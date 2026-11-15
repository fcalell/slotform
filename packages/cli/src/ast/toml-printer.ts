import { stringify } from "smol-toml";
import { isRecord } from "../lib/is-record.ts";
import type { TomlDocument, TomlValue } from "./specs.ts";

// Build a nested JS object that smol-toml's stringify can serialize.
// - `root` entries become top-level keys.
// - `arrayTables[].path` becomes an array of objects at that path
//   (e.g. `["unsafe", "bindings"]` → `[[unsafe.bindings]]`).

type MutableTomlTable = { [key: string]: TomlValue };

function ensureObject(parent: MutableTomlTable, key: string): MutableTomlTable {
	const existing = parent[key];
	if (existing === undefined) {
		const fresh: MutableTomlTable = {};
		parent[key] = fresh;
		return fresh;
	}
	if (!isRecord(existing)) {
		throw new Error(
			`TOML path conflict: "${key}" already set to a non-object value`,
		);
	}
	return existing;
}

function ensureArray(
	parent: MutableTomlTable,
	key: string,
): MutableTomlTable[] {
	const existing = parent[key];
	if (existing === undefined) {
		const fresh: MutableTomlTable[] = [];
		parent[key] = fresh;
		return fresh;
	}
	if (!Array.isArray(existing)) {
		throw new Error(
			`TOML path conflict: "${key}" already set to a non-array value`,
		);
	}
	// Only this function writes an array at a table path, and it writes tables.
	return existing as MutableTomlTable[];
}

function resolveParent(
	root: MutableTomlTable,
	path: string[],
): MutableTomlTable {
	let cursor: MutableTomlTable = root;
	for (let i = 0; i < path.length - 1; i++) {
		const segment = path[i];
		if (segment === undefined) {
			throw new Error("TOML path contains an undefined segment");
		}
		cursor = ensureObject(cursor, segment);
	}
	return cursor;
}

export function renderToml(doc: TomlDocument): string {
	const out: MutableTomlTable = { ...doc.root };

	for (const aot of doc.arrayTables) {
		if (aot.path.length === 0) {
			throw new Error("TOML array-table path must be non-empty");
		}
		const parent = resolveParent(out, aot.path);
		const leaf = aot.path[aot.path.length - 1];
		if (leaf === undefined) {
			throw new Error("TOML array-table path contains an undefined leaf");
		}
		const arr = ensureArray(parent, leaf);
		arr.push({ ...aot.entries });
	}

	return stringify(out);
}
