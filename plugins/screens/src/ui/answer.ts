import { ORG_RULES_PATH, SCOPE_ROUTES_PATH } from "@fcalell/plugin-api/wire";
import { ORPCError } from "@orpc/client";
import {
	StandardRPCJsonSerializer,
	StandardRPCSerializer,
} from "@orpc/client/standard";
import { StandardRPCCodec } from "@orpc/server/standard";
import { toFetchResponse } from "@orpc/standard-server-fetch";
import { http } from "msw";

// What a screen's queries answer: the fixture's value, nothing yet, a failure,
// the collection with no items, or that the thing does not exist.
export type ScreenState = "data" | "loading" | "error" | "empty" | "notFound";

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
// Told by its fields: docs/architecture/plugins/screens.md, "Gaps".
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

// Frame routes: docs/architecture/plugins/screens.md, "What a state applies to".
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
const isPlain = (value: unknown): value is Record<string, unknown> => {
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

// A call's input, as oRPC sends it: a POST body, or a GET's `data` parameter.
async function inputOf(request: Request): Promise<unknown> {
	try {
		const raw =
			request.method === "GET"
				? new URL(request.url).searchParams.get("data")
				: await request.text();
		return raw ? serializer.deserialize(JSON.parse(raw)) : undefined;
	} catch {
		// A body that is no JSON (a file upload) reaches the fixture as no input.
		return undefined;
	}
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

// Procedures a story's queries call: docs/architecture/plugins/screens.md, "Gaps".
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

// What the fixtures could not answer: docs/architecture/plugins/screens.md, "Gaps".
const gaps = new Set<string>();

export function fixtureGaps(): readonly string[] {
	return [...gaps];
}

// A read that errors in the data state: docs/architecture/plugins/screens.md, "Gaps".
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
	gaps.clear();
	failed = undefined;
}

holdCalls();

// Answers the calls held, and the ones after, as data.
export function release(): void {
	open();
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
	story: ScreenState,
	// The generated schema is a virtual module the node tests cannot import.
	kinds: ProcedureKinds = {},
): Promise<Response> {
	const path = procedurePath(request.url, prefix);
	const kind = kinds[path.join(".")]?.kind;
	const query = kind ? kind === "query" : request.method === "GET";
	const found = findFixture(app, plugins, path);
	const owned = found?.plugin || isContainerRoute(path) || isSessionRead(path);
	let state: ScreenState = query && !owned ? story : "data";
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
		gaps.add(message);
		return replyError(new ORPCError("NOT_IMPLEMENTED", { message }));
	}
	let input: unknown;
	try {
		input = await inputOf(request);
		const output = found.fixture(input);
		return reply(state === "empty" ? emptyOf(output) : output);
	} catch (error) {
		// A fixture may throw the procedure's own error (`ApiError("NOT_FOUND")`).
		const thrown = asORPCError(error);
		if (thrown) {
			const lost =
				query && story === "data" && !isContainerRoute(path)
					? failedInData(path, input, currentStory().params, thrown.code)
					: undefined;
			if (lost) gaps.add(lost);
			return replyError(thrown);
		}
		const message = error instanceof Error ? error.message : String(error);
		gaps.add(`the fixture for ${path.join(".")} threw: ${message}`);
		return replyError(new ORPCError("INTERNAL_SERVER_ERROR", { message }));
	}
}

// A channel's fixture, by the channel's name: it takes the route params of the
// fixtures, since the `sub` frame carries none.
export type ChannelFixture = (params: Record<string, string>) => unknown;

// The frame plugin-node's server sends and its client decodes (`ServerFrame`,
// `serverFrameSchema`). A channel has no frame of its own for its opening: it
// is one of its server messages, "snapshot" by the `channelRead` convention.
export interface ChannelFrame {
	t: "msg";
	ch: string;
	type: string;
	payload: unknown;
}

// A fixture names the opening message with `{ type, payload }` (exactly those
// two keys, a string type); any other value is the payload of "snapshot".
function opening(value: unknown): { type: string; payload: unknown } {
	if (isPlain(value)) {
		const keys = Object.keys(value);
		if (
			keys.length === 2 &&
			keys.includes("type") &&
			keys.includes("payload") &&
			typeof value.type === "string"
		)
			return { type: value.type, payload: value.payload };
	}
	return { type: "snapshot", payload: value };
}

// What the socket does on a subscribe: docs/architecture/plugins/screens.md, "Channels".
export type ChannelAnswer =
	| { send: ChannelFrame; close?: undefined }
	| { send?: undefined; close: boolean };

// One subscribe, answered for the story's state. Loading holds the frame until
// `release`, as it holds a query.
export async function channelAnswer(
	channel: string,
	channels: Record<string, ChannelFixture> | undefined,
	params: Record<string, string>,
	state: ScreenState,
): Promise<ChannelAnswer> {
	if (state === "error") return { close: true };
	const fixture = channels?.[channel];
	if (!fixture) return gap(`no fixture for channel ${channel}`);
	if (state === "loading") await hold;
	try {
		const { type, payload } = opening(fixture(params));
		return {
			send: {
				t: "msg",
				ch: channel,
				type,
				payload: state === "empty" ? emptyOf(payload) : payload,
			},
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return gap(`the fixture for channel ${channel} threw: ${message}`);
	}
}

// A subscribe left unanswered: one gap, one console error (the floors fail the
// story on either).
function gap(message: string): ChannelAnswer {
	if (!gaps.has(message)) {
		gaps.add(message);
		console.error(message);
	}
	return { close: false };
}

// The story on screen, for the socket's one handler: a handler module is
// static and a socket belongs to the story that opened it. A story sets it as
// it renders.
interface Story {
	channels: Record<string, ChannelFixture> | undefined;
	params: Record<string, string>;
	state: ScreenState;
}

let story: Story = { channels: undefined, params: {}, state: "data" };

export function setStory(next: Story): void {
	story = next;
}

export function currentStory(): Story {
	return story;
}

export function fixtureHandlers(
	prefixes: readonly string[],
	app: unknown,
	plugins: readonly unknown[],
	state: ScreenState,
	kinds: ProcedureKinds = {},
) {
	return prefixes.map((prefix) =>
		http.all(`*${prefix}/*`, ({ request }) =>
			answer(request, prefix, app, plugins, state, kinds),
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
