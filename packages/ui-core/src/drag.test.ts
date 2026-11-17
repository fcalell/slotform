import assert from "node:assert/strict";
import { test } from "node:test";
import {
	accepts,
	bandAt,
	DRAG_DELAY_SLOP,
	DRAG_SLOP,
	edgeDepth,
	edgeSpeed,
	movedTo,
	moveEntry,
	moveOf,
	pressed,
	SCROLL_EDGE,
	SCROLL_RAMP,
	SCROLL_SPEED,
	sideOf,
	stepOf,
} from "./drag.ts";

const ids = ["a", "b", "c", "d"];

test("a mouse press is a drag past the slop, a finger after its hold", () => {
	assert.equal(pressed("mouse", DRAG_SLOP - 1, false), "wait");
	assert.equal(pressed("mouse", DRAG_SLOP, false), "drag");
	assert.equal(pressed("pen", DRAG_SLOP, false), "drag");
	assert.equal(pressed("touch", 0, false), "wait");
	assert.equal(pressed("touch", DRAG_DELAY_SLOP + 1, false), "cancel");
	assert.equal(pressed("touch", 2, true), "drag");
});

test("the side of a row is the half the pointer is in", () => {
	assert.equal(sideOf(10, 0, 32), "before");
	assert.equal(sideOf(16, 0, 32), "after");
	assert.equal(sideOf(100, 90, 20), "after");
});

test("a move names its index and the rows it stands between", () => {
	assert.deepEqual(movedTo(ids, "d", 0), {
		index: 0,
		after: null,
		before: "a",
	});
	assert.deepEqual(movedTo(ids, "a", 3), {
		index: 3,
		after: "d",
		before: null,
	});
	assert.deepEqual(movedTo(ids, "a", 2), {
		index: 2,
		after: "c",
		before: "d",
	});
	assert.equal(movedTo(ids, "x", 1), undefined);
	assert.equal(movedTo(ids, "a", 4), undefined);
});

test("a neighbour that is not loaded ends the move", () => {
	const window = ["a", undefined, "c", "d"];
	assert.equal(movedTo(window, "d", 2), undefined);
	assert.deepEqual(movedTo(window, "d", 3), {
		index: 3,
		after: "c",
		before: null,
	});
	assert.equal(movedTo(window, "a", 1), undefined);
});

test("a drop on a row lands before or after it; beside its own place it moves nothing", () => {
	assert.deepEqual(moveOf(ids, "a", "c", "before"), {
		index: 1,
		after: "b",
		before: "c",
	});
	assert.deepEqual(moveOf(ids, "a", "c", "after"), {
		index: 2,
		after: "c",
		before: "d",
	});
	assert.deepEqual(moveOf(ids, "d", "a", "before"), {
		index: 0,
		after: null,
		before: "a",
	});
	assert.equal(moveOf(ids, "b", "b", "before"), undefined);
	assert.equal(moveOf(ids, "b", "b", "after"), undefined);
	assert.equal(moveOf(ids, "b", "a", "after"), undefined);
	assert.equal(moveOf(ids, "b", "c", "before"), undefined);
	assert.equal(moveOf(ids, "b", "zz", "before"), undefined);
});

test("a step moves a row one place or to an end, and stops there", () => {
	assert.deepEqual(stepOf(ids, "b", "up"), {
		index: 0,
		after: null,
		before: "a",
	});
	assert.deepEqual(stepOf(ids, "b", "down"), {
		index: 2,
		after: "c",
		before: "d",
	});
	assert.deepEqual(stepOf(ids, "b", "last"), {
		index: 3,
		after: "d",
		before: null,
	});
	assert.deepEqual(stepOf(ids, "c", "first"), {
		index: 0,
		after: null,
		before: "a",
	});
	assert.equal(stepOf(ids, "a", "up"), undefined);
	assert.equal(stepOf(ids, "a", "first"), undefined);
	assert.equal(stepOf(ids, "d", "down"), undefined);
	assert.equal(stepOf(ids, "d", "last"), undefined);
});

test("an entry moves in a list and the others keep their order", () => {
	assert.deepEqual(moveEntry(ids, 0, 2), ["b", "c", "a", "d"]);
	assert.deepEqual(moveEntry(ids, 3, 0), ["d", "a", "b", "c"]);
	assert.deepEqual(ids, ["a", "b", "c", "d"]);
});

test("a scroller is carried near its edges and not in the middle", () => {
	assert.equal(edgeDepth(300, 0, 600), 0);
	assert.equal(edgeDepth(SCROLL_EDGE, 0, 600), 0);
	assert.equal(edgeDepth(0, 0, 600), -1);
	assert.equal(edgeDepth(-50, 0, 600), -1);
	assert.equal(edgeDepth(600, 0, 600), 1);
	assert.equal(edgeDepth(700, 0, 600), 1);
	assert.equal(edgeDepth(SCROLL_EDGE / 2, 0, 600), -0.5);
	// a view shorter than two edges splits at its middle
	assert.equal(edgeDepth(50, 0, 100), 0);
});

test("a scroller is carried at one speed a second whatever the frame rate, ramping up from entry", () => {
	const ramped = SCROLL_RAMP;
	// 60 Hz and 144 Hz carry it the same distance a second.
	const at60 = edgeSpeed(1, 1000 / 60, ramped) * 60;
	const at144 = edgeSpeed(1, 1000 / 144, ramped) * 144;
	assert.equal(at60, SCROLL_SPEED);
	assert.ok(Math.abs(at144 - SCROLL_SPEED) <= 144 / 2);
	// A frame that ran long carries it no further than one at 60 Hz.
	assert.equal(edgeSpeed(-1, 250, ramped), edgeSpeed(-1, 1000 / 60, ramped));
	// On entry it does not move; halfway through the ramp it is at half speed.
	assert.equal(edgeSpeed(1, 1000 / 60, 0), 0);
	assert.equal(
		edgeSpeed(1, 1000 / 60, SCROLL_RAMP / 2),
		Math.round(SCROLL_SPEED / 120),
	);
	assert.equal(edgeSpeed(0, 1000 / 60, ramped), 0);
});

test("a drop takes the kinds it accepts", () => {
	assert.ok(accepts("track", "track"));
	assert.ok(accepts(["task", "project"], "project"));
	assert.ok(!accepts("task", "project"));
	assert.ok(!accepts(["track"], undefined));
});

test("a drag's band is entered afresh in another scroller or toward another side, and keeps its entry while it stays", () => {
	const list = {};
	const first = bandAt(undefined, list, 1, 100);
	assert.deepEqual([first.elapsed, first.since], [0, 0]);
	const next = bandAt(first.band, list, 1, 116);
	assert.deepEqual([next.elapsed, next.since], [16, 16]);
	assert.equal(bandAt(next.band, list, -1, 132).since, 0);
	assert.equal(bandAt(next.band, {}, 1, 132).since, 0);
});
