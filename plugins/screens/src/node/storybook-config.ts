import { randomUUID } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { GENERATED_DIR, type SlotformConfig } from "@slotform/cli";
import { buildGraphFromConfig } from "@slotform/cli/build-graph";
import { vite } from "@slotform/vite";
import { renderComponentHostConfig } from "./config.ts";

const STORYBOOK_VITE_CONFIG = `${GENERATED_DIR}/storybook.vite.config.ts`;

// The Vite config of a Storybook that draws components: docs/architecture/plugins/screens.md, "A Storybook that draws components".
export async function writeStorybookConfig(options: {
	config: SlotformConfig;
	cwd: string;
	env: NodeJS.ProcessEnv;
}): Promise<string> {
	const { graph } = await buildGraphFromConfig(options);
	const outDir = await graph.resolve(vite.slots.outDir);
	if (outDir === null) {
		throw new Error(
			"A Storybook over the app's Vite config needs the vite plugin",
		);
	}
	const source = renderComponentHostConfig({
		configImports: await graph.resolve(vite.slots.configImports),
		pluginCalls: await graph.resolve(vite.slots.pluginCalls),
		resolveAliases: await graph.resolve(vite.slots.resolveAliases),
		resolveDedupe: await graph.resolve(vite.slots.resolveDedupe),
		optimizeExclude: await graph.resolve(vite.slots.optimizeExclude),
		devServerPort: await graph.resolve(vite.slots.devServerPort),
		outDir,
		serverProxy: await graph.resolve(vite.slots.serverProxy),
		fsAllow: await graph.resolve(vite.slots.fsAllow),
		watchIgnored: await graph.resolve(vite.slots.watchIgnored),
		clientHeaders: await graph.resolve(vite.slots.clientHeaders),
	});
	const path = join(options.cwd, STORYBOOK_VITE_CONFIG);
	await mkdir(join(options.cwd, GENERATED_DIR), { recursive: true });
	// Storybook's main.ts and Vitest's config each write it as they load, and a
	// load can overlap a write: a rename hands a reader the whole file or the old one.
	const temp = `${path}.${randomUUID()}.tmp`;
	await writeFile(temp, source);
	await rename(temp, path);
	return path;
}
