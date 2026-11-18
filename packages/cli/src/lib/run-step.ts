import { spawnSync } from "node:child_process";
import type { BuildStep, DeployStep } from "../specs.ts";
import { StepFailedError } from "./errors.ts";

// Runs a build or deploy step: its `run`, or its command with the terminal
// attached, which throws on a non-zero exit.
export async function runStep(step: BuildStep | DeployStep): Promise<void> {
	if ("run" in step) {
		await step.run();
		return;
	}
	const result = spawnSync(step.exec.command, step.exec.args, {
		stdio: "inherit",
		cwd: step.exec.cwd,
	});
	if (result.status !== 0) {
		throw new StepFailedError(step.name, result.status, step.exec.command);
	}
}
