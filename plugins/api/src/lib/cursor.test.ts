import assert from "node:assert/strict";
import { test } from "node:test";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { ApiError } from "../error.ts";
import {
	decodeCursor,
	encodeCursor,
	type Order,
	type PaginateOptions,
	paginate,
} from "./cursor.ts";
import { paginateWindow } from "./window.ts";

const tasks = sqliteTable("tasks", {
	id: text("id").primaryKey(),
	org: text("org").notNull(),
	title: text("title").notNull(),
	points: integer("points").notNull(),
	due: integer("due"),
	at: integer("at", { mode: "timestamp_ms" }),
	size: integer("size"),
});

// Ascending, due then id with nulls last: t2 t7 | t5 | t0 t3 | t1 t4 t6.
const DUES = [3, null, 1, 3, null, 2, null, 1];

function setup(rows = DUES.length, orgs = 1) {
	const sqlite = new Database(":memory:");
	sqlite.exec(
		"create table tasks (id text primary key not null, org text not null, title text not null, points integer not null, due integer, at integer, size integer); create index tasks_org_due on tasks (org, due, id); create index tasks_org_points on tasks (org, points, id)",
	);
	const db = drizzle(sqlite, { schema: { tasks } });
	for (let at = 0; at < rows; at++) {
		const due = DUES[at % DUES.length] ?? null;
		db.insert(tasks)
			.values({
				id: `t${at}`,
				org: `o${at % orgs}`,
				title: `task ${at}`,
				points: at % 3,
				due,
				size: at % 4 ? at % 2 : null,
				at: due === null ? null : new Date(due * 1000),
			})
			.run();
	}
	// Each `findMany` the page issues, with its SQL.
	const statements: { sql: string; params: unknown[] }[] = [];
	const counted = {
		findMany(config: Parameters<typeof db.query.tasks.findMany>[0]) {
			const query = db.query.tasks.findMany(config);
			statements.push(query.toSQL());
			return query;
		},
	};
	return { sqlite, db, counted, statements };
}

type Walk = Pick<PaginateOptions, "where" | "orderBy" | "limit">;

// Every page from the first to the one with no next cursor.
async function walk(options: Walk, rows?: number, orgs?: number) {
	const { counted, statements, sqlite } = setup(rows, orgs);
	const ids: string[] = [];
	const calls: number[] = [];
	const cursors: string[] = [];
	let cursor: string | undefined;
	do {
		const before = statements.length;
		const page = await paginate(counted, {
			...options,
			idColumn: tasks.id,
			cursor,
		});
		calls.push(statements.length - before);
		ids.push(...page.data.map((row) => row.id));
		cursor = page.nextCursor ?? undefined;
		if (cursor) cursors.push(cursor);
	} while (cursor);
	return { ids, calls, cursors, statements, sqlite };
}

const by = (column: Order["column"], direction: Order["direction"]) => ({
	column,
	direction,
});

test("an ascending page on a nullable column puts the nulls last", async () => {
	const { ids, calls } = await walk({
		orderBy: by(tasks.due, "asc"),
		limit: 2,
	});
	assert.deepEqual(ids, ["t2", "t7", "t5", "t0", "t3", "t1", "t4", "t6"]);
	assert.deepEqual(calls, [1, 1, 2, 1]);
});

test("a descending page on a nullable column puts the nulls last", async () => {
	const { ids, calls } = await walk({
		orderBy: by(tasks.due, "desc"),
		limit: 2,
	});
	assert.deepEqual(ids, ["t3", "t0", "t5", "t7", "t2", "t6", "t4", "t1"]);
	assert.deepEqual(calls, [1, 1, 2, 1]);
});

test("a page whose last row is null continues within the nulls by id", async () => {
	for (const [direction, expected] of [
		["asc", ["t4", "t6"]],
		["desc", ["t4", "t1"]],
	] as const) {
		const { counted } = setup();
		const page = await paginate(counted, {
			orderBy: by(tasks.due, direction),
			idColumn: tasks.id,
			cursor: encodeCursor([null], direction === "asc" ? "t1" : "t6"),
			limit: 5,
		});
		assert.deepEqual(
			page.data.map((row) => row.id),
			expected,
		);
		assert.equal(page.nextCursor, null);
	}
});

test("a not-null sort reads one statement per page", async () => {
	const { ids, calls } = await walk({
		orderBy: by(tasks.points, "desc"),
		limit: 3,
	});
	assert.deepEqual(ids, ["t5", "t2", "t7", "t4", "t1", "t6", "t3", "t0"]);
	assert.deepEqual(calls, [1, 1, 1]);
});

test("a nullable inner column pages in the whole order", async () => {
	for (const [direction, expected] of [
		["asc", ["t0", "t3", "t6", "t7", "t1", "t4", "t2", "t5"]],
		["desc", ["t5", "t2", "t7", "t4", "t1", "t3", "t0", "t6"]],
	] as const) {
		for (const limit of [1, 2, 3]) {
			const { ids } = await walk({
				orderBy: [by(tasks.points, direction), by(tasks.due, direction)],
				limit,
			});
			assert.deepEqual(ids, expected, `${direction} by ${limit}`);
		}
	}
});

