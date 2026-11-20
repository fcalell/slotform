import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { GENERATED_DIR } from "@slotform/cli";
import type { StorybookConfig } from "@storybook/react-vite";
import { VITE_CONFIG } from "./files.ts";
import { STORIES_DIR } from "./stories.ts";

interface ScreensMainOptions {
	// Also load the test run's checks, which add to every screen.
	checks: boolean;
	// The project root, where `.slotform/` lives.
	root: string;
}

// The Storybook config of the screens and test hosts: docs/architecture/plugins/screens.md, "Storybook host".
export function screensMain({
	checks,
	root,
}: ScreensMainOptions): StorybookConfig {
	return {
		stories: [`../../${STORIES_DIR}/**/*.stories.ts`],
		addons: ["@storybook/addon-a11y"],
		framework: {
			name: "@storybook/react-vite",
			options: {
				builder: {
					viteConfigPath: join(root, GENERATED_DIR, VITE_CONFIG),
				},
			},
		},
		previewAnnotations: (entries = []) => [
			...entries,
			fileURLToPath(import.meta.resolve("@slotform/screens/preview")),
			...(checks
				? [fileURLToPath(import.meta.resolve("@slotform/screens/checks"))]
				: []),
		],
	};
}
