import type { ScaffoldSpec } from "../ast/index.ts";
import type {
	BuildStep,
	DeployCheck,
	DeployStep,
	DevReadyTask,
	GeneratedFile,
	GuideEntry,
	LintPlugin,
	ProcessSpec,
	PromptSpec,
	WatcherSpec,
} from "../specs.ts";
import { type Contribution, type Slot, slot } from "./slots.ts";

// CLI-owned slot tokens: docs/architecture/slot-catalog.md, "CLI lifecycle slots (`cliSlots`)".
const SOURCE = "cli";

const phaseOrder = { pre: 0, main: 1, post: 2 } as const;

function comparePhaseOrder<T extends { phase: "pre" | "main" | "post" }>(
	a: T,
	b: T,
): number {
	return phaseOrder[a.phase] - phaseOrder[b.phase];
}

export const cliSlots = {
	initPrompts: slot.list<PromptSpec>({ source: SOURCE, name: "initPrompts" }),
	initScaffolds: slot.list<ScaffoldSpec>({
		source: SOURCE,
		name: "initScaffolds",
		// Two plugins claiming the same target is a programming error — surface
		// it at compose time rather than waiting for the writer to detect it.
		uniqueBy: (s) => s.target,
	}),
	initDeps: slot.map<string>({ source: SOURCE, name: "initDeps" }),
	initDevDeps: slot.map<string>({ source: SOURCE, name: "initDevDeps" }),
	// Top-level `package.json` fields, written if absent: docs/architecture/slot-catalog.md, "CLI lifecycle slots (`cliSlots`)".
	packageJsonFields: slot.map<unknown>({
		source: SOURCE,
		name: "packageJsonFields",
	}),
	gitignore: slot.list<string>({ source: SOURCE, name: "gitignore" }),
	artifactFiles: slot.list<GeneratedFile>({
		source: SOURCE,
		name: "artifactFiles",
	}),
	// The guide index: docs/architecture/slot-catalog.md, "CLI lifecycle slots (`cliSlots`)".
	guide: slot.list<GuideEntry>({
		source: SOURCE,
		name: "guide",
		sortBy: (a, b) => a.domain.localeCompare(b.domain),
	}),
	// The Biome plugins the consumer's lint runs on its own sources, from the
	// package that owns the rules. Rendered into `.stack/biome.json`.
	lintPlugins: slot.list<LintPlugin>({
		source: SOURCE,
		name: "lintPlugins",
		uniqueBy: (p) => p.path,
	}),
	// Generated sources Biome skips: docs/architecture/consumer-project.md, "Lint".
	lintIgnore: slot.list<string>({
		source: SOURCE,
		name: "lintIgnore",
		uniqueBy: (p) => p,
	}),
	postWrite: slot.list<() => Promise<void>>({
		source: SOURCE,
		name: "postWrite",
	}),
	devProcesses: slot.list<ProcessSpec>({
		source: SOURCE,
		name: "devProcesses",
		// A name keys the supervisor's log prefix and restart target: docs/architecture/slot-catalog.md, "CLI lifecycle slots (`cliSlots`)".
		uniqueBy: (p) => p.name,
	}),
	devWatchers: slot.list<WatcherSpec>({
		source: SOURCE,
		name: "devWatchers",
		uniqueBy: (w) => w.name,
	}),
	devReadySetup: slot.list<DevReadyTask>({
		source: SOURCE,
		name: "devReadySetup",
		uniqueBy: (t) => t.name,
	}),
	buildSteps: slot.list<BuildStep>({
		source: SOURCE,
		name: "buildSteps",
		sortBy: comparePhaseOrder,
		uniqueBy: (s) => s.name,
	}),
	deployChecks: slot.list<DeployCheck>({
		source: SOURCE,
		name: "deployChecks",
	}),
	deploySteps: slot.list<DeployStep>({
		source: SOURCE,
		name: "deploySteps",
		sortBy: comparePhaseOrder,
		uniqueBy: (s) => s.name,
	}),
	removeFiles: slot.list<string>({ source: SOURCE, name: "removeFiles" }),
	removeDeps: slot.list<string>({ source: SOURCE, name: "removeDeps" }),
	removeDevDeps: slot.list<string>({ source: SOURCE, name: "removeDevDeps" }),
	// tsconfig `paths`, read once by `stack init`: docs/architecture/slot-catalog.md, "CLI lifecycle slots (`cliSlots`)".
	tsconfigPaths: slot.map<string[]>({ source: SOURCE, name: "tsconfigPaths" }),
	// tsconfig `types`, read where `tsconfigPaths` is: docs/architecture/slot-catalog.md, "CLI lifecycle slots (`cliSlots`)".
	tsconfigTypes: slot.list<string>({ source: SOURCE, name: "tsconfigTypes" }),
	// The tsconfig the worker's bundler reads: docs/architecture/consumer-project.md, "TypeScript projects".
	workerTsconfig: slot.value<string>({
		source: SOURCE,
		name: "workerTsconfig",
		seed: () => "tsconfig.json",
	}),
} as const;

// A null source means the upstream derivation chose not to emit anything (e.g.
// no runtimes registered) — the contribution returns undefined and the
// artifactFiles list drops it.
export function emitArtifact(
	path: string,
	source: Slot<string | null>,
): Contribution<GeneratedFile[]> {
	return cliSlots.artifactFiles.contribute(async (ctx) => {
		const content = await ctx.resolve(source);
		if (content === null) return undefined;
		return { path, content };
	});
}
