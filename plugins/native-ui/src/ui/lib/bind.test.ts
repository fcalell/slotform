import assert from "node:assert/strict";
import { test } from "node:test";
import { codeBound, codeWhole, titleBound } from "./bind.ts";

test("a hyphen that leads a word binds to it", () => {
	assert.equal(codeBound("--bg"), "-\u2060-\u2060bg");
	assert.equal(codeBound("a - b"), "a - b");
});

test("a URL breaks after each run of its separators, never inside one", () => {
	// A hyphen inside a word is the platform's own: "webauthn-3" is untouched.
	assert.equal(
		codeWhole("https://a.io/auth/webauthn-3?x=1&y=2#top"),
		"https://\u200Ba.io/\u200Bauth/\u200Bwebauthn-3?\u200Bx=\u200B1&\u200By=\u200B2#\u200Btop",
	);
});

test("a path breaks after its `../` run, never before a space", () => {
	assert.equal(codeWhole("../src/a / b"), "../\u200Bsrc/\u200Ba / b");
});

test("a flag's hyphen after a word is no leading one", () => {
	assert.equal(codeBound("--bg-color"), "-\u2060-\u2060bg-color");
});

test("a title breaks after a hyphen, never before one", () => {
	assert.equal(titleBound("Pre-release builds"), "Pre\u2060-release builds");
	assert.equal(titleBound("A - B"), "A - B");
	assert.equal(titleBound("Rules"), "Rules");
});
