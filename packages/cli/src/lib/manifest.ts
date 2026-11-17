import { readFileSync } from "node:fs";
import { z } from "zod";

const manifestSchema = z.looseObject({
	dependencies: z.record(z.string(), z.string()).optional(),
	devDependencies: z.record(z.string(), z.string()).optional(),
});

export type Manifest = z.infer<typeof manifestSchema>;

// The `package.json` at `path`, its dependency maps checked. The file's own
// object is returned, never the schema's copy: zod puts the keys a schema names
// first, and `installStack` writes this object back.
export function readManifest(path: string): Manifest {
	const manifest: unknown = JSON.parse(readFileSync(path, "utf8"));
	manifestSchema.parse(manifest);
	return manifest as Manifest;
}

// The CLI's own package.json, one level above `src/` and `dist/` alike.
export const cliManifest = z
	.object({
		name: z.string(),
		version: z.string(),
		peerDependencies: z.looseObject({ "ts-morph": z.string() }),
		devDependencies: z.looseObject({
			typescript: z.string(),
			"@types/node": z.string(),
		}),
	})
	.parse(
		JSON.parse(
			readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
		),
	);

// The ts-morph range an app declares as a devDependency: the CLI's optional peer, which prints the
// TypeScript `stack generate` writes.
export const TS_MORPH_SPEC = cliManifest.peerDependencies["ts-morph"];

// The TypeScript and Node types an app or a plugin the CLI scaffolds compiles with: the ones stack's
// own sources, which an app's `tsc` also reads, are checked with.
export const TYPESCRIPT_SPEC = cliManifest.devDependencies.typescript;
export const TYPES_NODE_SPEC = cliManifest.devDependencies["@types/node"];
