import assert from "node:assert/strict";
import { test } from "node:test";
import { aggregateServer } from "./codegen.ts";

const payload = {
	port: 8788,
	host: null,
	origins: [],
	listeners: {},
	bounds: { body: 1, frame: 1 },
	hasWorker: true,
	workerPaths: ["/rpc"],
	staticRoot: "dist/client",
	clientHeaders: {},
	hasConsumerServices: false,
	services: [],
};

test("the bundle entry finds the client beside itself and runs its boot tasks", () => {
	const source = aggregateServer({
		...payload,
		bundle: {
			imports: [],
			boot: [{ kind: "identifier", name: "migrate" }],
		},
	});
	assert.match(source, /staticDir:\s*new URL\(["']\.\.\/client["']/);
	assert.match(source, /boot:\s*\[migrate\]/);
});

test("a served entry loads the run's own worker module", () => {
	assert.match(
		aggregateServer({ ...payload, workerFile: "./serve-x.worker.ts" }),
		/serve-x\.worker\.ts/,
	);
});
