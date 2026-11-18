import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AppConfig, StackConfig } from "../config.ts";
import { corePlugin } from "./core-plugin.ts";
import { type DiscoveredPlugin, discoverPlugins } from "./discovery.ts";
import { ConfigValidationError } from "./errors.ts";
import { buildGraph, type Graph } from "./graph.ts";
import { createLogContext } from "./prompt.ts";
import type { LogContext } from "./slots.ts";

export interface BuildGraphFromConfigOptions {
	config: StackConfig;
	cwd: string;
	log?: LogContext;
}

export interface BuildGraphFromConfigResult {
	graph: Graph;
	// Config order, no sort: docs/architecture/slot-graph.md, "Ordering by data".
	plugins: DiscoveredPlugin[];
}

// A config's graph: validated, its plugins loaded, then built.
export async function buildGraphFromConfig(
	opts: BuildGraphFromConfigOptions,
): Promise<BuildGraphFromConfigResult> {
	const validation = opts.config.validate();
	if (!validation.valid) throw new ConfigValidationError(validation.errors);

	const discovered = await discoverPlugins(opts.config);
	return buildGraphFromDiscovered({
		discovered,
		app: opts.config.app,
		cwd: opts.cwd,
		log: opts.log,
	});
}

export interface BuildGraphFromDiscoveredOptions {
	discovered: DiscoveredPlugin[];
	app: AppConfig;
	cwd: string;
	log?: LogContext;
}

// The graph of plugins already loaded, beside the CLI's own contributions.
export function buildGraphFromDiscovered(
	opts: BuildGraphFromDiscoveredOptions,
): BuildGraphFromConfigResult {
	const { cwd } = opts;
	const plugins = opts.discovered.map((d) => ({
		name: d.name,
		...d.cli.collect({ app: opts.app, options: d.options }),
	}));

	const graph = buildGraph(
		[...plugins, corePlugin(opts.discovered.map((d) => d.name))],
		{
			app: opts.app,
			cwd,
			log: opts.log ?? createLogContext(),
			ctxForPlugin: (pluginName) => {
				const plugin = opts.discovered.find((d) => d.name === pluginName);
				// Only a plugin ships templates; the CLI's own contributions use none.
				const noTemplates = (name: string): never => {
					throw new Error(
						`'${pluginName}' has no templates; it asked for '${name}'.`,
					);
				};
				return {
					options: plugin?.options ?? {},
					fileExists: async (path: string) => {
						try {
							await access(join(cwd, path));
							return true;
						} catch {
							return false;
						}
					},
					readFile: async (path: string) => readFile(join(cwd, path), "utf-8"),
					template: plugin ? plugin.cli.template : noTemplates,
					scaffold: plugin ? plugin.cli.scaffold : noTemplates,
				};
			},
		},
	);

	return { graph, plugins: opts.discovered };
}
