import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, matchesGlob, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { pnpmWorkspaceTemplate } from "../templates/pnpm-workspace.ts";
import { isErrno } from "./errno.ts";
import { StackError } from "./errors.ts";
import { leaves } from "./inside-project.ts";
import { isRecord } from "./is-record.ts";
import { type Manifest, readManifest } from "./manifest.ts";
import { isStackPackage, type StackPackage } from "./stack-packages.ts";

// This package's root, from `src/lib/` or `dist/lib/`.
const CLI_DIR = fileURLToPath(new URL("../..", import.meta.url));

// The app's install files as they were before `stack link`, under the app.
// Its presence is what makes the app linked.
export const LINK_DIR = join(".stack", "link");

// Fails when the app is linked: the backup under `LINK_DIR` is the committed
// state, and `stack unlink` restores it over any later install or build.
export function assertUnlinked(cwd: string): void {
	if (existsSync(join(cwd, LINK_DIR))) {
		throw new StackError(
			"The app is linked to a stack checkout; run `stack unlink` first.",
			"APP_LINKED",
		);
	}
}

// Brings the app's stack packages in line with its `package.json`, then installs: docs/architecture/consumer-project.md, "Installing stack".
export function installStack(cwd: string, env: NodeJS.ProcessEnv): void {
	assertUnlinked(cwd);
	const pkgPath = join(cwd, "package.json");
	const pkg = readManifest(pkgPath);
	const workspace = stackWorkspaceRoot(cwd);
	// Inside stack's workspace its root carries the build verdicts by hand.
	if (workspace) {
		const next = JSON.stringify(toWorkspaceSpecs(pkg), null, "\t");
		if (next !== JSON.stringify(pkg, null, "\t")) {
			writeFileSync(pkgPath, `${next}\n`);
		}
		pnpmInstall(workspace, [], env);
		return;
	}
	const root = installRoot(cwd);
	const workspacePath = join(root, "pnpm-workspace.yaml");
	writeFileSync(
		workspacePath,
		pnpmWorkspaceTemplate(
			existsSync(workspacePath) ? readFileSync(workspacePath, "utf8") : null,
			namedStackPackages(pkg),
		),
	);
	pnpmInstall(root, [], env);
}

// The stack packages the app's `dependencies` and `devDependencies` name.
export function namedStackPackages(pkg: Manifest): StackPackage[] {
	return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter(
		isStackPackage,
	);
}

// Runs `pnpm install` with `args` in `cwd`.
export function pnpmInstall(
	cwd: string,
	args: readonly string[],
	env: NodeJS.ProcessEnv,
): void {
	const result = spawnSync("pnpm", ["install", ...args], {
		cwd,
		stdio: "inherit",
		env,
	});
	if (isErrno(result.error, "ENOENT")) {
		throw new StackError(
			"pnpm is not installed; install it with `corepack enable` or `npm i -g pnpm`.",
			"INSTALL_FAILED",
		);
	}
	if (result.status !== 0) {
		throw new StackError(
			`pnpm install failed (exit ${result.status ?? "signal"}).`,
			"INSTALL_FAILED",
		);
	}
}

// The manifest with each stack package in `dependencies` and
// `devDependencies` given `spec(name)`.
export function withStackSpecs(
	pkg: Manifest,
	spec: (name: StackPackage) => string,
): Manifest {
	const rewrite = (deps?: Record<string, string>) =>
		deps &&
		Object.fromEntries(
			Object.entries(deps).map(([name, current]) => [
				name,
				isStackPackage(name) ? spec(name) : current,
			]),
		);
	return {
		...pkg,
		dependencies: rewrite(pkg.dependencies),
		devDependencies: rewrite(pkg.devDependencies),
	};
}

export function toWorkspaceSpecs(pkg: Manifest): Manifest {
	return withStackSpecs(pkg, () => "workspace:*");
}

// `path` with POSIX separators, as specs and workspace globs take it.
export const toPosix = (path: string): string => path.split(sep).join("/");

// The directory that holds the app's `pnpm-workspace.yaml` and
// `pnpm-lock.yaml`, where its install runs: the root of the pnpm workspace
// the app is a project of (a consumer monorepo), else the app.
export function installRoot(cwd: string): string {
	return workspaceOf(cwd)?.root ?? cwd;
}

// The root of the pnpm workspace `dir` is a project of, with the test of
// whether a path is one of its projects. pnpm takes the nearest
// `pnpm-workspace.yaml` above a directory as its workspace, whose `packages`
// globs name the projects; null when none is above `dir` or `dir` is not a
// project of it.
function workspaceOf(
	dir: string,
): { root: string; isProject: (path: string) => boolean } | null {
	const target = realpathSync(dir);
	let root = target;
	while (!existsSync(join(root, "pnpm-workspace.yaml"))) {
		const parent = dirname(root);
		if (parent === root) return null;
		root = parent;
	}
	const manifest: unknown = parse(
		readFileSync(join(root, "pnpm-workspace.yaml"), "utf8"),
	);
	const packages =
		isRecord(manifest) && Array.isArray(manifest.packages)
			? manifest.packages.filter((p): p is string => typeof p === "string")
			: [];
	// pnpm accepts `./apps/*`, `..` segments and repeated slashes.
	const globs = packages.map((p) => ({
		exclude: p.startsWith("!"),
		glob: posix.normalize(p.replace(/^!/, "")),
	}));
	const isProject = (path: string): boolean => {
		const rel = relative(root, path);
		if (leaves(rel)) return false;
		const project = toPosix(rel);
		const matches = (exclude: boolean) =>
			globs.some((g) => g.exclude === exclude && matchesGlob(project, g.glob));
		return matches(false) && !matches(true);
	};
	return isProject(target) ? { root, isProject } : null;
}

// The root of the pnpm workspace `dir` belongs to, when this CLI's package
// (`CLI_DIR`) is a project of that workspace too: stack's own checkout.
export function stackWorkspaceRoot(dir: string): string | null {
	const workspace = workspaceOf(dir);
	return workspace?.isProject(realpathSync(CLI_DIR)) ? workspace.root : null;
}
