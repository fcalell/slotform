import { join, posix } from "node:path";
import type { ContributionCtx } from "@slotform/cli";
import { plugin, slot } from "@slotform/cli";
import type {
	MiddlewareSpec,
	TsExpression,
	TsImportSpec,
	TsTypeRef,
} from "@slotform/cli/ast";
import { cliSlots, emitArtifact } from "@slotform/cli/cli-slots";
import { writeArtifact } from "@slotform/cli/write-artifact";
import { z } from "zod";
import { isLocalOrigin } from "./lib/local-origin.ts";
import { MCP_PATH } from "./mcp-path.ts";
import { generateRouteBarrel, hasRoutableFiles } from "./node/barrel.ts";
import {
	aggregateWorker,
	middlewareCallsOf,
	middlewareImportsOf,
} from "./node/codegen.ts";
import { aggregateProcedure } from "./node/procedure-codegen.ts";
import { schemaSource } from "./node/schema-source.ts";
import {
	checkServer,
	readServerFile,
	readServerManifest,
	serverTypesSource as renderServerTypes,
	SERVER_MANIFEST,
	SERVER_SCHEMA,
	SERVER_TYPES,
} from "./node/server-client.ts";
import {
	type CallbackSpec,
	importSource,
	type MiddlewareCall,
	type PluginRuntimeEntry,
	PROCEDURE_FILE,
	ROUTES_BARREL,
	ROUTES_BARREL_IMPORT_SOURCE,
	ROUTES_DIR,
	WORKER_FILE,
	type WorkerPayload,
} from "./node/types.ts";
import type { EnvSpec } from "./types.ts";
import { ENTITY_NAME_RE } from "./wire.ts";

const envSpecSchema = z.object({
	name: z.string().min(1),
	devDefault: z.string(),
	validate: z
		.object({
			minLength: z.number().int().positive().optional(),
			url: z.boolean().optional(),
			devLocalhost: z.boolean().optional(),
		})
		.optional(),
}) satisfies z.ZodType<EnvSpec>;

const apiOptionsSchema = z.object({
	prefix: z
		.string()
		.refine((p) => p.startsWith("/"), {
			error: "api: prefix must start with /",
		})
		.default("/rpc"),
	// Consumer env vars: docs/architecture/plugins/api.md, "Env vars".
	env: z.array(envSpecSchema).default([]),
	// Entity names outside any plugin's tables: docs/architecture/plugins/api.md, "Entities".
	entities: z
		.array(
			z.string().regex(ENTITY_NAME_RE, {
				error:
					'api: an entity name may only contain letters, digits, "_", ".", and "-"',
			}),
		)
		.default([]),
	// The server this app is a client of: docs/architecture/plugins/api.md, "Client-only apps".
	server: z.string().min(1).optional(),
});

export type ApiOptions = z.input<typeof apiOptionsSchema>;

// Every worker fragment is a slot: docs/architecture/plugins/api.md, "Overview".

const SOURCE = "api";

type ParsedOptions = z.output<typeof apiOptionsSchema>;

// The consumer's MCP definition.
const MCP_FILE = "src/worker/mcp.ts";

// The background handlers' convention files: a queue consumer and a cron
// handler, each answering with the plugin context a procedure gets.
const QUEUE_FILE = "src/worker/queue.ts";
const SCHEDULED_FILE = "src/worker/scheduled.ts";

// The consumer middleware convention files: docs/architecture/runtime.md, "Middleware".
const MIDDLEWARE_FILE = "src/worker/middleware.ts";
const CONTEXT_MIDDLEWARE_FILE = "src/worker/middleware.context.ts";

// The consumer files `.slotform/procedure.ts` leaves out: each imports it back,
// the MCP definition to type itself against the routes and a job handler for
// `defineQueue`, as the route barrel does.
const WORKER_ONLY_IMPORTS = new Set([
	ROUTES_BARREL_IMPORT_SOURCE,
	...[MCP_FILE, QUEUE_FILE, SCHEDULED_FILE].map(importSource),
]);

