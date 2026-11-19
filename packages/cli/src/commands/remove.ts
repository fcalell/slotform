import { readFileSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join, relative } from "node:path";
import { log, outro } from "@clack/prompts";
import type { PluginConfig, StackConfig } from "../config.ts";
import { buildGraphFromDiscovered } from "../lib/build-graph.ts";
import { cliSlots } from "../lib/cli-slots.ts";
import { loadConfig } from "../lib/config.ts";
import { editConfig } from "../lib/config-writer.ts";
import {
	type DiscoveredPlugin,
	discoverPlugins,
	requirementOptions,
} from "../lib/discovery.ts";
import { isErrno } from "../lib/errno.ts";
import { MissingPluginError, StackError } from "../lib/errors.ts";
import { insideProject } from "../lib/inside-project.ts";
import { isRecord } from "../lib/is-record.ts";
import { toCamelCase } from "../lib/naming.ts";
import { confirm } from "../lib/prompt.ts";

async function removePluginCall(
	path: string,
	pluginName: string,
): Promise<void> {
	const callee = toCamelCase(pluginName);
	await editConfig(path, ({ config }) => {
		if (!Array.isArray(config.plugins)) return;
		const idx = config.plugins.findIndex(
			// biome-ignore lint/suspicious/noExplicitAny: magicast proxies are dynamically typed
			(p: any) => p?.$type === "function-call" && p.$callee === callee,
		);
		if (idx >= 0) {
			config.plugins.splice(idx, 1);
		}
	});
}

// Answers whether `pkg` changed: a field the pruning empties is deleted, and
// an empty field left by another tool counts as a change too.
function pruneObjectField(
	pkg: Record<string, unknown>,
	field: string,
	keys: ReadonlySet<string>,
): boolean {
	const current = pkg[field];
	if (!isRecord(current)) return false;
	let changed = false;
	for (const key of keys) {
		if (key in current) {
			delete current[key];
			changed = true;
		}
	}
	if (Object.keys(current).length === 0) {
		delete pkg[field];
		return true;
	}
	return changed;
}

function configEntry(config: StackConfig, pluginName: string): PluginConfig {
	const entry = config.plugins.find((p) => p.__plugin === pluginName);
	if (!entry) {
		throw new MissingPluginError(
			pluginName,
			`Plugin "${pluginName}" is not in your config.`,
		);
	}
	return entry;
}

export async function remove(
	pluginName: string,
	configPath: string,
	options: { yes?: boolean; env: NodeJS.ProcessEnv },
): Promise<void> {
	const config = await loadConfig(configPath);
	const cwd = process.cwd();
	configEntry(config, pluginName);

	// A workspace that does not load takes the degraded removal: docs/architecture/commands.md, "Removing a plugin".
	let discovered: DiscoveredPlugin[] | null = null;
	try {
		discovered = await discoverPlugins(config, cwd);
	} catch (err) {
		log.warn(
			`Could not load all plugins for dependency check: ${
				err instanceof Error ? err.message : String(err)
			}`,
		);
		log.warn(
			`Proceeding with a degraded removal of "${pluginName}" — only the package and the config call will be cleaned up. Run \`stack generate\` after fixing the workspace.`,
		);
	}

	// A sibling's requirement blocks removal: docs/architecture/commands.md, "Removing a plugin".
	if (discovered) {
		const dependents = discovered.filter((p) =>
			p.cli
				.requires(p.options)
				.some((req) => requirementOptions(req).includes(pluginName)),
		);
		if (dependents.length > 0) {
			const names = dependents.map((p) => p.name).join(", ");
			throw new StackError(
				`Cannot remove "${pluginName}" — required by: ${names}. Remove those first.`,
				"PLUGIN_HAS_DEPENDENTS",
			);
		}
	}

	const label = await uninstall(pluginName, {
		config,
		configPath,
		cwd,
		discovered,
		yes: options.yes,
		env: options.env,
	});

	// A degraded workspace would fail `generate` on the same load error.
	if (discovered) {
		const { generate } = await import("./generate.ts");
		try {
			await generate(configPath, options.env);
		} catch (error) {
			log.warn(
				`Could not regenerate (${error instanceof Error ? error.message : String(error)}); fix it, then run \`stack generate\`.`,
			);
		}
	}

	outro(`Removed ${label}`);
}

