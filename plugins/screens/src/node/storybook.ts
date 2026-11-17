import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
import { STORIES_DIR } from "./stories.ts";

export interface ScreensMainOptions {
	// Also load the test run's checks, which add to every screen.
	checks: boolean;
	// The project root, where `.stack/` lives. The generated `main.ts` passes the
	// root it sits two levels under; without it, the process's directory, which
	// is the root only when Storybook or Vitest was started from there.
	root?: string;
}

// The Storybook config of the screens and test hosts: docs/architecture/plugins/screens.md, "Storybook host".
export function screensMain({
	checks,
	root = process.cwd(),
}: ScreensMainOptions): StorybookConfig {
	return {
		stories: [`../../${STORIES_DIR}/**/*.stories.ts`],
		addons: ["@storybook/addon-a11y"],
		framework: {
			name: "@storybook/react-vite",
			options: {
				builder: {
					viteConfigPath: join(root, ".stack", "screens.vite.config.ts"),
				},
			},
		},
		previewAnnotations: (entries = []) => [
			...entries,
			fileURLToPath(import.meta.resolve("@fcalell/plugin-screens/preview")),
			...(checks
				? [fileURLToPath(import.meta.resolve("@fcalell/plugin-screens/checks"))]
				: []),
		],
	};
}
