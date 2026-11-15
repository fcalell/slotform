import { spawnSync } from "node:child_process";
import { intro, log, outro } from "@clack/prompts";
import type { StackConfig } from "../config.ts";
import { buildGraphFromConfig } from "../lib/build-graph.ts";
import { cliSlots } from "../lib/cli-slots.ts";
import { loadConfig } from "../lib/config.ts";
import { StepFailedError } from "../lib/errors.ts";
import type { BuildStep } from "../specs.ts";
import { generateFromConfig } from "./generate.ts";

async function buildStepsFromConfig(
	config: StackConfig,
	cwd: string,
): Promise<BuildStep[]> {
	const { graph } = await buildGraphFromConfig({ config, cwd });
	// Slot's own sortBy returns phase-sorted already.
	return graph.resolve(cliSlots.buildSteps);
}

const PHASE_LABEL = {
	pre: "Pre-build",
	main: "Building",
	post: "Post-build",
} satisfies Record<BuildStep["phase"], string>;

async function runBuildSteps(steps: BuildStep[]): Promise<void> {
	for (const step of steps) {
		log.step(`${PHASE_LABEL[step.phase]}: ${step.name}`);

		if ("run" in step) {
			await step.run();
			continue;
		}
		const result = spawnSync(step.exec.command, step.exec.args, {
			stdio: "inherit",
			cwd: step.exec.cwd,
		});
		if (result.status !== 0) {
			throw new StepFailedError(step.name, result.status, step.exec.command);
		}
	}
}

export async function build(configPath: string): Promise<void> {
	intro("stack build");
	const cwd = process.cwd();
	const config = await loadConfig(configPath);

	await generateFromConfig(config, cwd);

	const steps = await buildStepsFromConfig(config, cwd);
	await runBuildSteps(steps);

	outro("Build complete");
}
