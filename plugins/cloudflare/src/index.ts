import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { type ContributionCtx, plugin, type Slot, slot } from "@fcalell/cli";
import type { TsTypeRef } from "@fcalell/cli/ast";
import { cliSlots, emitArtifact } from "@fcalell/cli/cli-slots";
import { api } from "@fcalell/plugin-api";
import { screens } from "@fcalell/plugin-screens";
import { startServer } from "@fcalell/plugin-screens/node";
import { vite } from "@fcalell/plugin-vite";
import {
	aggregateDevVars,
	aggregateWrangler,
	escapeDevVarValue,
	sanitizeWranglerName,
} from "./node/codegen.ts";
import { assertEnvName, declaresDevVar } from "./node/dev-vars.ts";
import {
	cloudflareOptionsSchema,
	type ServeConfig,
	type WranglerBindingSpec,
} from "./types.ts";

const SOURCE = "cloudflare";

// The pinned default compatibility date: docs/architecture/plugins/cloudflare.md, "Compatibility date".
const DEFAULT_COMPATIBILITY_DATE = "2025-01-01";

// `wrangler dev`'s listen port, passed explicitly so the dev process and the
// worker's dev origin agree.
const WRANGLER_DEV_PORT = 8787;
const DEV_ORIGIN = `http://localhost:${WRANGLER_DEV_PORT}`;

const WRANGLER_CONFIG = ".stack/wrangler.toml";
const WORKER_TYPES = ".stack/worker-configuration.d.ts";

// Miniflare's state dir, shared with plugin-db: docs/architecture/plugins/cloudflare.md, "Local state".
export const LOCAL_PERSIST = ".wrangler/state";

// ── Slot declarations ──────────────────────────────────────────────
//
// Bindings compose into wranglerToml: docs/architecture/plugins/cloudflare.md, "Slots and contributions".

const bindings = slot.list<WranglerBindingSpec>({
	source: SOURCE,
	name: "bindings",
});

const compatibilityFlags = slot.list<string>({
	source: SOURCE,
	name: "compatibilityFlags",
});

// Seeded from the pinned constant, never the wall clock: docs/architecture/plugins/cloudflare.md, "Compatibility date".
const compatibilityDate = slot.value<string>({
	source: SOURCE,
	name: "compatibilityDate",
	seed: () => DEFAULT_COMPATIBILITY_DATE,
});

// The final wrangler.toml source, a pure derivation: docs/architecture/plugins/cloudflare.md, "Slots and contributions".
const wranglerInputs = {
	bindings,
	env: api.slots.env,
	compatibilityDate,
	compatibilityFlags,
	clientDir: vite.slots.outDir,
	routePrefixes: api.slots.routePrefixes,
	queueHandler: api.slots.queueHandler,
	scheduledHandler: api.slots.scheduledHandler,
};

type WranglerInputs = {
	[K in keyof typeof wranglerInputs]: (typeof wranglerInputs)[K] extends Slot<
		infer T
	>
		? T
		: never;
};

// The consumer's root `wrangler.toml`, or null without one.
async function consumerWrangler(ctx: ContributionCtx): Promise<string | null> {
	return (await ctx.fileExists("wrangler.toml"))
		? ctx.readFile("wrangler.toml")
		: null;
}

function renderWrangler(
	inp: WranglerInputs,
	ctx: ContributionCtx,
	consumer: string | null,
	serve: ServeConfig | undefined,
): string {
	return aggregateWrangler({
		consumerWrangler: consumer,
		payload: {
			bindings: inp.bindings,
			secrets: inp.env,
			compatibilityDate: inp.compatibilityDate,
			compatibilityFlags: inp.compatibilityFlags,
			clientDir: inp.clientDir,
			routePrefixes: inp.routePrefixes,
			queueHandler: inp.queueHandler !== null,
			scheduledHandler: inp.scheduledHandler !== null,
			serve,
		},
		name: ctx.app.name,
		log: ctx.log,
	});
}

