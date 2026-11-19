import { basename } from "node:path";
import type { ContributionCtx } from "@fcalell/cli";
import { plugin, slot, stackSpec } from "@fcalell/cli";
import {
	literalToProps,
	type ProviderSpec,
	type TsExpression,
} from "@fcalell/cli/ast";
import { cliSlots, emitArtifact } from "@fcalell/cli/cli-slots";
import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { expo, sdkVersions } from "@fcalell/plugin-expo";
import { deriveTheme } from "@fcalell/ui-core/derive";
import { uiCoreGuide } from "@fcalell/ui-core/manifest";
import { KNOB_DEFAULTS, LOADING_REGIONS } from "@fcalell/ui-core/tokens";
import { aggregateGlobalCss } from "./node/codegen.ts";
import {
	type NativeFontEntry,
	type NativeUiOptions,
	nativeUiOptionsSchema,
} from "./types.ts";

const SOURCE = "native-ui";

// Generated files: docs/architecture/plugins/native-ui.md, "Generated files".
const GLOBAL_CSS_ARTIFACT = ".stack/global.css";
const NATIVE_AUTH_ARTIFACT = ".stack/native-auth.ts";
const NATIVE_THEME_ARTIFACT = ".stack/native-theme.ts";
const UNIWIND_CSS_ENTRY = "./.stack/global.css";
const UNIWIND_DTS = "./.stack/uniwind-types.d.ts";

// `@source` roots: docs/architecture/plugins/native-ui.md, "Stylesheet".
const SOURCES = [
	"../src",
	"../node_modules/@fcalell/plugin-native-ui/src",
	"../node_modules/@fcalell/ui-core/src",
];

// Native client defaults: docs/architecture/plugins/native-ui.md, "Native clients in src/lib".
// The paths are the consumer root's; an entry import is relative to `.stack/`.
const AUTH_MODULE_PATH = "src/lib/auth";
const QUERY_MODULE_PATH = "src/lib/query";
const DEFAULT_AUTH_MODULE = {
	source: `../${AUTH_MODULE_PATH}`,
	export: "authClient",
};
const DEFAULT_QUERY_MODULE = {
	source: `../${QUERY_MODULE_PATH}`,
	export: "queryClient",
};

// Metro wrapper order: docs/architecture/plugins/native-ui.md, "What it contributes".
const UNIWIND_METRO_ORDER = 100;

// ── Slot declarations ──────────────────────────────────────────────

// The design contract, resolved once; one `theme` object themes both
// platforms.
const resolvedTheme = slot.derived({
	source: SOURCE,
	name: "resolvedTheme",
	compute: (_inp, ctx: ContributionCtx<NativeUiOptions>) =>
		deriveTheme(ctx.options.theme),
});

// The font files to embed: the consumer's `fonts` option or none.
const fonts = slot.derived({
	source: SOURCE,
	name: "fonts",
	compute: (_inp, ctx: ContributionCtx<NativeUiOptions>): NativeFontEntry[] =>
		ctx.options.fonts ?? [],
});

// Rendered `.stack/global.css`. Always emits — uniwind needs the entry file
// whenever native-ui is in the config.
const appCssSource = slot.derived({
	source: SOURCE,
	name: "appCssSource",
	inputs: { resolved: resolvedTheme },
	compute: (inp): string =>
		aggregateGlobalCss({ resolved: inp.resolved, sources: SOURCES }),
});

// ── Provider specs ─────────────────────────────────────────────────
//
// Provider order: docs/architecture/plugins/native-ui.md, "Provider order".

const FLEX_FILL: TsExpression = {
	kind: "object",
	properties: [{ key: "flex", value: { kind: "number", value: 1 } }],
};

const gestureProvider: ProviderSpec = {
	imports: [
		{
			source: "react-native-gesture-handler",
			named: ["GestureHandlerRootView"],
		},
	],
	wrap: {
		identifier: "GestureHandlerRootView",
		props: [{ name: "style", value: FLEX_FILL }],
	},
	order: 0,
};

