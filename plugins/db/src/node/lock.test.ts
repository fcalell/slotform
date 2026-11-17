import assert from "node:assert/strict";
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	utimesSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { migrationLockPath, withMigrationLock } from "./lock.ts";

function lockIn() {
	const cwd = mkdtempSync(join(tmpdir(), "db-lock-"));
	return migrationLockPath(cwd);
}

const OTHER_PID = "99999999";

test("a lock holds this process's PID while the task runs and is removed after", async () => {
	const path = lockIn();
	await withMigrationLock(path, async () => {
		assert.equal(readFileSync(path, "utf-8"), String(process.pid));
	});
	assert.equal(existsSync(path), false);
});

test("release leaves a lock another process took", async () => {
	const path = lockIn();
	await withMigrationLock(path, async () => {
		writeFileSync(path, OTHER_PID);
	});
	assert.equal(readFileSync(path, "utf-8"), OTHER_PID);
	rmSync(path);
});

test("a lock of a dead PID is reclaimed", async () => {
	const path = lockIn();
	await withMigrationLock(path, async () => {});
	writeFileSync(path, OTHER_PID);
	let ran = false;
	await withMigrationLock(path, async () => {
		ran = true;
	});
	assert.equal(ran, true);
});

test("an empty lock older than a few seconds is reclaimed", async () => {
	const path = lockIn();
	await withMigrationLock(path, async () => {});
	writeFileSync(path, "");
	const old = new Date(Date.now() - 60_000);
	utimesSync(path, old, old);
	let ran = false;
	await withMigrationLock(path, async () => {
		ran = true;
	});
	assert.equal(ran, true);
});

test("a lock older than the boot is reclaimed though its PID is alive", async () => {
	const path = lockIn();
	await withMigrationLock(path, async () => {});
	writeFileSync(path, String(process.ppid));
	utimesSync(path, new Date(0), new Date(0));
	let ran = false;
	await withMigrationLock(path, async () => {
		ran = true;
	});
	assert.equal(ran, true);
});