const wranglerToml = slot.derived({
	source: SOURCE,
	name: "wranglerToml",
	inputs: wranglerInputs,
	compute: async (inp, ctx) =>
		renderWrangler(inp, ctx, await consumerWrangler(ctx), undefined),
});

// The config of a `stack screens serve` run: the same toml with the run's own
// entry and client build, as a function of them.
const serveWranglerToml = slot.derived({
	source: SOURCE,
	name: "serveWranglerToml",
	inputs: wranglerInputs,
	compute: async (inp, ctx) => {
		const consumer = await consumerWrangler(ctx);
		return (serve: ServeConfig) => renderWrangler(inp, ctx, consumer, serve);
	},
});

// The --config and --tsconfig every bundling command reads: docs/architecture/plugins/cloudflare.md, "Wrangler invocation".
async function wranglerConfigArgs(ctx: ContributionCtx): Promise<string[]> {
	const tsconfig = await ctx.resolve(cliSlots.workerTsconfig);
	return ["--config", WRANGLER_CONFIG, "--tsconfig", join(ctx.cwd, tsconfig)];
}

const STACK_DEV_LINE =
	"# STACK_DEV marks local dev; never set in production.\nSTACK_DEV=1\n";

// The dev values, and whether the root `.dev.vars` is written: docs/architecture/plugins/cloudflare.md, ".dev.vars".
async function devVars(
	ctx: ContributionCtx,
): Promise<{ content: string; write: boolean }> {
	const env = await ctx.resolve(api.slots.env);
	for (const e of env) assertEnvName(e.name);
	if (!(await ctx.fileExists(".dev.vars"))) {
		return {
			content: `${STACK_DEV_LINE}${aggregateDevVars(env) ?? ""}`,
			write: true,
		};
	}
	const existing = await ctx.readFile(".dev.vars");
	const declared = (name: string) => declaresDevVar(existing, name);
	const missing = `${declared("STACK_DEV") ? "" : STACK_DEV_LINE}${
		aggregateDevVars(env.filter((e) => !declared(e.name))) ?? ""
	}`;
	if (!missing) return { content: existing, write: false };
	const separator = existing === "" || existing.endsWith("\n") ? "" : "\n";
	return { content: `${existing}${separator}${missing}`, write: true };
}