const keyboardProvider: ProviderSpec = {
	imports: [
		{ source: "react-native-keyboard-controller", named: ["KeyboardProvider"] },
	],
	wrap: { identifier: "KeyboardProvider" },
	order: 10,
};

const safeAreaProvider: ProviderSpec = {
	imports: [
		{ source: "react-native-safe-area-context", named: ["SafeAreaProvider"] },
	],
	wrap: { identifier: "SafeAreaProvider" },
	order: 20,
};

// The update wall takes the app's place: docs/architecture/plugins/native-ui.md, "Update wall".
const updateWallProvider: ProviderSpec = {
	imports: [
		{
			source: "@fcalell/plugin-native-ui/lib/update-wall",
			named: ["UpdateWall"],
		},
	],
	wrap: { identifier: "UpdateWall" },
	order: 28,
};

const bottomSheetProvider: ProviderSpec = {
	imports: [
		{ source: "@gorhom/bottom-sheet", named: ["BottomSheetModalProvider"] },
	],
	wrap: { identifier: "BottomSheetModalProvider" },
	order: 30,
};

// The consumer's words provider: docs/architecture/ui-core/words.md, "Words".
function wordsProvider(opts: NativeUiOptions): ProviderSpec | undefined {
	if (!opts.words) return undefined;
	return {
		imports: [
			{
				source: "@fcalell/ui-core/react/words",
				named: ["WordsProvider"],
			},
		],
		wrap: {
			identifier: "WordsProvider",
			props: Object.entries(literalToProps({ words: opts.words })).map(
				([name, value]) => ({ name, value }),
			),
		},
		order: 25,
	};
}

function queryProvider(opts: NativeUiOptions): ProviderSpec {
	const mod = opts.queryClientModule ?? DEFAULT_QUERY_MODULE;
	return {
		imports: [
			{
				source: "@fcalell/plugin-query/tanstack-query",
				named: ["QueryProvider"],
			},
			{
				source: "@fcalell/ui-core/paint",
				named: ["paintWait"],
			},
			{
				source: "@fcalell/plugin-query/net",
				named: ["listen"],
			},
			{ source: mod.source, named: [mod.export] },
		],
		wrap: {
			identifier: "QueryProvider",
			props: [
				{ name: "client", value: { kind: "identifier", name: mod.export } },
				// A read's first write lands no earlier than the minimum hold
				// (`tuned.waitMin`).
				{ name: "hold", value: { kind: "identifier", name: "paintWait" } },
				// The phone has no window events: the managers listen to the
				// network and the app's foreground (`@fcalell/plugin-query/net`).
				{ name: "listen", value: { kind: "identifier", name: "listen" } },
			],
		},
		order: 26,
	};
}

function authProvider(opts: NativeUiOptions): ProviderSpec {
	const mod = opts.authClientModule ?? DEFAULT_AUTH_MODULE;
	return {
		imports: [
			{ source: "@fcalell/plugin-auth/expo", named: ["AuthProvider"] },
			{ source: mod.source, named: [mod.export] },
		],
		wrap: {
			identifier: "AuthProvider",
			props: [
				{ name: "client", value: { kind: "identifier", name: mod.export } },
			],
		},
		order: 27,
	};
}

// Native auth constants: docs/architecture/plugins/native-ui.md, "Native auth client".
const nativeAuthSource = slot.derived({
	source: SOURCE,
	name: "nativeAuthSource",
	inputs: {
		scheme: api.slots.nativeScheme,
		cookiePrefix: auth.slots.cookiePrefix,
	},
	compute: (inp): string =>
		[
			"// Generated by @fcalell/plugin-native-ui. Do not edit.",
			`export const scheme = ${JSON.stringify(inp.scheme)};`,
			`export const cookiePrefix = ${JSON.stringify(inp.cookiePrefix)};`,
			"",
		].join("\n"),
});

