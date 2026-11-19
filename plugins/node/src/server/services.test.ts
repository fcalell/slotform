import assert from "node:assert/strict";
import { test } from "node:test";
import createWorker from "@fcalell/plugin-api/runtime";
import { createNodeServer } from "./create-node-server.ts";
import { defineService, type ServiceContext } from "./service.ts";

const quiet = { info() {}, error() {} };

test("every service starts before any service is ready, then the server listens; stops run in reverse", async () => {
	const order: string[] = [];
	const service = (name: string) =>
		defineService({
			name,
			start() {
				order.push(`${name}:start`);
				return () => {
					order.push(`${name}:stop`);
				};
			},
			ready() {
				order.push(`${name}:ready`);
				return () => {
					order.push(`${name}:stop-ready`);
				};
			},
		});
	const server = createNodeServer({
		port: 0,
		host: "127.0.0.1",
		worker: null,
		workerPaths: [],
		staticRoot: null,
		env: {},
		log: {
			info(message) {
				if (message.includes("listening")) order.push("listening");
			},
			error() {},
		},
		// File-name order: `inbox` before `jobs`.
		services: [
			service("inbox"),
			service("jobs"),
			defineService({ name: "plain", start() {} }),
		],
	});
	await server.start();
	await server.stop();
	assert.deepEqual(order, [
		"inbox:start",
		"jobs:start",
		"inbox:ready",
		"jobs:ready",
		"listening",
		"jobs:stop-ready",
		"inbox:stop-ready",
		"jobs:stop",
		"inbox:stop",
	]);
});

test("a service's start and ready build the worker's job context afresh on each call", async () => {
	let built = 0;
	const worker = createWorker()
		.use({
			name: "db",
			context: () => {
				built += 1;
				return { db: "the database" };
			},
			// A plugin's own fetch never runs for a job context.
			fetch: () => {
				throw new Error("fetch ran");
			},
		})
		.use((ctx: { db: string }) => ({ seen: ctx.db }))
		.handler();
	const env = { STACK_DEV: "1" };
	const contexts: Record<string, unknown>[] = [];
	const read = async (ctx: ServiceContext) => {
		assert.ok(ctx.jobContext);
		contexts.push(await ctx.jobContext());
	};
	const server = createNodeServer({
		port: 0,
		host: "127.0.0.1",
		worker,
		workerPaths: [],
		staticRoot: null,
		env,
		log: quiet,
		services: [defineService({ name: "importer", start: read, ready: read })],
	});
	await server.start();
	await server.stop();
	assert.equal(built, 2);
	const [fromStart, fromReady] = contexts;
	assert.ok(fromStart && fromReady);
	assert.notEqual(fromStart, fromReady);
	assert.equal(fromStart.db, "the database");
	assert.equal(fromStart.seen, "the database");
	assert.equal(fromStart.env, env);
	assert.equal(fromStart._devMode, true);
	for (const key of ["httpRequest", "reqHeaders", "resHeaders"])
		assert.equal(key in fromStart, false, key);
});

test("without a worker a service's job context is null", async () => {
	let given: unknown;
	const server = createNodeServer({
		port: 0,
		host: "127.0.0.1",
		worker: null,
		workerPaths: [],
		staticRoot: null,
		env: {},
		log: quiet,
		services: [
			defineService({
				name: "plain",
				start(ctx) {
					given = ctx.jobContext;
				},
			}),
		],
	});
	await server.start();
	await server.stop();
	assert.equal(given, null);
});
