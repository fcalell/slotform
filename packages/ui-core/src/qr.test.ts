import assert from "node:assert/strict";
import { test } from "node:test";
import { qrModules } from "./qr.ts";

test("a code's tile is its modules and the quiet zone around them", () => {
	const modules = qrModules("https://example.com");
	assert.ok(modules);
	// Version 2 is 25 modules a side, four quiet ones on each.
	assert.equal(modules.side, 33);
	assert.match(modules.path, /^M4 4h7v1h-7z/);
});

test("a text no version holds has no modules, and throws nothing", () => {
	assert.equal(qrModules("x".repeat(5000)), undefined);
});
