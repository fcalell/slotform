import assert from "node:assert/strict";
import { test } from "node:test";
import { assertEnvName, declaresDevVar } from "./dev-vars.ts";

test("assertEnvName accepts identifier-shaped names", () => {
	for (const name of ["AUTH_SECRET", "_X", "a1", "SLOTFORM_DEV"]) {
		assert.doesNotThrow(() => assertEnvName(name));
	}
});

test("assertEnvName rejects names with metacharacters or a leading digit", () => {
	for (const name of ["", "1A", "A.B", "A+", "A B", "(A)", "A=B", "A\nB"]) {
		assert.throws(
			() => assertEnvName(name),
			(error: Error & { code?: string }) => error.code === "INVALID_ENV_NAME",
		);
	}
});

test("declaresDevVar matches a key at the start of a line", () => {
	const file = "SLOTFORM_DEV=1\nAUTH_SECRET=abc\n# OTHER=1\n";
	assert.equal(declaresDevVar(file, "AUTH_SECRET"), true);
	assert.equal(declaresDevVar(file, "OTHER"), false);
	assert.equal(declaresDevVar(file, "SECRET"), false);
});

test("declaresDevVar treats the name literally", () => {
	assert.equal(declaresDevVar("AXB=1\n", "A.B"), false);
	assert.equal(declaresDevVar("A.B=1\n", "A.B"), true);
});

test("declaresDevVar reads every assignment form dotenv reads", () => {
	for (const file of [
		"AUTH_SECRET = abc\n",
		"  AUTH_SECRET=abc\n",
		"export AUTH_SECRET=abc\n",
		"AUTH_SECRET: abc\n",
	]) {
		assert.equal(declaresDevVar(file, "AUTH_SECRET"), true, file);
	}
	assert.equal(declaresDevVar("AUTH_SECRETS=abc\n", "AUTH_SECRET"), false);
	assert.equal(declaresDevVar("# AUTH_SECRET=abc\n", "AUTH_SECRET"), false);
});
