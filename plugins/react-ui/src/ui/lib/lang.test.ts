import assert from "node:assert/strict";
import { test } from "node:test";
import { pageLang } from "./lang.ts";

// A document of the given root language, for the length of `run`.
function withLang(lang: string, run: () => void) {
	const page = globalThis as { document?: unknown };
	page.document = { documentElement: { lang } };
	try {
		run();
	} finally {
		delete page.document;
	}
}

test("the page's language is its root's lang", () => {
	withLang("de-DE", () => assert.equal(pageLang(), "de-DE"));
});

test("a root that names no language, or no document, leaves it to the platform", () => {
	withLang("", () => assert.equal(pageLang(), undefined));
	assert.equal(pageLang(), undefined);
});
