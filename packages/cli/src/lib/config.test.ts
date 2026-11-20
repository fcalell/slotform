import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { configUrl, loadConfig } from "./config.ts";

const source = (name: string) =>
	`export default { app: { name: ${JSON.stringify(name)}, domain: "example.com" }, plugins: [], validate() { return []; } };`;

test("configUrl is a file URL, and a reload gets a fresh one each time", () => {
	assert.match(configUrl("slotform.config.ts"), /^file:\/\//);
	assert.notEqual(configUrl("a.ts", true), configUrl("a.ts", true));
	assert.equal(configUrl("a.ts"), configUrl("a.ts"));
});

test("a reload sees the edited file, a plain load the cached module", async () => {
	const dir = mkdtempSync(join(tmpdir(), "slotform-config-"));
	try {
		const file = join(dir, "slotform.config.mjs");
		writeFileSync(file, source("one"));
		const first = await loadConfig(file);
		assert.equal(first.app.name, "one");
		writeFileSync(file, source("two"));
		const cached = await loadConfig(file);
		assert.equal(cached.app.name, "one");
		const fresh = await loadConfig(file, { reload: true });
		assert.equal(fresh.app.name, "two");
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
