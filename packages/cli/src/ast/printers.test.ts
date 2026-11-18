import assert from "node:assert/strict";
import { test } from "node:test";
import { dedupeImports } from "./imports.ts";
import type { TomlDocument } from "./specs.ts";
import { renderToml } from "./toml-printer.ts";
import { renderTsSourceFile } from "./ts-printer.ts";

test("a type and a value from one source print as two lines; a value wins a binding", () => {
	assert.deepEqual(
		dedupeImports([
			{ source: "react", named: ["ReactNode", "FC"], typeOnly: true },
			{ source: "react", named: ["useState", "FC"] },
		]),
		[
			{ source: "react", named: ["FC", "useState"] },
			{ source: "react", named: ["ReactNode"], typeOnly: true },
		],
	);
});

test("rendering a TOML document twice leaves it as it was", () => {
	const doc: TomlDocument = {
		root: { queues: { consumers: [] } },
		arrayTables: [{ path: ["queues", "producers"], entries: { queue: "q" } }],
	};
	const first = renderToml(doc);
	assert.equal(renderToml(doc), first);
	assert.deepEqual(doc.root, { queues: { consumers: [] } });
});

test("an arrow's object body, a quoted JSX string and a call under new print as written", () => {
	const text = renderTsSourceFile({
		imports: [],
		statements: [
			{
				kind: "const",
				name: "f",
				value: {
					kind: "arrow",
					params: [],
					body: {
						kind: "object",
						properties: [{ key: "a", value: { kind: "number", value: 1 } }],
					},
				},
			},
			{
				kind: "const",
				name: "el",
				value: {
					kind: "jsx",
					tag: "a",
					props: [
						{ name: "title", value: { kind: "string", value: 'say "hi"' } },
					],
					children: [],
				},
			},
			{
				kind: "const",
				name: "n",
				value: {
					kind: "new",
					callee: {
						kind: "call",
						callee: { kind: "identifier", name: "g" },
						args: [],
					},
					args: [],
				},
			},
		],
	});
	assert.match(text, /const f = \(\) => \(\{ a: 1 \}\);/);
	assert.match(text, /title=\{"say \\"hi\\""\}/);
	assert.match(text, /const n = new \(g\(\)\)\(\);/);
});

test("a shorthand property whose value is not its key throws", () => {
	assert.throws(() =>
		renderTsSourceFile({
			imports: [],
			statements: [
				{
					kind: "expression",
					value: {
						kind: "object",
						properties: [
							{
								key: "a",
								value: { kind: "string", value: "x" },
								shorthand: true,
							},
						],
					},
				},
			],
		}),
	);
});
