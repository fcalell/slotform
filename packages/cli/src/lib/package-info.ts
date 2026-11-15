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

// Memoized: within a CLI process, package resolution is stable, so we
// avoid repeating the require.resolve + filesystem walk for any package
// we've already looked up.
const cache = new Map<string, PackageInfo | null>();

export function findPackageInfo(pkg: string): PackageInfo | null {
	const cached = cache.get(pkg);
	if (cached !== undefined) return cached;
	for (const make of [
		() => createRequire(join(process.cwd(), "package.json")),
		() => createRequire(import.meta.url),
	]) {
		let mainPath: string;
		try {
			mainPath = make().resolve(pkg);
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
	cache.set(pkg, null);
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
