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
import { dbOptionsSchema } from "../types.ts";
import { generateMigrations } from "./push.ts";

const SQLITE = dbOptionsSchema.parse({ dialect: "sqlite", path: "./x.db" });

const orm = dirname(
	createRequire(import.meta.url).resolve("drizzle-orm/version"),
);
// The source `/orm` module: the package's own subpath resolves to its `dist`,
// which would test the last build.
const ormSource = join(import.meta.dirname, "..", "orm.ts");

function consumer(schema: string): string {
	const cwd = mkdtempSync(join(tmpdir(), "stack-view-"));
	mkdirSync(join(cwd, "src", "schema"), { recursive: true });
	mkdirSync(join(cwd, "node_modules"), { recursive: true });
	symlinkSync(orm, join(cwd, "node_modules", "drizzle-orm"), "dir");
	writeFileSync(join(cwd, "package.json"), '{"type":"module"}');
	writeFileSync(join(cwd, "src", "schema", "index.ts"), schema);
	return cwd;
}

const TABLE = `import { integer, sql, sqliteTable, sqliteView, text } from "${ormSource}";
export const boards = sqliteTable("boards", { id: text("id").primaryKey(), parent: text("parent"), n: integer("n") });
`;

test("a view from a query builder generates a migration", async () => {
	const cwd = consumer(`${TABLE}
export const roots = sqliteView("roots").as((qb) => qb.select().from(boards));
`);
	try {
		const [m] = await generateMigrations(cwd, SQLITE);
		assert.match(
			m?.sql ?? "",
			/CREATE VIEW `roots` AS select "id", "parent", "n" from "boards";/,
		);
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});

test("a view with columns and a sql body generates a migration", async () => {
	const cwd = consumer(`${TABLE}
export const counts = sqliteView("counts", { id: text("id"), n: integer("n") }).as(sql\`select id, n from boards\`);
`);
	try {
		const [m] = await generateMigrations(cwd, SQLITE);
		assert.match(
			m?.sql ?? "",
			/CREATE VIEW `counts` AS select id, n from boards;/,
		);
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});

test("a view with columns and a query builder body generates a migration", async () => {
	const cwd = consumer(`${TABLE}
export const counts = sqliteView("counts", { id: text("id"), n: integer("n") }).as((qb) => qb.select().from(boards));
`);
	try {
		const [m] = await generateMigrations(cwd, SQLITE);
		assert.match(
			m?.sql ?? "",
			/CREATE VIEW `counts` AS select "id", "parent", "n" from "boards";/,
		);
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});
