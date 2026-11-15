import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { captureEntityHeaders } from "./query-invalidation.ts";
import type { RouterClient } from "./types.ts";
import { STACK_NOT_FOUND_HEADER } from "./wire.ts";

export { isNotFound } from "./not-found.ts";
export type { RouterClient } from "./types.ts";

// ---------- Default-client registration ----------
// Mirrors `defaultEntityRegistry` (./query-invalidation.ts): a module-level
// singleton so `useAbility()` needs zero wiring in the common case (one
// client per app). `createClient` below calls `registerApiClient`
// internally only when nothing is registered yet, so the first client
// created wins as the default; an explicit call always overwrites,
// regardless of call order.
//
// Per-JS-isolate, single-user assumption: this module-level singleton
// assumes one client for the lifetime of the isolate (CSR in a browser tab,
// or a native app's single JS runtime) -- it is NOT per-request. An SSR
// target that reuses the same isolate across requests/users (Node, most
// non-Workers SSR runtimes) must never rely on it: a request from user A
// could read user B's registered client. SSR consumers should call
// `registerApiClient` (or otherwise thread the client explicitly) within
// each request's own scope instead of depending on this default.
let registeredApiClient: unknown;

export function registerApiClient(client: unknown): void {
	registeredApiClient = client;
}

// Read by the query plugin's org-rules fetch and by `createClient`'s
// auto-registration guard. Not a consumer-facing surface -- there's nothing
// to inspect on the value beyond "is a client registered".
export function getRegisteredApiClient(): unknown {
	return registeredApiClient;
}

export interface ClientConfig {
	/** The RPC endpoint (`/rpc` by default). A function is read on every request, so an app whose server is chosen while it runs (a phone signing in to a server it is told the address of) changes the address without rebuilding the client. Clear the query cache when it changes: the data held is the old server's. */
	url?: string | (() => string);
	fetch?: typeof globalThis.fetch;
	credentials?: RequestCredentials;
	/** Sent with every request: an object, or a function read on every request that may answer later (a cookie or a key read from the device's secure store). */
	headers?:
		| Record<string, string>
		| (() => Record<string, string> | Promise<Record<string, string>>);
}

// Derives the procedure pathKey ("todos/list") from a request URL by
// stripping the configured base's pathname. `base` is either relative
// ("/rpc") or absolute ("https://host/rpc"); both cases resolve through
// `URL` against a dummy origin so the pathname strip is identical either way.
function pathKeyFromRequestUrl(requestUrl: string, base: string): string {
	const basePath = new URL(base, "http://stack.invalid").pathname;
	const path = new URL(requestUrl, "http://stack.invalid").pathname;
	const trimmedBase = basePath.replace(/^\/|\/$/g, "");
	const trimmedPath = path.replace(/^\/|\/$/g, "");
	return trimmedPath.startsWith(trimmedBase)
		? trimmedPath.slice(trimmedBase.length).replace(/^\/+/, "")
		: trimmedPath;
}

// oRPC's RPCLink resolves every request URL via `new URL(baseUrl)` with no
// `base` argument, so a relative default like "/rpc" throws "Invalid URL" on
// the first real call. Resolve against `location.origin` when present (any
// browser); native/SSR/test callers keep passing an absolute `url` (as the
// README's Expo example already does), so this is a no-op for them.
function resolveClientUrl(url: string): string {
	if (/^[a-z][a-z\d+\-.]*:\/\//i.test(url)) return url;
	if (typeof location === "undefined") return url;
	return new URL(url, location.origin).toString();
}

// oRPC's TanStack Query utils tag every call they make with an operation
// context (`queryOptions` -> "query", `mutationOptions` -> "mutation", ...)
// under the symbol `@orpc/tanstack-query` exports. That package is the query
// plugin's peer, which this entry must not import, so its `createApiQueryUtils`
// hands the symbol over before its calls are made.
let operationContext: symbol | undefined;

export function registerOperationContext(symbol: symbol): void {
	operationContext = symbol;
}

// The operation types oRPC's own docs send as GET.
const READ_OPERATIONS = new Set(["query", "streamed", "live", "infinite"]);

// A read travels as GET (its input in `?data=`), so a reader of the wire, the
// screens workbench's answerer, tells a query from a mutation by the method.
// Every other call (a mutation, a call outside TanStack Query) is a POST.
function methodOf(options: { context: object }): "GET" | "POST" {
	if (operationContext === undefined) return "POST";
	const operation = (
		options.context as Record<symbol, { type?: string } | undefined>
	)[operationContext];
	return operation?.type && READ_OPERATIONS.has(operation.type)
		? "GET"
		: "POST";
}

export function createClient<TRouter>(
	config?: ClientConfig,
): RouterClient<TRouter> {
	const given = config?.url ?? "/rpc";
	// The address now: a function is asked each time, a string once.
	const urlNow = (): string =>
		resolveClientUrl(typeof given === "function" ? given() : given);
	const baseFetch = config?.fetch ?? globalThis.fetch;

	const link = new RPCLink({
		url: typeof given === "function" ? urlNow : urlNow(),
		method: methodOf,
		headers: config?.headers,
		fetch: async (request, init) => {
			const response = await baseFetch(request, {
				...init,
				credentials: config?.credentials ?? "include",
			});
			// Capture the entity headers
			// for cache invalidation. Never let a capture failure break the
			// response passed back to the RPC link.
			try {
				captureEntityHeaders(
					pathKeyFromRequestUrl(request.url, urlNow()),
					response.headers,
				);
			} catch {
				// Capture is best-effort; the response must pass through untouched.
			}
			// A read's not found travels as a success status (see the worker);
			// oRPC decodes an error from the status, so the 404 goes back on.
			if (response.headers.has(STACK_NOT_FOUND_HEADER)) {
				return new Response(response.body, {
					status: 404,
					statusText: "Not Found",
					headers: response.headers,
				});
			}
			return response;
		},
	});

	const client = createORPCClient<RouterClient<TRouter>>(link);

	// The first client any consumer
	// creates becomes `useAbility()`'s default target, zero config. A later
	// `createClient` call never overwrites it; an explicit `registerApiClient`
	// always does (see the registration above).
	if (getRegisteredApiClient() === undefined) {
		registerApiClient(client);
	}

	return client;
}
