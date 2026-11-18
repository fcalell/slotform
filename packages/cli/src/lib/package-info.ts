// Locates an installed npm package by name and returns its root directory + its package.json `exports`.
// Tries the consumer cwd's resolver first, then falls back to the CLI's own resolution scope so workspace dev (with symlinked node_modules) works.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { isErrno } from "./errno.ts";

interface PackageInfo {
	root: string;
	exports: object | undefined;
}

// The entry of `pkg` as the app at `dir` resolves it.
export function resolveFromApp(pkg: string, dir: string): string {
	return createRequire(join(dir, "package.json")).resolve(pkg);
}

// Only a found package is memoized: one not found yet may be installed later
// in the same process (`stack init` installs, then loads).
const cache = new Map<string, PackageInfo>();

export function findPackageInfo(pkg: string): PackageInfo | null {
	const cached = cache.get(pkg);
	if (cached !== undefined) return cached;
	for (const resolvePkg of [
		() => resolveFromApp(pkg, process.cwd()),
		() => createRequire(import.meta.url).resolve(pkg),
	]) {
		let mainPath: string;
		try {
			mainPath = resolvePkg();
		} catch (error) {
			// Not installed, or installed with no entry `require` can reach.
			if (!isErrno(error, "MODULE_NOT_FOUND", "ERR_PACKAGE_PATH_NOT_EXPORTED"))
				throw error;
			continue;
		}
		const info = walkUpToPackageJson(mainPath, pkg);
		if (info) {
			cache.set(pkg, info);
			return info;
		}
	}
	return null;
}

function walkUpToPackageJson(
	startPath: string,
	pkg: string,
): PackageInfo | null {
	let dir = dirname(startPath);
	for (let i = 0; i < 15; i++) {
		const parsed = readPackageJson(join(dir, "package.json"));
		if (
			typeof parsed === "object" &&
			parsed !== null &&
			"name" in parsed &&
			parsed.name === pkg
		) {
			const exports =
				"exports" in parsed &&
				typeof parsed.exports === "object" &&
				parsed.exports !== null
					? parsed.exports
					: undefined;
			return { root: dir, exports };
		}
		const parent = dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
	return null;
}

function readPackageJson(path: string): unknown {
	try {
		return JSON.parse(readFileSync(path, "utf-8"));
	} catch (error) {
		if (isErrno(error, "ENOENT", "ENOTDIR")) return null;
		throw error;
	}
}
