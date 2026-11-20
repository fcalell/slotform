import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { SlotformError } from "../lib/errors.ts";
import { assertUnlinked, LINK_DIR } from "../lib/install.ts";
import { linkedInstall } from "./link.ts";

test("linking takes each named Slotform package from the checkout, injected, and overrides the closure", () => {
	const { manifest, overrides } = linkedInstall(
		{
			name: "app",
			dependencies: { "@slotform/vite": "^0.1.0", react: "^19.3.0" },
			devDependencies: { "@slotform/cli": "^0.1.0" },
			dependenciesMeta: { react: { injected: false } },
		},
		{ fromApp: "../../slotform", fromRoot: "../slotform" },
	);
	assert.deepEqual(manifest, {
		name: "app",
		dependencies: {
			"@slotform/vite": "file:../../slotform/plugins/vite",
			react: "^19.3.0",
		},
		devDependencies: { "@slotform/cli": "file:../../slotform/packages/cli" },
		dependenciesMeta: {
			react: { injected: false },
			"@slotform/vite": { injected: true },
			"@slotform/cli": { injected: true },
		},
	});
	assert.deepEqual(overrides, {
		"@slotform/cli": "file:../slotform/packages/cli",
		"@slotform/api": "file:../slotform/plugins/api",
		"@slotform/vite": "file:../slotform/plugins/vite",
	});
});

test("linking a linked manifest again changes nothing", () => {
	const checkout = { fromApp: "../slotform", fromRoot: "../slotform" };
	const once = linkedInstall(
		{ dependencies: { "@slotform/db": "^0.1.0" } },
		checkout,
	);
	assert.deepEqual(linkedInstall(once.manifest, checkout), once);
});

test("a build refuses a linked app", () => {
	const dir = mkdtempSync(join(tmpdir(), "slotform-link-"));
	try {
		assertUnlinked(dir);
		mkdirSync(join(dir, LINK_DIR), { recursive: true });
		assert.throws(
			() => assertUnlinked(dir),
			(error) =>
				error instanceof SlotformError && /slotform unlink/.test(error.message),
		);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
