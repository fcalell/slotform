import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { dbOptionsSchema } from "../types.ts";
import { sqliteFile } from "./push.ts";

const options = dbOptionsSchema.parse({
	dialect: "sqlite",
	path: "./data/app.sqlite",
});
const saved = { DB_FILE: process.env.DB_FILE, TV_DB: process.env.TV_DB };

function env(vars: Record<string, string | undefined>): void {
	for (const key of Object.keys(saved)) {
		const value = vars[key];
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
}

afterEach(() => env(saved));

test("the dev path is the file when the env names none", () => {
	env({});
	assert.equal(sqliteFile("/app", options), "/app/data/app.sqlite");
});

test("DB_FILE wins over the path, relative to the project root", () => {
	env({ DB_FILE: "./scratch.sqlite" });
	assert.equal(sqliteFile("/app", options), "/app/scratch.sqlite");
	env({ DB_FILE: "/var/lib/a.sqlite" });
	assert.equal(sqliteFile("/app", options), "/var/lib/a.sqlite");
});

test("a renamed var is the one read", () => {
	const renamed = { ...options, fileVar: "TV_DB" };
	env({ DB_FILE: "/x.sqlite", TV_DB: "/y.sqlite" });
	assert.equal(sqliteFile("/app", renamed), "/y.sqlite");
});

test("a serve run's own file wins over the env var", () => {
	env({ DB_FILE: "/x.sqlite" });
	assert.equal(sqliteFile("/app", options, "/run/db.sqlite"), "/run/db.sqlite");
});
