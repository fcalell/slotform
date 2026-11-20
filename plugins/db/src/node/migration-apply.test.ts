import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { dbOptionsSchema } from "../types.ts";
import {
	formatFailedMigration,
	formatUnacknowledgedDrops,
} from "./migration-safety.ts";

function project(files: Record<string, string>): string {
	const cwd = mkdtempSync(join(tmpdir(), "apply-"));
	const dir = join(cwd, "src", "migrations");
	mkdirSync(join(dir, "meta"), { recursive: true });
	for (const [name, sql] of Object.entries(files))
		writeFileSync(join(dir, name), sql);
	return cwd;
}

const options = dbOptionsSchema.parse({ dialect: "sqlite", path: "./x.db" });

test("migrations that build an empty database pass", () => {
	const cwd = project({
		"0000_a.sql":
			'CREATE TABLE `t` (`id` text);--> statement-breakpoint\nCREATE INDEX `i` ON `t` ("id" collate nocase);',
	});
	try {
		assert.equal(formatFailedMigration(cwd, options), null);
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});

test("a migration that fails to apply is named", () => {
	const cwd = project({
		"0000_a.sql": "CREATE TABLE `t` (`id` text);",
		"0001_b.sql": 'CREATE INDEX `i` ON `t` (`"id" collate nocase`);',
	});
	try {
		const failed = formatFailedMigration(cwd, options);
		assert.match(failed ?? "", /0001_b\.sql fails to apply/);
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});

test("a drop is found behind the custom migration that follows it", () => {
	const cwd = project({
		"0000_a.sql": "CREATE TABLE `t` (`id` text, `old` text);",
		"0001_b.sql": "ALTER TABLE `t` DROP COLUMN `old`;",
		"0002_fts_s.sql": "SELECT 1;",
	});
	const meta = join(cwd, "src", "migrations", "meta");
	const snapshot = (columns: string[]) =>
		JSON.stringify({
			tables: {
				t: { columns: Object.fromEntries(columns.map((c) => [c, {}])) },
			},
		});
	writeFileSync(
		join(meta, "_journal.json"),
		JSON.stringify({
			entries: [
				{ idx: 0, tag: "0000_a" },
				{ idx: 1, tag: "0001_b" },
				{ idx: 2, tag: "0002_fts_s" },
			],
		}),
	);
	writeFileSync(join(meta, "0000_snapshot.json"), snapshot(["id", "old"]));
	writeFileSync(join(meta, "0001_snapshot.json"), snapshot(["id"]));
	writeFileSync(join(meta, "0002_snapshot.json"), snapshot(["id"]));
	try {
		assert.match(
			formatUnacknowledgedDrops(cwd, options) ?? "",
			/0001_b\.sql:\n {2}- drops column "old" on table "t"/,
		);
		writeFileSync(
			join(cwd, "src", "migrations", "0001_b.sql"),
			"-- slotform:allow-destructive\nALTER TABLE `t` DROP COLUMN `old`;",
		);
		assert.equal(formatUnacknowledgedDrops(cwd, options), null);
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});
