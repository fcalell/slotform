import { literalToProps, type TsExpression } from "@fcalell/cli/ast";
import { routerPluginFor } from "@fcalell/plugin-react/codegen";
import {
	renderViteConfig,
	type ViteConfigValues,
} from "@fcalell/plugin-vite/node";
import type { ScreensConfigValues } from "../types.ts";
import {
	EXCLUDE_ENV,
	FULL_ENV,
	OPEN_ENV,
	SHOTS_ENV,
	WIDTHS_ENV,
} from "./select.ts";

// The app's fixtures module, beside the routes by convention.
export const FIXTURES = "src/app/fixtures.ts";

const ident = (name: string): TsExpression => ({ kind: "identifier", name });

// The directory the generated config sits in, `.stack/`.
const configDir: TsExpression = {
	kind: "call",
	callee: ident("fileURLToPath"),
	args: [
		{
			kind: "new",
			callee: ident("URL"),
			args: [
				{ kind: "string", value: "." },
				{ kind: "member", object: ident("import.meta"), property: "url" },
			],
		},
	],
};

// This package's own location: Vite 403s a path outside its workspace root, and
// a workspace-linked stack checkout serves the preview from beside the app's.
const ownRoot: TsExpression = {
	kind: "call",
	callee: ident("searchForWorkspaceRoot"),
	args: [
		{
			kind: "call",
			callee: ident("fileURLToPath"),
			args: [
				{
					kind: "call",
					callee: {
						kind: "member",
						object: ident("import.meta"),
						property: "resolve",
					},
					args: [{ kind: "string", value: "@fcalell/plugin-screens" }],
				},
			],
		},
	],
};

// What every Storybook host changes: docs/architecture/plugins/screens.md, "Storybook host".
function hosted(values: ViteConfigValues): ViteConfigValues {
	return { ...values, serverProxy: [], clientHeaders: {}, devServerPort: 0 };
}

// The screens host's Vite config: docs/architecture/plugins/screens.md, "Screens Vite config".
export function renderScreensConfig(values: ScreensConfigValues): string {
	const props = literalToProps({
		fixtures: `../${FIXTURES}`,
		routesDir: `../${values.routesDir}`,
		entryImports: values.entryImports.flatMap((spec) =>
			"sideEffect" in spec ? [spec.source] : [],
		),
		routerBindings: values.routerBindings.flatMap((spec) =>
			"named" in spec
				? spec.named.map((entry) => ({
						source: spec.source,
						name: typeof entry === "string" ? entry : entry.name,
					}))
				: [],
		),
		prefixes: values.prefixes,
		handlerModules: values.handlerModules,
		fixtureModules: values.fixtureModules,
		previewGlobals: values.previewGlobals,
	});
	const plugin: TsExpression = {
		kind: "call",
		callee: ident("screensPlugin"),
		args: [
			{
				kind: "object",
				properties: [
					{ key: "stackDir", value: configDir },
					...Object.entries(props).map(([key, value]) => ({ key, value })),
				],
			},
		],
	};
	const router = routerPluginFor({
		...values.routerOptions,
		autoCodeSplitting: false,
	});
	return renderViteConfig(
		hosted({
			...values,
			configImports: [
				...values.configImports,
				...router.imports,
				{ source: "node:url", named: ["fileURLToPath"] },
				{ source: "@fcalell/plugin-screens/vite", named: ["screensPlugin"] },
			],
			pluginCalls: [router.call, ...values.pluginCalls, plugin],
			fsAllow: [...values.fsAllow, ownRoot],
			// The stories import `virtual:stack-screens` through this package,
			// which `screensPlugin` serves.
			optimizeExclude: [...values.optimizeExclude, "@fcalell/plugin-screens"],
		}),
	);
}

// The Vite config of a Storybook that draws components: docs/architecture/plugins/screens.md, "A Storybook that draws components".
export function renderComponentHostConfig(values: ViteConfigValues): string {
	return renderViteConfig(
		hosted({
			...values,
			configImports: [
				...values.configImports,
				{ source: "@fcalell/plugin-screens/vite", named: ["storybookHost"] },
			],
			pluginCalls: [
				...values.pluginCalls,
				{ kind: "call", callee: ident("storybookHost"), args: [] },
			],
		}),
	);
}

// `.stack/screens/main.ts`: Storybook's config directory holds this one file.
// The one for the test run (`.stack/screens-test/main.ts`) adds the floors.
export function renderStorybookMain(options: { floors: boolean }): string {
	return [
		'import { fileURLToPath } from "node:url";',
		'import { screensMain } from "@fcalell/plugin-screens/storybook";',
		"",
		"export default screensMain({",
		`\tfloors: ${options.floors},`,
		"\t// The project root, two levels above this file.",
		'\troot: fileURLToPath(new URL("../..", import.meta.url)),',
		"});",
		"",
	].join("\n");
}

// `.stack/screens.vitest.config.ts`: docs/architecture/plugins/screens.md, "Vitest config".
export function renderVitestConfig(): string {
	return `import { fileURLToPath } from "node:url";
import { workspaceTriggers } from "@fcalell/plugin-screens/node";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { chrome, inputCommands } from "@fcalell/plugin-screens/browser";
import { configDefaults, defineConfig } from "vitest/config";
import screens from "./screens.vite.config.ts";

const list = (value: string | undefined) =>
	(value ?? "").split(",").filter(Boolean);
const widths = list(process.env.${WIDTHS_ENV}).map(Number);
const exclude = list(process.env.${EXCLUDE_ENV});
const shots = process.env.${SHOTS_ENV} ?? "";
const full = process.env.${FULL_ENV} === "1";
const open = process.env.${OPEN_ENV} ?? "";

export default defineConfig({
	...screens,
	// The story reads \`--search\` from \`import.meta.env\`.
	envPrefix: ["VITE_", "STACK_SCREENS_"],
	test: {
		// A change to a linked package's compiled side reaches no screen's module
		// graph, so it reruns every screen.
		forceRerunTriggers: [
			...configDefaults.forceRerunTriggers,
			...workspaceTriggers(fileURLToPath(new URL("..", import.meta.url))),
		],
		projects: [
			{
				extends: true,
				plugins: [
					storybookTest({
						configDir: fileURLToPath(new URL("./screens-test", import.meta.url)),
						tags: { exclude },
					}),
				],
				test: {
					name: "screens",
					provide: {
						screensWidths: widths,
						screensShots: shots,
						screensFull: full,
						screensOpen: open,
					},
					testTimeout: 120_000,
					maxWorkers: 2,
					browser: {
						enabled: true,
						headless: true,
						// The shared Chrome, with reduced motion, so every transition
						// snaps and a screen is judged at rest, as the run's walk expects.
						provider: chrome(),
						commands: inputCommands,
						instances: [
							{ browser: "chromium", viewport: { width: 1280, height: 800 } },
						],
					},
				},
			},
		],
	},
});
`;
}
