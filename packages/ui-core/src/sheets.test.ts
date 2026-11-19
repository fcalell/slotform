import assert from "node:assert/strict";
import { test } from "node:test";
import { closeOnResolve, closeSheet, openSheet, openSheets } from "./sheets.ts";

const sheetsNow = () => openSheets.get().map((entry) => entry.sheet);

test("the open sheets stand in the order they were opened, each closed by its id", () => {
	const first = openSheet("first");
	const second = openSheet("second");
	const third = openSheet("third");
	assert.deepEqual(sheetsNow(), ["first", "second", "third"]);
	closeSheet(second);
	assert.deepEqual(sheetsNow(), ["first", "third"]);
	closeSheet(first);
	closeSheet(third);
	assert.deepEqual(sheetsNow(), []);
});

test("closing an id no open sheet has changes nothing", () => {
	const open = openSheet("open");
	const before = openSheets.get();
	closeSheet(open + 100);
	assert.equal(openSheets.get(), before);
	closeSheet(open);
	closeSheet(open);
	assert.deepEqual(sheetsNow(), []);
});

test("a run closes its sheet at once, once its promise resolves, and never on a rejection", async () => {
	const at = openSheet("now");
	assert.equal(closeOnResolve(at, "done"), "done");
	assert.deepEqual(sheetsNow(), []);
	const later = openSheet("later");
	const ran = closeOnResolve(later, Promise.resolve(7));
	assert.deepEqual(sheetsNow(), ["later"]);
	assert.equal(await ran, 7);
	assert.deepEqual(sheetsNow(), []);
	const refused = openSheet("refused");
	await assert.rejects(
		Promise.resolve(closeOnResolve(refused, Promise.reject(new Error("no")))),
	);
	assert.deepEqual(sheetsNow(), ["refused"]);
	closeSheet(refused);
});
