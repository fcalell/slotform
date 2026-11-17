import assert from "node:assert/strict";
import { test } from "node:test";
import { reachesEnd, VIRTUAL_FROM } from "./window.ts";

test("a collection under the windowing floor never reaches its end by scrolling", () => {
	const count = VIRTUAL_FROM - 1;
	assert.equal(reachesEnd(count - 1, count), false);
	assert.equal(reachesEnd(count + 10, count), false);
});

test("a windowed collection reaches its end once its last loaded row mounts", () => {
	const count = VIRTUAL_FROM;
	assert.equal(reachesEnd(count - 2, count), false);
	assert.equal(reachesEnd(count - 1, count), true);
	assert.equal(reachesEnd(count + 3, count), true);
});

test("a collection with no row mounted has not reached its end", () => {
	assert.equal(reachesEnd(-1, VIRTUAL_FROM), false);
});