// Theme startup file: docs/architecture/plugins/native-ui.md, "Theme startup".
const nativeThemeSource = slot.derived({
	source: SOURCE,
	name: "nativeThemeSource",
	inputs: { resolved: resolvedTheme },
	compute: (inp): string | null => {
		const scrambled = LOADING_REGIONS.filter(
			(slot) => inp.resolved.loading[slot] === "scramble",
		);
		const { radius, size } = inp.resolved.knobs;
		const room =
			radius === KNOB_DEFAULTS.radius && size === KNOB_DEFAULTS.size
				? undefined
				: { radius, size };
		if (!inp.resolved.defaultMode && scrambled.length === 0 && !room)
			return null;
		return [
			"// Generated by @fcalell/plugin-native-ui. Do not edit.",
			...(inp.resolved.defaultMode
				? ['import { Uniwind } from "uniwind";']
				: []),
			...(scrambled.length > 0
				? ['import { setLoading } from "@fcalell/ui-core/paint";']
				: []),
			...(room
				? ['import { setRoomKnobs } from "@fcalell/plugin-native-ui/lib/room";']
				: []),
			"",
			...(inp.resolved.defaultMode
				? [`Uniwind.setTheme(${JSON.stringify(inp.resolved.defaultMode)});`]
				: []),
			...(scrambled.length > 0
				? [
						`setLoading({ ${scrambled.map((slot) => `${slot}: "scramble"`).join(", ")} });`,
					]
				: []),
			...(room ? [`setRoomKnobs(${JSON.stringify(room)});`] : []),
			"",
		].join("\n");
	},
});

// A client app signs in through `src/lib/auth.ts`, which it writes itself: no
// scaffold stands for an app with no `auth()`.
async function hasAuthModule(
	ctx: Pick<ContributionCtx, "fileExists">,
): Promise<boolean> {
	const present = await Promise.all(
		[".ts", ".tsx"].map((extension) =>
			ctx.fileExists(`${AUTH_MODULE_PATH}${extension}`),
		),
	);
	return present.some(Boolean);
}

