import assert from "node:assert/strict";
import { test } from "node:test";
import type { SQL } from "drizzle-orm";
import {
	integer,
	SQLiteSyncDialect,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";
import {
	bm25,
	FTS_KEY,
	ftsConvergeStatements,
	ftsQuery,
	ftsTable,
	highlight,
	match,
} from "./fts.ts";
import {
	deadFtsTriggers,
	migratedFts,
	pendingFtsMigrations,
	resyncRecreatedContent,
} from "./node/fts.ts";

const tasks = sqliteTable("tasks", {
	id: integer("id").primaryKey(),
	title: text("title").notNull(),
	ownerName: text("owner_name").notNull(),
	plays: integer("plays").notNull().default(0),
});

const search = ftsTable("task_search", {
	content: tasks,
	columns: ["title", "ownerName"],
	prefix: [2, 3],
});

test("ftsTable maps columns to their database names and watches only them", () => {
	const def = search[FTS_KEY];
	assert.deepEqual(def.columns, ["title", "owner_name"]);
	assert.match(def.create, /fts5\(`title`, `owner_name`, content=`tasks`/);
	assert.match(def.create, /prefix='2 3'/);
	const update = def.triggers.find((t) => t.name === "task_search_au");
	assert.match(
		update?.sql ?? "",
		/AFTER UPDATE OF `id`, `title`, `owner_name`/,
	);
	assert.doesNotMatch(update?.sql ?? "", /plays/);
});

test("ftsTable refuses a content table without an integer key", () => {
	const textKeyed = sqliteTable("t", { id: text("id").primaryKey() });
	assert.throws(
		() => ftsTable("t_search", { content: textKeyed, columns: ["id"] }),
		/integer primary key/,
	);
});

const dialect = new SQLiteSyncDialect();
const render = (query: SQL) => {
	const { sql, params } = dialect.sqlToQuery(query);
	return { sql, params };
};

test("match binds the query against the index", () => {
	assert.deepEqual(render(match(search, '"daft"*')), {
		sql: '"task_search" MATCH ?',
		params: ['"daft"*'],
	});
});

test("bm25 lists weights in index order, 1 for a column left out", () => {
	assert.equal(render(bm25(search)).sql, 'bm25("task_search")');
	assert.equal(
		render(bm25(search, { ownerName: 5 })).sql,
		'bm25("task_search", 1, 5)',
	);
	assert.equal(
		render(bm25(search, { ownerName: 5, title: 10 })).sql,
		'bm25("task_search", 10, 5)',
	);
});

test("highlight names the column by its place in the index", () => {
	assert.deepEqual(render(highlight(search, "ownerName", "<b>", "</b>")), {
		sql: 'highlight("task_search", 1, ?, ?)',
		params: ["<b>", "</b>"],
	});
});

test("ftsTable addresses rows by the column `rowid` names", () => {
	const keyed = sqliteTable("notes", {
		id: text("id").primaryKey(),
		seq: integer("seq").notNull().unique(),
		body: text("body"),
	});
	const def = ftsTable("note_search", {
		content: keyed,
		columns: ["body"],
		rowid: "seq",
	})[FTS_KEY];
	assert.match(def.create, /content_rowid=`seq`/);
	assert.throws(
		() =>
			ftsTable("note_search", {
				content: keyed,
				columns: ["body"],
				// @ts-expect-error: a column the table lacks
				rowid: "missing",
			}),
		/has no column "missing"/,
	);
});

test("a live index converges: nothing when current, triggers alone, or the whole index", () => {
	const def = search[FTS_KEY];
	const triggers = new Map(def.triggers.map((t) => [t.name, t.sql]));
	assert.deepEqual(
		ftsConvergeStatements(def, { table: def.create, triggers }),
		[],
	);
	const lost = ftsConvergeStatements(def, {
		table: def.create,
		triggers: new Map(),
	});
	assert.doesNotMatch(lost.join("\n"), /VIRTUAL TABLE/);
	assert.match(lost.join("\n"), /CREATE TRIGGER `task_search_ai`/);
	assert.match(lost.at(-1) ?? "", /VALUES \('rebuild'\)/);
	const missing = ftsConvergeStatements(def, { table: null, triggers });
	assert.match(missing.join("\n"), /DROP TABLE IF EXISTS `task_search`/);
	assert.match(missing.join("\n"), /CREATE VIRTUAL TABLE `task_search`/);
});

test("two indexes of one name are refused", () => {
	const def = search[FTS_KEY];
	assert.throws(
		() => pendingFtsMigrations([def, { ...def, hash: "0" }], new Map()),
		/Two full-text indexes are named "task_search"/,
	);
});

test("ftsQuery quotes every word and prefixes the last", () => {
	assert.equal(ftsQuery("daft pu"), '"daft" "pu"*');
	assert.equal(ftsQuery('a "b" OR (c'), '"a" "b" "OR" "c"*');
	assert.equal(ftsQuery("daft pu", { prefix: false }), '"daft" "pu"');
	assert.equal(ftsQuery("  -- "), null);
});

test("an index migrates once, again when it changes, and drops when removed", () => {
	const def = search[FTS_KEY];
	const [created] = pendingFtsMigrations([def], new Map());
	assert.match(
		created?.sql ?? "",
		/^-- slotform:fts task_search [0-9a-f]{8}\n/,
	);
	assert.doesNotMatch(created?.sql ?? "", /DROP TABLE/);

	assert.deepEqual(
		pendingFtsMigrations([def], new Map([[def.name, def.hash]])),
		[],
	);

	const [changed] = pendingFtsMigrations([def], new Map([[def.name, "0"]]));
	assert.match(changed?.sql ?? "", /DROP TABLE IF EXISTS `task_search`/);

	const [dropped] = pendingFtsMigrations([], new Map([[def.name, def.hash]]));
	assert.equal(dropped?.name, "fts_drop_task_search");
});

test("migratedFts reads the newest marker per index", async () => {
	const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs");
	const { tmpdir } = await import("node:os");
	const { join } = await import("node:path");
	const dir = mkdtempSync(join(tmpdir(), "fts-"));
	try {
		writeFileSync(
			join(dir, "0001_a.sql"),
			"-- slotform:fts a 11111111\nSELECT 1;",
		);
		writeFileSync(
			join(dir, "0002_b.sql"),
			"-- slotform:fts a 22222222\nSELECT 1;",
		);
		writeFileSync(join(dir, "0003_c.sql"), "-- slotform:fts b 33333333\n");
		writeFileSync(join(dir, "0004_d.sql"), "-- slotform:fts-drop b\n");
		assert.deepEqual([...migratedFts(dir)], [["a", "22222222"]]);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test("a migration that recreates the content table re-syncs the index", () => {
	const def = search[FTS_KEY];
	const recreate =
		"INSERT INTO `__new_tracks` SELECT * FROM `tasks`;--> statement-breakpoint\nDROP TABLE `tasks`;--> statement-breakpoint\nALTER TABLE `__new_tracks` RENAME TO `tasks`;\n";
	const synced = resyncRecreatedContent(recreate, [def]);
	assert.match(synced, /CREATE TRIGGER `task_search_ai`/);
	assert.match(synced, /VALUES \('rebuild'\)/);
	const untouched = "ALTER TABLE `tasks` ADD `x` text;\n";
	assert.equal(resyncRecreatedContent(untouched, [def]), untouched);
});

test("a rebuild of the content table that creates no trigger afterwards is reported", async () => {
	const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs");
	const { tmpdir } = await import("node:os");
	const { join } = await import("node:path");
	const def = search[FTS_KEY];
	const dir = mkdtempSync(join(tmpdir(), "fts-dead-"));
	try {
		writeFileSync(
			join(dir, "0000_fts.sql"),
			pendingFtsMigrations([def], new Map())[0]?.sql ?? "",
		);
		assert.deepEqual(deadFtsTriggers(dir, [def]), []);
		const rebuild =
			"INSERT INTO `__new_tracks` SELECT * FROM `tasks`;--> statement-breakpoint\nDROP TABLE `tasks`;--> statement-breakpoint\nALTER TABLE `__new_tracks` RENAME TO `tasks`;\n";
		writeFileSync(join(dir, "0001_rebuild.sql"), rebuild);
		assert.deepEqual(deadFtsTriggers(dir, [def]), [
			{
				index: "task_search",
				table: "tasks",
				migration: "0001_rebuild.sql",
			},
		]);
		writeFileSync(
			join(dir, "0001_rebuild.sql"),
			resyncRecreatedContent(rebuild, [def]),
		);
		assert.deepEqual(deadFtsTriggers(dir, [def]), []);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
