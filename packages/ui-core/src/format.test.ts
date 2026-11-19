import assert from "node:assert/strict";
import { test } from "node:test";
import { initials } from "./format.ts";

test("a name reads as its first two words' first letters", () => {
	assert.equal(initials("Jean-Luc"), "JL");
	assert.equal(initials("ada lovelace byron"), "AL");
	assert.equal(initials("Ada"), "A");
});

test("an email address reads by its local part", () => {
	assert.equal(initials("ada.lovelace@example.com"), "AL");
	assert.equal(initials("@ada"), "");
});

test("an empty name has no initials", () => {
	assert.equal(initials(""), "");
});