// Sort imports by source so the emitted worker file is independent of
// `config.plugins` array order. dedupeImports preserves insertion order
// within a group, so we sort the raw list first.
const workerImports = slot.list<TsImportSpec>({
	source: SOURCE,
	name: "workerImports",
	sortBy: (a, b) => a.source.localeCompare(b.source),
});

// Runtimes sort by plugin name: docs/architecture/runtime.md, "Chain order".
const pluginRuntimes = slot.list<PluginRuntimeEntry>({
	source: SOURCE,
	name: "pluginRuntimes",
	sortBy: (a, b) => a.plugin.localeCompare(b.plugin),
});

const middlewareEntries = slot.list<MiddlewareSpec>({
	source: SOURCE,
	name: "middlewareEntries",
});

// Derived view of middleware: sorted calls, each carrying the builder method
// that mounts it (`use` / `useAfterContext`).
const middlewareCalls = slot.derived({
	source: SOURCE,
	name: "middlewareCalls",
	inputs: { entries: middlewareEntries },
	compute: (inp): MiddlewareCall[] => middlewareCallsOf(inp.entries),
});

const middlewareImports = slot.derived({
	source: SOURCE,
	name: "middlewareImports",
	inputs: { entries: middlewareEntries },
	compute: (inp): TsImportSpec[] => middlewareImportsOf(inp.entries),
});

// The routes handler is gated on routable files, as the barrel is: docs/architecture/runtime.md, "Chain order".
const routesHandler = slot.value<{ identifier: string } | null>({
	source: SOURCE,
	name: "routesHandler",
	seed: (ctx) => (hasRoutableFiles(ctx.cwd) ? { identifier: "routes" } : null),
});

// MCP auth flag: docs/architecture/slot-catalog.md, "`api.slots.*` (the `api` plugin)".
const mcpAuth = slot.value<boolean>({
	source: SOURCE,
	name: "mcpAuth",
	override: true,
	seed: () => false,
});

// Whether the server has `auth()`: docs/architecture/plugins/api.md, "Client-only apps".
const serverAuth = slot.value<boolean, ParsedOptions>({
	source: SOURCE,
	name: "serverAuth",
	seed: async (ctx) =>
		ctx.options.server === undefined
			? false
			: (await readServerManifest(ctx, ctx.options.server)).auth,
});

// A client app's `.slotform/schema.ts`: docs/architecture/plugins/api.md, "Client-only apps".
const serverSchemaSource = slot.derived({
	source: SOURCE,
	name: "serverSchemaSource",
	compute: async (
		_inp,
		ctx: ContributionCtx<ParsedOptions>,
	): Promise<string | null> => {
		const { server } = ctx.options;
		if (server === undefined) return null;
		if (hasRoutableFiles(ctx.cwd)) {
			throw new Error(
				`api: \`server: "${server}"\` makes this app a client, which serves no procedures: remove ${ROUTES_DIR} or the option.`,
			);
		}
		await checkServer(ctx, server);
		return readServerFile(ctx, server, SERVER_SCHEMA);
	},
});

// `.slotform/server.ts` of a client app: the server's `AppRouter` type.
const serverTypesSource = slot.derived({
	source: SOURCE,
	name: "serverTypesSource",
	compute: (_inp, ctx: ContributionCtx<ParsedOptions>): string | null =>
		ctx.options.server === undefined
			? null
			: renderServerTypes(ctx.options.server),
});

