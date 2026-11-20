import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { api } from "@slotform/api";
import type { ContributionCtx } from "@slotform/cli";
import { GENERATED_DIR, plugin, slot } from "@slotform/cli";
import type {
	MiddlewareSpec,
	ProviderSpec,
	ScaffoldSpec,
	TsImportSpec,
} from "@slotform/cli/ast";
import { cliSlots, emitArtifact } from "@slotform/cli/cli-slots";
import type { GeneratedFile } from "@slotform/cli/specs";
import { cloudflare } from "@slotform/cloudflare";
import { z } from "zod";
import {
	aggregateEntry,
	aggregateExpoConfig,
	aggregateMetroConfig,
} from "./node/codegen.ts";
import {
	appSlug,
	buildBundleId,
	deepLinkScheme,
	versionGateDataset,
} from "./node/names.ts";
import {
	hasNotFoundRoute,
	NOT_FOUND_FILE,
	notFoundRouteSource,
} from "./node/not-found.ts";
import { buildRoutesDts } from "./node/routes.ts";
import {
	type ExpoConfigPlugin,
	type ExpoOptions,
	expoOptionsSchema,
	type MetroRequireSpec,
	type MetroWrapperSpec,
} from "./types.ts";
import { VERSION_GATE_METRICS_BINDING } from "./version-gate-shared.ts";

const SOURCE = "expo";

const DEFAULT_PORT = 8081;
const DEFAULT_APP_DIR = "src/app";
// The `eas.json` `slotform init` writes: the build profiles by name, the eas-cli floor its `cli.version` and
// the `eas-cli` devDependency share.
const EAS_CLI_FLOOR = "27.10.0";
const DEFAULT_EAS_BUILD = {
	development: { developmentClient: true, distribution: "internal" },
	preview: { distribution: "internal" },
	production: { autoIncrement: true },
};
const DEFAULT_EAS_PROFILES = Object.keys(DEFAULT_EAS_BUILD);
const DEFAULT_UPDATE_CHANNEL = "production";

// Why expo is a dependency and which react it pins: docs/architecture/plugins/expo.md, "Dependencies".
const require = createRequire(import.meta.url);
const expoVersion = z
	.object({ version: z.string() })
	.parse(require("expo/package.json")).version;
const sdkModules = z
	.record(z.string(), z.string())
	.parse(require("expo/bundledNativeModules.json"));

/** The installed Expo SDK's version of each module in `names`. */
export function sdkVersions(names: readonly string[]): Record<string, string> {
	return Object.fromEntries(
		names.map((name) => {
			const version = sdkModules[name];
			if (!version) {
				throw new Error(`Expo ${expoVersion} names no version for ${name}.`);
			}
			return [name, version];
		}),
	);
}

// The gate is active only when a floor is configured; a dormant gate must
// not appear in the emitted worker or claim a binding.
function versionGateFloors(
	minNativeBuild: { ios?: number; android?: number } | undefined,
): { ios: number; android: number } | undefined {
	const ios = minNativeBuild?.ios ?? 0;
	const android = minNativeBuild?.android ?? 0;
	if (!minNativeBuild || (ios === 0 && android === 0)) return undefined;
	return { ios, android };
}

// The generated expo-router custom root. It calls `registerRootComponent` and
// mounts the provider stack, so it must be the package's `main` to ever run.
const ENTRY_ARTIFACT = `${GENERATED_DIR}/entry.tsx`;

// Mirrors the `expo-env.d.ts` Expo's own tooling writes at a project root: a
// single reference that pulls Expo's ambient types into the app's TS program
// (require.context for the router entry, EXPO_PUBLIC_* env vars, etc.).
// Emitted into `.slotform/` so the consumer's `tsconfig.app.json` includes it
// without a hand-managed file.
const EXPO_ENV_ARTIFACT = `${GENERATED_DIR}/expo-env.d.ts`;
const ROUTES_ARTIFACT = `${GENERATED_DIR}/routes.d.ts`;
const EXPO_ENV_DTS = '/// <reference types="expo/types" />\n';

// ── Slot declarations ──────────────────────────────────────────────
//
// The `expo` plugin owns the native bootstrap the way the `vite` plugin and the web
// plugin own the web one: metro config, the Expo app config, the entry, and typed
// routes. Peer plugins (native-ui, auth/expo) contribute
// into the list slots; the derived `*Config`/`*Source` slots compose them
// into the files emitted under `.slotform/`. Ordering is pure dataflow.

const metroConfigImports = slot.list<MetroRequireSpec>({
	source: SOURCE,
	name: "metroConfigImports",
});

