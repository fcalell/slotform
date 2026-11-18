import { ORG_RULES_PATH, SCOPE_ROUTES_PATH } from "@fcalell/plugin-api/wire";
import { ORPCError } from "@orpc/client";
import {
	StandardRPCJsonSerializer,
	StandardRPCSerializer,
} from "@orpc/client/standard";
import { StandardRPCCodec } from "@orpc/server/standard";
import {
	toFetchResponse,
	toStandardLazyRequest,
} from "@orpc/standard-server-fetch";
import { http } from "msw/http";
import type { SCREEN_STATES } from "../node/screens.ts";

// What a screen's queries answer: the fixture's value, nothing yet, a failure,
// the collection with no items, or that the thing does not exist.
export type ScreenState = (typeof SCREEN_STATES)[number]["state"];

type Fixture = (input: unknown) => unknown;

// oRPC's own server codec, the one `RPCHandler` builds, so the envelope, the
// status and the headers are exactly what the client decodes in production.
const serializer = new StandardRPCSerializer(new StandardRPCJsonSerializer());
const codec = new StandardRPCCodec(serializer);

// `encode` takes the procedure it never reads.
const reply = (output: unknown) =>
	toFetchResponse(codec.encode(output, undefined as never));
const replyError = (error: ORPCError<string, unknown>) =>
	toFetchResponse(codec.encodeError(error));

// An error a fixture threw as oRPC's own, from any copy of `@orpc/client`; null for any other value.
// Told by its fields: docs/architecture/plugins/screens.md, "Unanswered calls".
export function asORPCError(error: unknown): ORPCError<string, unknown> | null {
	if (error instanceof ORPCError) return error;
	if (
		!(error instanceof Error) ||
		!("code" in error) ||
		typeof error.code !== "string" ||
		!("status" in error) ||
		typeof error.status !== "number" ||
		!("defined" in error) ||
		typeof error.defined !== "boolean"
	)
		return null;
	return new ORPCError(error.code, {
		status: error.status,
		message: error.message,
		defined: error.defined,
		data: "data" in error ? error.data : undefined,
		cause: error.cause,
	});
}

// Container routes: docs/architecture/plugins/screens.md, "What a state applies to".
function isContainerRoute(path: readonly string[]): boolean {
	const under = (route: readonly string[]) =>
		route.every((key, at) => path[at] === key);
	return under(SCOPE_ROUTES_PATH) || under(ORG_RULES_PATH);
}

// The session read: docs/architecture/plugins/screens.md, "What a state applies to".
const SESSION_PATH = ["auth", "session"] as const;

function isSessionRead(path: readonly string[]): boolean {
	return (
		path.length === SESSION_PATH.length &&
		SESSION_PATH.every((key, at) => path[at] === key)
	);
}

function isFixture(value: unknown): value is Fixture {
	return typeof value === "function";
}

// Fixture lookup order: docs/architecture/slot-catalog.md, "`screens.slots.*` (plugin-screens)".
function findFixture(
	app: unknown,
	plugins: readonly unknown[],
	path: readonly string[],
): { fixture: Fixture; plugin: boolean } | undefined {
	const trees = [app, ...plugins];
	for (const [index, tree] of trees.entries()) {
		let node = tree;
		for (const key of path) {
			if (typeof node !== "object" || node === null) {
				node = undefined;
				break;
			}
			node = Reflect.get(node, key);
		}
		if (isFixture(node)) return { fixture: node, plugin: index > 0 };
	}
	return undefined;
}

// The empty answer: docs/architecture/plugins/screens.md, "States".
export const isPlain = (value: unknown): value is Record<string, unknown> => {
	if (typeof value !== "object" || value === null) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
};

export function emptyOf(value: unknown): unknown {
	if (Array.isArray(value)) return [];
	if (!isPlain(value)) return value;
	if (Array.isArray(value.data) && "nextCursor" in value)
		return { ...value, data: [], nextCursor: null };
	if (Array.isArray(value.data) && "total" in value && "offset" in value)
		return { ...value, data: [], total: 0 };
	const schema = value.type === "object" && isPlain(value.properties);
	return Object.fromEntries(
		Object.entries(value).map(([key, item]) => [
			key,
			schema && key === "properties" ? {} : emptyOf(item),
		]),
	);
}

function procedurePath(url: string, prefix: string): string[] {
	const { pathname } = new URL(url);
	const at = pathname.indexOf(`${prefix}/`);
	return pathname
		.slice(at + prefix.length + 1)
		.split("/")
		.filter(Boolean)
		.map(decodeURIComponent);
}

// Procedures a story's queries call: docs/architecture/plugins/screens.md, "Unanswered calls".
const seen = new Map<string, readonly string[]>();

export function called(): readonly (readonly string[])[] {
	return [...seen.values()];
}

// The one procedure whose queries fail in a "data" story, every other still
// answering its fixture: the run's way to draw a screen with a single read
// failed. `holdCalls` takes it off.
let failed: string | undefined;

export function failing(path: readonly string[] | undefined): void {
	failed = path?.join(".");
}

// What the fixtures could not answer: docs/architecture/plugins/screens.md, "Unanswered calls".
const unanswered = new Set<string>();

export function unansweredCalls(): readonly string[] {
	return [...unanswered];
}

