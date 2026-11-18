import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	realpathSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { basename, join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { intro, log, note, outro } from "@clack/prompts";
import { buildGraphFromDiscovered } from "../lib/build-graph.ts";
import { cliSlots } from "../lib/cli-slots.ts";
import {
	type ChooseRequirement,
	loadInstalledPlugins,
	validateDependencies,
} from "../lib/discovery.ts";
import { StackError } from "../lib/errors.ts";
import {
	assertKnownPlugins,
	PLUGIN_NAMES,
	pluginPackage,
} from "../lib/first-party.ts";
import { pinnedStackCommit, stackWorkspaceRoot } from "../lib/install.ts";
import { TS_MORPH_SPEC } from "../lib/manifest.ts";
import {
	applyScaffold,
	askPrompts,
	DEFAULT_DOMAIN,
	installClosure,
	withOptions,
} from "../lib/plugin-setup.ts";
import { ask, choose, multi } from "../lib/prompt.ts";
import {
	announceCreated,
	patchPackageJson,
	writeIfMissingString,
} from "../lib/scaffold.ts";
import { stackPluginSpecs } from "../lib/stack-packages.ts";
import { biomeTemplate } from "../templates/biome.ts";
import { claudeMdTemplate } from "../templates/claude-md.ts";
import { editorconfigTemplate } from "../templates/editorconfig.ts";
import { gitignoreTemplate } from "../templates/gitignore.ts";
import { packageJsonTemplate } from "../templates/package-json.ts";
import { stackConfigTemplate } from "../templates/stack-config.ts";
import { tsconfigLayout, tsconfigTemplate } from "../templates/tsconfig.ts";

interface InitOptions {
	plugins?: string[];
	domain?: string;
	yes: boolean;
	// Scaffold into a directory that already holds a project.
	force: boolean;
	// `dir` was named on the command line rather than defaulted to the cwd.
	dirGiven: boolean;
}

// Refuses a target `init` would scaffold into by accident: the cwd with no
// terminal to say so (it would write a project with zero plugins), or a
// directory that already holds a project.
export function assertInitTarget(
	dir: string,
	{ dirGiven, force, tty }: { dirGiven: boolean; force: boolean; tty: boolean },
): void {
	if (!dirGiven && !tty) {
		throw new StackError(
			"stack init needs a directory when stdin is not a terminal: `stack init <dir>`.",
			"INIT_NEEDS_DIR",
		);
	}
	if (
		!force &&
		(existsSync(join(dir, "package.json")) ||
			existsSync(join(dir, "stack.config.ts")))
	) {
		throw new StackError(
			"this directory already has a project; use `stack add <plugin>` (or pass --force to scaffold into it anyway).",
			"INIT_PROJECT_EXISTS",
		);
	}
}

export async function init(dir: string, options: InitOptions): Promise<void> {
	assertInitTarget(dir, {
		dirGiven: options.dirGiven,
		force: options.force,
		tty: process.stdin.isTTY === true,
	});
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	// The project is the cwd: package resolution (plugin discovery, a plugin's
	// package info) and `generate` read it.
	const original = process.cwd();
	process.chdir(dir);

	try {
		await run(dir, options);
	} finally {
		process.chdir(original);
	}
}

interface Selection {
	plugins: string[];
	appName: string;
	domain: string;
	nonInteractive: boolean;
}

async function run(dir: string, options: InitOptions): Promise<void> {
	intro(`stack init ${basename(dir)}`);

	const flagDriven =
		options.plugins !== undefined ||
		options.domain !== undefined ||
		options.yes;
	const nonInteractive = flagDriven || !process.stdin.isTTY;

	let picked: string[] = [];
	let appName = basename(dir);
	let domain = options.domain ?? DEFAULT_DOMAIN;

	if (options.plugins !== undefined) {
		assertKnownPlugins(options.plugins);
		picked = options.plugins;
	} else if (!nonInteractive) {
		picked = await multi(
			"Which plugins do you want?",
			PLUGIN_NAMES.map((name) => ({
				label: `${name}  (${pluginPackage(name)})`,
				value: name,
			})),
		);
		appName = await ask("App name", basename(dir));
		domain = await ask("Domain", DEFAULT_DOMAIN);
	}

	const plugins = await installPlugins(
		dir,
		picked,
		nonInteractive ? undefined : chooseRequirement,
	);

	// The scaffold runs in the app's own `@fcalell/cli`: docs/architecture/slot-graph.md, "Slot identity".
	const installedCli = createRequire(join(dir, "package.json")).resolve(
		"@fcalell/cli",
	);
	// The installed copy is this module at another version; the compiler sees only this one's shape.
	const { scaffold } = (await import(
		new URL("./commands/init.js", pathToFileURL(installedCli)).href
	)) as typeof import("./init.ts");
	await scaffold(dir, { plugins, appName, domain, nonInteractive });
}

async function installPlugins(
	dir: string,
	picked: string[],
	pick?: ChooseRequirement,
): Promise<string[]> {
	const manifestPath = join(dir, "package.json");
	const ownsManifest = !existsSync(manifestPath);
	const workspace = stackWorkspaceRoot(dir) !== null;
	const { plugins, available } = await installClosure({
		dir,
		existing: [],
		picked,
		pick,
		writeManifest: (plugins) => {
			if (ownsManifest) {
				writeFileSync(
					manifestPath,
					packageJsonTemplate({ name: basename(dir), plugins, workspace }),
				);
			} else {
				patchPackageJson(dir, {
					dependencies: stackPluginSpecs(plugins, pinnedStackCommit(dir)),
					devDependencies: { "ts-morph": TS_MORPH_SPEC },
				});
			}
		},
	});
	for (const name of plugins) {
		if (!picked.includes(name)) {
			log.warn(`${name} added automatically (required by your selection).`);
		}
	}
	validateDependencies(available);
	if (ownsManifest) announceCreated(["package.json"]);
	return plugins;
}

export async function scaffold(
	dir: string,
	{ plugins: selectedPlugins, appName, domain, nonInteractive }: Selection,
): Promise<void> {
	const available = await loadInstalledPlugins(selectedPlugins);
	const app = { name: appName, domain };

	// The prompts and the tsconfig contributions resolve off a graph whose
	// options are `{}`, since the prompts produce the options; a plugin whose
	// schema cannot default `{}` (db's dialect) is never run through its factory
	// here: docs/architecture/slot-catalog.md, "CLI lifecycle slots (`cliSlots`)".
	const { graph: promptGraph } = buildGraphFromDiscovered({
		discovered: available,
		app,
		cwd: dir,
	});
	const tsconfigPaths = await promptGraph.resolve(cliSlots.tsconfigPaths);
	const tsconfigTypes = await promptGraph.resolve(cliSlots.tsconfigTypes);

	const baseEntries: Array<[string, string]> = [
		...tsconfigTemplate({
			...tsconfigLayout(selectedPlugins),
			procedurePaths: tsconfigPaths,
			nativeTypes: tsconfigTypes,
		}),
		[".gitignore", gitignoreTemplate()],
	];
	// An app in stack's workspace: docs/architecture/consumer-project.md, "Inside stack's workspace".
	const workspaceRoot = stackWorkspaceRoot(dir);
	const rootConfig =
		workspaceRoot === null
			? null
			: relative(realpathSync(dir), join(workspaceRoot, "biome.json"))
					.split(sep)
					.join("/");
	baseEntries.push(["biome.json", biomeTemplate({ rootConfig })]);
	if (!workspaceRoot)
		baseEntries.push([".editorconfig", editorconfigTemplate()]);
	const createdBase: string[] = [];
	for (const [path, content] of baseEntries) {
		if (writeIfMissingString(join(dir, path), content)) createdBase.push(path);
	}
	announceCreated(createdBase);
	const written = [...createdBase];
	writeClaudeMd(dir);

	const pluginAnswers = await askPrompts(
		promptGraph,
		selectedPlugins,
		nonInteractive,
	);

	const configContent = stackConfigTemplate({
		name: appName,
		domain,
		plugins: selectedPlugins,
		pluginAnswers,
	});
	if (writeIfMissingString(join(dir, "stack.config.ts"), configContent)) {
		announceCreated(["stack.config.ts"]);
		written.push("stack.config.ts");
	}

	// The second pass runs each factory, which validates the answers.
	const { graph: initGraph } = buildGraphFromDiscovered({
		discovered: withOptions(available, pluginAnswers),
		app,
		cwd: dir,
	});
	written.push(...(await applyScaffold(initGraph, selectedPlugins, dir)));

	// Generate precedes the format: docs/architecture/commands.md, "`stack init` and `stack add`".
	try {
		const { generate } = await import("./generate.ts");
		await generate("stack.config.ts");
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		log.info(
			"Your scaffolded files were written, but generation did not complete. " +
				"Fix the error above, then run `stack generate` to finish setup.",
		);
		throw new StackError(
			`Failed to generate .stack/ files: ${message}`,
			"INIT_GENERATE_FAILED",
		);
	}

	formatWritten(dir, written);

	note("stack dev", "Next steps");
	outro("Done!");
}

const chooseRequirement: ChooseRequirement = (req, plugin) =>
	choose(`${plugin} requires exactly one of these plugins`, req.oneOf);

// The templates write plain `JSON.stringify` and unsorted imports; the
// app's own Biome lays out what init wrote, so its first check changes
// nothing. A file type Biome does not handle (Markdown, YAML) is skipped.
function formatWritten(dir: string, files: string[]): void {
	if (files.length === 0) return;
	const result = spawnSync(
		"pnpm",
		[
			"exec",
			"biome",
			"check",
			"--write",
			"--files-ignore-unknown=true",
			"--no-errors-on-unmatched",
			...files,
		],
		{ cwd: dir, stdio: "inherit" },
	);
	if (result.status !== 0) {
		throw new StackError(
			`biome check failed on the scaffold (exit ${result.status ?? "signal"}).`,
			"INIT_FORMAT_FAILED",
		);
	}
}

// The consumer's `CLAUDE.md` imports the guide's index.
function writeClaudeMd(dir: string): void {
	const path = join(dir, "CLAUDE.md");
	const content = claudeMdTemplate(
		existsSync(path) ? readFileSync(path, "utf8") : null,
	);
	if (content === null) return;
	writeFileSync(path, content);
	log.success("Imported stack's guide in CLAUDE.md");
}
