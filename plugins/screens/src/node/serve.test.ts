import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildGraphFromConfig } from "@slotform/cli/build-graph";
import { cliSlots } from "@slotform/cli/cli-slots";
import { FIXTURE_PREFIX, fixtureControls } from "../serve/controls.ts";

// `slotform dev` and `slotform build` hold no trace of `serve`'s controls: docs/architecture/plugins/screens.md, "Serve".
// The wrapper, its module, a control's path (not the workbench's own
// `/fixtures`) and the run's environment.
const TRACES = new RegExp(
	`${fixtureControls.name}|@slotform/screens/serve|${FIXTURE_PREFIX}(?!s)|SLOTFORM_SERVE`,
);

test("the generated output of an app holds no trace of the served controls", async () => {
	const cwd = fileURLToPath(
		new URL("../../../../apps/showcase/", import.meta.url),
	);
	// Discovery resolves the config's plugins from the working directory.
	process.chdir(cwd);
	const config = (await import(`${cwd}slotform.config.ts`)).default;
	const { graph } = await buildGraphFromConfig({ config, cwd, env: {} });
	const files = await graph.resolve(cliSlots.artifactFiles);
	assert.ok(files.some((file) => file.path === ".slotform/wrangler.toml"));
	assert.ok(files.some((file) => file.path === ".slotform/worker.ts"));
	for (const file of files)
		assert.doesNotMatch(file.content, TRACES, file.path);
});
