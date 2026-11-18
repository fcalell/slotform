import assert from "node:assert/strict";
import { test } from "node:test";
import Database from "better-sqlite3";
import { like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { chosenWhere } from "./chosen.ts";

const tasks = sqliteTable("tasks", {
	id: text("id").primaryKey(),
	title: text("title").notNull(),
});

function setup() {
	const sqlite = new Database(":memory:");
	sqlite.exec(
		"create table tasks (id text primary key not null, title text not null)",
	);
	const db = drizzle(sqlite);
	for (let at = 0; at < 300; at++) {
		db.insert(tasks)
			.values({ id: `t${at}`, title: at % 2 ? "odd" : "even" })
			.run();
	}
	return db;
}

const options = {
	id: tasks.id,
	where: (query: { title: string }) => like(tasks.title, query.title),
};

test("a selection of more ids than a D1 statement binds is one bound value", () => {
	const db = setup();
	const ids = Array.from({ length: 150 }, (_, at) => `t${at}`);
	const byIds = db
		.select({ id: tasks.id })
		.from(tasks)
		.where(chosenWhere({ ids }, options));
	assert.equal(byIds.toSQL().params.length, 1);
	assert.equal(byIds.all().length, 150);

	const except = Array.from({ length: 140 }, (_, at) => `t${at * 2}`);
	const byQuery = db
		.select({ id: tasks.id })
		.from(tasks)
		.where(chosenWhere({ query: { title: "even" }, except }, options));
	assert.equal(byQuery.toSQL().params.length, 2);
	assert.deepEqual(
		byQuery
			.all()
			.map((row) => row.id)
			.sort(),
		Array.from({ length: 10 }, (_, at) => `t${(140 + at) * 2}`).sort(),
	);
});