// The MCP endpoint's mount: set when `src/worker/mcp.ts` exists, and then
// refused unless every part it stands on is there. null without the file.
const mcpMount = slot.derived({
	source: SOURCE,
	name: "mcpMount",
	inputs: { auth: mcpAuth, handler: routesHandler },
	compute: async (
		inp,
		ctx: ContributionCtx<ParsedOptions>,
	): Promise<{ identifier: string; name: string } | null> => {
		if (!(await ctx.fileExists(MCP_FILE))) return null;
		if (!inp.auth) {
			throw new Error(
				`api: ${MCP_FILE} serves MCP, which authenticates through the OAuth provider: set auth({ mcp: true }) in slotform.config.ts.`,
			);
		}
		if (inp.handler === null) {
			throw new Error(
				`api: ${MCP_FILE} lists procedures of ${ROUTES_DIR}, which has no routable file.`,
			);
		}
		if (ctx.options.prefix === MCP_PATH) {
			throw new Error(
				`api: the prefix ${MCP_PATH} is where the MCP endpoint answers; pick another api({ prefix }).`,
			);
		}
		return { identifier: "mcp", name: ctx.app.name };
	},
});

// A background handler's mount: docs/architecture/runtime.md, "Background handlers".
function handlerMount<TIdentifier extends string>(
	name: string,
	file: string,
	identifier: TIdentifier,
) {
	return slot.derived({
		source: SOURCE,
		name,
		inputs: { handler: routesHandler, runtimes: pluginRuntimes },
		compute: async (
			inp,
			ctx: ContributionCtx<ParsedOptions>,
		): Promise<{ identifier: TIdentifier } | null> => {
			if (!(await ctx.fileExists(file))) return null;
			if (inp.handler === null && inp.runtimes.length === 0) {
				throw new Error(
					`api: ${file} runs in the worker, which has no routable file in ${ROUTES_DIR} and no plugin runtime.`,
				);
			}
			return { identifier };
		},
	});
}

const queueHandler = handlerMount("queueHandler", QUEUE_FILE, "queue");

// The cron handler's mount (`src/worker/scheduled.ts`).
const scheduledHandler = handlerMount(
	"scheduledHandler",
	SCHEDULED_FILE,
	"scheduled",
);

// Frontend-contributed CORS origins: docs/architecture/plugins/api.md, "The production list".
const corsOrigins = slot.list<string>({
	source: SOURCE,
	name: "corsOrigins",
});

// Dev-only origins: docs/architecture/plugins/api.md, "Local and dev origins".
const devCorsOrigins = slot.list<string>({
	source: SOURCE,
	name: "devCorsOrigins",
	sortBy: (a, b) => a.localeCompare(b),
});

// Dev origins of the deploy targets: docs/architecture/plugins/api.md, "Local and dev origins".
const devTargetOrigins = slot.list<string>({
	source: SOURCE,
	name: "devTargetOrigins",
	sortBy: (a, b) => a.localeCompare(b),
});

// The native client's deep-link scheme: docs/architecture/plugins/api.md, "Local and dev origins".
const nativeScheme = slot.value<string | null>({
	source: SOURCE,
	name: "nativeScheme",
	seed: () => null,
});

// Where local origins belong: docs/architecture/plugins/api.md, "Local and dev origins".
const localOrigins = slot.value<"dev" | "deployed">({
	source: SOURCE,
	name: "localOrigins",
	seed: () => "dev",
});

// Worker-owned URL prefixes: docs/architecture/plugins/api.md, "Worker-owned URL prefixes".
const routePrefixes = slot.list<string>({
	source: SOURCE,
	name: "routePrefixes",
	sortBy: (a, b) => a.localeCompare(b),
});

// The oRPC endpoint's prefix (`api({ prefix })`, `/rpc` by default): the one
// of `routePrefixes` a client's procedure calls go to.
const rpcPrefix = slot.value<string, ParsedOptions>({
	source: SOURCE,
	name: "rpcPrefix",
	seed: (ctx) => ctx.options.prefix,
});

