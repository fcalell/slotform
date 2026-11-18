// The spec shapes plugins contribute to the CLI's slots.

export interface GeneratedFile {
	path: string;
	content: string;
}

// A Biome GritQL plugin a package ships: docs/architecture/consumer-project.md, "Lint".
export interface LintPlugin {
	path: string;
	includes: string[];
}

// One line of `.stack/guide.md`: docs/architecture/plugin-authoring.md, "The `plugin()` contract".
export interface GuideEntry {
	domain: string;
	package: string;
	page: string;
	trigger: string;
}

// Restart policy of a supervised dev process: docs/architecture/commands.md, "`stack dev`".
export type ProcessRestartPolicy = "never" | "on-crash" | "always";

export interface ProcessSpec {
	name: string;
	command: string;
	args: string[];
	// The port the process serves on, shown as its URL: docs/architecture/commands.md, "`stack dev`".
	defaultPort?: number;
	readyPattern?: RegExp;
	color?: string;
	// Extra environment variables merged over the parent process env at
	// spawn. The generic carrier for per-process dev signals (e.g. a Node
	// target's STACK_DEV=1, which has no `.dev.vars` equivalent).
	env?: Record<string, string>;
	// Default restart policy: docs/architecture/commands.md, "`stack dev`".
	restart?: ProcessRestartPolicy;
	// Cap on restart attempts: docs/architecture/commands.md, "`stack dev`".
	maxRestarts?: number;
	// Per-exit hook — method shorthand makes return-type checking bivariant
	// so callers with side-effect-only handlers (no explicit return) work.
	onExit?(event: ProcessExit): { restart: boolean } | undefined;
}

// Surfaced on every exit (initial run + each restart attempt).
//   restartAttempt — 0 for the first run, increments per restart.
//   portInUse      — stderr reports a port conflict.
//   detectedPort   — the port a conflict on stderr names, otherwise `null`.
//   stderrTail     — last ~4 KB of stderr; useful for surfacing the failure
//                    in a higher-level error without re-streaming.
export interface ProcessExit {
	code: number | null;
	signal: NodeJS.Signals | null;
	restartAttempt: number;
	portInUse: boolean;
	detectedPort: number | null;
	stderrTail: string;
}

export interface WatcherSpec {
	name: string;
	paths: string;
	ignore?: string[];
	debounce?: number;
	handler: (
		path: string,
		type: "add" | "unlink" | "change",
	) => void | Promise<void>;
}

export type Phase = "pre" | "main" | "post";

export type BuildStep =
	| {
			name: string;
			phase: Phase;
			exec: { command: string; args: string[]; cwd?: string };
	  }
	| { name: string; phase: Phase; run: () => Promise<void> };

export type DeployStep = BuildStep;

export interface DeployCheck {
	plugin: string;
	description: string;
	items: { label: string; detail?: string }[];
	action: () => Promise<void>;
}

// Prompt contract for `cliSlots.initPrompts`: docs/architecture/commands.md, "Prompts".
export interface PromptSpec {
	plugin: string;
	ask: (
		// Contributions run with a full ContributionCtx, but PromptSpec is
		// structural — we avoid re-exporting ContributionCtx here to keep this
		// file dependency-free for plugin consumers that only need the shape.
		ctx: unknown,
		priors: Record<string, unknown>,
	) => Promise<Record<string, unknown>>;
}

// Setup tasks surfaced via `cliSlots.devReadySetup`. Kept distinct from a
// generic "runnable" because `dev` logs each task's name as it runs.
export interface DevReadyTask {
	name: string;
	run: () => Promise<void>;
}
