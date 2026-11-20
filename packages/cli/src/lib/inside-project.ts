import { isAbsolute, relative, resolve, sep } from "node:path";
import { SlotformError } from "./errors.ts";

// Whether `rel`, a path relative to some directory, leaves it (`..foo` stays).
export function leaves(rel: string): boolean {
	return rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel);
}

// Resolves `path` against `cwd`, refusing the root itself or a path outside it.
// Path containment: docs/architecture/codegen.md, "Path containment".
export function insideProject(cwd: string, path: string): string {
	const absolute = resolve(cwd, path);
	const rel = relative(cwd, absolute);
	if (rel === "" || leaves(rel)) {
		throw new SlotformError(
			`Refusing path "${path}": it is not inside the project (${cwd}).`,
			"PATH_OUTSIDE_PROJECT",
		);
	}
	return absolute;
}
