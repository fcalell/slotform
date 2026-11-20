import assert from "node:assert/strict";
import { test } from "node:test";
import { scriptHash } from "@slotform/vite/csp";
import { modeScriptPolicy, themeModePlugin } from "./mode.ts";

const configs = [
	["no config", undefined, {}],
	["a default mode", "dark", {}],
	["a scrambled loading text", "light", { text: "scramble" }],
	[
		"every region scrambled",
		undefined,
		{ text: "scramble", figure: "scramble", id: "scramble" },
	],
	["pulsed regions", "dark", { text: "pulse" }],
] as const;

for (const [name, mode, loading] of configs) {
	test(`the policy hashes the script the plugin injects: ${name}`, () => {
		const transform = themeModePlugin(mode, loading).transformIndexHtml;
		assert.ok(transform && typeof transform === "object");
		// The hook reads neither the page nor Vite's context and returns the tag
		// list, so the test calls it bare.
		const tags = (
			transform.handler as unknown as () => { children: string }[]
		)();
		assert.equal(tags.length, 1);
		assert.equal(
			modeScriptPolicy(mode, loading),
			`script-src 'self' ${scriptHash(tags[0]?.children ?? "")}`,
		);
	});
}
