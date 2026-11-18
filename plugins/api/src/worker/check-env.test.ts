import assert from "node:assert/strict";
import { test } from "node:test";
import createWorker from "./index.ts";

const worker = createWorker({
	envChecks: [
		{ name: "AUTH_SECRET", minLength: 32 },
		{ name: "APP_URL", url: true },
	],
}).handler();

test("checkEnv names every missing var in one error", () => {
	assert.throws(
		() => worker.checkEnv({}),
		(error: Error) =>
			/Missing env var: AUTH_SECRET/.test(error.message) &&
			/Missing env var: APP_URL/.test(error.message),
	);
});

test("checkEnv names a var that is malformed", () => {
	assert.throws(
		() => worker.checkEnv({ AUTH_SECRET: "short", APP_URL: "https://a.test" }),
		/AUTH_SECRET must be at least 32 characters/,
	);
});

test("checkEnv passes a complete env", () => {
	worker.checkEnv({ AUTH_SECRET: "x".repeat(32), APP_URL: "https://a.test" });
});

test("devLocalhost under STACK_DEV takes every local origin and refuses another", () => {
	const dev = createWorker({
		envChecks: [{ name: "APP_URL", devLocalhost: true }],
	}).handler();
	for (const url of [
		"http://localhost:3000",
		"http://[::1]:3000",
		"http://dev.localdomain:3000",
	]) {
		dev.checkEnv({ STACK_DEV: "1", APP_URL: url });
	}
	assert.throws(
		() => dev.checkEnv({ STACK_DEV: "1", APP_URL: "https://a.test" }),
		/points at a.test while STACK_DEV is set/,
	);
});
