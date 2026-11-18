import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// The entity vocabulary sweep and what it skips: docs/architecture/plugins/db.md, "Entity vocabulary".
const VALUE_DECL_RE =
	/export\s+(?:declare\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
const EXPORT_LIST_RE =
	/export\s+(type\s+)?\{([^}]*)\}(?:\s*from\s*["'][^"']+["'])?/g;

function parseExportList(body: string): string[] {
	const names: string[] = [];
	for (const rawItem of body.split(",")) {
		const item = rawItem.trim();
		if (!item || item.startsWith("type ")) continue; // `export { type Foo, bar }`
		const asMatch = item.match(
			/^[A-Za-z_$][A-Za-z0-9_$]*\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)$/,
		);
		if (asMatch?.[1]) {
			names.push(asMatch[1]);
			continue;
		}
		if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(item) && item !== "default") {
			names.push(item);
		}
	}
	return names;
}

// Returns `null` when the schema file doesn't exist or has no value exports
// — the caller then contributes no entity names.
export function extractSchemaEntities(cwd: string): readonly string[] | null {
	const schemaPath = join(cwd, "src", "schema", "index.ts");
	if (!existsSync(schemaPath)) return null;
	const content = readFileSync(schemaPath, "utf-8");

	const names = new Set<string>();
	for (const match of content.matchAll(VALUE_DECL_RE)) {
		if (match[1]) names.add(match[1]);
	}
	for (const match of content.matchAll(EXPORT_LIST_RE)) {
		const isTypeOnly = match[1] !== undefined;
		if (isTypeOnly || !match[2]) continue;
		for (const name of parseExportList(match[2])) names.add(name);
	}

	if (names.size === 0) return null;
	return [...names].sort((a, b) => a.localeCompare(b));
}
