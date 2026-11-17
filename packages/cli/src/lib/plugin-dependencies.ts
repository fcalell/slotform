import { cliSlots } from "./cli-slots.ts";
import type { Graph } from "./graph.ts";
import { stackPluginSpecs } from "./stack-packages.ts";

interface PluginDependencies {
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
}

// The dependencies `stack init` and `stack add` write: docs/architecture/consumer-project.md, "Installing stack".
export async function pluginDependencies(
	graph: Graph,
	plugins: readonly string[],
	commit: string | null,
): Promise<PluginDependencies> {
	const [deps, devDependencies] = await Promise.all([
		graph.resolve(cliSlots.initDeps),
		graph.resolve(cliSlots.initDevDeps),
	]);
	return {
		dependencies: { ...deps, ...stackPluginSpecs(plugins, commit) },
		devDependencies,
	};
}
