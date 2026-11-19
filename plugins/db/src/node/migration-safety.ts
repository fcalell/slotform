import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import type { ResolvedDbOptions } from "../types.ts";
import { runDrizzleKit, writeDrizzleConfig } from "./drizzle-kit.ts";
import {
	deadFtsTriggers,
	loadFtsDefinitions,
	migratedFts,
	pendingFtsMigrations,
} from "./fts.ts";
import {
	DB_KIT_DIR,
	migrationFiles,
	migrationsDir,
	readJournal,
	readSnapshot,
	type Snapshot,
} from "./layout.ts";

// The destructive marker: docs/architecture/plugins/db.md, "Deploy checks".
const ALLOW_DESTRUCTIVE_MARKER = "stack:allow-destructive";

// Drift paths stay relative to cwd: docs/architecture/plugins/db.md, "drizzle-kit".
const DRIFT_DIR = `${DB_KIT_DIR}/drift`;
const DRIFT_CONFIG = `${DB_KIT_DIR}/drift.config.ts`;

interface DropReport {
	tables: string[];
	columns: { table: string; column: string }[];
	views: string[];
}

// Drops present in `prev` and gone in `next`. A dropped table subsumes its
// columns (only the table is reported, not each column). Deterministically
// ordered so the explainer reads the same across runs.
function diffSnapshots(prev: Snapshot, next: Snapshot): DropReport {
	const prevTables = prev.tables ?? {};
	const nextTables = next.tables ?? {};
	const tables = Object.keys(prevTables)
		.filter((t) => !(t in nextTables))
		.sort();

	const columns: { table: string; column: string }[] = [];
	for (const [table, def] of Object.entries(prevTables)) {
		const nextTable = nextTables[table];
		if (!nextTable) continue; // whole-table drop already reported
		const nextColumns = nextTable.columns ?? {};
		for (const column of Object.keys(def.columns ?? {})) {
			if (!(column in nextColumns)) columns.push({ table, column });
		}
	}
	columns.sort(
		(a, b) =>
			a.table.localeCompare(b.table) || a.column.localeCompare(b.column),
	);

	const nextViews = next.views ?? {};
	const views = Object.keys(prev.views ?? {})
		.filter((v) => !(v in nextViews))
		.sort();

	return { tables, columns, views };
}

const sameSchema = (a: Snapshot, b: Snapshot): boolean =>
	JSON.stringify([a.tables ?? {}, a.views ?? {}]) ===
	JSON.stringify([b.tables ?? {}, b.views ?? {}]);

function formatDropReport(migration: string, report: DropReport): string {
	const lines: string[] = [];
	for (const t of report.tables) lines.push(`  - drops table "${t}"`);
	for (const v of report.views) lines.push(`  - drops view "${v}"`);
	for (const c of report.columns)
		lines.push(`  - drops column "${c.column}" on table "${c.table}"`);

	return [
		`Destructive migration ${migration}:`,
		...lines,
		"",
		"A drop breaks the live worker mid-deploy — old code still reads the",
		"dropped shape during the rollout window. Use expand/contract: ship the",
		"additive change, deploy, migrate data off the old shape, then drop it in a",
		"later release.",
		"",
		`If this drop is intentional and safe, add a "-- ${ALLOW_DESTRUCTIVE_MARKER}"`,
		`line anywhere in ${migration}.`,
	].join("\n");
}

/** The newest schema change's unacknowledged drops, formatted; null when it drops nothing or carries the marker. The newest schema change is the newest migration whose snapshot differs from its predecessor's: a custom migration (an index, a backfill) after it leaves the snapshot as it was. Docs: docs/architecture/plugins/db.md, "Deploy checks". */
export function formatUnacknowledgedDrops(
	cwd: string,
	options: ResolvedDbOptions,
): string | null {
	const dir = migrationsDir(cwd, options);
	const entries = readJournal(dir) ?? [];
	for (let at = entries.length - 1; at >= 0; at--) {
		const entry = entries[at];
		if (!entry) continue;
		const prevEntry = entries[at - 1];
		const prev = prevEntry ? readSnapshot(dir, prevEntry) : {};
		const next = readSnapshot(dir, entry);
		if (sameSchema(prev, next)) continue;
		const report = diffSnapshots(prev, next);
		const migration = `${entry.tag}.sql`;
		const sqlPath = join(dir, migration);
		const sql = existsSync(sqlPath) ? readFileSync(sqlPath, "utf-8") : "";
		const drops =
			report.tables.length + report.columns.length + report.views.length;
		if (drops === 0 || sql.includes(ALLOW_DESTRUCTIVE_MARKER)) return null;
		return formatDropReport(migration, report);
	}
	return null;
}

