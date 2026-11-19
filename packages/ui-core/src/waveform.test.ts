import assert from "node:assert/strict";
import { test } from "node:test";
import {
	COLUMN,
	columnBoxes,
	columnCount,
	columns,
	headAt,
} from "./waveform.ts";

test("a width holds its columns and their gaps, and never fewer than one", () => {
	assert.equal(columnCount(0), 1);
	assert.equal(columnCount(2), 1);
	assert.equal(columnCount(5), 2);
	assert.equal(columnCount(300), 100);
});

test("a column stands centred at its peak, and a silent one keeps one pixel", () => {
	const reduced = columns({ values: [1, 0] }, 2);
	const [loud, silent] = columnBoxes(reduced, 6, 10, 2);
	assert.deepEqual(loud, { left: 0, top: 0, width: 2, height: 10 });
	assert.deepEqual(silent, { left: 3, top: 5, width: 2, height: 0.5 });
});

test("the playhead stays on the waveform at both ends", () => {
	assert.equal(headAt(0, 100, 1), 0);
	assert.equal(headAt(0.5, 100, 1), 50 - COLUMN.head / 2);
	assert.equal(headAt(1, 100, 1), 100 - COLUMN.head);
});
