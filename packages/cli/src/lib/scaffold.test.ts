import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { patchPackageJson } from "./scaffold.ts";

test("a dependency either block declares keeps the app's range", () => {
	const dir = mkdtempSync(join(tmpdir(), "slotform-patch-"));
	writeFileSync(
		join(dir, "package.json"),
		JSON.stringify({
			dependencies: { zod: "^4.0.0" },
			devDependencies: { hono: "4.0.0" },
		}),
	);
	try {
		patchPackageJson(dir, {
			dependencies: { zod: "^4.6.7", hono: "^4.13.19", clsx: "^2.1.1" },
		});
		assert.deepEqual(
			JSON.parse(readFileSync(join(dir, "package.json"), "utf8")),
			{
				dependencies: { clsx: "^2.1.1", zod: "^4.0.0" },
				devDependencies: { hono: "4.0.0" },
			},
		);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
