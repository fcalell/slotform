import assert from "node:assert/strict";
import { test } from "node:test";
import { afterRun, offerOf } from "./acts.ts";
import type { IconAct } from "./descriptors.ts";
import { createLeave } from "./leave.ts";
import { ENGLISH as words } from "./tokens.ts";

test("a run settles once it ends, failed where it threw or rejected", async () => {
	const seen: boolean[] = [];
	const settle = (failed: boolean) => seen.push(failed);
	assert.equal(
		afterRun(() => 1, settle),
		1,
	);
	assert.equal(await afterRun(async () => 2, settle), 2);
	assert.throws(() =>
		afterRun(() => {
			throw new Error("no");
		}, settle),
	);
	await assert.rejects(
		afterRun(() => Promise.reject(new Error("no")), settle) as Promise<unknown>,
	);
	assert.deepEqual(seen, [false, false, true, true]);
});

test("a leave holds no question while its act runs, and a rejection puts the edit back", async () => {
	const leave = createLeave();
	leave.edit(true);
	let during: boolean | undefined;
	const ran = leave.run(() => {
		during = leave.asks();
		return Promise.reject(new Error("no"));
	});
	assert.equal(during, false);
	await assert.rejects(ran as Promise<unknown>);
	assert.equal(leave.asks(), true);
	leave.run(() => undefined);
	assert.equal(leave.asks(), false);
});

test("an icon act given as a datum waits, stands, or is blocked by its ended read's sentence", () => {
	const act = { label: "Add", icon: "Plus", onAct: () => {} } as const;
	assert.deepEqual(offerOf<IconAct>(words, { painted: false, value: act }), {
		waits: false,
		given: act,
		blocked: undefined,
	});
	assert.deepEqual(
		offerOf<IconAct>(words, {
			painted: true,
			value: undefined,
			phase: "waiting",
		}),
		{ waits: true, given: undefined, blocked: undefined },
	);
	const ended = offerOf<IconAct>(words, {
		painted: true,
		value: undefined,
		phase: "missing",
	});
	assert.equal(ended.given?.icon, "CircleAlert");
	assert.equal(ended.blocked, words.missing);
});
