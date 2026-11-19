import assert from "node:assert/strict";
import { test } from "node:test";
import { definitionsOneRow, trailWhole } from "./overflow.ts";
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

test("trailWhole follows the size knob", () => {
	assert.ok(
		trailWhole(KNOB_DEFAULTS.size + 2) > trailWhole(KNOB_DEFAULTS.size),
	);
	assert.ok(
		trailWhole(KNOB_DEFAULTS.size - 1) < trailWhole(KNOB_DEFAULTS.size),
	);
});
