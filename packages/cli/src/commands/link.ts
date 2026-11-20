// `stack link` and `stack unlink`: docs/architecture/consumer-project.md, "A linked app".
import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join, posix, relative } from "node:path";
import { log } from "@clack/prompts";
import { parseDocument } from "yaml";
import { StackError } from "../lib/errors.ts";
import {
	installRoot,
	LINK_DIR,
	namedStackPackages,
	pnpmInstall,
	stackWorkspaceRoot,
	toPosix,
	withStackSpecs,
} from "../lib/install.ts";
import { isRecord } from "../lib/is-record.ts";
import { type Manifest, readManifest } from "../lib/manifest.ts";
import {
	STACK_PACKAGES,
	type StackPackage,
	stackClosure,
} from "../lib/stack-packages.ts";

// Each file `stack link` changes, by its name in `LINK_DIR`, at its place:
// the app's manifest, and the workspace yaml and lockfile at the install root.
function installFiles(cwd: string, root: string) {
	return {
		"package.json": join(cwd, "package.json"),
		"pnpm-workspace.yaml": join(root, "pnpm-workspace.yaml"),
		"pnpm-lock.yaml": join(root, "pnpm-lock.yaml"),
	};
}

// The app's manifest with each stack package it names taken from the checkout
// and injected, and the overrides that take every stack package those reach
// from it too. `fromApp` and `fromRoot` are the checkout's path relative to the
// app and to the install root.
export function linkedInstall(
	pkg: Manifest,
	checkout: { fromApp: string; fromRoot: string },
): { manifest: Manifest; overrides: Partial<Record<StackPackage, string>> } {
	const direct = namedStackPackages(pkg);
	const spec = (from: string, name: StackPackage) =>
		`file:${posix.join(from, STACK_PACKAGES[name].dir)}`;
	const meta = isRecord(pkg.dependenciesMeta) ? pkg.dependenciesMeta : {};
	return {
		manifest: {
			...withStackSpecs(pkg, (name) => spec(checkout.fromApp, name)),
			dependenciesMeta: {
				...meta,
				...Object.fromEntries(direct.map((name) => [name, { injected: true }])),
			},
		},
		overrides: Object.fromEntries(
			stackClosure(direct).map((name) => [name, spec(checkout.fromRoot, name)]),
		),
	};
}

// Fails naming the build when a package of the checkout that ships `dist/`
// has none.
function assertBuilt(checkout: string, names: readonly StackPackage[]): void {
	const unbuilt: StackPackage[] = [];
	for (const name of names) {
		const dir = join(checkout, STACK_PACKAGES[name].dir);
		if (!existsSync(join(dir, "package.json"))) {
			throw new StackError(
				`${checkout} is no stack checkout: it has no ${STACK_PACKAGES[name].dir}/package.json.`,
				"LINK_FAILED",
			);
		}
		const { files } = readManifest(join(dir, "package.json"));
		if (
			Array.isArray(files) &&
			files.includes("dist") &&
			!existsSync(join(dir, "dist"))
		) {
			unbuilt.push(name);
		}
	}
	if (unbuilt.length > 0) {
		throw new StackError(
			`The checkout is not built (no dist/ in ${unbuilt.join(", ")}); run \`pnpm turbo run build\` in ${checkout}.`,
			"LINK_FAILED",
		);
	}
}

export function link(
	cwd: string,
	checkout: string,
	env: NodeJS.ProcessEnv,
): void {
	if (stackWorkspaceRoot(cwd) !== null) {
		throw new StackError(
			"An app inside stack's workspace takes each stack package as `workspace:*`; it links nothing.",
			"LINK_FAILED",
		);
	}
	const root = installRoot(cwd);
	const pkg = readManifest(join(cwd, "package.json"));
	const direct = namedStackPackages(pkg);
	if (direct.length === 0) {
		throw new StackError("The app names no stack package.", "LINK_FAILED");
	}
	assertBuilt(checkout, stackClosure(direct));

	// A re-run keeps the first backup, which holds the files as committed.
	const files = installFiles(cwd, root);
	const backup = join(cwd, LINK_DIR);
	if (!existsSync(backup)) {
		mkdirSync(backup, { recursive: true });
		for (const [name, path] of Object.entries(files)) {
			if (existsSync(path)) cpSync(path, join(backup, name));
		}
	}

	const { manifest, overrides } = linkedInstall(pkg, {
		fromApp: toPosix(relative(cwd, checkout)),
		fromRoot: toPosix(relative(root, checkout)),
	});
	writeFileSync(
		files["package.json"],
		`${JSON.stringify(manifest, null, "\t")}\n`,
	);
	const yamlPath = files["pnpm-workspace.yaml"];
	const doc = parseDocument(
		existsSync(yamlPath) ? readFileSync(yamlPath, "utf8") : "",
	);
	// A `file:` package's `workspace:^` ranges resolve only through these.
	for (const [name, spec] of Object.entries(overrides)) {
		doc.setIn(["overrides", name], spec);
	}
	writeFileSync(yamlPath, String(doc));
	pnpmInstall(root, [], env);
	log.success(`Linked ${direct.length} stack packages from ${checkout}.`);
}

export function unlink(cwd: string, env: NodeJS.ProcessEnv): void {
	const backup = join(cwd, LINK_DIR);
	if (!existsSync(backup)) {
		throw new StackError("The app is not linked.", "NOT_LINKED");
	}
	const root = installRoot(cwd);
	for (const [name, path] of Object.entries(installFiles(cwd, root))) {
		const kept = join(backup, name);
		if (existsSync(kept)) cpSync(kept, path);
		else rmSync(path, { force: true });
	}
	rmSync(backup, { recursive: true });
	pnpmInstall(root, ["--frozen-lockfile"], env);
	log.success("Unlinked; the app installs from its lockfile.");
}
