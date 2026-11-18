import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { generateServiceBarrel } from "./barrel.ts";

test("the barrel binds every service file, whatever its name", () => {
	const cwd = mkdtempSync(join(tmpdir(), "barrel-"));
	try {
		const dir = join(cwd, "src", "server", "services");
		mkdirSync(dir, { recursive: true });
		for (const file of [
			"a-b.ts",
			"aB.ts",
			"delete.ts",
			"2fa.mts",
			"x.test.ts",
			"index.ts",
		]) {
			writeFileSync(join(dir, file), "export default {};\n");
		}
		const barrel = generateServiceBarrel(cwd);
		const imports = [...barrel.matchAll(/^import (\S+) from "(.+)";$/gm)];
		assert.deepEqual(
			imports.map((m) => m[2]),
			["./2fa.mts", "./a-b.ts", "./aB.ts", "./delete.ts"],
		);
		const bindings = imports.map((m) => m[1] ?? "");
		assert.equal(new Set(bindings).size, bindings.length);
		for (const binding of bindings) assert.match(binding, /^service\d+$/);
		assert.match(
			barrel,
			/export const services = \[service0, service1, service2, service3\];/,
		);
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});