// The removals the graph of `plugins` contributes.
async function removals(
	plugins: DiscoveredPlugin[],
	config: StackConfig,
	cwd: string,
	env: NodeJS.ProcessEnv,
): Promise<{ files: string[]; deps: string[]; devDeps: string[] }> {
	const { graph } = buildGraphFromDiscovered({
		discovered: plugins,
		app: config.app,
		cwd,
		env,
	});
	const [files, deps, devDeps] = await Promise.all([
		graph.resolve(cliSlots.removeFiles),
		graph.resolve(cliSlots.removeDeps),
		graph.resolve(cliSlots.removeDevDeps),
	]);
	return { files, deps, devDeps };
}

// Removes the plugin's files, its dependencies and its config call, and
// answers its label. `discovered` is null when the workspace did not load,
// and then only the package and the config call go.
export async function uninstall(
	pluginName: string,
	{
		config,
		configPath,
		cwd,
		discovered,
		env,
		yes = false,
	}: {
		config: StackConfig;
		configPath: string;
		cwd: string;
		discovered: DiscoveredPlugin[] | null;
		env: NodeJS.ProcessEnv;
		// Deletes the plugin's files without asking. Without it, the paths are
		// listed and confirmed, and a session with no terminal refuses.
		yes?: boolean;
	},
): Promise<string> {
	const plugin = discovered?.find((p) => p.name === pluginName) ?? null;
	// What to remove comes from the graph and `__package`: docs/architecture/commands.md, "Removing a plugin".
	const packageName = configEntry(config, pluginName).__package;

	const own = plugin
		? await removals([plugin], config, cwd, env)
		: { files: [], deps: [], devDeps: [] };
	// A dependency a remaining plugin also declares stays.
	const kept = plugin
		? await removals(
				(discovered ?? []).filter((p) => p !== plugin),
				config,
				cwd,
				env,
			)
		: { files: [], deps: [], devDeps: [] };

	// Delete files, confined to the project: docs/architecture/commands.md, "Removing a plugin".
	const targets = own.files.map((path) => ({
		path,
		target: insideProject(cwd, path),
	}));
	if (targets.length > 0 && !yes) {
		const listing = targets
			.map(({ target }) => `  ${relative(cwd, target)}`)
			.join("\n");
		if (!process.stdin.isTTY) {
			throw new StackError(
				`Removing "${pluginName}" deletes:\n${listing}\nPass --yes to delete them without a terminal.`,
				"REMOVE_NEEDS_CONFIRMATION",
			);
		}
		log.warn(`Removing "${pluginName}" deletes:\n${listing}`);
		if (!(await confirm("Delete these paths?"))) {
			throw new StackError(
				"Cancelled; nothing was removed.",
				"REMOVE_CANCELLED",
			);
		}
	}
	// A path that cannot be deleted is reported; the package and the config
	// call still go.
	const removed: string[] = [];
	for (const { path, target } of targets) {
		try {
			await rm(target, { recursive: true, force: true });
			removed.push(path);
		} catch (error) {
			log.warn(
				`Could not delete ${path}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	if (removed.length > 0) {
		log.info(`Removed files: ${removed.join(", ")}`);
	}

	// Prunes `dependencies` and `devDependencies` of the plugin's own and its
	// package, dropping a field the pruning empties.
	const pkgPath = join(cwd, "package.json");
	let manifest: string | null = null;
	try {
		manifest = readFileSync(pkgPath, "utf-8");
	} catch (error) {
		if (!isErrno(error, "ENOENT")) throw error;
	}
	const pkg: unknown = manifest === null ? null : JSON.parse(manifest);
	if (isRecord(pkg)) {
		const prune = (declared: string[], keep: string[]) =>
			new Set([...declared, packageName].filter((d) => !keep.includes(d)));
		const removalsByField: Record<string, ReadonlySet<string>> = {
			dependencies: prune(own.deps, kept.deps),
			devDependencies: prune(own.devDeps, kept.devDeps),
		};
		let changed = false;
		for (const [field, keys] of Object.entries(removalsByField)) {
			if (pruneObjectField(pkg, field, keys)) changed = true;
		}
		if (changed) {
			writeFileSync(pkgPath, `${JSON.stringify(pkg, null, "\t")}\n`);
		}
	}

	const fullConfigPath = join(cwd, configPath);
	await removePluginCall(fullConfigPath, pluginName);

	return plugin?.cli.label ?? pluginName;
}
