import assert from "node:assert/strict";
import { test } from "node:test";
import {
	PLACE_TAB,
	type PlaceTabState,
	placeTab,
	placeTabContentTone,
	placeTabLabel,
} from "./roster/shell.ts";
import { YIELDS_FIRST, YIELDS_LAST, YIELDS_LAST_EACH } from "./variants.ts";

const weight = (name: string) =>
	Number(/shrink-\[?([\d.]+)\]?/.exec(name)?.[1]);

// Tailwind reads a class as written, so the each-child form is spelled whole
// and kept in step with the weight here.
test("the last weight's each-child form is the weight on each child", () => {
	assert.equal(YIELDS_LAST_EACH, `*:${YIELDS_LAST}`);
});

test("the first weight is above the default of 1 and the last below it", () => {
	assert.ok(weight(YIELDS_FIRST) > 1);
	assert.ok(weight(YIELDS_LAST) < 1);
});

test("a place tab's tone is the ink its box and its label draw in every state, never the selected tab's border", () => {
	const inks = (classes: string) => classes.match(/\btext-ink-[a-z]+/g) ?? [];
	for (const state of Object.keys(
		PLACE_TAB.variants.state,
	) as PlaceTabState[]) {
		const tone = placeTabContentTone(state);
		assert.deepEqual(inks(placeTab({ state })), [`text-${tone}`], state);
		assert.deepEqual(inks(placeTabLabel({ state })), [`text-${tone}`], state);
	}
	assert.notEqual(placeTabContentTone("idle"), placeTabContentTone("selected"));
});