export const cloudflare = plugin("cloudflare", {
	label: "Cloudflare",

	schema: cloudflareOptionsSchema,

	devDependencies: {
		wrangler: "^4.162.0",
	},
	gitignore: [".wrangler", ".dev.vars"],

	guide: [
		{
			page: "wrangler",
			trigger:
				"Editing the root `wrangler.toml` or `.dev.vars`, adding a binding or route, or typing `Env`",
		},
		{ page: "deploy", trigger: "Deploying the app to Cloudflare" },
	],

	slots: {
		bindings,
		compatibilityDate,
		compatibilityFlags,
		wranglerToml,
		serveWranglerToml,
	},

	contributes: (self) => [
		emitArtifact(WRANGLER_CONFIG, self.slots.wranglerToml),

		// The blanket per-IP volume limiter: docs/architecture/plugins/api.md, "Rate limiting".
		self.slots.bindings.contribute(async (ctx) => {
			if ((await ctx.resolve(api.slots.routePrefixes)).length === 0) {
				return undefined;
			}
			return {
				kind: "rate_limiter" as const,
				binding: "RATE_LIMITER_RPC",
				simple: { limit: 1000, period: 60 },
			};
		}),

		// The app's one queue: docs/architecture/plugins/cloudflare.md, "wrangler.toml merge contract".
		self.slots.bindings.contribute(async (ctx) => {
			if ((await ctx.resolve(api.slots.queueHandler)) === null) {
				return undefined;
			}
			return {
				kind: "queue" as const,
				binding: "QUEUE",
				queue: sanitizeWranglerName(ctx.app.name),
				consumer: { maxBatchSize: 10, maxBatchTimeout: 5, maxRetries: 3 },
			};
		}),

		// Emit .dev.vars and mirror it into .stack/: docs/architecture/plugins/cloudflare.md, ".dev.vars".
		cliSlots.artifactFiles.contribute(async (ctx) => {
			const { content, write } = await devVars(ctx);
			return [
				...(write ? [{ path: ".dev.vars", content }] : []),
				{
					path: ".stack/.dev.vars",
					content: `# Generated mirror of ../.dev.vars — edit that file, then re-run stack generate.\n${content}`,
				},
			];
		}),

		// The global `Env` `wrangler types` declares types the worker's `env`:
		// `.stack/worker.ts` and `.stack/procedure.ts` render `createWorker<Env>(…)`.
		api.slots.envType.contribute(
			(): TsTypeRef => ({ kind: "reference", name: "Env" }),
		),

		// The worker's own dev origin: docs/architecture/plugins/api.md, "Local and dev origins".
		api.slots.devTargetOrigins.contribute((ctx) =>
			ctx.app.origins !== undefined ? undefined : DEV_ORIGIN,
		),

		// Same-origin dev proxy, inert without vite: docs/architecture/plugins/vite.md, "Dev server proxy, file access and watching".
		vite.slots.serverProxy.contribute(async (ctx) => {
			const prefixes = await ctx.resolve(api.slots.routePrefixes);
			return prefixes.map((path) => ({ path, target: DEV_ORIGIN }));
		}),

		// Ignore .stack/.wrangler so Vite never reloads on it: docs/architecture/plugins/cloudflare.md, "Dev and Vite root".
		vite.slots.watchIgnored.contribute(() => "**/.wrangler/**"),

		// The shared --config and --persist-to, outside .stack/: docs/architecture/plugins/cloudflare.md, "Local state".
		cliSlots.devProcesses.contribute(async (ctx) => ({
			name: "wrangler",
			command: "npx",
			args: [
				"wrangler",
				"dev",
				...(await wranglerConfigArgs(ctx)),
				"--port",
				String(WRANGLER_DEV_PORT),
				"--persist-to",
				LOCAL_PERSIST,
			],
			defaultPort: WRANGLER_DEV_PORT,
			readyPattern: /Ready on/,
		})),

		// The screens serve target: docs/architecture/plugins/cloudflare.md, "Screens serve".
		screens.slots.serveTargets.contribute(async (ctx) => {
			if ((await ctx.resolve(api.slots.workerSource)) === null) {
				return undefined;
			}
			const render = await ctx.resolve(self.slots.serveWranglerToml);
			// The run's entry sits outside the app, so it names the controls by path.
			const require = createRequire(join(ctx.cwd, "package.json"));
			const controls = require.resolve("@fcalell/plugin-screens/serve");
			const named = await ctx.resolve(screens.slots.serveControls);
			const extra = named.map((spec) => require.resolve(spec));
			const { content: devValues } = await devVars(ctx);
			const tsconfig = join(
				ctx.cwd,
				await ctx.resolve(cliSlots.workerTsconfig),
			);
			return {
				name: "cloudflare",
				async start(serve) {
					const main = join(serve.dir, "worker.ts");
					writeFileSync(
						main,
						[
							`import { fixtureControls } from ${JSON.stringify(controls)};`,
							...extra.map(
								(path, i) => `import c${i} from ${JSON.stringify(path)};`,
							),
							`import worker from ${JSON.stringify(join(ctx.cwd, ".stack/worker.ts"))};`,
							`export default fixtureControls(worker${extra.map((_, i) => `, c${i}`).join("")});`,
							"",
						].join("\n"),
					);
					const config = join(serve.dir, "wrangler.toml");
					writeFileSync(config, render({ main, clientDir: serve.client }));
					const overrides = Object.entries(serve.env)
						.map(([name, value]) => `${name}=${escapeDevVarValue(value)}`)
						.join("\n");
					writeFileSync(
						join(serve.dir, ".dev.vars"),
						`${devValues}\n${overrides}\n`,
					);
					return startServer(
						serve,
						"wrangler",
						"npx",
						[
							"wrangler",
							"dev",
							"--config",
							config,
							"--tsconfig",
							tsconfig,
							"--ip",
							"127.0.0.1",
							"--port",
							String(serve.port),
							"--persist-to",
							serve.state,
						],
						ctx.env,
					);
				},
			};
		}),

		cliSlots.deploySteps.contribute(async (ctx) => ({
			name: "Worker",
			phase: "main",
			exec: {
				command: "npx",
				args: ["wrangler", "deploy", ...(await wranglerConfigArgs(ctx))],
			},
		})),

		// The _headers step: docs/architecture/plugins/cloudflare.md, "Client headers".
		cliSlots.buildSteps.contribute(async (ctx) => {
			const clientDir = await ctx.resolve(vite.slots.outDir);
			const headers = await ctx.resolve(vite.slots.clientHeaders);
			const names = Object.keys(headers).sort();
			if (clientDir === null || names.length === 0) return undefined;
			return {
				name: "client-headers",
				phase: "post" as const,
				run: async () => {
					const file = join(ctx.cwd, clientDir, "_headers");
					if (existsSync(file)) {
						throw new Error(
							"public/_headers is refused: stack writes the web client's _headers from vite.slots.clientHeaders, and Cloudflare joins a header two rules set. Remove public/_headers.",
						);
					}
					const rules = names.map((n) => `  ${n}: ${headers[n]}`).join("\n");
					writeFileSync(file, `/*\n${rules}\n`);
				},
			};
		}),

		// wrangler refuses to start when `assets.directory` is missing, which it
		// is until the first `stack build`; an empty one serves nothing and
		// lets `wrangler dev` run on a fresh clone.
		cliSlots.postWrite.contribute((ctx) => async () => {
			const clientDir = await ctx.resolve(vite.slots.outDir);
			if (clientDir !== null) {
				mkdirSync(join(ctx.cwd, clientDir), { recursive: true });
			}
		}),

		// wrangler types after the toml is written, non-fatal: docs/architecture/plugins/cloudflare.md, "Wrangler invocation".
		cliSlots.postWrite.contribute((ctx) => async () => {
			// A failed removal (a locked file) is a warning of its own, so it
			// never masks the wrangler error being reported.
			const removeStaleDts = () => {
				try {
					rmSync(join(ctx.cwd, WORKER_TYPES), { force: true });
				} catch (err) {
					const detail = err instanceof Error ? err.message : String(err);
					ctx.log.warn(`${WORKER_TYPES} could not be removed: ${detail}`);
				}
			};

			const result = spawnSync(
				"npx",
				["wrangler", "types", WORKER_TYPES, "-c", WRANGLER_CONFIG],
				{ cwd: ctx.cwd, stdio: "pipe", env: ctx.env },
			);
			if (result.error) {
				removeStaleDts();
				const err = result.error;
				const hint =
					"code" in err && err.code === "ENOENT"
						? "npx not found on PATH; install Node.js or wrangler and re-run `stack generate`."
						: err.message;
				ctx.log.warn(
					`wrangler types could not run (Env typings removed to surface the failure): ${hint}`,
				);
				return;
			}
			if (result.status !== 0) {
				removeStaleDts();
				const stderr = result.stderr?.toString().trim() ?? "";
				ctx.log.warn(
					`wrangler types failed (Env typings removed to surface the failure)${stderr ? `: ${stderr}` : ""}. ` +
						`Run \`pnpm exec wrangler types ${WORKER_TYPES} -c ${WRANGLER_CONFIG}\` manually to see the full error.`,
				);
			}
		}),
	],
});

export type { WranglerBindingSpec } from "./types.ts";