/** The drift problem, formatted: the schema, or a full-text index, changed with no committed migration; null when the migrations match. Docs: docs/architecture/plugins/db.md, "Deploy checks". */
export function formatDrift(
	cwd: string,
	options: ResolvedDbOptions,
	env: NodeJS.ProcessEnv,
): string | null {
	const dir = migrationsDir(cwd, options);
	const driftAbs = join(cwd, DRIFT_DIR);
	const configAbs = join(cwd, DRIFT_CONFIG);

	rmSync(driftAbs, { recursive: true, force: true });
	mkdirSync(driftAbs, { recursive: true });
	try {
		if (existsSync(dir)) cpSync(dir, driftAbs, { recursive: true });
		const before = migrationFiles(driftAbs).length;

		// Config paths stay relative to cwd: docs/architecture/plugins/db.md, "drizzle-kit".
		writeDrizzleConfig(configAbs, {
			schema: "./src/schema/index.ts",
			out: `./${DRIFT_DIR}`,
		});

		runDrizzleKit(cwd, ["generate", "--config", configAbs], env, {
			createOnConflict: true,
		});

		const drift =
			migrationFiles(driftAbs).length > before ||
			pendingFtsMigrations(loadFtsDefinitions(cwd, env), migratedFts(dir))
				.length > 0;
		return drift
			? "Schema drift: `src/schema` has changes with no committed migration. Run `stack db generate` and commit the migration."
			: null;
	} finally {
		rmSync(driftAbs, { recursive: true, force: true });
		rmSync(configAbs, { force: true });
	}
}

/** What a full-text index's content table lost to a rebuild: each index a committed migration rebuilt the table of without creating its triggers again. Its writes no longer reach the index. */
export function formatDeadTriggers(
	cwd: string,
	options: ResolvedDbOptions,
	env: NodeJS.ProcessEnv,
): string | null {
	const dead = deadFtsTriggers(
		migrationsDir(cwd, options),
		loadFtsDefinitions(cwd, env),
	);
	if (dead.length === 0) return null;
	return [
		"A migration rebuilds a table with a full-text index and leaves it without its triggers, so writes stop reaching the index:",
		...dead.map(
			(d) =>
				`  - ${d.migration} rebuilds "${d.table}"; the triggers of "${d.index}" are not created again`,
		),
		"",
		"Append the resync that `stack db generate` writes after a rebuild to that migration: DROP TRIGGER IF EXISTS and CREATE TRIGGER for `<index>_ai`, `_ad` and `_au` (copy them from the index's `fts_<index>` migration), then INSERT INTO `<index>`(`<index>`) VALUES ('rebuild').",
		"Do not edit a migration already applied to a database you keep: add a new custom migration (`stack db generate --custom`) with the same statements.",
	].join("\n");
}

/** The first committed migration that fails to build a database from nothing, applied in order to a scratch in-memory sqlite, as `stack db apply` and a fresh deploy would; null when all apply. A statement SQLite refuses (a rebuilt table's index on a column it lacks, an empty custom migration) is reported with its migration. */
export function formatFailedMigration(
	cwd: string,
	options: ResolvedDbOptions,
): string | null {
	const dir = migrationsDir(cwd, options);
	const journaled = readJournal(dir)?.map((e) => `${e.tag}.sql`);
	const files = (journaled ?? migrationFiles(dir)).filter((f) =>
		existsSync(join(dir, f)),
	);
	if (files.length === 0) return null;
	const Database = createRequire(import.meta.url)("better-sqlite3");
	const db = new Database(":memory:");
	try {
		for (const file of files) {
			const statements = readFileSync(join(dir, file), "utf-8")
				.split("--> statement-breakpoint")
				.map((s) => s.trim())
				.filter(Boolean);
			for (const statement of statements) {
				try {
					db.exec(statement);
				} catch (err) {
					const why = err instanceof Error ? err.message : String(err);
					return [
						`Migration ${file} fails to apply to an empty database: ${why}`,
						`  ${statement.split("\n")[0]?.slice(0, 160)}`,
						"",
						"Fix the schema and run `stack db generate` again, or, for a migration not yet applied anywhere, correct the statement in the file.",
					].join("\n");
				}
			}
		}
		return null;
	} finally {
		db.close();
	}
}

/** The checks `stack db check` runs and a d1 deploy refuses on, in that order: each formats its problem, or returns null. */
export const MIGRATION_CHECKS = [
	{
		problem: "drift",
		code: "DB_DRIFT",
		pass: "No schema drift.",
		run: formatDrift,
	},
	{
		problem: "destructive migration",
		code: "DB_DESTRUCTIVE",
		pass: "No unacknowledged destructive changes.",
		run: formatUnacknowledgedDrops,
	},
	{
		problem: "full-text triggers",
		code: "DB_FTS_TRIGGERS",
		pass: "Full-text indexes keep their triggers.",
		run: formatDeadTriggers,
	},
	{
		problem: "migration does not apply",
		code: "DB_MIGRATION_FAILS",
		pass: "Every migration applies to an empty database.",
		run: formatFailedMigration,
	},
] as const;
