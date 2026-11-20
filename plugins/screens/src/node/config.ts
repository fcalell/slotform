import { literalToProps, type TsExpression } from "@slotform/cli/ast";
import { routerPluginFor } from "@slotform/react/codegen";
import { renderViteConfig, type ViteConfigValues } from "@slotform/vite/node";
import type { ScreensConfigValues } from "../types.ts";
import { START_VIEWPORT } from "../widths.ts";
import { TEST_STORYBOOK_DIR, VITE_CONFIG } from "./files.ts";
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

// The directory the generated config sits in, `.slotform/`.
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
// a workspace-linked Slotform checkout serves the preview from beside the app's.
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
					args: [{ kind: "string", value: "@slotform/screens" }],
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
					{ key: "slotformDir", value: configDir },
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
				{ source: "@slotform/screens/vite", named: ["screensPlugin"] },
			],
			pluginCalls: [router.call, ...values.pluginCalls, plugin],
			fsAllow: [...values.fsAllow, ownRoot],
			// The stories import `virtual:slotform-screens` through this package,
			// which `screensPlugin` serves.
			optimizeExclude: [...values.optimizeExclude, "@slotform/screens"],
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
				{ source: "@slotform/screens/vite", named: ["storybookHost"] },
			],
			pluginCalls: [
				...values.pluginCalls,
				{ kind: "call", callee: ident("storybookHost"), args: [] },
			],
		}),
	);
}

// `.slotform/screens/main.ts`: Storybook's config directory holds this one file.
// The one for the test run (`.slotform/screens-test/main.ts`) adds the checks.
export function renderStorybookMain(options: { checks: boolean }): string {
	return [
		'import { fileURLToPath } from "node:url";',
		'import { screensMain } from "@slotform/screens/storybook";',
		"",
		"export default screensMain({",
		`\tchecks: ${options.checks},`,
		"\t// The project root, two levels above this file.",
		'\troot: fileURLToPath(new URL("../..", import.meta.url)),',
		"});",
		"",
	].join("\n");
}

// `.slotform/screens.vitest.config.ts`: docs/architecture/plugins/screens.md, "Vitest config".
export function renderVitestConfig(): string {
	return `import { fileURLToPath } from "node:url";
import { workspaceTriggers } from "@slotform/screens/node";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { chrome, inputCommands } from "@slotform/screens/browser";
import { configDefaults, defineConfig } from "vitest/config";
import screens from "./${VITE_CONFIG}";

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
	envPrefix: ["VITE_", "SLOTFORM_SCREENS_"],
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
						configDir: fileURLToPath(new URL("./${TEST_STORYBOOK_DIR}", import.meta.url)),
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
						provider: chrome(process.env),
						commands: inputCommands,
						instances: [
							{ browser: "chromium", viewport: { width: ${START_VIEWPORT.width}, height: ${START_VIEWPORT.height} } },
						],
					},
				},
			},
		],
	},
});
`;
}
