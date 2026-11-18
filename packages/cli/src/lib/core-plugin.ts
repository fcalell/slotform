import { LINT_PATH, lintConfig } from "../templates/biome.ts";
import { tsconfigLayout, workerTsconfig } from "../templates/tsconfig.ts";
import { cliSlots } from "./cli-slots.ts";
import type { GraphPlugin } from "./graph.ts";
import { cliGuide, GUIDE_PATH, renderGuide } from "./guide.ts";
import { cliManifest } from "./manifest.ts";

// The CLI's own contributions: facts only core knows (which tsconfig
// `stack init` wrote for the worker), its guide pages, the guide's index and
// the lint config.
export function corePlugin(pluginNames: readonly string[]): GraphPlugin {
	const layout = tsconfigLayout(pluginNames);
	return {
		name: "cli",
		contributes: [
			cliSlots.workerTsconfig.contribute(() => workerTsconfig(layout)),
			cliSlots.guide.contribute(() =>
				cliGuide.map((e) => ({
					domain: "cli",
					package: cliManifest.name,
					...e,
				})),
			),
			cliSlots.artifactFiles.contribute(async (ctx) => ({
				path: GUIDE_PATH,
				content: renderGuide(await ctx.resolve(cliSlots.guide)),
			})),
			cliSlots.artifactFiles.contribute(async (ctx) => ({
				path: LINT_PATH,
				content: lintConfig(
					await ctx.resolve(cliSlots.lintPlugins),
					await ctx.resolve(cliSlots.lintIgnore),
				),
			})),
		],
	};
}