// The final CORS list: docs/architecture/plugins/api.md, "The production list".
const cors = slot.derived({
	source: SOURCE,
	name: "cors",
	inputs: { extras: corsOrigins, local: localOrigins },
	compute: (inp, ctx): string[] => {
		// Local origins in an explicit list move to `devCorsOrigins`: docs/architecture/plugins/api.md, "Local and dev origins".
		const result =
			ctx.app.origins !== undefined
				? ctx.app.origins.filter(
						(origin) => inp.local === "deployed" || !isLocalOrigin(origin),
					)
				: [
						`https://${ctx.app.domain}`,
						`https://app.${ctx.app.domain}`,
						...inp.extras,
					];
		const hasWildcard = result.includes("*");
		const hasSpecific = result.some((o) => o !== "*");
		if (hasWildcard && hasSpecific) {
			throw new Error(
				`api.cors: "*" mixed with specific origins (${result
					.filter((o) => o !== "*")
					.join(
						", ",
					)}); wildcard semantics are undefined when combined with explicit origins.`,
			);
		}
		return result;
	},
});

// Callback files for a peer plugin's runtime: docs/architecture/plugins/api.md, "Callbacks".
const callbacks = slot.map<CallbackSpec>({
	source: SOURCE,
	name: "callbacks",
});

// Env vars the worker reads: docs/architecture/plugins/api.md, "Env vars".
const env = slot.list<EnvSpec>({
	source: SOURCE,
	name: "env",
	uniqueBy: (e) => e.name,
});

// The worker's `env` type: docs/architecture/plugins/api.md, "Runtime".
const envType = slot.value<TsTypeRef | null>({
	source: SOURCE,
	name: "envType",
	override: true,
	seed: () => null,
});

// The root builder call. Derived from cors + options so worker options
// (prefix / cors) are baked in purely from dataflow.
const workerBase = slot.derived({
	source: SOURCE,
	name: "workerBase",
	inputs: {
		cors,
		devCors: devCorsOrigins,
		devTargets: devTargetOrigins,
		env,
		envType,
	},
	compute: (inp, ctx: ContributionCtx<ParsedOptions>): TsExpression => {
		const properties: Array<{ key: string; value: TsExpression }> = [
			{
				key: "prefix",
				value: { kind: "string", value: ctx.options.prefix },
			},
		];
		// `cors` is always emitted, an empty list included: docs/architecture/plugins/api.md, "The production list".
		properties.push({
			key: "cors",
			value: {
				kind: "array",
				items: inp.cors.map((o) => ({ kind: "string", value: o })),
			},
		});
		// `devCors` is omitted when empty: docs/architecture/plugins/api.md, "Local and dev origins".
		const devCors = [...inp.devCors, ...inp.devTargets];
		if (devCors.length > 0) {
			properties.push({
				key: "devCors",
				value: {
					kind: "array",
					items: devCors.map((o) => ({ kind: "string", value: o })),
				},
			});
		}
		// Env value assertions: docs/architecture/plugins/api.md, "Env vars".
		if (inp.env.length > 0) {
			properties.push({
				key: "envChecks",
				value: {
					kind: "array",
					items: inp.env.map((s) => {
						const props: Array<{ key: string; value: TsExpression }> = [
							{ key: "name", value: { kind: "string", value: s.name } },
						];
						if (s.validate?.minLength !== undefined) {
							props.push({
								key: "minLength",
								value: { kind: "number", value: s.validate.minLength },
							});
						}
						if (s.validate?.url) {
							props.push({
								key: "url",
								value: { kind: "boolean", value: true },
							});
						}
						if (s.validate?.devLocalhost) {
							props.push({
								key: "devLocalhost",
								value: { kind: "boolean", value: true },
							});
						}
						return { kind: "object" as const, properties: props };
					}),
				},
			});
		}
		return {
			kind: "call",
			callee: { kind: "identifier", name: "createWorker" },
			args: [{ kind: "object", properties }],
			...(inp.envType ? { typeArgs: [inp.envType] } : {}),
		};
	},
});