export const nativeUi = plugin("native-ui", {
	label: "Native Design System",

	schema: nativeUiOptionsSchema,

	// Requires: docs/architecture/plugins/native-ui.md, "Requires and peers".
	requires: ["expo", "api", "query"],

	guide: [
		{
			page: "rules",
			trigger: "Writing or editing any `.tsx` of the phone app",
		},
		{
			page: "reference",
			trigger:
				"Importing a phone component, or setting the theme, words or fonts, or the scaffolded query client, or what a client of another app's server needs (`api({ server })`)",
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
			page: "audio",
			trigger: "Playing sound, or reading what is playing",
		},
	],

	// Consumer dependencies. A native module takes the version the app's Expo
	// SDK is built against; the rest are not in the SDK's table.
	dependencies: {
		// The `@source` root pointing into ui-core only resolves when the package
		// sits in the consumer's node_modules.
		"@fcalell/ui-core": stackSpec("@fcalell/ui-core"),
		uniwind: "^1.13.2",
		"@gorhom/bottom-sheet": "^5.2.14",
		"lucide-react-native": "^1.73.0",
		"@tanstack/react-query": "^5.107.1",
		"@better-auth/expo": "1.7.25",
		...sdkVersions([
			"react-native-gesture-handler",
			"react-native-reanimated",
			"react-native-worklets",
			"react-native-safe-area-context",
			"react-native-keyboard-controller",
			// lucide's required peer; also backs consumer brand glyphs. Without it a
			// fresh consumer can't render any icon.
			"react-native-svg",
			"expo-font",
			// The copy acts (Code, a row with a copy act) write the clipboard.
			"expo-clipboard",
			// Code's download act writes the text to a file and hands it to the share sheet.
			"expo-file-system",
			"expo-sharing",
			// file `Input`'s Choose act opens the system document picker.
			"expo-document-picker",
			// `Thread`'s composer's attach act opens the photo library beside the files.
			"expo-image-picker",
			"expo-secure-store",
			// Metro bundles optional peers: docs/architecture/plugins/native-ui.md, "Requires and peers".
			"expo-constants",
			"expo-linking",
			"expo-network",
			"expo-web-browser",
		]),
	},

	slots: {
		nativeAuthSource,
		nativeThemeSource,
		resolvedTheme,
		fonts,
		appCssSource,
	},

	contributes: (self) => [
		// ── uniwind Metro integration ────────────────────────────────────
		expo.slots.metroConfigImports.contribute(() => ({
			names: ["withUniwindConfig"],
			module: "uniwind/metro",
		})),
		expo.slots.metroPluginCalls.contribute(() => ({
			callee: "withUniwindConfig",
			options: { cssEntryFile: UNIWIND_CSS_ENTRY, dtsFile: UNIWIND_DTS },
			order: UNIWIND_METRO_ORDER,
		})),

		// ── expo-font: embed contributed font files natively ──────────────
		expo.slots.expoConfigPlugins.contribute(async (ctx) => {
			const fontEntries = await ctx.resolve(self.slots.fonts);
			const files = fontEntries.map((font) => font.source);
			if (files.length === 0) return undefined;
			return { name: "expo-font", options: { fonts: files } };
		}),

		// ── Provider composition (outer → inner) ─────────────────────────
		expo.slots.providers.contribute(() => gestureProvider),
		expo.slots.providers.contribute(() => keyboardProvider),
		expo.slots.providers.contribute(() => safeAreaProvider),
		expo.slots.providers.contribute(() => wordsProvider(self.options)),
		expo.slots.providers.contribute(() => queryProvider(self.options)),
		// When the Auth provider stands: docs/architecture/plugins/native-ui.md, "Provider order".
		expo.slots.providers.contribute(async (ctx) =>
			(await ctx.resolve(auth.slots.clientFlags)) === null &&
			self.options.authClientModule === undefined &&
			!((await ctx.resolve(api.slots.serverAuth)) && (await hasAuthModule(ctx)))
				? undefined
				: authProvider(self.options),
		),
		expo.slots.providers.contribute(() => updateWallProvider),
		expo.slots.providers.contribute(() => bottomSheetProvider),

		// The page for an address no route serves: expo writes it as the app's
		// `+not-found` route unless the app has one of its own.
		expo.slots.notFoundRoute.contribute(
			() => "@fcalell/plugin-native-ui/lib/not-found",
		),

		// ── Emit the uniwind entry stylesheet ─────────────────────────────
		emitArtifact(GLOBAL_CSS_ARTIFACT, self.slots.appCssSource),
		emitArtifact(NATIVE_AUTH_ARTIFACT, self.slots.nativeAuthSource),
		emitArtifact(NATIVE_THEME_ARTIFACT, self.slots.nativeThemeSource),
		// ui-core is no plugin: each UI plugin indexes its guide pages.
		cliSlots.guide.contribute(() => uiCoreGuide),
		// The entry sits in `.stack/`, beside the files it imports. uniwind
		// reads classes only from a stylesheet the app imports.
		expo.slots.entryImports.contribute(() => ({
			source: `./${basename(GLOBAL_CSS_ARTIFACT)}`,
			sideEffect: true,
		})),
		expo.slots.entryImports.contribute(async (ctx) =>
			(await ctx.resolve(self.slots.nativeThemeSource)) === null
				? undefined
				: { source: "./native-theme", sideEffect: true },
		),

		// ── Scaffold the native client modules the entry imports ──────────
		//
		// Scaffolds: docs/architecture/plugins/native-ui.md, "Native clients in src/lib".
		cliSlots.initScaffolds.contribute((ctx) => {
			if (self.options.queryClientModule) return undefined;
			return ctx.scaffold("lib-query.ts", `${QUERY_MODULE_PATH}.ts`);
		}),
		cliSlots.initScaffolds.contribute(async (ctx) => {
			if (self.options.authClientModule) return undefined;
			if ((await ctx.resolve(auth.slots.clientFlags)) === null)
				return undefined;
			return ctx.scaffold("lib-auth.ts", `${AUTH_MODULE_PATH}.ts`);
		}),
		cliSlots.removeFiles.contribute(() => [
			`${QUERY_MODULE_PATH}.ts`,
			`${AUTH_MODULE_PATH}.ts`,
		]),

		// uniwind types: docs/architecture/plugins/native-ui.md, "Type-checking".
		cliSlots.tsconfigTypes.contribute(() => "uniwind/types"),
	],
});

export type {
	NativeFontEntry,
	NativeUiOptions,
	Theme,
	Words,
} from "./types.ts";
