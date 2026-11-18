import assert from "node:assert/strict";
import { test } from "node:test";
import { findPluginCommand, parseCommandFlags } from "./command-router.ts";
import type { CommandDefinition } from "./create-plugin.ts";

const command: CommandDefinition<unknown, Record<string, unknown>> = {
	description: "build",
	options: {
		out: { type: "string", description: "", alias: "o" },
		retries: { type: "number", description: "", default: 3 },
		force: { type: "boolean", description: "", alias: "f" },
		verbose: { type: "boolean", description: "", alias: "loud" },
	},
	handler: async () => {},
};

test("flags take their defaults, then what argv sets", () => {
	assert.deepEqual(parseCommandFlags(command, ["plugin", "build"]), {
		retries: 3,
		force: false,
		verbose: false,
	});
	assert.deepEqual(
		parseCommandFlags(command, ["x", "--out", "a", "-f", "--retries", "5"]),
		{ out: "a", retries: 5, force: true, verbose: false },
	);
});

test("--flag=value, a short flag and a long alias reach the key", () => {
	assert.deepEqual(parseCommandFlags(command, ["--out=dist", "--loud"]), {
		out: "dist",
		retries: 3,
		force: false,
		verbose: true,
	});
	assert.equal(parseCommandFlags(command, ["-o", "b"]).out, "b");
});

test("an unknown flag names itself and what is available", () => {
	assert.throws(
		() => parseCommandFlags(command, ["--nope"]),
		(error: Error & { code?: string }) =>
			error.code === "UNKNOWN_FLAG" &&
			error.message ===
				'Unknown flag "--nope" for command "build". Available: --out (-o), --retries, --force (-f), --verbose (-loud)',
	);
});

test("a flag without its value, and a number that is none, throw", () => {
	assert.throws(
		() => parseCommandFlags(command, ["--out", "--force"]),
		(error: Error & { code?: string }) =>
			error.code === "MISSING_FLAG_VALUE" &&
			error.message === 'Flag "--out" requires a string value.',
	);
	assert.throws(
		() => parseCommandFlags(command, ["--retries", "x"]),
		(error: Error & { code?: string }) => error.code === "INVALID_FLAG_VALUE",
	);
});

test("a flag followed by a dash-led word is missing its value, named as typed", () => {
	assert.throws(
		() => parseCommandFlags(command, ["-o", "-f"]),
		(error: Error & { code?: string }) =>
			error.code === "MISSING_FLAG_VALUE" &&
			error.message === 'Flag "-o" requires a string value.',
	);
	assert.equal(parseCommandFlags(command, ["--out=-f"]).out, "-f");
});

test("a boolean flag given a value throws", () => {
	assert.throws(
		() => parseCommandFlags(command, ["--force=1"]),
		(error: Error & { code?: string }) =>
			error.code === "INVALID_FLAG_VALUE" &&
			error.message === 'Flag "--force" takes no value.',
	);
});

test("the global flags pass a plugin command by, a string one with its value", () => {
	assert.deepEqual(
		parseCommandFlags(command, ["--config", "other.ts", "--debug", "-h", "-f"]),
		{ retries: 3, force: true, verbose: false },
	);
});

test("an empty number throws", () => {
	assert.throws(
		() => parseCommandFlags(command, ["--retries="]),
		(error: Error & { code?: string }) => error.code === "INVALID_FLAG_VALUE",
	);
});

test("a name on Object's prototype is no command", () => {
	// The router reads only `name` and `commands`.
	const plugin = {
		name: "db",
		commands: { push: command },
	} as unknown as Parameters<typeof findPluginCommand>[0][number];
	assert.equal(findPluginCommand([plugin], "db", "constructor"), null);
	assert.equal(findPluginCommand([plugin], "db", "push")?.command, command);
});