// RBAC statements for `rbac` and `can`: docs/architecture/slot-catalog.md, "`api.slots.*` (the `api` plugin)".
const rbacStatements = slot.value<Record<string, readonly string[]> | null>({
	source: SOURCE,
	name: "rbacStatements",
	override: true,
	seed: () => null,
});

// The entity vocabulary: docs/architecture/plugins/api.md, "Entities".
const entities = slot.list<string>({
	source: SOURCE,
	name: "entities",
	sortBy: (a, b) => a.localeCompare(b),
	uniqueBy: (e) => e,
});

// The routes barrel is null with nothing to barrel: docs/architecture/plugins/api.md, "Routes barrel".
const routeBarrelSource = slot.derived({
	source: SOURCE,
	name: "routeBarrelSource",
	compute: (_inp, ctx): string | null => {
		if (!hasRoutableFiles(ctx.cwd)) return null;
		return generateRouteBarrel(ctx.cwd);
	},
});

// The `.slotform/worker.ts` source: docs/architecture/plugins/api.md, "Generated files".
const workerSource = slot.derived({
	source: SOURCE,
	name: "workerSource",
	inputs: {
		imports: workerImports,
		base: workerBase,
		runtimes: pluginRuntimes,
		middlewareCalls,
		middlewareImports,
		handler: routesHandler,
		mcp: mcpMount,
		queue: queueHandler,
		scheduled: scheduledHandler,
		callbacks,
	},
	compute: (inp): string | null => {
		// No runtimes AND no routes — nothing would actually run. Return null
		// so the file-emission contribution skips writing a hollow worker.
		// Routes alone are a real worker (a routes-only consumer with no
		// db/auth still serves its procedures).
		if (inp.runtimes.length === 0 && inp.handler === null) return null;

		const payload: WorkerPayload = {
			imports: [...inp.imports, ...inp.middlewareImports],
			base: inp.base,
			pluginRuntimes: inp.runtimes,
			middlewareChain: inp.middlewareCalls,
			handler: inp.handler,
			mcp: inp.mcp,
			queue: inp.queue,
			scheduled: inp.scheduled,
			callbacks: inp.callbacks,
		};
		return aggregateWorker(payload);
	},
});

// The `.slotform/procedure.ts` source and its gate: docs/architecture/runtime.md, "`virtual:slotform-procedure`".
// The chain it rebuilds: docs/architecture/runtime.md, "The rebuilt chain".
const procedureSource = slot.derived({
	source: SOURCE,
	name: "procedureSource",
	inputs: {
		base: workerBase,
		runtimes: pluginRuntimes,
		imports: workerImports,
		middlewareCalls,
		middlewareImports,
		statements: rbacStatements,
		entities,
		handler: routesHandler,
	},
	compute: (inp): string | null => {
		if (inp.runtimes.length === 0 && inp.handler === null) return null;
		const procedureImports = (imports: TsImportSpec[]) =>
			imports.filter((imp) => !WORKER_ONLY_IMPORTS.has(imp.source));
		return aggregateProcedure({
			base: inp.base,
			runtimes: inp.runtimes,
			imports: procedureImports(inp.imports),
			middlewareChain: inp.middlewareCalls,
			middlewareImports: procedureImports(inp.middlewareImports),
			statements: inp.statements,
			entities: inp.entities,
		});
	},
});

