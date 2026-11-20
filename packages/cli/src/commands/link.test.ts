import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { StackError } from "../lib/errors.ts";
import { assertUnlinked } from "../lib/install.ts";
import { linkedInstall } from "./link.ts";

test("linking takes each named stack package from the checkout, injected, and overrides the closure", () => {
	const { manifest, overrides } = linkedInstall(
		{
			name: "app",
			dependencies: { "@fcalell/plugin-vite": "^0.1.0", react: "^19.3.0" },
			devDependencies: { "@fcalell/cli": "^0.1.0" },
			dependenciesMeta: { react: { injected: false } },
		},
		{ fromApp: "../../stack", fromRoot: "../stack" },
	);
	assert.deepEqual(manifest, {
		name: "app",
		dependencies: {
			"@fcalell/plugin-vite": "file:../../stack/plugins/vite",
			react: "^19.3.0",
		},
		devDependencies: { "@fcalell/cli": "file:../../stack/packages/cli" },
		dependenciesMeta: {
			react: { injected: false },
			"@fcalell/plugin-vite": { injected: true },
			"@fcalell/cli": { injected: true },
		},
	});
	assert.deepEqual(overrides, {
		"@fcalell/cli": "file:../stack/packages/cli",
		"@fcalell/plugin-api": "file:../stack/plugins/api",
		"@fcalell/plugin-vite": "file:../stack/plugins/vite",
	});
});

test("linking a linked manifest again changes nothing", () => {
	const checkout = { fromApp: "../stack", fromRoot: "../stack" };
	const once = linkedInstall(
		{ dependencies: { "@fcalell/plugin-db": "^0.1.0" } },
		checkout,
	);
	assert.deepEqual(linkedInstall(once.manifest, checkout), once);
});

test("a build refuses a linked app", () => {
	const dir = mkdtempSync(join(tmpdir(), "stack-link-"));
	try {
		assertUnlinked(dir);
		mkdirSync(join(dir, ".stack", "link"), { recursive: true });
		assert.throws(
			() => assertUnlinked(dir),
			(error) =>
				error instanceof StackError && /stack unlink/.test(error.message),
		);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
