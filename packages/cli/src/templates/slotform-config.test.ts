import assert from "node:assert/strict";
import { test } from "node:test";
import { slotformConfigTemplate } from "./slotform-config.ts";

// Evaluates the template's `defineConfig` argument, each plugin call answering
// its name and options.
function evaluate(source: string): unknown {
	const body = source
		.replace(/^import .*$/gm, "")
		.replace("export default defineConfig(", "return (");
	const names = ["db", "auth"];
	const calls = names.map((name) => (options?: unknown) => ({
		plugin: name,
		options,
	}));
	return new Function(...names, body)(...calls);
}

test("the app and each plugin's options evaluate back to the values given", () => {
	const name = 'my "app" \\ x';
	const domain = 'ex"ample.com';
	const db = {
		databaseId: 'a"b\\c',
		n: 1,
		flag: false,
		nested: { empty: {}, list: [1, "two"], none: null },
		"dashed-key": "x",
	};
	const source = slotformConfigTemplate({
		name,
		domain,
		plugins: ["db", "auth"],
		pluginAnswers: new Map<string, Record<string, unknown>>([
			["db", db],
			["auth", {}],
		]),
	});
	assert.deepEqual(evaluate(source), {
		app: { name, domain },
		plugins: [
			{ plugin: "db", options: db },
			{ plugin: "auth", options: undefined },
		],
	});
});

test("a config with no plugins holds an empty plugin list", () => {
	const source = slotformConfigTemplate({
		name: "a",
		domain: "a.com",
		plugins: [],
		pluginAnswers: new Map(),
	});
	assert.deepEqual(evaluate(source), {
		app: { name: "a", domain: "a.com" },
		plugins: [],
	});
});
