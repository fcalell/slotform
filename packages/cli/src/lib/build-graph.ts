import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AppConfig, StackConfig } from "../config.ts";
import type { GuideEntry, LintPlugin } from "../specs.ts";
import { tsconfigLayout, workerTsconfig } from "../templates/tsconfig.ts";
import { cliSlots } from "./cli-slots.ts";
import { type DiscoveredPlugin, discoverPlugins } from "./discovery.ts";
import { ConfigValidationError } from "./errors.ts";
import { buildGraph, type Graph } from "./graph.ts";
import { cliManifest } from "./manifest.ts";
import { createLogContext } from "./prompt.ts";
import type { Contribution, LogContext, Slot } from "./slots.ts";

const GUIDE_PATH = ".stack/guide.md";

// The CLI's own pages, beside the plugins' in `cliSlots.guide`.
const cliGuide: readonly { page: string; trigger: string }[] = [
	{
		page: "provided",
		trigger: "Shaping, scoping or estimating a feature",
	},
	{
		page: "config",
		trigger: "Adding a plugin or changing an option in `stack.config.ts`",
	},
	{
		page: "commands",
		trigger: "Running a `stack` command, or deciding which one a change needs",
	},
	{
		page: "gap",
		trigger:
			"A part the app needs that stack lacks: a component, variant, token, option or procedure feature",
	},
];

// `.stack/guide.md`, which the consumer's `CLAUDE.md` imports: each line a
// trigger and the page's path from the consumer root, grouped by domain in the
// slot's order. Claude Code imports an `@` only at a line start or after
// whitespace; a scoped package's `@` follows `node_modules/`, so no page loads
// until a session opens it.
function renderGuide(entries: readonly GuideEntry[]): string {
	const domains = new Map<string, string[]>();
	const seen = new Set<string>();
	for (const e of entries) {
		const key = `${e.package}/${e.page}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const lines = domains.get(e.domain) ?? [];
		lines.push(`- ${e.trigger} → node_modules/${e.package}/guide/${e.page}.md`);
		domains.set(e.domain, lines);
	}
	const sections = [...domains].map(
		([domain, lines]) => `## ${domain}\n\n${lines.join("\n")}\n`,
	);
	return [
		"Stack's guide at this project's pin: each line says when to open a page, then the page. Open only the page the step in hand needs.\n",
		...sections,
	].join("\n");
}

const LINT_PATH = ".stack/biome.json";

// `.stack/biome.json`: the plugins' GritQL rules, each on the sources it names.
// `root: false` keeps Biome from reading it as a second root config where the
// consumer's `files.includes` does not skip `.stack`.
//
// TODO: Biome resolves a plugin path against the directory of the root config
// (or the nested one), not the extending file, and fails a package specifier,
// so a package's file is spelled under `node_modules/` and each plugin takes
// its `includes` through an override (Biome 2.4 reads no `includes` on a plugin
// entry). Drop both when Biome resolves `@scope/pkg/file.grit` and takes
// per-plugin `includes` (2.5's object form).
//
// `ignore` lists generated sources Biome skips: a plugin's output follows its
// tool's formatting, not the consumer's. They are an override that turns the
// linter, formatter and import sorting off for them, never a `files.includes`
// exclusion: an `includes` list in an extending config replaces the one before
// it (a lone `["!src/migrations"]` leaves nothing to check, `biome check .`
// processing 0 files), where overrides accumulate and leave the shared preset's
// list in force.
function lintConfig(
	plugins: readonly LintPlugin[],
	ignore: readonly string[] = [],
): string {
	const byIncludes = new Map<string, string[]>();
	for (const { path, includes } of plugins) {
		const key = JSON.stringify(includes);
		byIncludes.set(key, [
			...(byIncludes.get(key) ?? []),
			`node_modules/${path}`,
		]);
	}
	const overrides: object[] = [...byIncludes].map(([includes, paths]) => ({
		includes: JSON.parse(includes) as string[],
		plugins: paths,
	}));
	if (ignore.length > 0) {
		overrides.push({
			// Each entry as a file and as a directory's contents.
			includes: ignore.flatMap((glob) => [glob, `${glob}/**`]),
			linter: { enabled: false },
			formatter: { enabled: false },
			assist: { enabled: false },
		});
	}
	return `${JSON.stringify({ root: false, overrides }, null, "\t")}\n`;
}

export interface CollectedPlugin {
	discovered: DiscoveredPlugin;
	slots: Record<string, Slot<unknown>>;
	contributes: Contribution<unknown>[];
}

export interface BuildGraphFromConfigOptions {
	config: StackConfig;
	cwd: string;
	log?: LogContext;
}

export interface BuildGraphFromConfigResult {
	graph: Graph;
	collected: CollectedPlugin[];
	// The discovered plugins in `config.plugins` order. No sort is applied —
	// ordering is derived per-slot from data dependencies, so consumers here do
	// only order-independent lookups (find-by-name, map-to-cli).
	plugins: DiscoveredPlugin[];
	app: AppConfig;
}

// Validate → discover → per-plugin `.cli.collect()` → buildGraph. Every
// command that needs the slot graph funnels through this helper; keeps the
// wiring in one place so new commands don't re-invent the path.
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

export function buildGraphFromDiscovered(
	opts: BuildGraphFromDiscoveredOptions,
): BuildGraphFromConfigResult {
	const collected: CollectedPlugin[] = opts.discovered.map((d) => {
		const { slots, contributes } = d.cli.collect({
			app: opts.app,
			options: d.options,
		});
		return { discovered: d, slots, contributes };
	});

	const log = opts.log ?? createLogContext();
	const cwd = opts.cwd;

	// The CLI's own contributions: facts only core knows (which tsconfig
	// `stack init` wrote for the worker), its guide pages, and the guide's index.
	const layout = tsconfigLayout(opts.discovered.map((d) => d.name));
	const core = {
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

	const graph = buildGraph(
		[
			...collected.map((c) => ({
				name: c.discovered.name,
				slots: c.slots,
				contributes: c.contributes,
			})),
			core,
		],
		{
			app: opts.app,
			cwd,
			log,
			ctxForPlugin: (pluginName) => {
				const plugin = collected.find((c) => c.discovered.name === pluginName);
				return {
					options: plugin?.discovered.options ?? {},
					fileExists: async (path: string) => {
						try {
							await access(join(cwd, path));
							return true;
						} catch {
							return false;
						}
					},
					readFile: async (path: string) => readFile(join(cwd, path), "utf-8"),
					template: plugin?.discovered.cli.template
						? plugin.discovered.cli.template
						: (n: string) =>
								new URL(`file:///__synthetic__/${pluginName}/${n}`),
					scaffold: plugin?.discovered.cli.scaffold
						? plugin.discovered.cli.scaffold
						: (n: string, target: string) => ({
								source: new URL(`file:///__synthetic__/${pluginName}/${n}`),
								target,
								plugin: pluginName,
							}),
				};
			},
		},
	);

	return {
		graph,
		collected,
		plugins: opts.discovered,
		app: opts.app,
	};
}
