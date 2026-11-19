import type { RuntimePlugin } from "@fcalell/cli/runtime";
import { ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import {
	RequestHeadersPlugin,
	ResponseHeadersPlugin,
} from "@orpc/server/plugins";
import { type Context, Hono, type MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { isLocalOrigin } from "../lib/local-origin.ts";
import type { McpDefinition } from "../mcp.ts";
import { MCP_PATH } from "../mcp-path.ts";
import {
	createProcedure,
	type JobBatch,
	type JobScheduledEvent,
} from "../procedure.ts";
import {
	listenerOrigin,
	STACK_EXPOSED_HEADERS,
	STACK_NOT_FOUND_HEADER,
} from "../wire.ts";
import { ipLimited, ORIGINS_VAR } from "./guards.ts";
import { buildMcpTools, createMcpEndpoint, createMcpRoute } from "./mcp.ts";
import { requestLogger } from "./request-log.ts";

export { isForbiddenOrigin, RATE_LIMITER_RPC } from "./guards.ts";

export interface WorkerExport<
	TRouter extends Record<string, unknown> = Record<string, unknown>,
> {
	fetch: (
		request: Request,
		env: unknown,
		ctx: unknown,
	) => Response | Promise<Response>;
	// `checkEnv`: docs/architecture/plugins/api.md, "Env vars".
	checkEnv: (env: unknown) => void;
	// The job context, built afresh on each call: docs/architecture/runtime.md, "Background handlers".
	jobContext: (env: unknown, ctx?: unknown) => Promise<Record<string, unknown>>;
	// `queue` and `scheduled`: plugins/api/guide/background.md, "The context".
	queue?: (batch: JobBatch, env: unknown, ctx: unknown) => Promise<void>;
	scheduled?: (
		controller: JobScheduledEvent,
		env: unknown,
		ctx: unknown,
	) => Promise<void>;
	_router: TRouter;
}

interface PluginEntry {
	// biome-ignore lint/suspicious/noExplicitAny: plugins have varying types
	plugin: RuntimePlugin<string, any, any, any>;
}

interface FnEntry {
	fn: (
		ctx: Record<string, unknown>,
	) => Record<string, unknown> | Promise<Record<string, unknown>>;
}

interface MiddlewareEntry {
	middleware: MiddlewareHandler;
	// `afterContext` mounts via `.useAfterContext()`: docs/architecture/runtime.md, "Middleware".
	afterContext?: boolean;
}

type UseEntry = PluginEntry | FnEntry | MiddlewareEntry;

function isPluginEntry(entry: UseEntry): entry is PluginEntry {
	return "plugin" in entry;
}

function isMiddlewareEntry(entry: UseEntry): entry is MiddlewareEntry {
	return "middleware" in entry;
}

// Plugin entries sort by `dependsOn`: docs/architecture/runtime.md, "Runtime plugin protocol".
function sortPluginEntries(entries: UseEntry[]): UseEntry[] {
	const pluginPositions: number[] = [];
	const pluginEntries: PluginEntry[] = [];
	entries.forEach((entry, i) => {
		if (isPluginEntry(entry)) {
			pluginPositions.push(i);
			pluginEntries.push(entry);
		}
	});

	if (pluginEntries.length <= 1) return entries;

	const byName = new Map(pluginEntries.map((e) => [e.plugin.name, e]));
	const visited = new Set<string>();
	const inStack = new Set<string>();
	const sorted: PluginEntry[] = [];

	function visit(entry: PluginEntry, stack: string[]): void {
		const name = entry.plugin.name;
		if (visited.has(name)) return;
		if (inStack.has(name)) {
			const cycleStart = stack.indexOf(name);
			const cycle = [...stack.slice(cycleStart), name];
			throw new Error(`Runtime plugin dependency cycle: ${cycle.join(" -> ")}`);
		}
		inStack.add(name);
		for (const dep of entry.plugin.dependsOn ?? []) {
			const depEntry = byName.get(dep);
			// A dependsOn naming a plugin that isn't registered is ignored —
			// presence is validated at config level by `requires`.
			if (depEntry) visit(depEntry, [...stack, name]);
		}
		inStack.delete(name);
		visited.add(name);
		sorted.push(entry);
	}

	for (const entry of pluginEntries) {
		visit(entry, []);
	}

	const result = [...entries];
	pluginPositions.forEach((pos, i) => {
		result[pos] = sorted[i] as PluginEntry;
	});
	return result;
}

// Middleware dispatches on arity: docs/architecture/runtime.md, "Middleware".
function isHonoMiddleware(fn: (...args: unknown[]) => unknown): boolean {
	return fn.length >= 2;
}

// `TPluginRoutes` accumulates the routes each `.use(plugin)` registers, so
// `handler()` types the router as the plugins' routes plus the consumer's.
export interface AppBuilder<
	TContext extends Record<string, unknown>,
	TPluginRoutes extends Record<string, unknown> = Record<never, never>,
> {
	use<
		TName extends string,
		TProvides extends Record<string, unknown>,
		TRoutes extends Record<string, unknown>,
	>(
		plugin: RuntimePlugin<TName, TContext, TProvides, TRoutes>,
	): AppBuilder<TContext & TProvides, TPluginRoutes & TRoutes>;

	use(middleware: MiddlewareHandler): AppBuilder<TContext, TPluginRoutes>;

	use<TExtra extends Record<string, unknown>>(
		fn: (ctx: TContext) => TExtra | Promise<TExtra>,
	): AppBuilder<TContext & TExtra, TPluginRoutes>;

	useAfterContext(
		middleware: MiddlewareHandler,
	): AppBuilder<TContext, TPluginRoutes>;

	// `mcp` mounts `POST /mcp` over the routes it names (the generated worker
	// passes `src/worker/mcp.ts` and the app's name); `queue` and `scheduled`
	// are the consumer's background handlers.
	handler<TRoutes extends Record<string, unknown>>(
		consumerRoutes?: TRoutes,
		mount?: HandlerMount,
	): WorkerExport<TPluginRoutes & TRoutes>;
}

// What the generated worker mounts beside the routes: the MCP definition with
// the server's name (`name` comes with `mcp`), and the two job handlers.
export type HandlerMount = {
	queue?: JobQueueHandler;
	scheduled?: JobScheduledHandler;
} & ({ mcp: McpDefinition; name: string } | { mcp?: never; name?: never });

type JobQueueHandler = (
	// biome-ignore lint/suspicious/noExplicitAny: the consumer types its own body
	batch: JobBatch<any>,
	context: never,
) => Promise<void>;

type JobScheduledHandler = (
	event: JobScheduledEvent,
	context: never,
) => Promise<void>;

// `TEnv` is the env type the deploy target names (`Env` on Cloudflare), baked
// into the generated `createWorker<Env>(...)`; `unknown` without one.
export type BaseContext<TEnv = unknown> = {
	env: TEnv;
	// The raw HTTP request, named so no scope's row shadows it.
	httpRequest: Request;
	reqHeaders: Headers;
	resHeaders: Headers;
	// Hono's and wrangler's `ExecutionContext` types disagree on optional
	// members; `waitUntil` is the only part of the contract procedures need.
	executionCtx: { waitUntil(promise: Promise<unknown>): void };
	[key: string]: unknown;
};

// One env var the worker asserts before serving: docs/architecture/plugins/api.md, "Env vars".
export interface EnvCheckSpec {
	name: string;
	minLength?: number;
	url?: boolean;
	devLocalhost?: boolean;
}

export interface ApiWorkerOptions {
	cors?: string[];
	// Localhost dev-server origins. Honoured only when the worker runs with
	// STACK_DEV set, so a production deploy never accepts them.
	devCors?: string[];
	prefix?: `/${string}`;
	envChecks?: EnvCheckSpec[];
}

type ResolvedApiOptions = Required<Pick<ApiWorkerOptions, "prefix">> &
	Pick<ApiWorkerOptions, "cors" | "devCors" | "envChecks">;

// The single dev predicate every gate reads: set by `stack dev`, never by a
// deploy. Also what `ctx._devMode` carries to procedures.
function isDevMode(env: unknown): boolean {
	return (env as Record<string, unknown> | null | undefined)?.STACK_DEV === "1";
}

// Asserts every baked env check against the live env. Throws the first
// violation by var name; the caller runs this once per isolate.
function assertEnvChecks(checks: EnvCheckSpec[], env: unknown): void {
	const e = env as Record<string, unknown> | null | undefined;
	const devMode = isDevMode(env);
	for (const check of checks) {
		const value = e?.[check.name];
		if (!value) {
			throw new Error(`Missing env var: ${check.name}`);
		}
		if (typeof value !== "string") continue;
		if (check.minLength !== undefined && value.length < check.minLength) {
			throw new Error(
				`Env var ${check.name} must be at least ${check.minLength} characters (got ${value.length})`,
			);
		}
		if (check.url || check.devLocalhost) {
			let parsed: URL;
			try {
				parsed = new URL(value);
			} catch {
				// A `devLocalhost` check alone judges no value that is not a URL.
				if (!check.url) continue;
				throw new Error(`Env var ${check.name} must be a valid URL`);
			}
			if (check.devLocalhost && devMode && !isLocalOrigin(value)) {
				throw new Error(
					`Env var ${check.name} points at ${parsed.hostname} while STACK_DEV is set; refusing to serve. Unset STACK_DEV outside local dev.`,
				);
			}
		}
	}
}

// The Workers execution context a job invocation received, narrowed to the
// one member a handler needs; a no-op where the runtime supplied none.
function workersContext(ctx: unknown): {
	waitUntil(promise: Promise<unknown>): void;
} {
	const given = ctx as
		| { waitUntil(promise: Promise<unknown>): void }
		| null
		| undefined;
	if (typeof given?.waitUntil !== "function") return { waitUntil: () => {} };
	return { waitUntil: (promise) => given.waitUntil(promise) };
}

export default function createWorker<TEnv = unknown>(
	options?: ApiWorkerOptions,
): AppBuilder<BaseContext<TEnv>> {
	const apiOptions: ResolvedApiOptions = {
		prefix: "/rpc",
		...options,
	};
	return createAppBuilder<BaseContext<TEnv>>([], apiOptions);
}

function createAppBuilder<
	TContext extends Record<string, unknown>,
	TPluginRoutes extends Record<string, unknown> = Record<never, never>,
>(
	entries: UseEntry[],
	apiOptions: ResolvedApiOptions,
): AppBuilder<TContext, TPluginRoutes> {
	return {
		use(
			pluginOrFn:
				| RuntimePlugin<string>
				| MiddlewareHandler
				| ((
						ctx: TContext,
				  ) => Record<string, unknown> | Promise<Record<string, unknown>>),
		) {
			if (typeof pluginOrFn === "function") {
				const fn = pluginOrFn as (...args: unknown[]) => unknown;
				const newEntries: UseEntry[] = isHonoMiddleware(fn)
					? [...entries, { middleware: fn as MiddlewareHandler }]
					: [
							...entries,
							{
								fn: fn as (
									ctx: Record<string, unknown>,
								) => Record<string, unknown> | Promise<Record<string, unknown>>,
							},
						];
				// biome-ignore lint/suspicious/noExplicitAny: context type grows dynamically
				return createAppBuilder<any>(newEntries, apiOptions);
			}

			const plugin = pluginOrFn as RuntimePlugin<string>;

			const existingKeys = new Set<string>();
			for (const entry of entries) {
				if (isPluginEntry(entry)) {
					existingKeys.add(entry.plugin.name);
				}
			}
			if (existingKeys.has(plugin.name)) {
				throw new Error(
					`Context key collision: plugin "${plugin.name}" already registered`,
				);
			}

			const newEntries: UseEntry[] = [...entries, { plugin }];
			// biome-ignore lint/suspicious/noExplicitAny: context type grows dynamically
			return createAppBuilder<any>(newEntries, apiOptions);
		},

		useAfterContext(middleware: MiddlewareHandler) {
			return createAppBuilder<TContext, TPluginRoutes>(
				[...entries, { middleware, afterContext: true }],
				apiOptions,
			);
		},

		handler<TRoutes extends Record<string, unknown>>(
			consumerRoutes?: TRoutes,
			mount?: HandlerMount,
		): WorkerExport<TPluginRoutes & TRoutes> {
			const {
				prefix: rpcPrefix,
				cors: corsOrigin,
				devCors: devCorsOrigin,
				envChecks,
			} = apiOptions;

			// Once per isolate: the first request pays for value validation
			// (length / URL-shape / dev-localhost refusal), every later request
			// skips it. A failed run never sets the flag, so a misconfigured
			// isolate keeps failing loudly instead of caching the miss.
			let envChecked = false;

			// The allow-list is resolved per request: docs/architecture/plugins/api.md, "At runtime".
			const effectiveOrigins = (env: unknown): string[] => {
				const origins =
					devCorsOrigin?.length && isDevMode(env)
						? [...(corsOrigin ?? []), ...devCorsOrigin]
						: (corsOrigin ?? []);
				const own = listenerOrigin(env);
				return own === null || origins.includes(own)
					? origins
					: [...origins, own];
			};

			// Sort once at construction time so both the context-building loop
			// and the fetch/routes loops below see plugins in dependency order,
			// regardless of `.use()` registration order.
			const sortedEntries = sortPluginEntries(entries);
			const pluginEntries = sortedEntries.filter(isPluginEntry);

			const procedure = createProcedure<TContext>();

			let pluginRoutes: Record<string, unknown> = {};
			// Route-key collisions name the owning plugin: docs/architecture/plugins/api.md, "Routes barrel".
			const routeOwners = new Map<string, string>();
			for (const entry of pluginEntries) {
				const routes = entry.plugin.routes?.(procedure);
				if (routes) {
					for (const key of Object.keys(routes)) {
						routeOwners.set(key, entry.plugin.name);
					}
					pluginRoutes = { ...pluginRoutes, ...routes };
				}
			}

			if (consumerRoutes) {
				for (const key of Object.keys(consumerRoutes)) {
					const owner = routeOwners.get(key);
					if (owner) {
						throw new Error(
							`createWorker: consumer routes key "${key}" collides with a route ` +
								`namespace already registered by the "${owner}" plugin runtime. ` +
								"Rename the consumer routes export.",
						);
					}
				}
			}

			// `.handler()` (no arg) and `.handler({})` are equivalent: the worker
			// is a runnable shell that 404s every RPC call. Validating this at
			// construction time is intentional — it lets a worker boot before
			// any consumer routes have been authored.
			const fullRouter = { ...pluginRoutes, ...(consumerRoutes ?? {}) };

			// Resolved at construction, so a tool the endpoint cannot serve fails
			// the boot, naming the tool.
			const mcpRoute = mount?.mcp
				? createMcpRoute(
						createMcpEndpoint({
							tools: buildMcpTools(consumerRoutes, mount.mcp),
							instructions: mount.mcp.instructions,
							name: mount.name,
						}),
					)
				: null;

			// biome-ignore lint/suspicious/noExplicitAny: oRPC RPCHandler expects internal router type
			const rpcHandler = new RPCHandler(fullRouter as any, {
				plugins: [new RequestHeadersPlugin(), new ResponseHeadersPlugin()],
			});

			const app = new Hono<{
				Variables: {
					__stackCtx: Record<string, unknown>;
					[ORIGINS_VAR]: string[];
				};
			}>();

			// CORS mounts first, and an empty list throws: docs/architecture/plugins/api.md, "At runtime".
			if (corsOrigin !== undefined) {
				if (corsOrigin.length === 0) {
					throw new Error(
						"createWorker: cors was provided but is empty. Check app.domain / app.origins.",
					);
				}
				app.use(
					"*",
					cors({
						// A function, not the array: the allow-list depends on
						// env (dev origins), which Hono only hands over per
						// request. Wildcard keeps the array form's meaning:
						// `["*"]` answers every origin with `*`.
						origin: (requestOrigin, c) => {
							const allowed = effectiveOrigins(c.env);
							if (allowed.includes("*")) return "*";
							return allowed.includes(requestOrigin) ? requestOrigin : null;
						},
						credentials: true,
						exposeHeaders: [...STACK_EXPOSED_HEADERS],
					}),
				);
			}
			app.use("*", requestLogger());
			app.use("*", secureHeaders());

			// The liveness route precedes the context middleware: docs/architecture/runtime.md, "Request order".
			app.get("/", (c) => c.json({ ok: true }));

			// Consumer middleware before context injection: docs/architecture/runtime.md, "Request order".
			for (const entry of sortedEntries) {
				if (isMiddlewareEntry(entry) && !entry.afterContext) {
					app.use("*", entry.middleware);
				}
			}

			// The plugin context of one invocation: docs/architecture/runtime.md, "Request order".
			const buildContext = async (
				env: unknown,
				base: Record<string, unknown>,
			): Promise<Record<string, unknown>> => {
				if (!envChecked && envChecks && envChecks.length > 0) {
					assertEnvChecks(envChecks, env);
					envChecked = true;
					console.info(`[api] env checks passed (${envChecks.length} vars)`);
				}

				for (const entry of pluginEntries) {
					entry.plugin.validateEnv?.(env);
				}

				let ctx: Record<string, unknown> = {
					env,
					...base,
					_devMode: isDevMode(env),
				};

				for (const entry of sortedEntries) {
					if (isPluginEntry(entry)) {
						const provided = await entry.plugin.context(env, ctx);
						ctx = { ...ctx, ...provided };
					} else if (!isMiddlewareEntry(entry)) {
						const extra = await entry.fn(ctx);
						ctx = { ...ctx, ...extra };
					}
				}
				return ctx;
			};

			app.use("*", async (c, next) => {
				const env = c.env;
				const request = c.req.raw;

				// `c.executionCtx` throws when the runtime supplied none (Node
				// tests, `.handler({})` invoked without a Workers ctx). A no-op
				// waitUntil is behaviorally correct outside Workers: the promise
				// still runs, waitUntil only extends the worker's lifetime.
				let executionCtx: { waitUntil(promise: Promise<unknown>): void };
				try {
					executionCtx = c.executionCtx;
				} catch {
					executionCtx = { waitUntil: () => {} };
				}

				const ctx = await buildContext(env, {
					httpRequest: request,
					executionCtx,
				});

				for (const entry of pluginEntries) {
					const fetchFn = entry.plugin.fetch;
					if (typeof fetchFn !== "function") continue;
					const claimed = await fetchFn(request, env, ctx);
					if (claimed) return claimed;
				}

				c.set(ORIGINS_VAR, effectiveOrigins(env));
				c.set("__stackCtx", ctx);
				await next();
			});

			// Post-context middleware: docs/architecture/runtime.md, "Request order".
			for (const entry of sortedEntries) {
				if (isMiddlewareEntry(entry) && entry.afterContext) {
					app.use("*", entry.middleware);
				}
			}

			// Reads travel as GET: docs/architecture/plugins/api.md, "Reads travel as GET".
			app.on(["GET", "POST"], `${rpcPrefix}/*`, async (c) => {
				// A non-GET request must be `application/json`: docs/architecture/plugins/api.md, "Reads travel as GET".
				const contentType = c.req.header("content-type")?.toLowerCase();
				if (
					c.req.method === "POST" &&
					!contentType?.startsWith("application/json")
				) {
					return c.json({ code: "UNSUPPORTED_MEDIA_TYPE" }, 415);
				}

				const ctx = c.get("__stackCtx");

				if (await ipLimited(c, ctx)) {
					return c.json({ code: "TOO_MANY_REQUESTS" }, 429);
				}

				const { matched, response } = await rpcHandler.handle(c.req.raw, {
					prefix: rpcPrefix,
					context: ctx,
				});

				if (matched) {
					// A read's not found travels as a 200: docs/architecture/plugins/api.md, "Not found".
					if (response.status === 404 && c.req.method === "GET") {
						const headers = new Headers(response.headers);
						headers.set(STACK_NOT_FOUND_HEADER, "1");
						return c.newResponse(response.body, { status: 200, headers });
					}
					return c.newResponse(response.body, response);
				}

				return c.json({ error: "Not found", code: "NOT_FOUND" }, 404);
			});

			if (mcpRoute) {
				// The one MCP route: any other method is refused before anything
				// else, and `POST` verifies its bearer token first.
				app.post(MCP_PATH, (c) => mcpRoute(c, c.get("__stackCtx")));
				app.all(MCP_PATH, (c) => c.body(null, 405, { Allow: "POST" }));
			}

			app.onError((err, c) => {
				if (err instanceof ORPCError) {
					return c.json(
						{ code: err.code, message: err.message },
						{ status: err.status as ContentfulStatusCode },
					);
				}

				console.error("API Error:", err);
				return c.json(
					{
						code: "INTERNAL_SERVER_ERROR",
						message: "Internal Server Error",
					},
					500,
				);
			});

			const honoFetch = app.fetch.bind(app);
			const checkEnv = (env: unknown): void => {
				const problems: string[] = [];
				for (const check of envChecks ?? []) {
					try {
						assertEnvChecks([check], env);
					} catch (error) {
						problems.push(
							error instanceof Error ? error.message : String(error),
						);
					}
				}
				for (const entry of pluginEntries) {
					try {
						entry.plugin.validateEnv?.(env);
					} catch (error) {
						const message =
							error instanceof Error ? error.message : String(error);
						if (!problems.includes(message)) problems.push(message);
					}
				}
				if (problems.length > 0) {
					throw new Error(
						`the environment is incomplete:\n${problems.map((line) => `  - ${line}`).join("\n")}`,
					);
				}
			};

			// A job's context is a request's without the request: docs/architecture/runtime.md, "Background handlers".
			const jobContext = (env: unknown, ctx?: unknown) =>
				buildContext(env, {
					executionCtx: workersContext(ctx),
				});
			// A mounted handler declares its own context type (`never` here, so any
			// handler is assignable); the compiler cannot relate it to the built one.
			const queueRun = mount?.queue;
			const scheduledRun = mount?.scheduled;

			return {
				fetch: (request, env, ctx) => honoFetch(request, env, ctx as undefined),
				checkEnv,
				jobContext,
				...(queueRun
					? {
							queue: async (batch: JobBatch, env: unknown, ctx: unknown) =>
								queueRun(batch, (await jobContext(env, ctx)) as never),
						}
					: {}),
				...(scheduledRun
					? {
							scheduled: async (
								controller: JobScheduledEvent,
								env: unknown,
								ctx: unknown,
							) =>
								scheduledRun(controller, (await jobContext(env, ctx)) as never),
						}
					: {}),
				_router: fullRouter as TPluginRoutes & TRoutes,
			};
		},
	} as AppBuilder<TContext>;
}

// The injected plugin context (`db`, `auth`, `env`, …), for post-context
// middleware and raw Hono routes. Annotate the call with the generated
// `WorkerContext` to get the same typed context a procedure handler sees.
export function stackContext<
	TContext extends Record<string, unknown> = BaseContext,
>(c: Context): TContext {
	const ctx = c.get("__stackCtx") as TContext | undefined;
	if (!ctx) {
		throw new Error(
			"stackContext: no context on this request. Register the middleware with .useAfterContext() (src/worker/middleware.context.ts), not .use().",
		);
	}
	return ctx;
}
