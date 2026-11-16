import assert from "node:assert/strict";
import { test } from "node:test";
import { deriveTheme } from "./derive.ts";
import { roomTokens, themeTokens } from "./emit.ts";
import { widthPx } from "./scales.ts";
import { MEASURES, WIDTHS } from "./tokens.ts";

const MEASURE_NAMES: ReadonlySet<string> = new Set(MEASURES);

test("a node stands 240px wide at the default size", () => {
	assert.equal(widthPx("node"), 240);
});

test("the emitted widths are px, and ch only for a measure", () => {
	const resolved = deriveTheme();
	for (const width of WIDTHS) {
		const measure = MEASURE_NAMES.has(width);
		assert.match(
			resolved.widths[width],
			measure ? /^\d+ch$/ : /^\d+px$/,
			width,
		);
	}
	const tokens = themeTokens(resolved);
	assert.equal(tokens["--container-sidebar"], "220px");
	assert.equal(tokens["--container-list"], "520px");
	assert.equal(tokens["--container-reading"], "720px");
	assert.equal(tokens["--container-region-min"], "340px");
	assert.equal(tokens["--container-measure-short"], "20ch");
});

test("the room scales the px widths and leaves the measures to native's px", () => {
	const room = roomTokens((units) => units, 6, 13);
	assert.equal(room["--container-sidebar"], 220);
	assert.equal(room["--container-node"], 240);
	assert.equal(room["--container-measure-short"], undefined);
});

test("a unit width follows the size knob and no density, the node's included", () => {
	const resolved = deriveTheme({ size: 16 });
	assert.ok(widthPx("list", 16) > widthPx("list"));
	assert.equal(resolved.widths.list, `${widthPx("list", 16)}px`);
	assert.ok(widthPx("node", 16) > widthPx("node"));
	assert.equal(resolved.widths.node, `${widthPx("node", 16)}px`);
	const room = roomTokens((units) => units, 6, 16);
	assert.equal(room["--container-list"], widthPx("list", 16));
	assert.equal(room["--container-node"], widthPx("node", 16));
});
