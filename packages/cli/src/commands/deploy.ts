import { intro, log, outro } from "@clack/prompts";
import { cliSlots } from "../lib/cli-slots.ts";
import { confirm } from "../lib/prompt.ts";
import { runStep } from "../lib/run-step.ts";
import { buildApp } from "./build.ts";

interface DeployOptions {
	config: string;
	env: NodeJS.ProcessEnv;
}

export async function deploy(options: DeployOptions): Promise<void> {
	intro("stack deploy");

	const graph = await buildApp(options.config, options.env);
	const [checks, steps] = await Promise.all([
		graph.resolve(cliSlots.deployChecks),
		graph.resolve(cliSlots.deploySteps),
	]);

	// The checks are shown, confirmed in a terminal, then their actions run: docs/architecture/commands.md, "Command steps".
	if (checks.length > 0) {
		log.info("Deploy plan:");
		for (const check of checks) {
			log.info(`  ${check.plugin}: ${check.description}`);
			for (const item of check.items) {
				log.info(
					`    - ${item.label}${item.detail ? ` (${item.detail})` : ""}`,
				);
			}
		}

		if (process.stdin.isTTY) {
			const ok = await confirm("Proceed with deployment?");
			if (!ok) {
				outro("Aborted.");
				return;
			}
		}

		for (const check of checks) {
			await check.action();
		}
	}

	for (const step of steps) {
		log.step(`Deploying: ${step.name}`);
		await runStep(step, options.env);
		log.success(`${step.name} deployed`);
	}

	outro("Deployed");
}
