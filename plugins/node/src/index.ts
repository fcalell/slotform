import { rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import type { ContributionCtx, Slot } from "@fcalell/cli";
import { plugin, slot } from "@fcalell/cli";
import { cliSlots, emitArtifact } from "@fcalell/cli/cli-slots";
import { api } from "@fcalell/plugin-api";
import { isLocalOrigin } from "@fcalell/plugin-api/local-origin";
import { screens } from "@fcalell/plugin-screens";
import { startServer } from "@fcalell/plugin-screens/node";
import { FIXTURE_PREFIX } from "@fcalell/plugin-screens/serve";
import { vite } from "@fcalell/plugin-vite";
import { generateServiceBarrel, hasServiceFiles } from "./node/barrel.ts";
import { bundleServer } from "./node/bundle.ts";
import { aggregateServer } from "./node/codegen.ts";
import { READY_LINE } from "./server/log.ts";
import {
	type BundleEntry,
	type CodegenServerPayload,
	type NodeListenerOptions,
	type NodeOptions,
	type NodeOptionsResolved,
	nodeOptionsSchema,
	type ServiceEntry,
} from "./types.ts";

const SOURCE = "node";

const serverPort = slot.value<number, NodeOptions>({
	source: SOURCE,
	name: "serverPort",
	seed: (ctx) => ctx.options.port ?? 8788,
});

// The address the server binds; null binds every interface.
const serverHost = slot.value<string | null, NodeOptions>({
	source: SOURCE,
	name: "serverHost",
	seed: (ctx) => ctx.options.host ?? null,
});

// The further listeners, by name: each a port the server answers on for the
// one origin its `originVar` names at run time.
const serverListeners = slot.value<
	Record<string, NodeListenerOptions>,
	NodeOptionsResolved
>({
	source: SOURCE,
	name: "serverListeners",
	seed: (ctx) => ctx.options.listeners,
});

// Codegen entries for the generated server's `services` array. The consumer
// barrel lands here as one entry; other plugins can contribute their own
// background services the same way.
const services = slot.list<ServiceEntry>({
	source: SOURCE,
	name: "services",
	sortBy: (a, b) => a.name.localeCompare(b.name),
	uniqueBy: (e) => e.name,
});

// consumerServices seeds both the barrel emission and the barrel import: docs/architecture/plugins/node.md, "Services".
const consumerServices = slot.value<{ identifier: string } | null>({
	source: SOURCE,
	name: "consumerServices",
	seed: (ctx) => (hasServiceFiles(ctx.cwd) ? { identifier: "services" } : null),
});

// The rendered `src/server/services/index.ts` barrel; null skips emission.
const serviceBarrelSource = slot.derived({
	source: SOURCE,
	name: "serviceBarrelSource",
	inputs: { consumer: consumerServices },
	compute: (inp, ctx): string | null =>
		inp.consumer === null ? null : generateServiceBarrel(ctx.cwd),
});

// The transport bounds the server enforces, from the config.
const serverBounds = slot.value<
	{ body: number; frame: number },
	NodeOptionsResolved
>({
	source: SOURCE,
	name: "serverBounds",
	seed: (ctx) => ctx.options.bounds,
});

// What other plugins add to the production bundle: a boot task and files to
// copy beside it (db's migrations).
const bundleEntries = slot.list<BundleEntry>({
	source: SOURCE,
	name: "bundleEntries",
	sortBy: (a, b) => a.name.localeCompare(b.name),
	uniqueBy: (e) => e.name,
});

// The inputs both entries render from: the source entry the dev process runs
// and the bundle's, which differ in how they reach the worker and the services.
const serverInputs = {
	port: serverPort,
	host: serverHost,
	listeners: serverListeners,
	bounds: serverBounds,
	entries: services,
	consumer: consumerServices,
	worker: api.slots.workerSource,
	prefixes: api.slots.routePrefixes,
	origins: api.slots.cors,
	staticRoot: vite.slots.outDir,
	clientHeaders: vite.slots.clientHeaders,
};

// What both entries render; null when there is nothing to serve or run: no
// worker (api emitted none) and no services.
function serverPayload(
	inp: {
		[K in keyof typeof serverInputs]: (typeof serverInputs)[K] extends Slot<
			infer T
		>
			? T
			: never;
	},
): CodegenServerPayload | null {
	const hasWorker = inp.worker !== null;
	const hasConsumerServices = inp.consumer !== null;
	if (!hasWorker && !hasConsumerServices && inp.entries.length === 0) {
		return null;
	}
	return {
		port: inp.port,
		host: inp.host,
		origins: inp.origins,
		listeners: inp.listeners,
		bounds: inp.bounds,
		hasWorker,
		workerPaths: inp.prefixes,
		staticRoot: inp.staticRoot,
		clientHeaders: inp.clientHeaders,
		hasConsumerServices,
		services: inp.entries,
	};
}

// The production bundle entry, null where serverSource is: docs/architecture/plugins/node.md, "Build and bundle".
const serverBundleSource = slot.derived({
	source: SOURCE,
	name: "serverBundleSource",
	inputs: { ...serverInputs, bundle: bundleEntries },
	compute: (inp): string | null => {
		const payload = serverPayload(inp);
		if (payload === null) return null;
		return aggregateServer({
			...payload,
			bundle: {
				imports: inp.bundle.flatMap((entry) => entry.imports ?? []),
				boot: inp.bundle.flatMap((entry) => (entry.boot ? [entry.boot] : [])),
			},
		});
	},
});

const serverSource = slot.derived({
	source: SOURCE,
	name: "serverSource",
	inputs: {
		...serverInputs,
		queue: api.slots.queueHandler,
		scheduled: api.slots.scheduledHandler,
	},
	compute: async (inp): Promise<string | null> => {
		// The Cloudflare runtime calls these two handlers; this server never would.
		for (const mount of [inp.queue, inp.scheduled]) {
			if (mount !== null) {
				const file = `src/worker/${mount.identifier}.ts`;
				throw new Error(
					`node: ${file} runs on the Cloudflare target; on node, use a service in src/server/services.`,
				);
			}
		}
		const payload = serverPayload(inp);
		return payload === null ? null : aggregateServer(payload);
	},
});

// A dev run's env: STACK_DEV, and the dev default of each declared var the
// shell leaves unset.
function devEnv(
	declared: ReadonlyArray<{ name: string; devDefault: string }>,
): Record<string, string> {
	const env: Record<string, string> = { STACK_DEV: "1" };
	for (const spec of declared) {
		if (process.env[spec.name] === undefined) env[spec.name] = spec.devDefault;
	}
	return env;
}

export const node = plugin("node", {
	label: "Node server",

	schema: nodeOptionsSchema,

	requires: ["api"],

	// The production bundler (`stack build`'s node-bundle step): an optional peer
	// of the plugin, so an install that only runs the app holds none of it.
	devDependencies: {
		esbuild: "^0.28.2",
	},

	guide: [
		{
			page: "server",
			trigger:
				"Running the app as a Node server: `node()` options, a further listener and the Host rule, sqlite, env vars, dev or production",
		},
		{
			page: "services",
			trigger:
				"Adding a background service, a WebSocket channel or a raw HTTP mount to the Node server",
		},
		{
			page: "live",
			trigger:
				"Drawing a WebSocket channel's data on a screen: a channel read held by a frame",
		},
	],

	slots: {
		serverPort,
		serverHost,
		serverListeners,
		serverBounds,
		services,
		consumerServices,
		bundleEntries,
		serviceBarrelSource,
		serverSource,
		serverBundleSource,
	},

	contributes: (self) => [
		emitArtifact(".stack/server.ts", self.slots.serverSource),
		emitArtifact(
			"src/server/services/index.ts",
			self.slots.serviceBarrelSource,
		),

		// The production bundle step: docs/architecture/plugins/node.md, "Build and bundle".
		cliSlots.buildSteps.contribute(async (ctx) => {
			const source = await ctx.resolve(self.slots.serverBundleSource);
			if (source === null) return undefined;
			const staticRoot = await ctx.resolve(vite.slots.outDir);
			const entries = await ctx.resolve(self.slots.bundleEntries);
			return {
				name: "node-bundle",
				phase: "post" as const,
				async run() {
					const entry = join(ctx.cwd, ".stack/server.bundle.ts");
					writeFileSync(entry, source);
					const outDir = join(
						ctx.cwd,
						staticRoot === null ? "dist" : dirname(staticRoot),
						"server",
					);
					const { native, bins } = await bundleServer({
						cwd: ctx.cwd,
						entry,
						outDir,
						entries,
					});
					const kept = Object.keys(native);
					ctx.log.success(
						`Bundled the server into ${outDir.slice(ctx.cwd.length + 1)}/server.mjs` +
							(kept.length > 0 ? ` (native: ${kept.join(", ")})` : "") +
							(bins.length > 0 ? `, tools: ${bins.join(", ")}` : ""),
					);
				},
			};
		}),

		// The screens serve target: docs/architecture/plugins/node.md, "Screens serve".
		screens.slots.serveTargets.contribute(async (ctx) => {
			if ((await ctx.resolve(api.slots.workerSource)) === null)
				return undefined;
			const entries = await ctx.resolve(self.slots.services);
			const consumer = await ctx.resolve(self.slots.consumerServices);
			const prefixes = await ctx.resolve(api.slots.routePrefixes);
			const bounds = await ctx.resolve(self.slots.serverBounds);
			const headers = await ctx.resolve(vite.slots.clientHeaders);
			const declared = await ctx.resolve(api.slots.env);
			return {
				name: "node",
				async start(serve) {
					const id = basename(serve.dir);
					const worker = `serve-${id}.worker.ts`;
					const server = `serve-${id}.server.ts`;
					const workerPath = join(ctx.cwd, ".stack", worker);
					const serverPath = join(ctx.cwd, ".stack", server);
					writeFileSync(
						workerPath,
						[
							'import { fixtureControls } from "@fcalell/plugin-screens/serve";',
							...serve.controls.map(
								(spec, i) => `import c${i} from ${JSON.stringify(spec)};`,
							),
							'import worker from "./worker.ts";',
							`export default fixtureControls(worker${serve.controls.map((_, i) => `, c${i}`).join("")});`,
							"",
						].join("\n"),
					);
					writeFileSync(
						serverPath,
						aggregateServer({
							port: serve.port,
							host: "127.0.0.1",
							origins: [serve.url],
							listeners: {},
							bounds,
							hasWorker: true,
							workerPaths: [...prefixes, FIXTURE_PREFIX],
							staticRoot:
								serve.client === null ? null : relative(ctx.cwd, serve.client),
							clientHeaders: headers,
							hasConsumerServices: consumer !== null,
							services: [
								...entries,
								{
									name: "fixture-sockets",
									imports: [
										{
											source: "@fcalell/plugin-node/serve",
											named: ["fixtureSockets"],
										},
									],
									expression: { kind: "identifier", name: "fixtureSockets" },
								},
							],
							workerFile: `./${worker}`,
						}),
					);
					const stop = await startServer(
						serve,
						"node",
						process.execPath,
						[join(".stack", server)],
						devEnv(declared),
					);
					return async () => {
						await stop();
						for (const file of [workerPath, serverPath]) {
							rmSync(file, { force: true });
						}
					};
				},
			};
		}),

		// The dev process: docs/architecture/plugins/node.md, "Dev".
		cliSlots.devProcesses.contribute(async (ctx) => {
			if ((await ctx.resolve(self.slots.serverSource)) === null) {
				return undefined;
			}
			const port = await ctx.resolve(self.slots.serverPort);
			const env = devEnv(await ctx.resolve(api.slots.env));
			return {
				name: "node",
				command: "node",
				args: ["--watch", ".stack/server.ts"],
				defaultPort: port,
				readyPattern: new RegExp(READY_LINE),
				env,
			};
		}),

		// A server bound to loopback is a local deployment: the local origins
		// in `app.origins` are its deployed allow-list, not dev origins.
		api.slots.localOrigins.contribute(async (ctx) => {
			const host = await ctx.resolve(self.slots.serverHost);
			return host !== null && isLocalOrigin(`http://${host}`)
				? "deployed"
				: undefined;
		}),

		// The server's own origin is a dev origin: docs/architecture/plugins/api.md, "Local and dev origins".
		api.slots.devTargetOrigins.contribute(async (ctx) => {
			if (ctx.app.origins !== undefined) return undefined;
			const port = await ctx.resolve(self.slots.serverPort);
			return `http://localhost:${port}`;
		}),

		// Same-origin dev proxy, inert without vite: docs/architecture/plugins/vite.md, "Dev server proxy, file access and watching".
		vite.slots.serverProxy.contribute(async (ctx) => {
			const port = await ctx.resolve(self.slots.serverPort);
			const prefixes = await ctx.resolve(api.slots.routePrefixes);
			const target = `http://localhost:${port}`;
			return [
				...prefixes.map((path) => ({ path, target })),
				{ path: "/ws", target, ws: true },
			];
		}),

		// The workbench answers the app's /ws, a no-op without screens: docs/architecture/plugins/node.md, "Screens serve".
		screens.slots.handlerModules.contribute(
			() => "@fcalell/plugin-node/screens",
		),

		cliSlots.devWatchers.contribute((ctx: ContributionCtx) => ({
			name: "services",
			paths: "src/server/services/**",
			ignore: ["**/index.ts"],
			debounce: 300,
			async handler(_path: string, type: "add" | "unlink" | "change") {
				if (type === "add" || type === "unlink") {
					const barrelContent = generateServiceBarrel(ctx.cwd);
					writeFileSync(
						join(ctx.cwd, "src/server/services/index.ts"),
						barrelContent,
					);
					ctx.log.info("Service barrel regenerated");
				}
			},
		})),

		cliSlots.removeFiles.contribute(() => "src/server/"),
	],
});

export type {
	NodeListenerOptions,
	NodeOptions,
	ServiceEntry,
} from "./types.ts";
