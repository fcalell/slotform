import assert from "node:assert/strict";
import { test } from "node:test";
import { Lexer } from "marked";
import { decodeHTML, safeHref } from "./prose.ts";

test("a link whose scheme runs script has no target, control characters and all", () => {
	assert.equal(safeHref("\u0001javascript:alert(1)"), undefined);
	assert.equal(safeHref("java\tscript:alert(1)"), undefined);
	assert.equal(safeHref(" DATA:text/html,x"), undefined);
	assert.equal(safeHref("https://example.org"), "https://example.org");
});

test("a text token's character references decode as a browser draws them", () => {
	const [text] = Lexer.lexInline("a &amp; b &#38; c &copy;&nbsp;d");
	assert.ok(text?.type === "text");
	assert.equal(text.text, "a &amp; b &amp; c &copy;&nbsp;d");
	assert.equal(decodeHTML(text.text), "a & b & c ©\u00a0d");
});
