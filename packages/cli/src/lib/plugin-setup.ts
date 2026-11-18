// The steps `stack init` and `stack add` share: docs/architecture/commands.md, "`stack init` and `stack add`".
import { cliSlots } from "./cli-slots.ts";
import {
	type ChooseRequirement,
	type DiscoveredPlugin,
	loadInstalledPlugins,
	resolveRequiresClosure,
} from "./discovery.ts";
import type { Graph } from "./graph.ts";
import { installStack, pinnedStackCommit } from "./install.ts";
import { pluginDependencies } from "./plugin-dependencies.ts";
import { createPromptContext } from "./prompt.ts";
import {
	announceCreated,
	ensureGitignore,
	patchPackageJson,
	writeScaffoldSpecs,
} from "./scaffold.ts";

// The domain an app takes until its owner names one.
export const DEFAULT_DOMAIN = "example.com";

// Installs `picked` and every plugin its requires closure adds, until the
// closure stops growing: docs/architecture/commands.md, "Installing the requires closure".
// `writeManifest` puts the plugins to install in `package.json`; `existing`
// are installed already and stay out of the answer.
export async function installClosure({
	dir,
	existing,
	picked,
	writeManifest,
	pick,
}: {
	dir: string;
	existing: readonly string[];
	picked: readonly string[];
	writeManifest: (plugins: string[]) => void;
	pick?: ChooseRequirement;
}): Promise<{ plugins: string[]; available: DiscoveredPlugin[] }> {
	let plugins = [...picked];
	for (;;) {
		writeManifest(plugins);
		installStack(dir);
		const available = await loadInstalledPlugins([...existing, ...plugins]);
		const closure = (
			await resolveRequiresClosure([...existing, ...plugins], available, pick)
		).filter((n) => !existing.includes(n));
		if (closure.length === plugins.length) return { plugins, available };
		plugins = closure;
	}
}

// The loaded plugins with the options their factories validate from
// `answers` (`{}` for a plugin with none).
export function withOptions(
	available: readonly DiscoveredPlugin[],
	answers: ReadonlyMap<string, Record<string, unknown>>,
): DiscoveredPlugin[] {
	return available.map((p) => ({
		...p,
		options: p.factory(answers.get(p.name) ?? {}).options,
	}));
}

// Asks the prompts of `plugins`, each seeing the answers before it: docs/architecture/commands.md, "Prompts".
export async function askPrompts(
	graph: Graph,
	plugins: readonly string[],
	nonInteractive: boolean,
): Promise<Map<string, Record<string, unknown>>> {
	const answers = new Map<string, Record<string, unknown>>(
		plugins.map((p) => [p, {}]),
	);
	const prompt = createPromptContext({ nonInteractive });
	for (const spec of await graph.resolve(cliSlots.initPrompts)) {
		if (!answers.has(spec.plugin)) continue;
		answers.set(
			spec.plugin,
			await spec.ask({ prompt }, Object.fromEntries(answers)),
		);
	}
	return answers;
}

// Writes the scaffolds of `plugins`, the dependencies, `package.json` fields
// and gitignore entries the graph holds, then installs; answers the files it
// created.
export async function applyScaffold(
	graph: Graph,
	plugins: readonly string[],
	dir: string,
): Promise<string[]> {
	const [scaffolds, dependencies, gitignore, packageJsonFields] =
		await Promise.all([
			graph.resolve(cliSlots.initScaffolds),
			pluginDependencies(graph, plugins, pinnedStackCommit(dir)),
			graph.resolve(cliSlots.gitignore),
			graph.resolve(cliSlots.packageJsonFields),
		]);
	const created = await writeScaffoldSpecs(
		scaffolds.filter((s) => plugins.includes(s.plugin)),
		dir,
	);
	announceCreated(created);
	patchPackageJson(dir, { ...dependencies, fields: packageJsonFields });
	if (gitignore.length > 0) ensureGitignore(dir, ...gitignore);
	installStack(dir);
	return created;
}
