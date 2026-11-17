import { isAbsolute, relative, resolve, sep } from "node:path";
import { StackError } from "./errors.ts";

// Resolves `path` against `cwd`, refusing the root itself or a path outside it.
// Path containment: docs/architecture/codegen.md, "Path containment".
export function insideProject(cwd: string, path: string): string {
	const absolute = resolve(cwd, path);
	const rel = relative(cwd, absolute);
	if (
		rel === "" ||
		rel === ".." ||
		rel.startsWith(`..${sep}`) ||
		isAbsolute(rel)
	) {
		throw new StackError(
			`Refusing path "${path}": it is not inside the project (${cwd}).`,
			"PATH_OUTSIDE_PROJECT",
		);
	}
	return absolute;
}
