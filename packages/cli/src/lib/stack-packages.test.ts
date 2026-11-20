import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { pnpmWorkspaceTemplate } from "../templates/pnpm-workspace.ts";
import { isErrno } from "./errno.ts";
import { cliManifest } from "./manifest.ts";
import {
	STACK_PACKAGES,
	stackClosure,
	stackPluginSpecs,
	stackSpec,
} from "./stack-packages.ts";

test("a spec is the caret of the CLI's version", () => {
	assert.equal(stackSpec(), `^${cliManifest.version}`);
});

test("plugin specs name only first-party plugins", () => {
	assert.deepEqual(stackPluginSpecs(["db", "nope"]), {
		"@fcalell/plugin-db": stackSpec(),
	});
});

test("the closure holds every stack package the given ones reach", () => {
	assert.deepEqual(stackClosure(["@fcalell/plugin-vite"]), [
		"@fcalell/cli",
		"@fcalell/plugin-api",
		"@fcalell/plugin-vite",
	]);
});

test("the workspace template carries only the third-party verdicts", () => {
	const yaml = pnpmWorkspaceTemplate(null, [
		"@fcalell/plugin-auth",
		"@fcalell/plugin-react-ui",
	]);
	assert.doesNotMatch(yaml, /overrides/);
	assert.match(yaml, /allowBuilds/);
	assert.match(yaml, /esbuild: true/);
	assert.match(yaml, /better-sqlite3: true/);
	assert.match(yaml, /"@prisma\/client": false/);
});

test("the workspace template keeps the entries the yaml has", () => {
	const yaml = pnpmWorkspaceTemplate("allowBuilds:\n  esbuild: false\n", [
		"@fcalell/plugin-node",
	]);
	assert.match(yaml, /esbuild: false/);
});
// The two tests below hold STACK_PACKAGES to the checkout's own manifests.
const REPO = new URL("../../../../", import.meta.url);

function manifest(dir: string): {
	name: string;
	private?: boolean;
	dependencies?: Record<string, string>;
} {
	return JSON.parse(readFileSync(new URL(`${dir}/package.json`, REPO), "utf8"));
}

test("each STACK_PACKAGES entry lists its manifest's @fcalell dependencies", () => {
	for (const [name, entry] of Object.entries(STACK_PACKAGES)) {
		const pkg = manifest(entry.dir);
		assert.equal(pkg.name, name);
		const declared = Object.keys(pkg.dependencies ?? {})
			.filter((dep) => dep.startsWith("@fcalell/"))
			.sort();
		assert.deepEqual(
			[...entry.dependencies].sort(),
			declared,
			`${name} dependencies drifted from ${entry.dir}/package.json`,
		);
	}
});

test("every public package of the repo has an entry", () => {
	const dirs = ["packages", "plugins"].flatMap((group) =>
		readdirSync(new URL(`${group}/`, REPO), { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => `${group}/${entry.name}`),
	);
	const listed = new Set<string>(Object.keys(STACK_PACKAGES));
	for (const dir of dirs) {
		let pkg: ReturnType<typeof manifest>;
		try {
			pkg = manifest(dir);
		} catch (error) {
			if (isErrno(error, "ENOENT")) continue;
			throw error;
		}
		if (pkg.private) continue;
		assert.ok(listed.has(pkg.name), `${pkg.name} (${dir}) has no entry`);
	}
});
