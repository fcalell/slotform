import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import type { ControlPoint } from "./page.ts";
import { type PressSteps, press } from "./press.ts";

beforeEach(() => mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 }));
afterEach(() => mock.timers.reset());

// What a fake page answers on each try: the control's point, or null for no
// control, and what the try's trusted event hit (`landed`).
interface Try {
	point: ControlPoint | null;
	landed?: string | null;
}

const at = (x: number, y: number, cover: string | null = null) => ({
	x,
	y,
	label: "delete",
	cover,
});

// Awaits `pressed`, running the mocked clock to each timer the loop sets as
// it waits.
async function driven<T>(pressed: Promise<T>): Promise<T> {
	let done = false;
	pressed.finally(() => {
		done = true;
	});
	while (!done) {
		await new Promise((resolve) => setImmediate(resolve));
		mock.timers.runAll();
	}
	return pressed;
}

// Runs `press` over steps that answer `tries` in order, and records every
// step it sends.
async function run(tries: Try[]) {
	const calls: string[] = [];
	let current: Try | undefined;
	const steps: PressSteps = {
		aim: async (align) => {
			calls.push(`aim ${align}`);
			current = tries.shift();
			return current?.point ?? null;
		},
		click: async (x, y) => {
			calls.push(`click ${x},${y}`);
		},
		landed: async () => {
			calls.push("landed");
			return current?.landed ?? null;
		},
	};
	return { failure: await driven(press(steps, "Delete")), calls };
}

test("a clear first try presses once at the centre and reports nothing", async () => {
	const { failure, calls } = await run([{ point: at(10, 20) }]);
	assert.equal(failure, undefined);
	assert.deepEqual(calls, ["aim center", "click 10,20", "landed"]);
});

test("a control covered at the point until the third try is pressed once, at the end alignment", async () => {
	const { failure, calls } = await run([
		{ point: at(10, 20, "div.toast") },
		{ point: at(10, 30, "div.bar") },
		{ point: at(10, 40) },
	]);
	assert.equal(failure, undefined);
	assert.deepEqual(calls, [
		"aim center",
		"aim start",
		"aim end",
		"click 10,40",
		"landed",
	]);
});

test("a press whose trusted event hit a cover is tried again", async () => {
	const { failure, calls } = await run([
		{ point: at(10, 20), landed: "div.toast" },
		{ point: at(10, 30) },
	]);
	assert.equal(failure, undefined);
	assert.deepEqual(calls, [
		"aim center",
		"click 10,20",
		"landed",
		"aim start",
		"click 10,30",
		"landed",
	]);
});

test("a control covered at every try names the last cover and its point, and sends no input", async () => {
	const { failure, calls } = await run([
		{ point: at(10, 20, "div.a") },
		{ point: at(10, 30, "div.b") },
		{ point: at(160.4, 411.6, "div.toast") },
	]);
	assert.equal(
		failure,
		`"delete" is covered by div.toast at 160,412 (3 tries)`,
	);
	assert.deepEqual(calls, ["aim center", "aim start", "aim end"]);
});

test("a last try whose trusted event hit a cover names that cover", async () => {
	const { failure } = await run([
		{ point: at(1, 1, "div.a") },
		{ point: at(1, 1, "div.a") },
		{ point: at(5, 6), landed: "div.popover" },
	]);
	assert.equal(failure, `"delete" is covered by div.popover at 5,6 (3 tries)`);
});

test("no control at any try fails naming the text, with no input", async () => {
	const { failure, calls } = await run([]);
	assert.equal(failure, `no control named "Delete" (3 tries)`);
	assert.deepEqual(calls, ["aim center", "aim start", "aim end"]);
});

test("a control that appears at the second try is pressed at its alignment", async () => {
	const { failure, calls } = await run([{ point: null }, { point: at(3, 4) }]);
	assert.equal(failure, undefined);
	assert.deepEqual(calls, ["aim center", "aim start", "click 3,4", "landed"]);
});

test("the tries aim after their waits: at once, 50 ms on, 100 ms after that", async () => {
	const times: number[] = [];
	const steps: PressSteps = {
		aim: async () => {
			times.push(Date.now());
			return null;
		},
		click: async () => {},
		landed: async () => null,
	};
	await driven(press(steps, "Delete"));
	assert.deepEqual(times, [0, 50, 150]);
});
