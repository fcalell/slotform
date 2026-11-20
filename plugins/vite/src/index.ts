import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { api } from "@slotform/api";
import { GENERATED_DIR, plugin, slot } from "@slotform/cli";
import type { TsExpression, TsImportSpec } from "@slotform/cli/ast";
import { cliSlots, emitArtifact } from "@slotform/cli/cli-slots";
import { SlotformError } from "@slotform/cli/errors";
import { z } from "zod";
import { renderViteConfig } from "./node/codegen.ts";
import { headerKey, mergeClientHeader } from "./node/csp.ts";
import {
	type AppPlugin,
	type ServerProxyEntry,
	type ViteOptions,
	viteOptionsSchema,
} from "./types.ts";

const SOURCE = "vite";

const viteManifestSchema = z.object({ bin: z.object({ vite: z.string() }) });

// The consumer's own vite: docs/architecture/plugins/vite.md, "How it works".
function viteBin(cwd: string): string {
	const consumer = createRequire(join(cwd, "package.json"));
	let manifest: string;
	try {
		manifest = consumer.resolve("vite/package.json");
	} catch (err) {
		if (
			!(err instanceof Error && "code" in err) ||
			err.code !== "MODULE_NOT_FOUND"
		)
			throw err;
		throw new SlotformError(
			"vite is not installed in this app: run `pnpm install` (vite is in its devDependencies), then retry.",
			"VITE_NOT_INSTALLED",
		);
	}
	return join(
		dirname(manifest),
		viteManifestSchema.parse(consumer(manifest)).bin.vite,
	);
}

// Sort config imports by source so the emitted vite.config.ts order is
// independent of `config.plugins` array order.
const configImports = slot.list<TsImportSpec>({
	source: SOURCE,
	name: "configImports",
	sortBy: (a, b) => a.source.localeCompare(b.source),
});

// Plugin call order: docs/architecture/plugins/vite.md, "How it works".
function pluginCallName(expr: TsExpression): string {
	if (expr.kind === "call" && expr.callee.kind === "identifier") {
		return expr.callee.name;
	}
	return "";
}
const pluginCalls = slot.list<TsExpression>({
	source: SOURCE,
	name: "pluginCalls",
	sortBy: (a, b) => pluginCallName(a).localeCompare(pluginCallName(b)),
});

// App-only plugin calls: docs/architecture/plugins/vite.md, "App-only plugin calls".
const appPlugins = slot.list<AppPlugin>({
	source: SOURCE,
	name: "appPlugins",
});

const resolveAliases = slot.list<{ find: string; replacement: string }>({
	source: SOURCE,
	name: "resolveAliases",
	// `find` is the key in the emitted Vite `resolve.alias` object; two
	// contributions with the same `find` would silently overwrite when the
	// TS object literal is rendered. Fail loudly at compose time instead.
	uniqueBy: (a) => a.find,
});

// Dedupe: docs/architecture/plugins/vite.md, "Singletons and the optimizer".
const resolveDedupe = slot.list<string>({
	source: SOURCE,
	name: "resolveDedupe",
	sortBy: (a, b) => a.localeCompare(b),
});

// Exclude and include: docs/architecture/plugins/vite.md, "Singletons and the optimizer".
const optimizeExclude = slot.list<string>({
	source: SOURCE,
	name: "optimizeExclude",
	sortBy: (a, b) => a.localeCompare(b),
});

const devServerPort = slot.value<number, ViteOptions>({
	source: SOURCE,
	name: "devServerPort",
	seed: (ctx) => {
		return ctx.options.port ?? 3000;
	},
});

// Dev server proxy: docs/architecture/plugins/vite.md, "Dev server proxy, file access and watching".
const serverProxy = slot.list<ServerProxyEntry>({
	source: SOURCE,
	name: "serverProxy",
	sortBy: (a, b) => a.path.localeCompare(b.path),
	// `path` is the key in the emitted `server.proxy` object; duplicates
	// would silently overwrite when rendered. Fail loudly at compose time.
	uniqueBy: (e) => e.path,
});

// File access: docs/architecture/plugins/vite.md, "Dev server proxy, file access and watching".
const fsAllow = slot.list<TsExpression>({
	source: SOURCE,
	name: "fsAllow",
});

// Watching: docs/architecture/plugins/vite.md, "Dev server proxy, file access and watching".
const watchIgnored = slot.list<string>({
	source: SOURCE,
	name: "watchIgnored",
	sortBy: (a, b) => a.localeCompare(b),
});

// Build output directory: docs/architecture/plugins/vite.md, "Lifecycle contributions".
const outDir = slot.value<string | null>({
	source: SOURCE,
	name: "outDir",
	seed: () => null,
});

// Client headers: docs/architecture/slot-catalog.md, "`vite.slots.*` (the `vite` plugin)".
const clientHeaders = slot.map<string>({
	source: SOURCE,
	name: "clientHeaders",
	keyOf: headerKey,
	merge: mergeClientHeader,
});

