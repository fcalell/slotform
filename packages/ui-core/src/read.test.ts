import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchesMore, type More } from "./read.ts";

const more = (over: Partial<More>): More => ({
	next: true,
	fetching: false,
	failed: false,
	fetch: () => Promise.resolve(),
	...over,
});

test("a more row fetches by itself only when wanted and a next page waits", () => {
	assert.equal(fetchesMore(more({}), true), true);
	assert.equal(fetchesMore(more({}), false), false);
	assert.equal(fetchesMore(more({ next: false }), true), false);
});

test("a more row does not fetch again while a page loads or after one failed", () => {
	assert.equal(fetchesMore(more({ fetching: true }), true), false);
	assert.equal(fetchesMore(more({ failed: true }), true), false);
});
