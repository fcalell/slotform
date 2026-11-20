import assert from "node:assert/strict";
import {
	mkdirSync,
	mkdtempSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";
import { dbOptionsSchema } from "../types.ts";
import {
	applySeed,
	buildSeedSql,
	describeSeed,
	loadSeed,
	type TableSeedSpec,
} from "./seed.ts";

const projects: TableSeedSpec = {
	table: "projects",
	pkColumns: ["id"],
	rows: [
		{ id: "a", name: "A" },
		{ id: "b", name: "B" },
	],
};
const links: TableSeedSpec = {
	table: "links",
	pkColumns: [],
	rows: [{ url: "x" }],
};
const emptied: TableSeedSpec = { table: "tags", pkColumns: ["id"], rows: [] };

test("buildSeedSql prunes by default", () => {
	const sql = buildSeedSql([projects, links, emptied]);
	assert.match(sql, /INSERT INTO "projects"[^;]*ON CONFLICT\("id"\) DO UPDATE/);
	assert.match(sql, /DELETE FROM "projects" WHERE "id" NOT IN \('a', 'b'\);/);
	assert.match(sql, /DELETE FROM "links";\nINSERT INTO "links"/);
	assert.match(sql, /DELETE FROM "tags";/);
	assert.equal(sql, buildSeedSql([projects, links, emptied], { prune: true }));
});

test("buildSeedSql without prune only upserts", () => {
	const sql = buildSeedSql([projects, links, emptied], { prune: false });
	assert.match(sql, /INSERT INTO "projects"[^;]*ON CONFLICT\("id"\) DO UPDATE/);
	assert.doesNotMatch(sql, /DELETE/);
	assert.doesNotMatch(sql, /"links"/);
	assert.doesNotMatch(sql, /"tags"/);
});

test("buildSeedSql without prune and nothing to upsert is empty", () => {
	assert.equal(buildSeedSql([links, emptied], { prune: false }), "");
});

test("describeSeed states the effect on rows outside the seed", () => {
	assert.deepEqual(describeSeed([projects, links, emptied], { prune: true }), [
		{ label: "projects", detail: "2 rows upserted; every other row deleted" },
		{ label: "links", detail: "1 row; table emptied and refilled" },
		{ label: "tags", detail: "all rows deleted" },
	]);
	assert.deepEqual(describeSeed([projects, links, emptied], { prune: false }), [
		{ label: "projects", detail: "2 rows upserted; other rows kept" },
		{ label: "links", detail: "left alone: no primary key" },
		{ label: "tags", detail: "left alone" },
	]);
});

async function withSeedFile<T>(
	source: string | null,
	run: (cwd: string) => Promise<T>,
): Promise<T> {
	const cwd = mkdtempSync(join(tmpdir(), "slotform-seed-"));
	try {
		if (source !== null) {
			mkdirSync(join(cwd, "src", "schema"), { recursive: true });
			writeFileSync(join(cwd, "src", "schema", "seed.ts"), source);
		}
		return await run(cwd);
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
}

test("loadSeed reads the prune marker, false when absent", async () => {
	assert.equal(await withSeedFile(null, loadSeed), null);
	const absent = await withSeedFile("export default [];\n", loadSeed);
	assert.deepEqual(absent, { specs: [], prune: false });
	const off = await withSeedFile(
		"export const prune = false;\nexport default [];\n",
		loadSeed,
	);
	assert.equal(off?.prune, false);
	const on = await withSeedFile(
		"export const prune = true;\nexport default [];\n",
		loadSeed,
	);
	assert.equal(on?.prune, true);
});

test("loadSeed refuses a non-boolean prune marker", async () => {
	await assert.rejects(
		withSeedFile('export const prune = "yes";\nexport default [];\n', loadSeed),
		/prune.*boolean/,
	);
});

const orm = dirname(
	createRequire(import.meta.url).resolve("drizzle-orm/version"),
);

// A project whose seed reads its tables from drizzle, as a consumer's does.
function seedProject(seed: string): string {
	const cwd = mkdtempSync(join(tmpdir(), "slotform-seed-apply-"));
	mkdirSync(join(cwd, "src", "schema"), { recursive: true });
	mkdirSync(join(cwd, "node_modules"), { recursive: true });
	symlinkSync(orm, join(cwd, "node_modules", "drizzle-orm"), "dir");
	writeFileSync(join(cwd, "package.json"), '{"type":"module"}');
	writeFileSync(
		join(cwd, "src", "schema", "index.ts"),
		`import { sqliteTable, text } from "drizzle-orm/sqlite-core";
export const projects = sqliteTable("projects", { id: text("id").primaryKey(), name: text("name").notNull().default("untitled") });
`,
	);
	writeFileSync(join(cwd, "src", "schema", "seed.ts"), seed);
	return cwd;
}

const seedOf = (rows: string) => `import { projects } from "./index.ts";
export default [{ table: projects, rows: ${rows} }];
`;

test("a seed column left undefined takes its SQL default", async () => {
	const cwd = seedProject(seedOf('[{ id: "a", name: undefined }]'));
	try {
		const seed = await loadSeed(cwd);
		assert.deepEqual(seed?.specs[0]?.rows, [{ id: "a" }]);
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});

test("a seed saved again loads its new rows", async () => {
	const cwd = seedProject(seedOf('[{ id: "a" }]'));
	try {
		assert.deepEqual((await loadSeed(cwd))?.specs[0]?.rows, [{ id: "a" }]);
		writeFileSync(
			join(cwd, "src", "schema", "seed.ts"),
			seedOf('[{ id: "b" }]'),
		);
		assert.deepEqual((await loadSeed(cwd))?.specs[0]?.rows, [{ id: "b" }]);
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});

test("a sqlite prune runs the schema's ON DELETE actions", async () => {
	const cwd = seedProject(seedOf('[{ id: "a" }]'));
	const file = join(cwd, "app.sqlite");
	const db = new Database(file);
	db.exec(
		`CREATE TABLE projects (id text PRIMARY KEY, name text NOT NULL DEFAULT 'untitled');
CREATE TABLE tasks (id text PRIMARY KEY, project_id text REFERENCES projects(id) ON DELETE SET NULL);
INSERT INTO projects (id) VALUES ('a'), ('b');
INSERT INTO tasks VALUES ('t', 'b');`,
	);
	db.close();
	try {
		const options = dbOptionsSchema.parse({ dialect: "sqlite", path: file });
		assert.equal(await applySeed(cwd, options, {}, { remote: false }), true);
		const check = new Database(file, { readonly: true });
		try {
			assert.deepEqual(check.prepare("SELECT id, name FROM projects").all(), [
				{ id: "a", name: "untitled" },
			]);
			assert.deepEqual(check.prepare("SELECT project_id FROM tasks").all(), [
				{ project_id: null },
			]);
		} finally {
			check.close();
		}
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});