const metroPluginCalls = slot.list<MetroWrapperSpec>({
	source: SOURCE,
	name: "metroPluginCalls",
	// `callee` names the wrapper applied around the config; two wrappers with
	// the same name would emit duplicate `config = x(config, …)` lines.
	uniqueBy: (w) => w.callee,
});

// Sorted by name: docs/architecture/plugins/expo.md, "Slots and contributions".
const expoConfigPlugins = slot.list<ExpoConfigPlugin>({
	source: SOURCE,
	name: "expoConfigPlugins",
	sortBy: (a, b) => a.name.localeCompare(b.name),
	uniqueBy: (p) => p.name,
});

// Sorted ascending by order: docs/architecture/plugins/expo.md, "Slots and contributions".
const providers = slot.list<ProviderSpec>({
	source: SOURCE,
	name: "providers",
	sortBy: (a, b) => a.order - b.order,
});

const entryImports = slot.list<TsImportSpec>({
	source: SOURCE,
	name: "entryImports",
	sortBy: (a, b) => a.source.localeCompare(b.source),
});

// Resolved Metro dev-server port. Defaults to Expo's 8081; flows into the
// localhost CORS origin contributed to the `api` plugin.
const devServerPort = slot.value<number, ExpoOptions>({
	source: SOURCE,
	name: "devServerPort",
	seed: (ctx) => {
		const opts = ctx.options;
		return opts.port ?? DEFAULT_PORT;
	},
});

// null with `routes: false`: docs/architecture/slot-catalog.md, "`expo.slots.*` (the `expo` plugin)".
const routesPagesDir = slot.derived({
	source: SOURCE,
	name: "routesPagesDir",
	compute: (_inputs, ctx: ContributionCtx<ExpoOptions>): string | null => {
		const { routes } = ctx.options;
		return routes === false ? null : (routes?.appDir ?? DEFAULT_APP_DIR);
	},
});

// The not-found page contributed by a design system: docs/architecture/plugins/expo.md, "Routes".
const notFoundRoute = slot.value<string | null>({
	source: SOURCE,
	name: "notFoundRoute",
	override: true,
	seed: () => null,
});

// The route file for an unmatched address: docs/architecture/plugins/expo.md, "Routes".
const notFoundFile = slot.derived({
	source: SOURCE,
	name: "notFoundFile",
	inputs: { module: notFoundRoute, pagesDir: routesPagesDir },
	compute: (inp, ctx): GeneratedFile | null => {
		if (inp.module === null || inp.pagesDir === null) return null;
		if (hasNotFoundRoute(ctx.cwd, inp.pagesDir)) return null;
		return {
			path: `${inp.pagesDir}/${NOT_FOUND_FILE}`,
			content: notFoundRouteSource(inp.module),
		};
	},
});

// EAS build profile names (`eas build --profile <name>`). Consumed by the
// `expo build` command to validate the requested profile and pick a default.
const easBuildProfiles = slot.value<string[], ExpoOptions>({
	source: SOURCE,
	name: "easBuildProfiles",
	seed: (ctx) => {
		const opts = ctx.options;
		return opts.easProfiles ?? DEFAULT_EAS_PROFILES;
	},
});

const easUpdateChannel = slot.value<string, ExpoOptions>({
	source: SOURCE,
	name: "easUpdateChannel",
	seed: (ctx) => {
		const opts = ctx.options;
		return opts.updateChannel ?? DEFAULT_UPDATE_CHANNEL;
	},
});

const metroConfig = slot.derived({
	source: SOURCE,
	name: "metroConfig",
	inputs: { requires: metroConfigImports, wrappers: metroPluginCalls },
	compute: (inp): string | null =>
		aggregateMetroConfig({ requires: inp.requires, wrappers: inp.wrappers }),
});

const expoConfig = slot.derived({
	source: SOURCE,
	name: "expoConfig",
	inputs: { plugins: expoConfigPlugins, pagesDir: routesPagesDir },
	compute: (inp, ctx: ContributionCtx<ExpoOptions>): string | null => {
		const slug = appSlug(ctx.app.name);
		const routesEnabled = inp.pagesDir !== null;
		const bundleId = buildBundleId(ctx.app.domain, slug);
		// expo-router is listed as a config plugin so its native deep-link setup
		// runs during prebuild; only when routing is enabled.
		const basePlugins: ExpoConfigPlugin[] = routesEnabled
			? [{ name: "expo-router" }, ...inp.plugins]
			: inp.plugins;
		return aggregateExpoConfig({
			name: ctx.app.name,
			slug,
			scheme: deepLinkScheme(ctx),
			bundleIdentifier: bundleId,
			androidPackage: bundleId,
			appStoreId: ctx.options.appStoreId,
			plugins: basePlugins,
		});
	},
});

