import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import type { ContributionCtx } from "@fcalell/cli";
import { plugin, slot } from "@fcalell/cli";
import type {
	MiddlewareSpec,
	ProviderSpec,
	TsImportSpec,
} from "@fcalell/cli/ast";
import { cliSlots, emitArtifact } from "@fcalell/cli/cli-slots";
import type { GeneratedFile } from "@fcalell/cli/specs";
import { api } from "@fcalell/plugin-api";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { z } from "zod";
import {
	aggregateEntry,
	aggregateExpoConfig,
	aggregateMetroConfig,
} from "./node/codegen.ts";
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
const DEFAULT_EAS_PROFILES = ["development", "preview", "production"];
const DEFAULT_UPDATE_CHANNEL = "production";

// Why expo is a dependency and which react it pins: docs/architecture/plugins/expo.md, "Dependencies".
const require = createRequire(import.meta.url);
const expoVersion = z
	.object({ version: z.string() })
	.parse(require("expo/package.json")).version;
const sdkModules = z
	.record(z.string(), z.string())
	.parse(require("expo/bundledNativeModules.json"));

// The versions of `names` the installed Expo SDK is built against, the
// specifiers `expo install` writes.
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

// The dataset name carries the app slug: dataset names are account-global, and
// two apps sharing one would mix their canaries.
function versionGateDataset(appName: string): string {
	const slug = appName
		.toLowerCase()
		.replace(/[^a-z0-9_]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.replace(/_{2,}/g, "_");
	return `${slug || "stack_app"}_version_gate`;
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
const ENTRY_ARTIFACT = ".stack/entry.tsx";

// Mirrors the `expo-env.d.ts` Expo's own tooling writes at a project root: a
// single reference that pulls Expo's ambient types into the app's TS program
// (require.context for the router entry, EXPO_PUBLIC_* env vars, etc.).
// Emitted into `.stack/` so the consumer's `tsconfig.app.json` includes it
// without a hand-managed file.
const EXPO_ENV_ARTIFACT = ".stack/expo-env.d.ts";
const ROUTES_ARTIFACT = ".stack/routes.d.ts";
const EXPO_ENV_DTS = '/// <reference types="expo/types" />\n';

// ── Identifier helpers ─────────────────────────────────────────────

function slugify(name: string): string {
	return (
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "app"
	);
}

// The deep-link scheme the app config registers and api's `nativeScheme`
// carries to its readers: the `scheme` option, else the app name's slug.
function deepLinkScheme(ctx: {
	options: ExpoOptions;
	app: { name: string };
}): string {
	return ctx.options.scheme ?? slugify(ctx.app.name);
}

// Make a string a legal Java/Android package segment: alphanumerics only, and —
// since a segment must start with a letter — prefix a leading digit with `a`
// (e.g. "1foo" → "a1foo"). Empty input falls back to "app".
function packageSegment(raw: string): string {
	const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
	if (cleaned.length === 0) return "app";
	return /^[0-9]/.test(cleaned) ? `a${cleaned}` : cleaned;
}

// Reverse a domain into a bundle-id prefix: "wenauti.app" → "app.wenauti".
function reverseDomain(domain: string): string {
	const segments = domain
		.split(".")
		.map((s) => s.replace(/[^a-zA-Z0-9]/g, ""))
		.filter((s) => s.length > 0)
		.map(packageSegment);
	return segments.length > 0 ? segments.reverse().join(".") : "app";
}

// Compose the bundle identifier from the reversed domain + app leaf, collapsing
// a doubled leaf when the domain's last label already equals the slug (e.g.
// domain "wenauti.app" + slug "wenauti" → "app.wenauti", not the redundant
// "app.wenauti.wenauti"). Generic domains ("example.com" → "com.example.myapp")
// keep the leaf.
function buildBundleId(domain: string, slug: string): string {
	const prefix = reverseDomain(domain);
	const leaf = packageSegment(slug);
	const labels = prefix.split(".");
	if (labels[labels.length - 1] === leaf) return prefix;
	return `${prefix}.${leaf}`;
}

// ── Slot declarations ──────────────────────────────────────────────
//
// plugin-expo owns the native bootstrap the way plugin-vite and the web
// plugin own the web one: metro config, the Expo app config, the entry, and typed
// routes. Peer plugins (native-ui, auth/expo) contribute
// into the list slots; the derived `*Config`/`*Source` slots compose them
// into the files emitted under `.stack/`. Ordering is pure dataflow.

const metroConfigImports = slot.list<MetroRequireSpec>({
	source: SOURCE,
	name: "metroConfigImports",
	sortBy: (a, b) => a.module.localeCompare(b.module),
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
// localhost CORS origin contributed to plugin-api.
const devServerPort = slot.value<number, ExpoOptions>({
	source: SOURCE,
	name: "devServerPort",
	seed: (ctx) => {
		const opts = ctx.options;
		return opts.port ?? DEFAULT_PORT;
	},
});

// null disables expo-router wiring: docs/architecture/plugins/expo.md, "Slots and contributions".
const routesPagesDir = slot.derived({
	source: SOURCE,
	name: "routesPagesDir",
	compute: (_inputs, ctx: ContributionCtx<ExpoOptions>): string | null => {
		const opts = ctx.options;
		if (opts.routes === false) return null;
		if (opts.routes && typeof opts.routes === "object") {
			return opts.routes.appDir ?? DEFAULT_APP_DIR;
		}
		return DEFAULT_APP_DIR;
	},
});

// The not-found page contributed by a design system: docs/architecture/plugins/expo.md, "Routes".
const notFoundRoute = slot.value<string | null>({
	source: SOURCE,
	name: "notFoundRoute",
	override: true,
	seed: () => null,
});

// The route file generate writes for an unmatched address, in the app's routes
// directory where expo-router reads it: null without a page, with routing off,
// or while the app has a route there, whether its own or this one from an
// earlier generate.
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
		const slug = slugify(ctx.app.name);
		const _opts = ctx.options;
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
			// entry.tsx lives in `.stack/`, so the app dir is one level up.
			appContextPath: inp.pagesDir === null ? null : `../${inp.pagesDir}`,
		}),
});

