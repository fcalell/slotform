import type { StackConfig } from "../config.ts";
import { buildGraphFromConfig } from "../lib/build-graph.ts";
import { cliSlots } from "../lib/cli-slots.ts";
import { loadConfig } from "../lib/config.ts";
import { insideProject } from "../lib/inside-project.ts";
import type { LogContext } from "../lib/slots.ts";
import { writeArtifact } from "../lib/write-artifact.ts";
import type { GeneratedFile } from "../specs.ts";

interface GenerateResult {
	files: GeneratedFile[];
	postWrite: Array<() => Promise<void>>;
}

export async function generateFromConfig(
	config: StackConfig,
	cwd: string,
	log?: LogContext,
): Promise<GenerateResult> {
	const { graph } = await buildGraphFromConfig({ config, cwd, log });

	const rawFiles = await graph.resolve(cliSlots.artifactFiles);
	const postWrite = await graph.resolve(cliSlots.postWrite);

	// Collapse duplicate artifact contributions to the same path. Identical
	// content is fine — multiple `emitArtifact` helpers can resolve to the
	// same string and that's a no-op. Conflicting content is a structural
	// bug: two plugins fighting over the same generated file at runtime is
	// guaranteed to produce one of two surprising outputs depending on
	// resolver order. Throw with a clear error so the conflict is fixed at
	// the contribution site, not papered over by silent last-write-wins.
	const byPath = new Map<string, GeneratedFile>();
	for (const raw of rawFiles) {
		// Single source→file normalization: every artifact ends with exactly one
		// trailing newline. Aggregators emit raw content; the rule lives here, at
		// the write boundary, instead of being re-applied at every renderer.
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
	const files = [...byPath.values()];

	// Every path is checked before the first write, so a bad contribution
	// leaves the disk as it was.
	const writes = files.map((file) => ({
		target: insideProject(cwd, file.path),
		content: file.content,
	}));
	for (const { target, content } of writes) {
		await writeArtifact(target, content);
	}
	for (const hook of postWrite) {
		await hook();
	}

	return {
		files,
		postWrite,
	};
}

// `stack generate`, and the `generate` a plugin command's context carries.
export async function generate(configPath: string): Promise<void> {
	const config = await loadConfig(configPath);
	await generateFromConfig(config, process.cwd());
}