const entrySource = slot.derived({
	source: SOURCE,
	name: "entrySource",
	inputs: { imports: entryImports, providers, pagesDir: routesPagesDir },
	compute: (inp): string | null =>
		aggregateEntry({
			imports: inp.imports,
			providers: inp.providers,
			// entry.tsx lives in `.slotform/`, so the app dir is one level up.
			appContextPath: inp.pagesDir === null ? null : `../${inp.pagesDir}`,
		}),
});

// The app's typed routes, `.slotform/routes.d.ts`; null when routing is off.
const routesDtsSource = slot.derived({
	source: SOURCE,
	name: "routesDtsSource",
	inputs: { pagesDir: routesPagesDir },
	compute: (inp, ctx): string | null =>
		inp.pagesDir === null ? null : buildRoutesDts(ctx.cwd, inp.pagesDir),
});

// ── Command helpers ────────────────────────────────────────────────

interface RunResult {
	ok: boolean;
}

function runInherit(
	args: string[],
	cwd: string,
	env: NodeJS.ProcessEnv,
): RunResult {
	const result = spawnSync("npx", args, { cwd, stdio: "inherit", env });
	return { ok: !result.error && result.status === 0 };
}

export const expo = plugin("expo", {
	label: "Expo",

	schema: expoOptionsSchema,

	dependencies: {
		expo: `~${expoVersion}`,
		...sdkVersions([
			"expo-router",
			// expo-router's required peer.
			"react-native-screens",
			"react",
			// expo and expo-router's optional peer: unnamed, an install takes the
			// newest, which wants a newer react than the SDK's.
			"react-dom",
			"react-native",
			// expo-application is required for every generated src/lib/api.ts: docs/architecture/plugins/expo.md, "Dependencies".
			"expo-application",
			// Android's `userInterfaceStyle` needs it, or the app ignores the light
			// and dark setting.
			"expo-system-ui",
			// The generated entry's `StatusBar`.
			"expo-status-bar",
		]),
	},
	devDependencies: {
		"eas-cli": `^${EAS_CLI_FLOOR}`,
		// React's types back the app's JSX (`react/jsx-runtime`); without it a
		// consumer's `tsconfig.app.json` can't resolve the automatic runtime.
		"@types/react": "^19.3.0",
		// `babel.config.cjs` runs it over the app's code and @slotform/* (Babel
		// resolves the plugin from the consumer).
		"babel-plugin-react-compiler": "^1.0.0",
	},
	// Expo cache + prebuild outputs (continuous native generation regenerates
	// ios/ + android/ on demand via `slotform expo prebuild`).
	gitignore: [".expo", "ios", "android"],

	guide: [
		{ page: "add-a-phone-screen", trigger: "Adding a screen to the phone app" },
		{
			page: "routes",
			trigger:
				"Writing a route file under `src/app`, the root layout, or navigating on the phone",
		},
		{
			page: "options",
			trigger:
				"Changing `expo()` options, adding a native module, or touching `app.config.ts`, `metro.config.js` or `babel.config.cjs`",
		},
		{
			page: "builds",
			trigger:
				"Running the phone app, editing `eas.json`, or building or updating it with EAS",
		},
		{
			page: "phone-render",
			trigger:
				"Rendering the phone app on an emulator to judge a screen, or rebuilding it after a native change",
		},
		{
			page: "phone-capture",
			trigger:
				"Capturing, measuring or holding a phone screen's states on the emulator",
		},
		{
			page: "api-client",
			trigger:
				"Calling the API from the phone, or editing `src/lib/api.ts` or `EXPO_PUBLIC_API_URL`",
		},
		{
			page: "native-auth",
			trigger: "Signing in on the phone, or editing `src/lib/auth.ts`",
		},
		{
			page: "version-gate",
			trigger:
				"Shipping an API change that old phone builds cannot handle (`minNativeBuild`), or the update wall",
		},
	],

	slots: {
		metroConfigImports,
		metroPluginCalls,
		expoConfigPlugins,
		providers,
		entryImports,
		devServerPort,
		routesPagesDir,
		notFoundRoute,
		notFoundFile,
		easBuildProfiles,
		easUpdateChannel,
		metroConfig,
		expoConfig,
		entrySource,
		routesDtsSource,
	},

	commands: {
		dev: {
			description: "Start the Metro dev server (expo start)",
			options: {
				clear: {
					type: "boolean",
					description: "Clear the Metro bundler cache before starting",
					default: false,
				},
			},
			handler: async (ctx, flags) => {
				const port = await ctx.resolve(devServerPort);
				const args = ["expo", "start", "--port", String(port)];
				if (flags.clear) args.push("--clear");
				// Expo's TypeScript setup rewrites the generated tsconfig.json
				// (`extends`, `include`), which Slotform owns.
				const { ok } = runInherit(args, ctx.cwd, {
					...ctx.env,
					EXPO_NO_TYPESCRIPT_SETUP: "1",
				});
				if (!ok) throw new Error("expo start failed");
			},
		},
		prebuild: {
			description: "Generate native ios/ + android/ projects (expo prebuild)",
			options: {
				clean: {
					type: "boolean",
					description: "Delete existing native directories first",
					default: false,
				},
				platform: {
					type: "string",
					description: "Restrict to a single platform (ios | android)",
				},
			},
			handler: async (ctx, flags) => {
				const args = ["expo", "prebuild"];
				if (flags.clean) args.push("--clean");
				if (typeof flags.platform === "string") {
					args.push("--platform", flags.platform);
				}
				const { ok } = runInherit(args, ctx.cwd, ctx.env);
				if (!ok) throw new Error("expo prebuild failed");
			},
		},
		build: {
			description: "Create a native build with EAS Build (eas build)",
			options: {
				profile: {
					type: "string",
					description: "EAS build profile (defaults to the first configured)",
				},
				platform: {
					type: "string",
					description: "Target platform (ios | android | all)",
					default: "all",
				},
			},
			handler: async (ctx, flags) => {
				const profiles = await ctx.resolve(easBuildProfiles);
				const profile =
					typeof flags.profile === "string" ? flags.profile : profiles[0];
				if (!profile || !profiles.includes(profile)) {
					throw new Error(
						`Unknown EAS build profile "${profile}". Configured profiles: ${profiles.join(", ")}.`,
					);
				}
				const platform =
					typeof flags.platform === "string" ? flags.platform : "all";
				const { ok } = runInherit(
					["eas", "build", "--profile", profile, "--platform", platform],
					ctx.cwd,
					ctx.env,
				);
				if (!ok) throw new Error("eas build failed");
			},
		},
		update: {
			description: "Publish an OTA update with EAS Update (eas update)",
			options: {
				channel: {
					type: "string",
					description:
						"EAS Update channel (defaults to the configured channel)",
				},
				message: {
					type: "string",
					description: "Update message",
				},
			},
			handler: async (ctx, flags) => {
				const defaultChannel = await ctx.resolve(easUpdateChannel);
				const channel =
					typeof flags.channel === "string" ? flags.channel : defaultChannel;
				const args = ["eas", "update", "--channel", channel];
				if (typeof flags.message === "string") {
					args.push("--message", flags.message);
				}
				const { ok } = runInherit(args, ctx.cwd, ctx.env);
				if (!ok) throw new Error("eas update failed");
			},
		},
	},

	contributes: (self) => [
		api.slots.nativeScheme.contribute(() => deepLinkScheme(self)),

		// Metro's localhost origin, unless app.origins is set (`!== undefined`, so `[]` stays locked): docs/architecture/plugins/api.md, "Local and dev origins".
		api.slots.devCorsOrigins.contribute(async (ctx) => {
			if (ctx.app.origins !== undefined) return undefined;
			const port = await ctx.resolve(self.slots.devServerPort);
			return `http://localhost:${port}`;
		}),

		// The client version gate, dormant without a floor: docs/architecture/plugins/expo.md, "Version gate".
		api.slots.middlewareEntries.contribute(
			async (ctx): Promise<MiddlewareSpec | undefined> => {
				const floors = versionGateFloors(self.options.minNativeBuild);
				if (!floors) return undefined;
				const { ios, android } = floors;
				// Scope, the worker's own prefixes: docs/architecture/plugins/expo.md, "Version gate".
				const prefixes = await ctx.resolve(api.slots.routePrefixes);
				return {
					imports: [
						{
							source: "@slotform/expo/version-gate",
							named: ["versionGate"],
						},
					],
					call: {
						kind: "call",
						callee: { kind: "identifier", name: "versionGate" },
						args: [
							{
								kind: "object",
								properties: [
									{ key: "ios", value: { kind: "number", value: ios } },
									{
										key: "android",
										value: { kind: "number", value: android },
									},
									{
										key: "prefixes",
										value: {
											kind: "array",
											items: prefixes.map((prefix) => ({
												kind: "string" as const,
												value: prefix,
											})),
										},
									},
								],
							},
						],
					},
					phase: "after-cors",
					order: 0,
				};
			},
		),

		// The gate's telemetry dataset: docs/architecture/plugins/expo.md, "Version gate".
		cloudflare.slots.bindings.contribute((ctx) => {
			if (!versionGateFloors(self.options.minNativeBuild)) return undefined;
			return {
				kind: "analytics_engine",
				binding: VERSION_GATE_METRICS_BINDING,
				dataset: versionGateDataset(ctx.app.name),
			};
		}),

		// The two config files are .cjs: docs/architecture/plugins/expo.md, "Config files are .cjs".
		emitArtifact(`${GENERATED_DIR}/metro.config.cjs`, self.slots.metroConfig),
		emitArtifact(`${GENERATED_DIR}/app.config.cjs`, self.slots.expoConfig),
		emitArtifact(ENTRY_ARTIFACT, self.slots.entrySource),
		emitArtifact(ROUTES_ARTIFACT, self.slots.routesDtsSource),

		// The page for an unmatched address: docs/architecture/plugins/expo.md, "Routes".
		cliSlots.artifactFiles.contribute(
			async (ctx) => (await ctx.resolve(self.slots.notFoundFile)) ?? undefined,
		),

		// A route file added or removed during `slotform dev` retypes the hrefs.
		cliSlots.devWatchers.contribute(async (ctx) => {
			const pagesDir = await ctx.resolve(self.slots.routesPagesDir);
			if (pagesDir === null) return undefined;
			return {
				name: "routes",
				paths: `${pagesDir}/**`,
				debounce: 300,
				handler(_path, type) {
					if (type === "change") return;
					writeFileSync(
						join(ctx.cwd, ROUTES_ARTIFACT),
						buildRoutesDts(ctx.cwd, pagesDir),
					);
				},
			};
		}),

		// Consumer config plugins and their npm dependencies: docs/architecture/plugins/expo.md, "Dependencies".
		self.slots.expoConfigPlugins.contribute(() =>
			(self.options.configPlugins ?? []).map((p) => ({
				name: p.name,
				options: p.options,
			})),
		),
		cliSlots.initDeps.contribute(() => {
			const deps: Record<string, string> = {};
			for (const p of self.options.configPlugins ?? []) {
				if (p.dependencies) Object.assign(deps, p.dependencies);
			}
			return Object.keys(deps).length > 0 ? deps : undefined;
		}),

		// Always emit the ambient-types reference: harmless without routing and
		// needed by `tsconfig.app.json` whenever Expo is present.
		cliSlots.artifactFiles.contribute(() => ({
			path: EXPO_ENV_ARTIFACT,
			content: EXPO_ENV_DTS,
		})),

		// package.json main points at the generated entry, write-once: docs/architecture/plugins/expo.md, "Generated files".
		cliSlots.packageJsonFields.contribute(async (ctx) => {
			const pagesDir = await ctx.resolve(self.slots.routesPagesDir);
			if (pagesDir === null) return undefined;
			return { main: ENTRY_ARTIFACT };
		}),

		// The root files the consumer owns: docs/architecture/plugins/expo.md, "Generated files".
		cliSlots.initScaffolds.contribute((ctx) =>
			ctx.scaffold("metro.config.js.template", "metro.config.js"),
		),
		cliSlots.initScaffolds.contribute((ctx) =>
			ctx.scaffold("app.config.ts.template", "app.config.ts"),
		),
		// babel.config is .cjs: docs/architecture/plugins/expo.md, "Config files are .cjs".
		cliSlots.initScaffolds.contribute((ctx) =>
			ctx.scaffold("babel.config.cjs.template", "babel.config.cjs"),
		),
		cliSlots.initScaffolds.contribute(
			(): ScaffoldSpec => ({
				content: `${JSON.stringify(
					{
						cli: { version: `>= ${EAS_CLI_FLOOR}`, appVersionSource: "remote" },
						build: DEFAULT_EAS_BUILD,
						submit: { production: {} },
					},
					null,
					"\t",
				)}\n`,
				target: "eas.json",
				plugin: SOURCE,
			}),
		),

		// The scaffolded native API client: docs/architecture/plugins/expo.md, "API client".
		cliSlots.initScaffolds.contribute((ctx) =>
			ctx.scaffold("lib-api.ts", "src/lib/api.ts"),
		),

		// Clean up the scaffolded root config files on `slotform remove expo`.
		cliSlots.removeFiles.contribute(() => [
			"metro.config.js",
			"app.config.ts",
			"babel.config.cjs",
			"eas.json",
			"src/lib/api.ts",
		]),
	],
});

export type { ExpoOptions } from "./types.ts";
