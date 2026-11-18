import { pathToFileURL } from "node:url";
import type { StackConfig } from "../config.ts";
import type {
	InternalCliPlugin,
	OneOfRequirement,
	PluginFactory,
	Requirement,
} from "./create-plugin.ts";
import { PLUGIN_NAMES, pluginPackage } from "./first-party.ts";
import { toCamelCase } from "./naming.ts";
import { resolveFromApp } from "./package-info.ts";
import type { Slot } from "./slots.ts";

// A loaded plugin tied to its per-config options. `factory` is the
// `plugin()` result; the graph builder calls its `cli.collect(ctx)` for the
// plugin's slots and contributions.
export interface DiscoveredPlugin {
	name: string;
	cli: InternalCliPlugin<unknown, Record<string, Slot<unknown>>, unknown>;
	factory: PluginFactory<
		string,
		unknown,
		Record<string, Slot<unknown>>,
		Record<string, never>
	>;
	options: unknown;
}

async function loadPlugin(
	name: string,
	packageName: string,
	options: unknown,
): Promise<DiscoveredPlugin> {
	let mod: Record<string, unknown>;
	try {
		mod = await import(packageName);
	} catch (cause) {
		// Fallback: resolve the package from the consumer's cwd. ESM `import()`
		// resolves relative to this file's location, so when the CLI is run via
		// its symlinked bin and the plugin lives only in the consumer's
		// `node_modules` (not the CLI's), the primary import fails. Retrying
		// via `createRequire(cwd)` follows the consumer's resolution tree.
		try {
			const resolved = resolveFromApp(packageName, process.cwd());
			mod = await import(pathToFileURL(resolved).href);
		} catch {
			const detail = cause instanceof Error ? cause.message : String(cause);
			throw new Error(
				`Failed to load CLI plugin for "${name}" (${detail}). ` +
					`Run: pnpm add ${packageName}`,
			);
		}
	}
	const camelName = toCamelCase(name);
	// A dynamic import types its exports `unknown`; the `.cli` check below confirms the shape.
	const pluginExport = (mod[camelName] ?? mod[name] ?? mod.default) as
		| PluginFactory<
				string,
				unknown,
				Record<string, Slot<unknown>>,
				Record<string, never>
		  >
		| undefined;
	if (!pluginExport?.cli) {
		throw new Error(
			`Plugin "${name}" (${packageName}) does not export a valid plugin. ` +
				`Expected an export named "${camelName}", "${name}", or a default export ` +
				`created with plugin().`,
		);
	}
	return { name, cli: pluginExport.cli, factory: pluginExport, options };
}

// Never load an absent plugin: docs/architecture/plugin-authoring.md, "Plugin discovery".
export async function loadInstalledPlugins(
	names: readonly string[],
): Promise<DiscoveredPlugin[]> {
	const results: DiscoveredPlugin[] = [];
	for (const name of PLUGIN_NAMES) {
		if (!names.includes(name)) continue;
		results.push(await loadPlugin(name, pluginPackage(name), {}));
	}
	return results;
}

// The plugins any one of which satisfies a requirement.
export function requirementOptions(req: Requirement): readonly string[] {
	return typeof req === "string" ? [req] : req.oneOf;
}

// Picks the plugin that meets a one-of requirement the selection does not;
// `plugin` is the plugin that declares it.
export type ChooseRequirement = (
	req: OneOfRequirement,
	plugin: string,
) => Promise<string>;

const chooseFirst: ChooseRequirement = async (req) => req.oneOf[0];

// Transitive `requires` closure, shared by `stack init` and `stack add`: docs/architecture/commands.md, "Installing the requires closure".
export async function resolveRequiresClosure(
	names: readonly string[],
	available: readonly DiscoveredPlugin[],
	choose: ChooseRequirement = chooseFirst,
): Promise<string[]> {
	const byName = new Map(available.map((p) => [p.name, p]));
	const ordered: string[] = [];
	const seen = new Set<string>();
	const oneOfs: { req: OneOfRequirement; plugin: string }[] = [];

	const visit = (name: string): void => {
		if (seen.has(name)) return;
		seen.add(name);
		const found = byName.get(name);
		for (const req of found?.cli.requires(found.options) ?? []) {
			if (typeof req === "string") visit(req);
			else oneOfs.push({ req, plugin: name });
		}
		ordered.push(name);
	};

	for (const name of names) visit(name);
	for (let next = oneOfs.shift(); next; next = oneOfs.shift()) {
		if (next.req.oneOf.some((name) => seen.has(name))) continue;
		visit(await choose(next.req, next.plugin));
	}
	return ordered;
}

export async function discoverPlugins(
	config: StackConfig,
): Promise<DiscoveredPlugin[]> {
	const plugins: DiscoveredPlugin[] = [];

	for (const pluginConfig of config.plugins) {
		plugins.push(
			await loadPlugin(
				pluginConfig.__plugin,
				pluginConfig.__package,
				pluginConfig.options,
			),
		);
	}

	validateDependencies(plugins);

	return plugins;
}

// Presence check only: docs/architecture/slot-graph.md, "`requires`".
export function validateDependencies(plugins: DiscoveredPlugin[]): void {
	const available = new Set(plugins.map((p) => p.name));

	for (const plugin of plugins) {
		for (const req of plugin.cli.requires(plugin.options)) {
			const options = requirementOptions(req);
			const present = options.filter((name) => available.has(name));
			if (present.length === 1) continue;
			const quoted = options.map((name) => `'${name}'`).join(", ");
			const calls = options.map((name) => `${toCamelCase(name)}()`);
			if (present.length > 1) {
				throw new Error(
					`[${plugin.name}] requires exactly one of ${quoted}, but your config has ${present.join(", ")}. Remove all but one.`,
				);
			}
			throw new Error(
				typeof req === "string"
					? `[${plugin.name}] requires plugin '${req}', but it is not in your config. Add ${calls[0]} to plugins array.`
					: `[${plugin.name}] requires one of ${quoted}, but none is in your config. Add ${calls.join(" or ")} to plugins array.`,
			);
		}
	}
}
