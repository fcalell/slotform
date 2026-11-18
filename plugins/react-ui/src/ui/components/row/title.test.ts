import assert from "node:assert/strict";
import { test } from "node:test";
import { ROW_TITLE_LINES } from "@fcalell/ui-core/overflow";
import { TITLE_ADAPTS, TITLE_COMPACT } from "./title.ts";

test("a row's title clamps at the shared line count, in both forms", () => {
	const clamp = `line-clamp-${ROW_TITLE_LINES}`;
	assert.ok(TITLE_COMPACT.split(" ").includes(clamp));
	assert.ok(TITLE_ADAPTS.split(" ").includes(`row-two-line:${clamp}`));
});
