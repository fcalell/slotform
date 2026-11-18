import assert from "node:assert/strict";
import { test } from "node:test";
import { coalesce } from "./coalesce.ts";

test("a rejected run is followed by a fresh run, queued or not", async () => {
	let runs = 0;
	let fail = () => {};
	const push = coalesce(async () => {
		runs++;
		if (runs === 1)
			await new Promise<void>((_, reject) => {
				fail = () => reject(new Error("push failed"));
			});
	});
	const first = push();
	const queued = push();
	fail();
	await assert.rejects(first, /push failed/);
	await queued;
	assert.equal(runs, 2);
	await push();
	assert.equal(runs, 3);
});

test("calls during a run share one queued run", async () => {
	let runs = 0;
	let release = () => {};
	const push = coalesce(async () => {
		runs++;
		if (runs === 1) await new Promise<void>((r) => (release = r));
	});
	const first = push();
	const second = push();
	const third = push();
	assert.equal(second, third);
	assert.notEqual(first, second);
	release();
	await Promise.all([first, second, third]);
	assert.equal(runs, 2);
});
