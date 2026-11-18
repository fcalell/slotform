import assert from "node:assert/strict";
import { test } from "node:test";
import { safeHref } from "./prose.ts";

test("a link whose scheme runs script has no target, control characters and all", () => {
	assert.equal(safeHref("\u0001javascript:alert(1)"), undefined);
	assert.equal(safeHref("java\tscript:alert(1)"), undefined);
	assert.equal(safeHref(" DATA:text/html,x"), undefined);
	assert.equal(safeHref("https://example.org"), "https://example.org");
});