test("a nullable moment travels as { $date } and as null", async () => {
	const { ids, cursors } = await walk({
		orderBy: by(tasks.at, "asc"),
		limit: 2,
	});
	assert.deepEqual(ids, ["t2", "t7", "t5", "t0", "t3", "t1", "t4", "t6"]);
	const values = cursors.map((cursor) => decodeCursor(cursor).values[0]);
	assert.deepEqual(values, [new Date(1000), new Date(3000), null]);
});

test("a cursor decodes a null value and refuses a malformed one", () => {
	assert.deepEqual(decodeCursor(encodeCursor([null, 3], "t1")), {
		values: [null, 3],
		id: "t1",
	});
	const wire = (value: unknown) =>
		Buffer.from(JSON.stringify(value)).toString("base64");
	assert.deepEqual(decodeCursor(wire([[3, { $date: 5 }, "a"], "t0"])), {
		values: [3, new Date(5), "a"],
		id: "t0",
	});
	for (const malformed of [
		[[{ at: 5 }], "t0"],
		[[[3]], "t0"],
		[[3]],
		[[3], ""],
	]) {
		assert.throws(
			() => decodeCursor(wire(malformed)),
			(error) => error instanceof ApiError && error.code === "BAD_REQUEST",
		);
	}
});

test("a nullable outer and a nullable inner column page in the whole order", async () => {
	for (const [direction, expected] of [
		["asc", ["t2", "t7", "t5", "t3", "t0", "t6", "t1", "t4"]],
		["desc", ["t3", "t0", "t5", "t7", "t2", "t1", "t6", "t4"]],
	] as const) {
		for (const limit of [1, 2, 3]) {
			const { ids } = await walk({
				orderBy: [by(tasks.due, direction), by(tasks.size, direction)],
				limit,
			});
			assert.deepEqual(ids, expected, `${direction} by ${limit}`);
		}
	}
});

test("a cursor page and a window order a nullable column alike", async () => {
	for (const direction of ["asc", "desc"] as const) {
		const orderBy = by(tasks.due, direction);
		const { ids } = await walk({ orderBy, limit: 2 });
		const { db } = setup();
		const window = await paginateWindow(db.query.tasks, {
			db,
			idColumn: tasks.id,
			orderBy,
			limit: DUES.length,
		});
		assert.deepEqual(
			window.data.map((row) => row.id),
			ids,
		);
	}
});

test("each statement of a page seeks a range on the sort column, with no sort", async () => {
	for (const direction of ["asc", "desc"] as const) {
		const { calls, statements, sqlite } = await walk(
			{
				where: eq(tasks.org, "o1"),
				orderBy: by(tasks.due, direction),
				limit: 7,
			},
			400,
			4,
		);
		assert.ok(calls.some((count) => count === 2));
		for (const [at, statement] of statements.entries()) {
			const plan = sqlite
				.prepare(`explain query plan ${statement.sql}`)
				.all(...statement.params) as { detail: string }[];
			// The first page has no cursor, so the scope alone; a segment after a
			// value seeks `due>?` (`due<?` descending), a null segment `due=?`, and
			// one after a null cursor value `due=? AND id>?` (`id<?`).
			const range =
				at === 0
					? /^SEARCH tasks USING INDEX tasks_org_due \(org=\?\)$/
					: /^SEARCH tasks USING INDEX tasks_org_due \(org=\? AND due([<>]\?|=\?( AND id[<>]\?)?)\)$/;
			assert.equal(plan.length, 1, statement.sql);
			assert.match(plan[0]?.detail ?? "", range, statement.sql);
		}
	}
});

test("a cursor page sorts by the sorts map, else by the column of the key's name", async () => {
	// The keys a procedure declaring `sort: ["name", "points"]` hands over.
	type Key = "name" | "points";
	const { counted } = setup();
	const base = {
		idColumn: tasks.id,
		orderBy: { column: tasks.id, direction: "asc" as const },
		sorts: { name: tasks.title },
		limit: 2,
	};
	const byName = await paginate(counted, {
		...base,
		sort: { column: "name" as Key, direction: "desc" },
	});
	assert.deepEqual(
		byName.data.map((row) => row.id),
		["t7", "t6"],
	);
	assert.ok(byName.nextCursor);
	const byPoints = await paginate(counted, {
		...base,
		sort: { column: "points" as Key, direction: "desc" },
	});
	assert.deepEqual(
		byPoints.data.map((row) => row.id),
		["t5", "t2"],
	);
});

test("a cursor value of another type than its column answers BAD_REQUEST", async () => {
	const { counted } = setup();
	const options = {
		idColumn: tasks.id,
		orderBy: { column: tasks.due, direction: "asc" as const },
	};
	for (const values of [[new Date(1)], ["3"]]) {
		await assert.rejects(
			paginate(counted, { ...options, cursor: encodeCursor(values, "t1") }),
			(error) => error instanceof ApiError && error.code === "BAD_REQUEST",
		);
	}
	const unbounded = btoa('[[{"$date":1e999}],"t1"]');
	assert.throws(() => decodeCursor(unbounded), ApiError);
});
