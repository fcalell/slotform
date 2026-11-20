// `slotform link` and `slotform unlink`: docs/architecture/consumer-project.md, "A linked app".
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
import { SlotformError } from "../lib/errors.ts";
import {
	installRoot,
	LINK_DIR,
	namedSlotformPackages,
	pnpmInstall,
	slotformWorkspaceRoot,
	toPosix,
	withSlotformSpecs,
} from "../lib/install.ts";
import { isRecord } from "../lib/is-record.ts";
import { type Manifest, readManifest } from "../lib/manifest.ts";
import {
	SLOTFORM_PACKAGES,
	type SlotformPackage,
	slotformClosure,
} from "../lib/slotform-packages.ts";

// Each file `slotform link` changes, by its name in `LINK_DIR`, at its place:
// the app's manifest, and the workspace yaml and lockfile at the install root.
function installFiles(cwd: string, root: string) {
	return {
		"package.json": join(cwd, "package.json"),
		"pnpm-workspace.yaml": join(root, "pnpm-workspace.yaml"),
		"pnpm-lock.yaml": join(root, "pnpm-lock.yaml"),
	};
}

// The app's manifest with each Slotform package it names taken from the checkout
// and injected, and the overrides that take every Slotform package those reach
// from it too. `fromApp` and `fromRoot` are the checkout's path relative to the
// app and to the install root.
export function linkedInstall(
	pkg: Manifest,
	checkout: { fromApp: string; fromRoot: string },
): { manifest: Manifest; overrides: Partial<Record<SlotformPackage, string>> } {
	const direct = namedSlotformPackages(pkg);
	const spec = (from: string, name: SlotformPackage) =>
		`file:${posix.join(from, SLOTFORM_PACKAGES[name].dir)}`;
	const meta = isRecord(pkg.dependenciesMeta) ? pkg.dependenciesMeta : {};
	return {
		manifest: {
			...withSlotformSpecs(pkg, (name) => spec(checkout.fromApp, name)),
			dependenciesMeta: {
				...meta,
				...Object.fromEntries(direct.map((name) => [name, { injected: true }])),
			},
		},
		overrides: Object.fromEntries(
			slotformClosure(direct).map((name) => [
				name,
				spec(checkout.fromRoot, name),
			]),
		),
	};
}

// Fails naming the build when a package of the checkout that ships `dist/`
// has none.
function assertBuilt(
	checkout: string,
	names: readonly SlotformPackage[],
): void {
	const unbuilt: SlotformPackage[] = [];
	for (const name of names) {
		const dir = join(checkout, SLOTFORM_PACKAGES[name].dir);
		if (!existsSync(join(dir, "package.json"))) {
			throw new SlotformError(
				`${checkout} is no Slotform checkout: it has no ${SLOTFORM_PACKAGES[name].dir}/package.json.`,
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
		throw new SlotformError(
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
	if (slotformWorkspaceRoot(cwd) !== null) {
		throw new SlotformError(
			"An app inside the Slotform workspace takes each Slotform package as `workspace:*`; it links nothing.",
			"LINK_FAILED",
		);
	}
	const root = installRoot(cwd);
	const pkg = readManifest(join(cwd, "package.json"));
	const direct = namedSlotformPackages(pkg);
	if (direct.length === 0) {
		throw new SlotformError(
			"The app names no Slotform package.",
			"LINK_FAILED",
		);
	}
	assertBuilt(checkout, slotformClosure(direct));

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
	log.success(`Linked ${direct.length} Slotform packages from ${checkout}.`);
}

export function unlink(cwd: string, env: NodeJS.ProcessEnv): void {
	const backup = join(cwd, LINK_DIR);
	if (!existsSync(backup)) {
		throw new SlotformError("The app is not linked.", "NOT_LINKED");
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
