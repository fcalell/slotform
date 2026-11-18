import { readFileSync } from "node:fs";
import type { ContributionCtx } from "@fcalell/cli";
import { plugin, slot, stackSpec } from "@fcalell/cli";
import {
	literalToProps,
	type ProviderSpec,
	type TsExpression,
	type TsImportSpec,
} from "@fcalell/cli/ast";
import { cliSlots, emitArtifact } from "@fcalell/cli/cli-slots";
import { auth } from "@fcalell/plugin-auth";
import { react } from "@fcalell/plugin-react";
import { type PreviewGlobal, screens } from "@fcalell/plugin-screens";
import { vite } from "@fcalell/plugin-vite";
import { deriveTheme } from "@fcalell/ui-core/derive";
import { uiCoreGuide } from "@fcalell/ui-core/manifest";
import { z } from "zod";
import { aggregateAppCss } from "./node/codegen.ts";
import { defaultFonts, type FontEntry } from "./node/fonts.ts";
import { lintPlugins } from "./node/lint.ts";
import { modeScriptPolicy } from "./node/mode.ts";
import {
	densityLayer,
	modeLayer,
	motionLayer,
	pageVariants,
	rootLayer,
	safeAreaUtilities,
	shadowBlocks,
	themeBlock,
	tokenSources,
	touchVariant,
} from "./node/theme.ts";
import {
	type CssBlock,
	type CssImport,
	type CssLayer,
	type CssSourceInline,
	type ReactUiOptions,
	reactUiOptionsSchema,
} from "./types.ts";

const SOURCE = "react-ui";

// The Tailwind ranges an app installs are this package's optional peers, read from its
// own package.json, one level above `src/` and `dist/` alike.
const tailwindPeers = z
	.object({
		peerDependencies: z.object({
			tailwindcss: z.string(),
			"@tailwindcss/vite": z.string(),
		}),
	})
	.parse(
		JSON.parse(
			readFileSync(new URL("../package.json", import.meta.url), "utf8"),
		),
	).peerDependencies;

// ── Slot declarations ──────────────────────────────────────────────

const appCssImports = slot.list<CssImport>({
	source: SOURCE,
	name: "appCssImports",
});

const appCssSources = slot.list<CssSourceInline>({
	source: SOURCE,
	name: "appCssSources",
});

// Top-level `@theme` / `@utility` blocks. Separate from `appCssLayers`
// because neither at-rule may sit inside a `@layer`.
const appCssBlocks = slot.list<CssBlock>({
	source: SOURCE,
	name: "appCssBlocks",
});

const appCssLayers = slot.list<CssLayer>({
	source: SOURCE,
	name: "appCssLayers",
});

// Resolved fonts: docs/architecture/plugins/react-ui.md, "Fonts".
// The `??` is load-bearing: `fonts: []` means none, an omitted option means `defaultFonts`.
const fonts = slot.derived({
	source: SOURCE,
	name: "fonts",
	compute: (_inp, ctx: ContributionCtx<ReactUiOptions>): FontEntry[] =>
		ctx.options.fonts ?? defaultFonts,
});

// The design contract, resolved once, so knob resolution and validation
// happen exactly one time.
const resolvedTheme = slot.derived({
	source: SOURCE,
	name: "resolvedTheme",
	compute: (_inp, ctx: ContributionCtx<ReactUiOptions>) =>
		deriveTheme(ctx.options.theme),
});

// Rendered `.stack/app.css`, null when nothing landed.
const appCssSource = slot.derived({
	source: SOURCE,
	name: "appCssSource",
	inputs: {
		imports: appCssImports,
		sources: appCssSources,
		blocks: appCssBlocks,
		layers: appCssLayers,
	},
	compute: (inp): string | null => aggregateAppCss(inp),
});