// The app's typed routes, `.stack/routes.d.ts`; null when routing is off.
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

function runInherit(args: string[], cwd: string): RunResult {
	const result = spawnSync("npx", args, { cwd, stdio: "inherit" });
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
		"eas-cli": "^27.10.0",
		// React's types back the app's JSX (`react/jsx-runtime`); without it a
		// consumer's `tsconfig.app.json` can't resolve the automatic runtime.
		"@types/react": "^19.3.0",
		// `babel.config.cjs` runs it over the app's code and @fcalell/* (Babel
		// resolves the plugin from the consumer).
		"babel-plugin-react-compiler": "^1.0.0",
	},
	// Expo cache + prebuild outputs (continuous native generation regenerates
	// ios/ + android/ on demand via `stack expo prebuild`).
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
				// (`extends`, `include`), which stack owns.
				const result = spawnSync("npx", args, {
					cwd: ctx.cwd,
					stdio: "inherit",
					env: { ...process.env, EXPO_NO_TYPESCRIPT_SETUP: "1" },
				});
				if (result.error || result.status !== 0) {
					throw new Error("expo start failed");
				}
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
				const { ok } = runInherit(args, ctx.cwd);
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
				const { ok } = runInherit(args, ctx.cwd);
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
							source: "@fcalell/plugin-expo/version-gate",
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
		emitArtifact(".stack/metro.config.cjs", self.slots.metroConfig),
		emitArtifact(".stack/app.config.cjs", self.slots.expoConfig),
		emitArtifact(ENTRY_ARTIFACT, self.slots.entrySource),
		emitArtifact(ROUTES_ARTIFACT, self.slots.routesDtsSource),

		// The page for an unmatched address: written once into the app's routes
		// directory, never over a route of the app's.
		cliSlots.artifactFiles.contribute(
			async (ctx) => (await ctx.resolve(self.slots.notFoundFile)) ?? undefined,
		),

		// A route file added or removed during `stack dev` retypes the hrefs.
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

		// Consumer config plugins merge into the app config: docs/architecture/plugins/expo.md, "Dependencies".
		// Their npm dependencies go to `cliSlots.initDeps`, which `stack init` and `stack add` write.
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
		cliSlots.initScaffolds.contribute((ctx) =>
			ctx.scaffold("eas.json.template", "eas.json"),
		),

		// The scaffolded native API client: docs/architecture/plugins/expo.md, "API client".
		cliSlots.initScaffolds.contribute((ctx) =>
			ctx.scaffold("lib-api.ts", "src/lib/api.ts"),
		),

		// Clean up the scaffolded root config files on `stack remove expo`.
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
