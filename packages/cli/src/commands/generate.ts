import type { StackConfig } from "../config.ts";
import { buildGraphFromConfig } from "../lib/build-graph.ts";
import { cliSlots } from "../lib/cli-slots.ts";
import { loadConfig } from "../lib/config.ts";
import type { Graph } from "../lib/graph.ts";
import { insideProject } from "../lib/inside-project.ts";
import type { LogContext } from "../lib/slots.ts";
import { writeArtifact } from "../lib/write-artifact.ts";
import type { GeneratedFile } from "../specs.ts";

// Writes the config's artifacts and runs the post-write hooks; answers the
// graph, which the calling command resolves its own slots from.
export async function generateFromConfig(
	config: StackConfig,
	cwd: string,
	log?: LogContext,
): Promise<Graph> {
	const { graph } = await buildGraphFromConfig({ config, cwd, log });

	const rawFiles = await graph.resolve(cliSlots.artifactFiles);
	const postWrite = await graph.resolve(cliSlots.postWrite);

	// One content per path: docs/architecture/codegen.md, "Artifact emit".
	const byPath = new Map<string, GeneratedFile>();
	for (const raw of rawFiles) {
		// A trailing newline: docs/architecture/codegen.md, "Artifact emit".
		const file = raw.content.endsWith("\n")
			? raw
			: { ...raw, content: `${raw.content}\n` };
		const prior = byPath.get(file.path);
		if (prior && prior.content !== file.content) {
			throw new Error(
				`generate: conflicting contributions for artifact "${file.path}". ` +
					`Two plugins emitted different content for the same path. ` +
					`Reconcile by routing both through a single owning slot, or by ` +
					`scoping the contribution to a path the other plugin doesn't claim.`,
			);
		}
		byPath.set(file.path, file);
	}

	// Every path is checked before the first write, so a bad contribution
	// leaves the disk as it was.
	const writes = [...byPath.values()].map((file) => ({
		target: insideProject(cwd, file.path),
		content: file.content,
	}));
	for (const { target, content } of writes) {
		await writeArtifact(target, content);
	}
	for (const hook of postWrite) {
		await hook();
	}

	return graph;
}

// `stack generate`, and the `generate` a plugin command's context carries.
export async function generate(configPath: string): Promise<void> {
	const config = await loadConfig(configPath);
	await generateFromConfig(config, process.cwd());
}
