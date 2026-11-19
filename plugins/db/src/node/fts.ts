import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
	createsFtsTriggers,
	FTS_KEY_NAME,
	type FtsDefinition,
	ftsConvergeStatements,
	ftsDropMigrationSql,
	ftsMigrationSql,
	ftsResyncSql,
	ftsShadowTables,
} from "../fts.ts";
import { runCommand } from "./exec.ts";
import { migrationFiles } from "./layout.ts";

// Declared indexes are read in a fresh process: docs/architecture/plugins/db.md, "Full-text indexes".
// One index exported under two names is one definition; two indexes of one
// name are two, which `assertUnique` refuses.
const LOADER = `
const [file, key] = process.argv.slice(1);
const mod = await import(file);
const defs = [];
for (const value of Object.values(mod)) {
	const def = value?.[Symbol.for(key)];
	if (def && !defs.includes(def)) defs.push(def);
}
process.stdout.write("\\n@@stack-fts@@" + JSON.stringify(defs));
`;

export function loadFtsDefinitions(
	cwd: string,
	env: NodeJS.ProcessEnv,
): FtsDefinition[] {
	const schema = join(cwd, "src", "schema", "index.ts");
	if (!existsSync(schema)) return [];
	const { stdout } = runCommand(
		process.execPath,
		[
			"--input-type=module",
			"-e",
			LOADER,
			pathToFileURL(schema).href,
			FTS_KEY_NAME,
		],
		cwd,
		env,
	);
	const at = stdout.lastIndexOf("@@stack-fts@@");
	if (at < 0) return [];
	// LOADER prints the definitions the schema carries, which ftsTable built.
	return JSON.parse(
		stdout.slice(at + "@@stack-fts@@".length),
	) as FtsDefinition[];
}

function assertUnique(defs: FtsDefinition[]): void {
	const seen = new Set<string>();
	for (const def of defs) {
		if (seen.has(def.name)) {
			throw new Error(`Two full-text indexes are named "${def.name}"`);
		}
		seen.add(def.name);
	}
}

// What the committed migrations leave behind, per index: the hash of the
// newest definition migrated, or gone once a drop migration followed it.
export function migratedFts(migrationsDir: string): Map<string, string> {
	const state = new Map<string, string>();
	for (const file of migrationFiles(migrationsDir)) {
		const sql = readFileSync(join(migrationsDir, file), "utf-8");
		for (const [, name, hash] of sql.matchAll(/^-- stack:fts (\S+) (\S+)$/gm)) {
			if (name && hash) state.set(name, hash);
		}
		for (const [, name] of sql.matchAll(/^-- stack:fts-drop (\S+)$/gm)) {
			if (name) state.delete(name);
		}
	}
	return state;
}

interface FtsMigration {
	name: string;
	sql: string;
}

// The custom migrations the declared indexes still need: one per index that is
// new, changed or no longer declared.
export function pendingFtsMigrations(
	declared: FtsDefinition[],
	migrated: Map<string, string>,
): FtsMigration[] {
	assertUnique(declared);
	const out: FtsMigration[] = [];
	for (const def of declared) {
		const prior = migrated.get(def.name);
		if (prior === def.hash) continue;
		out.push({
			name: `fts_${def.name}`,
			sql: ftsMigrationSql(def, { replace: prior !== undefined }),
		});
	}
	const names = new Set(declared.map((d) => d.name));
	for (const name of migrated.keys()) {
		if (!names.has(name)) {
			out.push({ name: `fts_drop_${name}`, sql: ftsDropMigrationSql(name) });
		}
	}
	return out;
}

// Where a migration's SQL rebuilds `table` (SQLite's copy, drop and rename): the
// index of its `DROP TABLE`, or -1.
function rebuildAt(sql: string, table: string): number {
	const name = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return sql.search(
		new RegExp(`DROP TABLE (?:IF EXISTS )?[\`"\\[]?${name}[\`"\\]]?\\s*;`, "i"),
	);
}

// Resync after a content-table rebuild: docs/architecture/plugins/db.md, "Full-text indexes".
export function resyncRecreatedContent(
	sql: string,
	declared: FtsDefinition[],
): string {
	let out = sql;
	for (const def of declared) {
		if (rebuildAt(sql, def.content) >= 0) {
			out = `${out.trimEnd()}\n--> statement-breakpoint\n${ftsResyncSql(def)}`;
		}
	}
	return out;
}

// The trigger check: docs/architecture/plugins/db.md, "Full-text indexes".
export function deadFtsTriggers(
	migrationsDir: string,
	declared: FtsDefinition[],
): Array<{ index: string; table: string; migration: string }> {
	const dead = new Map<string, string>();
	for (const file of migrationFiles(migrationsDir)) {
		const sql = readFileSync(join(migrationsDir, file), "utf-8");
		for (const def of declared) {
			const at = rebuildAt(sql, def.content);
			if (at >= 0) {
				if (createsFtsTriggers(sql.slice(at), def)) {
					dead.delete(def.name);
				} else dead.set(def.name, file);
			} else if (createsFtsTriggers(sql, def)) {
				dead.delete(def.name);
			}
		}
	}
	return declared.flatMap((def) => {
		const migration = dead.get(def.name);
		return migration
			? [{ index: def.name, table: def.content, migration }]
			: [];
	});
}

interface Row {
	name: string;
	sql: string | null;
}

// The full-text indexes a database holds, declared or not: drizzle-kit must
// not offer to drop them.
export async function existingFtsNames(file: string): Promise<string[]> {
	if (!existsSync(file)) return [];
	const { default: Database } = await import("better-sqlite3");
	const db = new Database(file, { readonly: true });
	try {
		const rows = db
			.prepare<[], Row>(
				"SELECT name FROM sqlite_master WHERE type = 'table' AND sql LIKE 'CREATE VIRTUAL TABLE%USING fts5%'",
			)
			.all();
		return rows.map((r) => r.name);
	} finally {
		db.close();
	}
}

export function ftsTablesFilter(names: string[]): string[] {
	return names.flatMap((n) => [n, ...ftsShadowTables(n)]).map((t) => `!${t}`);
}

// Push brings the indexes to the declared ones: docs/architecture/plugins/db.md, "Full-text indexes".
export async function applyFtsLocal(
	cwd: string,
	file: string,
	declared: FtsDefinition[],
): Promise<void> {
	assertUnique(declared);
	const path = resolve(cwd, file);
	const { default: Database } = await import("better-sqlite3");
	const db = new Database(path);
	try {
		const rows = db
			.prepare<[], Row & { type: string }>(
				"SELECT type, name, sql FROM sqlite_master WHERE type IN ('table', 'trigger')",
			)
			.all();
		const statements: string[] = [];
		for (const def of declared) {
			const table = rows.find((r) => r.type === "table" && r.name === def.name);
			const triggers = new Map(
				rows.flatMap((r) =>
					r.type === "trigger" && r.sql !== null
						? [[r.name, r.sql] as const]
						: [],
				),
			);
			statements.push(
				...ftsConvergeStatements(def, {
					table: table?.sql ?? null,
					triggers,
				}),
			);
		}
		if (statements.length === 0) return;
		db.transaction(() => {
			for (const statement of statements) db.exec(statement);
		})();
	} finally {
		db.close();
	}
}