export const reactUi = plugin("react-ui", {
	label: "Design System",

	schema: reactUiOptionsSchema,

	requires: ["react", "vite"],

	dependencies: {
		// The guide's index points into the consumer's node_modules for
		// ui-core's pages.
		"@fcalell/ui-core": stackSpec("@fcalell/ui-core"),
		tailwindcss: tailwindPeers.tailwindcss,
	},
	devDependencies: {
		"@tailwindcss/vite": tailwindPeers["@tailwindcss/vite"],
	},

	guide: [
		{ page: "rules", trigger: "Writing or editing any `.tsx` of the web app" },
		{
			page: "reference",
			trigger:
				"Importing a web component, or setting the theme, words or fonts, or reasoning about density, dark mode or the page container",
		},
		{
			page: "containers",
			trigger:
				"Giving a `Shell`, `Pane`, `Gate`, `Sheet`, `Columns` or `Card` a prop",
		},
		{
			page: "controls",
			trigger:
				"Giving a `Button`, `Input`, `Picker`, `Switch` or `Slider` a prop",
		},
		{
			page: "content",
			trigger:
				"Giving a `Section`, `Table`, `Toolbar`, `Rules` or `Thread` a prop",
		},
		{
			page: "blocks",
			trigger:
				"Giving a `Text`, `Prose`, `Code`, `Diff`, `Stages`, `Stats`, `BarChart` or `Image` a prop",
		},
		{
			page: "canvas",
			trigger: "Drawing a graph of nodes and edges, a workflow or a journey",
		},
		{
			page: "audio",
			trigger:
				"Playing sound, drawing a track's waveform or reading what is playing",
		},
	],

	slots: {
		appCssImports,
		appCssSources,
		appCssBlocks,
		appCssLayers,
		fonts,
		resolvedTheme,
		appCssSource,
	},

	contributes: (self) => [
		// ── Vite integration ────────────────────────────────────────────
		vite.slots.configImports.contribute(
			(): TsImportSpec => ({
				source: "@tailwindcss/vite",
				default: "tailwindcss",
			}),
		),
		vite.slots.pluginCalls.contribute(
			(): TsExpression => ({
				kind: "call",
				callee: { kind: "identifier", name: "tailwindcss" },
				args: [],
			}),
		),
		vite.slots.configImports.contribute(
			(): TsImportSpec => ({
				source: "@fcalell/plugin-react-ui/node/fonts",
				named: ["themeFontsPlugin"],
			}),
		),
		// The mode before first paint, with the theme's `defaultMode` baked in
		// as the fallback for a viewer with no stored choice.
		vite.slots.configImports.contribute(
			(): TsImportSpec => ({
				source: "@fcalell/plugin-react-ui/node/mode",
				named: ["themeModePlugin"],
			}),
		),
		vite.slots.pluginCalls.contribute(async (ctx): Promise<TsExpression> => {
			const { defaultMode, loading } = await ctx.resolve(
				self.slots.resolvedTheme,
			);
			return {
				kind: "call",
				callee: { kind: "identifier", name: "themeModePlugin" },
				args: Object.values(literalToProps({ defaultMode, loading })),
			};
		}),
		// The mode script's hash in the CSP: docs/architecture/plugins/react-ui.md, "Mode script and CSP".
		vite.slots.clientHeaders.contribute(async (ctx) => {
			const { defaultMode, loading } = await ctx.resolve(
				self.slots.resolvedTheme,
			);
			return {
				"Content-Security-Policy": modeScriptPolicy(defaultMode, loading),
			};
		}),
		// The canvas layout module is served as source: docs/architecture/plugins/react-ui.md, "Canvas serving".
		vite.slots.configImports.contribute(
			(): TsImportSpec => ({
				source: "@fcalell/plugin-react-ui/node/canvas",
				named: ["canvasPlugin"],
			}),
		),
		vite.slots.pluginCalls.contribute(
			(): TsExpression => ({
				kind: "call",
				callee: { kind: "identifier", name: "canvasPlugin" },
				args: [],
			}),
		),
		vite.slots.configImports.contribute(
			(): TsImportSpec => ({ source: "node:url", named: ["fileURLToPath"] }),
		),
		// Fonts are served from this package's node_modules: docs/architecture/plugins/react-ui.md, "Fonts".
		vite.slots.fsAllow.contribute(
			(): TsExpression => ({
				kind: "call",
				callee: { kind: "identifier", name: "searchForWorkspaceRoot" },
				args: [
					{
						kind: "call",
						callee: { kind: "identifier", name: "fileURLToPath" },
						args: [
							{
								kind: "call",
								callee: {
									kind: "member",
									object: { kind: "identifier", name: "import.meta" },
									property: "resolve",
								},
								args: [{ kind: "string", value: "@fcalell/plugin-react-ui" }],
							},
						],
					},
				],
			}),
		),
		// The array is passed even when empty, so `fonts: []` stays "no fonts"
		// all the way to the Vite plugin.
		vite.slots.pluginCalls.contribute(async (ctx): Promise<TsExpression> => {
			const entries = await ctx.resolve(self.slots.fonts);
			return {
				kind: "call",
				callee: { kind: "identifier", name: "themeFontsPlugin" },
				args: Object.values(literalToProps({ entries })),
			};
		}),

		// Top-level routes are reserved slugs: docs/architecture/plugins/react-ui.md, "Organization routes".
		auth.slots.reservedSlugs.contribute((ctx) =>
			ctx.resolve(react.slots.topLevelRoutes),
		),

		// The consumer's words, mounted once; absent, the context speaks English.
		react.slots.providers.contribute((): ProviderSpec | undefined => {
			const words = self.options.words;
			if (!words) return undefined;
			return {
				imports: [
					{
						source: "@fcalell/ui-core/react/words",
						named: ["WordsProvider"],
					},
				],
				wrap: {
					identifier: "WordsProvider",
					props: Object.entries(literalToProps({ words })).map(
						([name, value]) => ({ name, value }),
					),
				},
				order: 1,
			};
		}),

		// The app's lockup: docs/architecture/plugins/react-ui.md, "App lockup".
		react.slots.providers.contribute(
			async (ctx): Promise<ProviderSpec | undefined> => {
				const icon = await ctx.resolve(react.slots.icon);
				if (icon === null) return undefined;
				const lockup = {
					src: icon.light,
					...(icon.dark === undefined ? {} : { dark: icon.dark }),
					...(icon.logo === undefined
						? {}
						: {
								logo: icon.logo.light,
								...(icon.logo.dark === undefined
									? {}
									: { logoDark: icon.logo.dark }),
							}),
					name: ctx.app.name,
				};
				return {
					imports: [
						{
							source: "@fcalell/plugin-react-ui/lib/lockup",
							named: ["LockupProvider"],
						},
					],
					wrap: {
						identifier: "LockupProvider",
						props: Object.entries(literalToProps({ lockup })).map(
							([name, value]) => ({ name, value }),
						),
					},
					order: 1,
				};
			},
		),

		cliSlots.lintPlugins.contribute(async (ctx) =>
			lintPlugins(await ctx.resolve(react.slots.routesDir)),
		),

		// ── App CSS ─────────────────────────────────────────────────────
		self.slots.appCssImports.contribute(() => ({
			url: "tailwindcss",
			source: "none",
		})),
		self.slots.appCssImports.contribute(
			() => "@fcalell/plugin-react-ui/globals.css",
		),
		self.slots.appCssSources.contribute(() => tokenSources()),
		self.slots.appCssBlocks.contribute(async (ctx) =>
			themeBlock(await ctx.resolve(self.slots.resolvedTheme)),
		),
		self.slots.appCssBlocks.contribute(() => shadowBlocks()),
		self.slots.appCssBlocks.contribute(() => touchVariant()),
		self.slots.appCssBlocks.contribute(async (ctx) =>
			pageVariants(await ctx.resolve(self.slots.resolvedTheme)),
		),
		self.slots.appCssBlocks.contribute(() => safeAreaUtilities()),
		self.slots.appCssLayers.contribute(async (ctx) =>
			rootLayer(await ctx.resolve(self.slots.resolvedTheme)),
		),
		self.slots.appCssLayers.contribute(async (ctx) =>
			modeLayer(await ctx.resolve(self.slots.resolvedTheme)),
		),
		self.slots.appCssLayers.contribute(() => motionLayer()),
		self.slots.appCssLayers.contribute(async (ctx) =>
			densityLayer(await ctx.resolve(self.slots.resolvedTheme)),
		),

		// The entry imports the sheet: docs/architecture/plugins/react-ui.md, "Generated files".
		react.slots.entryImports.contribute(
			(): TsImportSpec => ({ source: "./app.css", sideEffect: true }),
		),
		// The app's router, handed to react-ui's navigation so an act opens a route
		// in place, and the default not-found page: docs/architecture/plugins/react-ui.md, "Router bindings".
		// With routing off the entry has no router to hand over.
		react.slots.routerBindings.contribute(
			async (ctx): Promise<TsImportSpec[] | undefined> => {
				if ((await ctx.resolve(react.slots.routesDir)) === null)
					return undefined;
				return [
					{
						source: "@fcalell/plugin-react-ui/lib/navigate",
						named: ["bindRouter"],
					},
					{
						source: "@fcalell/plugin-react-ui/lib/not-found",
						named: ["bindNotFound"],
					},
				];
			},
		),
		// Mode and density as workbench toolbars: docs/architecture/plugins/react-ui.md, "Screens workbench".
		screens.slots.previewGlobals.contribute(
			async (ctx): Promise<PreviewGlobal[]> => {
				const { defaultMode } = await ctx.resolve(self.slots.resolvedTheme);
				return [
					{
						name: "mode",
						title: "Mode",
						values: ["light", "dark"],
						default: defaultMode ?? "light",
						checked: ["light", "dark"],
						apply: { classes: { dark: "dark" } },
					},
					{
						name: "density",
						title: "Density",
						values: ["desktop", "touch"],
						default: "desktop",
						// The density pin at each width: docs/architecture/plugins/react-ui.md, "Screens workbench".
						byViewport: true,
						apply: { attribute: "data-density" },
					},
				];
			},
		),
		emitArtifact(".stack/app.css", self.slots.appCssSource),
		// ui-core is no plugin: each UI plugin indexes its guide pages.
		cliSlots.guide.contribute(() => uiCoreGuide),
	],
});

export type {
	FontEntry,
	ReactUiOptions,
	Theme,
	Words,
} from "./types.ts";
