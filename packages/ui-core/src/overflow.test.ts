import assert from "node:assert/strict";
import { test } from "node:test";
import { definitionsOneRow, ROW_TITLE_LINES } from "./overflow.ts";
import { KNOB_DEFAULTS } from "./tokens.ts";

test("definitionsOneRow follows the size knob", () => {
	assert.ok(
		definitionsOneRow(KNOB_DEFAULTS.size + 2) >
			definitionsOneRow(KNOB_DEFAULTS.size),
	);
	assert.ok(
		definitionsOneRow(KNOB_DEFAULTS.size - 1) <
			definitionsOneRow(KNOB_DEFAULTS.size),
	);
});

// The web spells `line-clamp-3` whole for Tailwind; this holds it to the phone's count.
test("a two-line row's title wraps to three lines", () => {
	assert.equal(ROW_TITLE_LINES, 3);
});
