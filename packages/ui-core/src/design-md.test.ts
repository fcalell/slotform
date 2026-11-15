import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { deriveTheme } from "./derive.ts";
import { designMd } from "./design-md.ts";

test("DESIGN.md is what the contract emits (`pnpm --filter @fcalell/ui-core design-md` rewrites it)", () => {
	assert.equal(
		readFileSync(new URL("../DESIGN.md", import.meta.url), "utf8"),
		designMd(deriveTheme()),
	);
});
