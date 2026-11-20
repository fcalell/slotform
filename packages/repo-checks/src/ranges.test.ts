import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { subset } from "semver";

const ROOT = new URL("../../../", import.meta.url).pathname;
const FIELDS = ["peerDependencies", "devDependencies", "dependencies"] as const;

type Field = (typeof FIELDS)[number];
type Manifest = { private?: boolean } & Partial<
	Record<Field, Record<string, string>>
>;

// Each library's specs per field, each spec with the packages that give it.
type Specs = Map<Field, Map<string, string[]>>;

function publicManifests(): { dir: string; manifest: Manifest }[] {
	return ["packages", "plugins"].flatMap((group) =>
		readdirSync(join(ROOT, group))
			.map((name) => `${group}/${name}`)
			.filter((dir) => existsSync(join(ROOT, dir, "package.json")))
			.map((dir) => ({
				dir,
				manifest: JSON.parse(
					readFileSync(join(ROOT, dir, "package.json"), "utf8"),
				) as Manifest,
			}))
			.filter(({ manifest }) => !manifest.private),
	);
}

function librarySpecs(): Map<string, Specs> {
	const manifests = publicManifests();
	// A scan that reaches nothing finds nothing.
	assert.ok(manifests.some(({ dir }) => dir === "packages/ui-core"));
	const libraries = new Map<string, Specs>();
	for (const { dir, manifest } of manifests) {
		for (const field of FIELDS) {
			for (const [name, spec] of Object.entries(manifest[field] ?? {})) {
				if (name.startsWith("@fcalell/") || spec.startsWith("workspace:"))
					continue;
				const specs = libraries.get(name) ?? new Map();
				const bySpec = specs.get(field) ?? new Map<string, string[]>();
				bySpec.set(spec, [...(bySpec.get(spec) ?? []), dir]);
				specs.set(field, bySpec);
				libraries.set(name, specs);
			}
		}
	}
	return libraries;
}

// docs/architecture/releasing.md, "Peers: one copy of each stack package".
test("each third-party library has one spec per field across the public packages", () => {
	const split: string[] = [];
	for (const [name, specs] of librarySpecs()) {
		for (const [field, bySpec] of specs) {
			if (bySpec.size > 1)
				split.push(
					`${name} ${field}: ${[...bySpec].map(([spec, dirs]) => `${spec} (${dirs.join(", ")})`).join("; ")}`,
				);
		}
	}
	assert.deepEqual(split, []);
});

test("each devDependency spec lies inside its peer range", () => {
	const outside: string[] = [];
	for (const [name, specs] of librarySpecs()) {
		for (const peer of specs.get("peerDependencies")?.keys() ?? []) {
			for (const dev of specs.get("devDependencies")?.keys() ?? []) {
				if (!subset(dev, peer)) outside.push(`${name}: ${dev} outside ${peer}`);
			}
		}
	}
	assert.deepEqual(outside, []);
});
