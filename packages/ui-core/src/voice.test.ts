import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

// A px value in the voice guide (voice.md and its face pages): docs/architecture/ui-core/showcase.md, "Enforcement".
const CONSTANTS: readonly { phrase: string; reason: string }[] = [
	{ phrase: "1 px edge", reason: "the hairline (HAIRLINE_PX), fixed" },
	{ phrase: "1 px rail", reason: "the hairline (HAIRLINE_PX), fixed" },
	{ phrase: "2 px ink underline", reason: "the chosen tab's underline, fixed" },
	{
		phrase: "3 px accent bar",
		reason: "the current bar, three hairlines, fixed",
	},
	{ phrase: "`tablet` (768 px)", reason: "a breakpoint" },
	{ phrase: "a target of 24 px", reason: "the target floor (WCAG 2.5.8)" },
	{
		phrase: "`TARGET_PX` (28 px on desktop, 44 px on touch",
		reason: "the hit target (TARGET_PX), declared",
	},
];

// A px value, spelled with a space or without one.
const PX = /\d+(?:\.\d+)? ?px\b/g;
// A token, then words with no sentence break, then a parenthesis of px values
// (or ch) ending "at the default `size`" or "`radius`".
const STATED =
	/`[a-z-]+`[^.;(`]*\(\d+(?:\.\d+)? (?:px|ch)(?: on touch)?(?:, \d+(?:\.\d+)? (?:px|ch)(?: on touch)?)*(?:, | )at the default `(?:size|radius)`\)/g;

const guide = new URL("../guide/", import.meta.url);
const pages = readdirSync(guide)
	.filter((file) => file === "voice.md" || /^face-.*\.md$/.test(file))
	.map((file) => ({ file, text: readFileSync(new URL(file, guide), "utf8") }));

test("the voice guide states every px value beside a token or as a listed constant", () => {
	const bare: string[] = [];
	for (const { file, text } of pages)
		text.split("\n").forEach((line, index) => {
			let rest = line;
			for (const { phrase } of CONSTANTS) rest = rest.replaceAll(phrase, "");
			rest = rest.replace(STATED, "");
			for (const value of rest.match(PX) ?? []) {
				bare.push(`${file}:${index + 1}: bare ${value}`);
			}
		});
	assert.deepEqual(bare, []);
});

test("every listed constant stands in the voice guide", () => {
	const text = pages.map((page) => page.text).join("\n");
	for (const { phrase, reason } of CONSTANTS) {
		assert.ok(
			text.includes(phrase),
			`${phrase} (${reason}) is not in the voice guide`,
		);
	}
});