// A read that errors in the data state: docs/architecture/plugins/screens.md, "Unanswered calls".
function failedInData(
	path: readonly string[],
	input: unknown,
	params: Readonly<Record<string, string>>,
	code: string,
): string | undefined {
	const sent: unknown[] =
		typeof input === "object" && input !== null
			? Object.values(input)
			: [input];
	const named = Object.entries(params)
		.filter(([, value]) => sent.includes(value))
		.map(([name, value]) => `${name} "${value}"`);
	if (named.length === 0) return undefined;
	return `${path.join(".")} answered ${code} in the data state for the param ${named.join(", ")}: give the route an example value the procedure accepts, under its id in the params of src/app/fixtures.ts`;
}

// The loading hold: docs/architecture/plugins/screens.md, "States".
let hold = Promise.resolve();
let open = () => {};

// The calls waiting on the hold now, which the run itself keeps in flight. A
// new hold starts a set of its own: the last story's calls wait on a promise
// nothing releases.
let held = new Set<symbol>();

export function heldReads(): number {
	return held.size;
}

export function holdCalls(): void {
	hold = new Promise<void>((resolve) => {
		open = resolve;
	});
	held = new Set();
	seen.clear();
	unanswered.clear();
	failed = undefined;
}

holdCalls();

export function release(): void {
	open();
}

// Resolves when the loading hold opens.
export function whenReleased(): Promise<void> {
	return hold;
}

// One unanswered call, one console error (the checks fail the story on either).
export function noteUnanswered(message: string): void {
	if (unanswered.has(message)) return;
	unanswered.add(message);
	console.error(message);
}

// The kind of each procedure by dotted path, from the generated schema
// (`virtual:stack-schema`).
type ProcedureKinds = Readonly<
	Record<string, { readonly kind: "query" | "mutation" } | undefined>
>;

// One call answered for the story's state: docs/architecture/plugins/screens.md, "What a state applies to".
export async function answer(
	request: Request,
	prefix: string,
	app: unknown,
	plugins: readonly unknown[],
	// The screen on screen: its state and the route params its fixtures were written for.
	story: { state: ScreenState; params: Readonly<Record<string, string>> },
	// The generated schema is a virtual module the node tests cannot import.
	kinds: ProcedureKinds = {},
): Promise<Response> {
	const path = procedurePath(request.url, prefix);
	const kind = kinds[path.join(".")]?.kind;
	const query = kind ? kind === "query" : request.method === "GET";
	const found = findFixture(app, plugins, path);
	const owned = found?.plugin || isContainerRoute(path) || isSessionRead(path);
	let state: ScreenState = query && !owned ? story.state : "data";
	if (query) {
		seen.set(path.join("."), path);
		if (state === "data" && !owned && failed === path.join("."))
			state = "error";
	}
	if (state === "loading") {
		const calls = held;
		const call = Symbol(path.join("."));
		calls.add(call);
		try {
			await hold;
		} finally {
			calls.delete(call);
		}
		state = "data";
	}
	if (state === "error")
		return replyError(new ORPCError("INTERNAL_SERVER_ERROR"));
	if (state === "notFound") return replyError(new ORPCError("NOT_FOUND"));
	if (!found) {
		const message = `no fixture for ${path.join(".")}`;
		unanswered.add(message);
		return replyError(new ORPCError("NOT_IMPLEMENTED", { message }));
	}
	let input: unknown;
	try {
		// `decode` takes the params and the procedure it never reads.
		input = await codec.decode(
			toStandardLazyRequest(request),
			undefined,
			undefined as never,
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		unanswered.add(`the input of ${path.join(".")} is malformed: ${message}`);
		return replyError(new ORPCError("BAD_REQUEST", { message }));
	}
	try {
		const output = found.fixture(input);
		return reply(state === "empty" ? emptyOf(output) : output);
	} catch (error) {
		// A fixture may throw the procedure's own error (`ApiError("NOT_FOUND")`).
		const thrown = asORPCError(error);
		if (thrown) {
			const lost =
				query && story.state === "data" && !isContainerRoute(path)
					? failedInData(path, input, story.params, thrown.code)
					: undefined;
			if (lost) unanswered.add(lost);
			return replyError(thrown);
		}
		const message = error instanceof Error ? error.message : String(error);
		unanswered.add(`the fixture for ${path.join(".")} threw: ${message}`);
		return replyError(new ORPCError("INTERNAL_SERVER_ERROR", { message }));
	}
}

export function fixtureHandlers(
	prefixes: readonly string[],
	app: unknown,
	plugins: readonly unknown[],
	story: { state: ScreenState; params: Readonly<Record<string, string>> },
	kinds: ProcedureKinds,
) {
	return prefixes.map((prefix) =>
		http.all(`*${prefix}/*`, ({ request }) =>
			answer(request, prefix, app, plugins, story, kinds),
		),
	);
}

// A request no handler answered that must not reach the network: another
// origin's, or one under a prefix the worker owns. Anything else on the dev
// server's own origin is the host serving its modules.
export function mustBeMocked(
	url: string,
	origin: string,
	prefixes: readonly string[],
): boolean {
	const target = new URL(url);
	if (target.origin !== origin) return true;
	return prefixes.some(
		(prefix) =>
			target.pathname === prefix || target.pathname.startsWith(`${prefix}/`),
	);
}