export const api = plugin("api", {
	label: "API",

	schema: apiOptionsSchema,
	// A worker runs on exactly one server target, cloudflare by default; a client of another app's server (`server`) runs none.
	requires: (options) =>
		options.server === undefined ? [{ oneOf: ["cloudflare", "node"] }] : [],

	guide: [
		{
			page: "add-a-procedure",
			trigger: "Adding an endpoint the app calls",
		},
		{
			page: "procedures",
			trigger:
				"Writing or changing a procedure: its `procedure()` options, input, output, middleware or errors",
		},
		{
			page: "middleware",
			trigger:
				"Guarding every request, or adding a raw route outside the RPC tree (an upload, a webhook)",
		},
		{
			page: "mcp",
			trigger:
				"Letting an MCP client call procedures: `src/worker/mcp.ts`, or `defineMcp`",
		},
		{
			page: "background",
			trigger: "Running work outside a request: a queue message or a cron",
		},
		{
			page: "client",
			trigger:
				"Calling the API from the app: the typed client, queries, drawing a not-found state or cache invalidation",
		},
		{
			page: "config",
			trigger:
				"Changing `api()`'s options, or adding an env var the worker code reads",
		},
		{
			page: "utilities",
			trigger:
				"Paginating a list procedure (cursor or window), sorting it, acting on a selection of its query, or turning a name into a slug",
		},
	],

	slots: {
		workerImports,
		pluginRuntimes,
		middlewareEntries,
		middlewareCalls,
		middlewareImports,
		routesHandler,
		mcpAuth,
		serverAuth,
		serverSchemaSource,
		serverTypesSource,
		mcpMount,
		queueHandler,
		scheduledHandler,
		corsOrigins,
		devCorsOrigins,
		devTargetOrigins,
		nativeScheme,
		routePrefixes,
		rpcPrefix,
		cors,
		callbacks,
		env,
		envType,
		workerBase,
		workerSource,
		routeBarrelSource,
		rbacStatements,
		localOrigins,
		entities,
		procedureSource,
	},

	contributes: (self) => [
		// The oRPC prefix is a worker-owned URL space; deploy targets read
		// routePrefixes to mount or forward it.
		self.slots.routePrefixes.contribute(() => self.options.prefix),
		// `/mcp` is the endpoint's own, when it is served.
		self.slots.routePrefixes.contribute(async (ctx) =>
			(await ctx.resolve(self.slots.mcpMount)) ? MCP_PATH : undefined,
		),
		self.slots.env.contribute(() => self.options.env),
		self.slots.entities.contribute(() => self.options.entities),
		// Local origins the consumer listed in `app.origins`: docs/architecture/plugins/api.md, "Local and dev origins".
		self.slots.devCorsOrigins.contribute(async (ctx) =>
			(await ctx.resolve(self.slots.localOrigins)) === "dev"
				? ctx.app.origins?.filter(isLocalOrigin)
				: undefined,
		),
		// Always import `createWorker` — the base call uses it verbatim.
		self.slots.workerImports.contribute(
			(): TsImportSpec => ({
				source: "@slotform/api/runtime",
				default: "createWorker",
			}),
		),

		// The routes import follows `routesHandler`, so the import and the
		// `.handler(routes)` call never disagree.
		self.slots.workerImports.contribute(async (ctx) => {
			const handler = await ctx.resolve(self.slots.routesHandler);
			if (!handler) return undefined;
			return {
				source: ROUTES_BARREL_IMPORT_SOURCE,
				namespace: handler.identifier,
			};
		}),

		// The consumer's MCP definition: its default export, passed to `.handler`.
		self.slots.workerImports.contribute(
			async (ctx): Promise<TsImportSpec | undefined> => {
				const mount = await ctx.resolve(self.slots.mcpMount);
				if (!mount) return undefined;
				return { source: importSource(MCP_FILE), default: mount.identifier };
			},
		),

		// The consumer's background handlers: each default export, passed to
		// `.handler`.
		self.slots.workerImports.contribute(
			async (ctx): Promise<TsImportSpec | undefined> => {
				const mount = await ctx.resolve(self.slots.queueHandler);
				if (!mount) return undefined;
				return { source: importSource(QUEUE_FILE), default: mount.identifier };
			},
		),
		self.slots.workerImports.contribute(
			async (ctx): Promise<TsImportSpec | undefined> => {
				const mount = await ctx.resolve(self.slots.scheduledHandler);
				if (!mount) return undefined;
				return {
					source: importSource(SCHEDULED_FILE),
					default: mount.identifier,
				};
			},
		),

		// Consumer middleware convention files: docs/architecture/runtime.md, "Middleware".
		self.slots.middlewareEntries.contribute(async (ctx) => {
			if (!(await ctx.fileExists(MIDDLEWARE_FILE))) return undefined;
			return {
				imports: [
					{ source: importSource(MIDDLEWARE_FILE), default: "middleware" },
				],
				call: { kind: "identifier", name: "middleware" },
				phase: "before-routes",
				order: 100,
			} as MiddlewareSpec;
		}),

		// `middleware.context.ts` runs after context injection: docs/architecture/runtime.md, "Middleware".
		self.slots.middlewareEntries.contribute(async (ctx) => {
			if (!(await ctx.fileExists(CONTEXT_MIDDLEWARE_FILE))) return undefined;
			return {
				imports: [
					{
						source: importSource(CONTEXT_MIDDLEWARE_FILE),
						default: "contextMiddleware",
					},
				],
				call: { kind: "identifier", name: "contextMiddleware" },
				phase: "after-context",
				order: 100,
			} as MiddlewareSpec;
		}),

		// The `virtual:slotform-procedure` alias: docs/architecture/runtime.md, "`virtual:slotform-procedure`".
		cliSlots.tsconfigPaths.contribute(() => ({
			"virtual:slotform-procedure": [`./${PROCEDURE_FILE}`],
		})),

		// Both are null, and so not written, with no runtime and no route.
		emitArtifact(WORKER_FILE, self.slots.workerSource),
		emitArtifact(PROCEDURE_FILE, self.slots.procedureSource),

		// `.slotform/schema.ts` and `.slotform/server.json`: docs/architecture/plugins/api.md, "Schema".
		cliSlots.postWrite.contribute(async (ctx) => {
			const auth = await ctx.resolve(self.slots.serverAuth);
			return async () => {
				const source = await schemaSource(ctx.cwd, ctx.env);
				if (source === null) return;
				await writeArtifact(join(ctx.cwd, SERVER_SCHEMA), source);
				await writeArtifact(
					join(ctx.cwd, SERVER_MANIFEST),
					`${JSON.stringify({ auth })}\n`,
				);
			};
		}),

		// A client app's copies of the server's schema and router type.
		emitArtifact(SERVER_SCHEMA, self.slots.serverSchemaSource),
		emitArtifact(SERVER_TYPES, self.slots.serverTypesSource),
		cliSlots.devWatchers.contribute((ctx) => {
			const { server } = self.options;
			if (server === undefined) return undefined;
			return {
				name: "server-schema",
				paths: posix.join(posix.normalize(server), SERVER_SCHEMA),
				debounce: 300,
				async handler() {
					await writeArtifact(
						join(ctx.cwd, SERVER_SCHEMA),
						await readServerFile(ctx, server, SERVER_SCHEMA),
					);
					ctx.log.info("Server schema copied");
				},
			};
		}),

		// The route barrel: docs/architecture/plugins/api.md, "Routes barrel".
		emitArtifact(ROUTES_BARREL, self.slots.routeBarrelSource),

		// In dev the barrel follows the directory, an emptied one included: the
		// running worker imports it until the next generate.
		cliSlots.devWatchers.contribute((ctx) => ({
			name: "routes",
			paths: `${ROUTES_DIR}/**`,
			ignore: ["**/index.ts"],
			debounce: 300,
			async handler(_path, type) {
				if (type !== "add" && type !== "unlink") return;
				await writeArtifact(
					join(ctx.cwd, ROUTES_BARREL),
					generateRouteBarrel(ctx.cwd),
				);
				ctx.log.info("Route barrel regenerated");
			},
		})),

		// Remove: clean the routes directory on `slotform remove api`.
		cliSlots.removeFiles.contribute(() => `${ROUTES_DIR}/`),
	],
});

export { ApiError } from "./error.ts";
export type { CallbackSpec, PluginRuntimeEntry } from "./node/types.ts";
export type { Middleware } from "./procedure.ts";
