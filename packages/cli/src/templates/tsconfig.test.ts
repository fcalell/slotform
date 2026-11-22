import assert from "node:assert/strict";
import { test } from "node:test";
import { tsconfigLayout, tsconfigTemplate } from "./tsconfig.ts";

function includes(plugins: string[]): Record<string, string[]> {
	const files = tsconfigTemplate({
		...tsconfigLayout(plugins),
		procedurePaths: {
			"virtual:slotform-procedure": ["./.slotform/procedure.ts"],
		},
		nativeTypes: [],
	});
	return Object.fromEntries(
		files.map(([name, content]) => [
			name,
			(JSON.parse(content) as { include?: string[] }).include ?? [],
		]),
	);
}

test("the program that compiles a worker's sources holds its generated files in every layout", () => {
	const worker = [".slotform/worker.ts", ".slotform/procedure.ts"];
	const single = includes(["api", "db", "node"])["tsconfig.json"];
	const split = includes(["api", "db", "node", "vite"])["tsconfig.worker.json"];
	for (const file of worker) {
		assert.ok(single?.includes(file), `single: ${file}`);
		assert.ok(split?.includes(file), `split: ${file}`);
	}
	const web = includes(["vite"])["tsconfig.json"];
	assert.deepEqual(web, ["src", ".slotform/*.d.ts"]);
});
