import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { log, outro } from "@clack/prompts";
import { builders } from "magicast";
import { buildGraphFromDiscovered } from "../lib/build-graph.ts";
import { loadConfig } from "../lib/config.ts";
import { editConfig } from "../lib/config-writer.ts";
import {
	type DiscoveredPlugin,
	loadInstalledPlugins,
} from "../lib/discovery.ts";
import { MissingPluginError } from "../lib/errors.ts";
import { assertKnownPlugins } from "../lib/first-party.ts";
import { isRecord } from "../lib/is-record.ts";
import { toCamelCase } from "../lib/naming.ts";
import {
	applyScaffold,
	askPrompts,
	DEFAULT_DOMAIN,
	installClosure,
	withOptions,
} from "../lib/plugin-setup.ts";
import { confirm } from "../lib/prompt.ts";
import { patchPackageJson } from "../lib/scaffold.ts";
import { slotformPluginSpecs } from "../lib/slotform-packages.ts";
import { uninstall } from "./remove.ts";

// The app's plugins that `name` replaces: each one meeting a one-of
// requirement `name` also meets, since a one-of is met by exactly one plugin.
function displacedBy(
	name: string,
	plugins: readonly DiscoveredPlugin[],
): string[] {
	const present = new Set(plugins.map((p) => p.name));
	const displaced = new Set<string>();
	for (const plugin of plugins) {
		for (const req of plugin.cli.requires(plugin.options)) {
			if (typeof req === "string" || !req.oneOf.includes(name)) continue;
			for (const option of req.oneOf) {
				if (option !== name && present.has(option)) displaced.add(option);
			}
		}
	}
	return [...displaced];
}

export async function add(
	pluginName: string,
	configPath: string,
	options: { yes?: boolean; env: NodeJS.ProcessEnv },
): Promise<void> {
	assertKnownPlugins([pluginName]);

	const cwd = process.cwd();
	const fullConfigPath = resolve(cwd, configPath);
	// No config file yet is an app with no plugins; a config that fails to
	// load stops here.
	const existingConfig = existsSync(fullConfigPath)
		? await loadConfig(fullConfigPath)
		: null;

	const configuredNames = existingConfig
		? existingConfig.plugins.map((p) => p.__plugin)
		: [];

	if (configuredNames.includes(pluginName)) {
		log.info(`${pluginName} is already configured.`);
		return;
	}

	const nonInteractive = !process.stdin.isTTY;

	// A plugin meeting a one-of the app already meets replaces the one meeting it: docs/architecture/commands.md, "Installing the requires closure".
	let configured = await loadInstalledPlugins(configuredNames, cwd);
	const displaced = displacedBy(pluginName, configured);
	if (existingConfig && displaced.length > 0) {
		if (
			!nonInteractive &&
			!(await confirm(`Replace ${displaced.join(", ")} with ${pluginName}?`))
		) {
			outro("Nothing changed");
			return;
		}
		for (const name of displaced) {
			await uninstall(name, {
				config: existingConfig,
				configPath,
				cwd,
				discovered: configured,
				yes: options.yes,
				env: options.env,
			});
			configured = configured.filter((p) => p.name !== name);
			log.info(`Removed ${name}, which ${pluginName} replaces.`);
		}
	}

	const existingPluginNames = configuredNames.filter(
		(n) => !displaced.includes(n),
	);

	const { plugins: pluginsToAdd, available } = await installClosure({
		dir: cwd,
		existing: existingPluginNames,
		picked: [pluginName],
		env: options.env,
		writeManifest: (plugins) =>
			patchPackageJson(cwd, {
				dependencies: slotformPluginSpecs(plugins),
			}),
	});
	const pluginInfo = available.find((p) => p.name === pluginName);
	if (!pluginInfo) {
		throw new MissingPluginError(
			pluginName,
			`"${pluginName}" is installed but does not load.`,
		);
	}
	const addedInfos = pluginsToAdd.flatMap((n) =>
		available.filter((p) => p.name === n),
	);
	const siblings = pluginsToAdd.filter((n) => n !== pluginName);
	if (siblings.length > 0) {
		log.info(
			`${pluginInfo.cli.label} requires ${siblings.join(", ")} — ` +
				`adding ${siblings.length === 1 ? "it" : "them"} automatically.`,
		);
	}

	const app = existingConfig?.app ?? { name: "app", domain: DEFAULT_DOMAIN };

	// The graph holds the app's remaining plugins with their configured
	// options beside the added ones, so slot resolution sees every sibling.
	const existingOptions = new Map<string, Record<string, unknown>>();
	for (const p of existingConfig?.plugins ?? []) {
		if (!existingPluginNames.includes(p.__plugin)) continue;
		existingOptions.set(p.__plugin, isRecord(p.options) ? p.options : {});
	}

	// A failure here stops before `editConfig`: the config never names a plugin
	// whose scaffold, dependencies or install did not land.
	const { graph } = buildGraphFromDiscovered({
		discovered: withOptions(available, existingOptions),
		app,
		cwd,
		env: options.env,
	});

	const answersByPlugin = await askPrompts(graph, pluginsToAdd, nonInteractive);
	await applyScaffold(graph, pluginsToAdd, cwd, options.env);

	// magicast keeps the config's comments and formatting.
	if (existingConfig) {
		await editConfig(fullConfigPath, ({ mod, config: ast }) => {
			if (!ast.plugins) ast.plugins = [];
			for (const info of addedInfos) {
				const importName = toCamelCase(info.name);
				mod.imports.$append({
					from: info.cli.package,
					imported: importName,
					local: importName,
				});
				const answers = answersByPlugin.get(info.name) ?? {};
				const call =
					Object.keys(answers).length > 0
						? builders.functionCall(importName, answers)
						: builders.functionCall(importName);
				ast.plugins.push(call);
			}
		});
	}

	const { generate } = await import("./generate.ts");
	try {
		await generate(configPath, options.env);
	} catch (error) {
		log.warn(
			`Could not run generate (${error instanceof Error ? error.message : String(error)}); fix it, then run \`slotform generate\`.`,
		);
	}

	outro(`Added ${addedInfos.map((i) => i.cli.label).join(", ")}`);
}
