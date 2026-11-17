import assert from "node:assert/strict";
import { test } from "node:test";
import { closeOpenRuns } from "./streaming.ts";

// [input, closed]
const CASES: [string, string][] = [
	["plain text", "plain text"],
	["**bold", "**bold**"],
	["**bold**", "**bold**"],
	["a *em", "a *em*"],
	["a *em*", "a *em*"],
	["_em", "_em_"],
	["snake_case_word", "snake_case_word"],
	["__strong", "__strong__"],
	["~~gone", "~~gone~~"],
	["~~gone~~", "~~gone~~"],
	["20~25", "20~25"],
	["`code", "`code`"],
	["`code`", "`code`"],
	["``a`b", "``a`b``"],
	["text `", "text"],
	["[link", "[link]()"],
	["[link]", "[link]"],
	["[link](http://x", "[link](http://x)"],
	["[link](http://x)", "[link](http://x)"],
	["[a [b](c", "[a [b](c)]()"],
	["```js\nlet x", "```js\nlet x\n```"],
	["```js\nlet x\n```", "```js\nlet x\n```"],
	["~~~\nx", "~~~\nx\n~~~"],
	["```\nx\n", "```\nx\n```"],
	["**a *b", "**a *b***"],
	["***both", "***both***"],
	["a * b", "a * b"],
	["2 * 3 * 4", "2 * 3 * 4"],
	["para **one\n\nnext", "para **one\n\nnext"],
	["\\*not", "\\*not"],
	["**", ""],
	["*", ""],
	["- item *em", "- item *em*"],
	["**bold **", "**bold**"],
	["a **b** and *c", "a **b** and *c*"],
	["![img](http://x", "![img](http://x)"],
	["$$x", "$$x"],
	["Heading\n---", "Heading\n---"],
	["* list\n* item", "* list\n* item"],
	["a_b", "a_b"],
	["_a_b", "_a_b_"],
	["**a_b**", "**a_b**"],
	["`a` and **b", "`a` and **b**"],
	["**bold ", "**bold**"],
	["**a *", "**a**"],
	["a ~~", "a"],
	["*a **", "*a*"],
	["_a _", "_a_"],
	["**bold **x", "**bold **x****"],
	["a **b ** c", "a **b ** c**"],
	["a *", "a"],
	["2 * 3 *", "2 * 3"],
	["a_", "a"],
	["**bold  ", "**bold**"],
];

test("every run open at the end is closed, a closed text comes back as it is", () => {
	for (const [input, closed] of CASES)
		assert.equal(closeOpenRuns(input), closed, JSON.stringify(input));
});

test("a marker run at the end that closes nothing is held back, whatever it is", () => {
	for (const marker of ["**", "*", "_", "~~", "`"])
		assert.equal(closeOpenRuns(`a ${marker}`), "a", marker);
});

test("closers stand before trailing whitespace", () => {
	for (const space of [" ", "  ", "\t"])
		assert.equal(closeOpenRuns(`**bold${space}`), "**bold**");
});
