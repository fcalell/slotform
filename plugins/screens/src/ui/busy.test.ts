import assert from "node:assert/strict";
import { test } from "node:test";
import type { QueryClient } from "@slotform/query/tanstack-query";
import { fetchingReads } from "./busy.ts";

interface FakeQuery {
	fetchStatus: "fetching" | "paused" | "idle";
	meta?: Record<string, unknown>;
}

// Only the part of the client the count reads: the cache's `findAll` by fetch
// status, and each query's meta.
const clientOf = (...queries: FakeQuery[]) =>
	({
		getQueryCache: () => ({
			findAll: ({ fetchStatus }: { fetchStatus?: string } = {}) =>
				queries.filter(
					(query) =>
						fetchStatus === undefined || query.fetchStatus === fetchStatus,
				),
		}),
	}) as unknown as QueryClient;

const fetching = (meta?: Record<string, unknown>): FakeQuery => ({
	fetchStatus: "fetching",
	meta,
});

test("a stream query fetching is not counted, any other is", () => {
	assert.equal(fetchingReads(clientOf(fetching({ stream: true }))), 0);
	assert.equal(
		fetchingReads(clientOf(fetching({ stream: true }), fetching())),
		1,
	);
	assert.equal(
		fetchingReads(
			clientOf(
				fetching({ reach: 1, stream: true }),
				fetching({ hold: 1 }),
				fetching({}),
			),
		),
		2,
	);
});

test("a paused or idle query is not counted", () => {
	assert.equal(
		fetchingReads(
			clientOf({ fetchStatus: "paused" }, { fetchStatus: "idle" }, fetching()),
		),
		1,
	);
});

test("no client is no read", () => {
	assert.equal(fetchingReads(undefined), 0);
});