// Null without an `outDir`, or with no plugin call, import or app-only call,
// so a vite-less config never writes an empty file.
const viteConfig = slot.derived({
	source: SOURCE,
	name: "viteConfig",
	inputs: {
		configImports,
		pluginCalls,
		appPlugins,
		resolveAliases,
		resolveDedupe,
		optimizeExclude,
		devServerPort,
		outDir,
		serverProxy,
		fsAllow,
		watchIgnored,
		clientHeaders,
	},
	compute: (inp): string | null => {
		if (inp.outDir === null) return null;
		if (
			inp.pluginCalls.length === 0 &&
			inp.configImports.length === 0 &&
			inp.appPlugins.length === 0
		)
			return null;
		const { appPlugins: app, ...values } = inp;
		return renderViteConfig({
			...values,
			outDir: inp.outDir,
			configImports: [
				...inp.configImports,
				...app.flatMap((a) => a.imports),
			].sort((a, b) => a.source.localeCompare(b.source)),
			pluginCalls: [...app.map((a) => a.call), ...inp.pluginCalls],
		});
	},
});

export const vite = plugin("vite", {
	// The consumer runs vite: its generated config imports it and the dev
	// process and the build step run its bin.
	devDependencies: {
		vite: "^8.3.8",
	},
	label: "Vite",

	schema: viteOptionsSchema,

	slots: {
		configImports,
		pluginCalls,
		appPlugins,
		resolveAliases,
		resolveDedupe,
		optimizeExclude,
		devServerPort,
		outDir,
		serverProxy,
		fsAllow,
		watchIgnored,
		clientHeaders,
		viteConfig,
	},

	contributes: (self) => [
		self.slots.outDir.contribute(() => "dist/client"),

		// No Slotform app is framed: `frame-ancestors` is the standard, and
		// `X-Frame-Options` covers a browser without it.
		self.slots.clientHeaders.contribute(() => ({
			"Content-Security-Policy": "frame-ancestors 'none'",
			"X-Frame-Options": "DENY",
		})),

		self.slots.configImports.contribute(
			(): TsImportSpec => ({
				source: "@slotform/vite/preset",
				named: ["excludedImportsPlugin", "providersPlugin", "schemaPlugin"],
			}),
		),
		self.slots.pluginCalls.contribute(
			(): TsExpression => ({
				kind: "call",
				callee: { kind: "identifier", name: "providersPlugin" },
				args: [],
			}),
		),
		self.slots.pluginCalls.contribute(
			(): TsExpression => ({
				kind: "call",
				callee: { kind: "identifier", name: "schemaPlugin" },
				args: [],
			}),
		),
		// The optimizer bundles what an excluded package imports (`excludedImportsPlugin`).
		self.slots.pluginCalls.contribute(
			(): TsExpression => ({
				kind: "call",
				callee: { kind: "identifier", name: "excludedImportsPlugin" },
				args: [],
			}),
		),

		// Dev CORS origin: docs/architecture/plugins/api.md, "CORS and origins".
		// The predicate is `!== undefined`, so `app.origins: []` stays a lockdown.
		api.slots.devCorsOrigins.contribute(async (ctx) => {
			if (ctx.app.origins !== undefined) return undefined;
			const port = await ctx.resolve(self.slots.devServerPort);
			return `http://localhost:${port}`;
		}),

		emitArtifact(`${GENERATED_DIR}/vite.config.ts`, self.slots.viteConfig),

		// Dev process: docs/architecture/plugins/vite.md, "Dev server port".
		cliSlots.devProcesses.contribute(async (ctx) => {
			const port = await ctx.resolve(self.slots.devServerPort);
			const opts = self.options;
			return {
				name: "vite",
				command: process.execPath,
				args: [
					viteBin(ctx.cwd),
					"dev",
					"--config",
					`${GENERATED_DIR}/vite.config.ts`,
				],
				defaultPort: port,
				readyPattern: /Local:/,
				// Default `restart: "never"` — Vite handles HMR; auto-restart
				// on crash usually hides the real failure. Consumer can opt in.
				restart: opts.restart ?? "never",
				maxRestarts: opts.maxRestarts,
				// Use the supervisor's default EADDRINUSE pattern. Explicitly
				// returns `undefined` rather than relying on implicit-void
				// because `() => void` isn't assignable to the spec's
				// `() => { restart: boolean } | undefined` under strict TS.
				onExit: (event) => {
					if (!event.portInUse) return undefined;
					const detected = event.detectedPort ?? port;
					ctx.log.error(
						`vite dev: port :${detected} is in use — set \`vite({ port: ... })\` in slotform.config.ts or stop the process holding it.`,
					);
					return undefined;
				},
			};
		}),

		// Build step: docs/architecture/plugins/vite.md, "Lifecycle contributions".
		cliSlots.buildSteps.contribute((ctx) => ({
			name: "vite-build",
			phase: "main",
			exec: {
				command: process.execPath,
				args: [
					viteBin(ctx.cwd),
					"build",
					"--config",
					`${GENERATED_DIR}/vite.config.ts`,
				],
			},
		})),
	],
});

export type { AppPlugin, ServerProxyEntry, ViteOptions } from "./types.ts";
