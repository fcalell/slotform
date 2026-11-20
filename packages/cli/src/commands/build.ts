import { intro, log, outro } from "@clack/prompts";
import { cliSlots } from "../lib/cli-slots.ts";
import { loadConfig } from "../lib/config.ts";
import type { Graph } from "../lib/graph.ts";
import { assertUnlinked } from "../lib/install.ts";
import { runStep } from "../lib/run-step.ts";
import type { Phase } from "../specs.ts";
import { generateFromConfig } from "./generate.ts";

const PHASE_LABEL = {
	pre: "Pre-build",
	main: "Building",
	post: "Post-build",
} satisfies Record<Phase, string>;

// Generates, then runs the build steps; answers the graph for `deploy`.
export async function buildApp(
	configPath: string,
	env: NodeJS.ProcessEnv,
): Promise<Graph> {
	const cwd = process.cwd();
	assertUnlinked(cwd);
	const graph = await generateFromConfig(
		await loadConfig(configPath),
		cwd,
		env,
	);
	// The slot sorts the steps by phase.
	for (const step of await graph.resolve(cliSlots.buildSteps)) {
		log.step(`${PHASE_LABEL[step.phase]}: ${step.name}`);
		await runStep(step, env);
	}
	return graph;
}

export async function build(
	configPath: string,
	env: NodeJS.ProcessEnv,
): Promise<void> {
	intro("slotform build");
	await buildApp(configPath, env);
	outro("Build complete");
}
