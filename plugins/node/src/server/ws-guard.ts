import type { NodeWorker } from "./worker.ts";
import type { ConnectionSession } from "./ws-hub.ts";

// The auth path this package names: docs/architecture/plugins/node.md, "Auth coupling".
const AUTH_PREFIX = "/api/auth";

// The session-ended channel this package names: docs/architecture/plugins/node.md, "Auth coupling".
export const SESSION_ENDED_CHANNEL = "slotform:auth:session-ended";

export function hasAuth(workerPaths: readonly string[]): boolean {
	return workerPaths.includes(AUTH_PREFIX);
}

type WsUpgradeDecision =
	| { allow: true; session: ConnectionSession | null }
	| { allow: false; reason: "origin" | "session" };

// The whole admission rule: docs/architecture/plugins/node.md, "WebSocket admission".
export function wsUpgradeDecision(input: {
	origin: string | null;
	originAllowed: boolean;
	bearer: boolean;
	authConfigured: boolean;
	session: ConnectionSession | null;
}): WsUpgradeDecision {
	const named =
		input.origin === null
			? input.bearer && input.authConfigured
			: input.originAllowed;
	if (!named) return { allow: false, reason: "origin" };
	if (input.authConfigured && input.session === null) {
		return { allow: false, reason: "session" };
	}
	return { allow: true, session: input.session };
}

// Whether the worker's CORS layer answers an origin: docs/architecture/plugins/node.md, "WebSocket admission".
async function workerAllowsOrigin(
	worker: NodeWorker | null,
	env: unknown,
	url: URL,
	origin: string,
): Promise<boolean> {
	if (!worker) return false;
	try {
		const response = await worker.fetch(
			new Request(url, {
				method: "OPTIONS",
				headers: {
					origin,
					"access-control-request-method": "GET",
				},
			}),
			env,
			undefined,
		);
		const allowed = response.headers.get("access-control-allow-origin");
		return allowed === "*" || allowed === origin;
	} catch {
		return false;
	}
}

// The session comes from the worker's auth, not the cookie cache: docs/architecture/plugins/node.md, "WebSocket admission".
// `credentials` names the request headers it forwards.
async function workerSession(
	worker: NodeWorker | null,
	env: unknown,
	request: Request,
	credentials: readonly string[],
): Promise<ConnectionSession | null> {
	if (!worker) return null;
	const headers = new Headers({ accept: "application/json" });
	for (const name of credentials) {
		const value = request.headers.get(name);
		if (value !== null) headers.set(name, value);
	}
	try {
		const response = await worker.fetch(
			new Request(
				new URL(
					`${AUTH_PREFIX}/get-session?disableCookieCache=true`,
					request.url,
				),
				{
					headers,
				},
			),
			env,
			undefined,
		);
		if (!response.ok) return null;
		const body: unknown = await response.json();
		if (!isRecord(body) || !isRecord(body.user) || !isRecord(body.session)) {
			return null;
		}
		return { user: body.user, session: body.session };
	} catch {
		return null;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Whether the request's Origin is one of the app's pages: on a listener that
// serves one origin of its own, that origin alone; on the main one, an origin
// the worker's CORS list trusts. Null when the request sends none.
async function trustedOrigin(options: {
	worker: NodeWorker | null;
	env: unknown;
	listenerOrigin: string | null;
	request: Request;
}): Promise<boolean | null> {
	const { worker, env, listenerOrigin, request } = options;
	const origin = request.headers.get("origin");
	if (origin === null) return null;
	if (listenerOrigin !== null) return origin === listenerOrigin;
	return workerAllowsOrigin(worker, env, new URL(request.url), origin);
}

const BEARER_ONLY = ["authorization"] as const;
const EVERY_CREDENTIAL = ["cookie", "authorization"] as const;
// Reads carry no Origin: docs/architecture/plugins/node.md, "Service route sessions".
const READS = new Set(["GET", "HEAD"]);

// Admits or refuses a `/ws` upgrade request: the origin first, so a
// cross-site page never makes the worker look a session up. With no Origin,
// only a bearer credential is read.
export async function authorizeUpgrade(options: {
	worker: NodeWorker | null;
	env: unknown;
	listenerOrigin: string | null;
	authConfigured: boolean;
	request: Request;
}): Promise<WsUpgradeDecision> {
	const { worker, env, authConfigured, request } = options;
	const origin = request.headers.get("origin");
	const bearer = /^bearer\s/i.test(request.headers.get("authorization") ?? "");
	const originAllowed = (await trustedOrigin(options)) === true;
	const named = origin === null ? bearer : originAllowed;
	const session =
		named && authConfigured
			? await workerSession(
					worker,
					env,
					request,
					origin === null ? BEARER_ONLY : EVERY_CREDENTIAL,
				)
			: null;
	return wsUpgradeDecision({
		origin,
		originAllowed,
		bearer,
		authConfigured,
		session,
	});
}

// The session a mounted route's request holds: docs/architecture/plugins/node.md, "Service route sessions".
export async function mountSession(options: {
	worker: NodeWorker | null;
	env: unknown;
	listenerOrigin: string | null;
	request: Request;
}): Promise<ConnectionSession | null> {
	const { worker, env, request } = options;
	const trusted = await trustedOrigin(options);
	const cookies =
		trusted === true || (trusted === null && READS.has(request.method));
	return workerSession(
		worker,
		env,
		request,
		cookies ? EVERY_CREDENTIAL : BEARER_ONLY,
	);
}
