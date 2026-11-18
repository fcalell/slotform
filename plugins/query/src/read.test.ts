import assert from "node:assert/strict";
import { test } from "node:test";
import {
	isSelection,
	type Read,
	type WindowState,
} from "@fcalell/ui-core/read";
import { QueryClient, replaceEqualDeep } from "@tanstack/react-query";
import { ensurePages, holdOf, isStreamQuery, read, withHold } from "./read.ts";

const one = read({ queryKey: ["one"], queryFn: async () => 1 });

const pickOf = (selection: unknown, data: unknown[]) =>
	(
		selection as {
			[key: symbol]: { pick: (d: unknown[], r: boolean[]) => unknown };
		}
	)[Symbol.for("@fcalell/ui-core/selection")]?.pick(
		data,
		data.map(() => true),
	);

// TanStack's structural sharing runs over every `combine` result a leaf draws:
// a selection it rebuilds must still be one.
test("a selection survives structural sharing", () => {
	const before = { value: one.at((n) => n + 1) };
	const after = { value: one.at((n) => n + 2) };
	const shared = replaceEqualDeep(before, after) as typeof after;
	assert.equal(shared.value, after.value);
	assert.equal(isSelection(shared.value), true);
	assert.equal(
		isSelection(
			replaceEqualDeep(
				{ value: one },
				{ value: read({ queryKey: ["one"], queryFn: async () => 1 }) },
			).value,
		),
		true,
	);
});

test("a read is its own selection", () => {
	assert.equal(isSelection(one), true);
	assert.equal(one.kind, "query");
	assert.equal(pickOf(one, [2]), 2);
	assert.equal(
		pickOf(
			one.at((n) => n + 1),
			[2],
		),
		3,
	);
	assert.equal(pickOf(one.or(0), [2]), 2);
});

test("a stream read's query carries meta.stream beside its own meta, a query read's does not", () => {
	const options = { queryKey: ["m"], queryFn: () => 1, meta: { reads: ["a"] } };
	const stream = read(options, { kind: "stream" }).options;
	assert.deepEqual(stream.meta, { reads: ["a"], stream: true });
	assert.equal(
		isStreamQuery(stream as { meta?: Record<string, unknown> }),
		true,
	);
	assert.equal(
		isStreamQuery(read(options).options as { meta?: Record<string, unknown> }),
		false,
	);
});

test("a window loads each missing page once into its query, and refetches when the total moved", async () => {
	const client = new QueryClient();
	const queryKey = ["w"];
	client.setQueryData(queryKey, {
		total: 6,
		size: 2,
		pages: { 0: ["a", "b"] },
	});
	let total = 6;
	const asked: number[] = [];
	const page = async (offset: number) => {
		asked.push(offset);
		return { data: [`r${offset}`, `r${offset + 1}`], total, offset };
	};
	const window = {
		options: { queryKey },
		key: "w",
		page,
	} as unknown as Read<unknown>;
	await Promise.all([
		ensurePages(client, window, [1, 2, 3]),
		ensurePages(client, window, [1]),
	]);
	// Page 3 starts past the total; page 1 is asked for once by both.
	assert.deepEqual(asked, [2, 4]);
	assert.deepEqual(client.getQueryData<WindowState>(queryKey)?.pages, {
		0: ["a", "b"],
		1: ["r2", "r3"],
		2: ["r4", "r5"],
	});
	// The data moved under the window: the page is not written, the query is refetched.
	client.setQueryData(queryKey, {
		total: 6,
		size: 2,
		pages: { 0: ["a", "b"] },
	});
	total = 8;
	await ensurePages(client, window, [1]);
	assert.equal(client.getQueryData<WindowState>(queryKey)?.pages[1], undefined);
	assert.equal(client.getQueryState(queryKey)?.isInvalidated, true);
});

test("withHold sets the hold beside the client's own defaults", () => {
	const client = new QueryClient({
		defaultOptions: { queries: { staleTime: 5, meta: { reads: ["a"] } } },
	});
	const hold = (elapsed: number) => 100 - elapsed;
	withHold(client, hold);
	assert.equal(client.getDefaultOptions().queries?.staleTime, 5);
	assert.deepEqual(client.getDefaultOptions().queries?.meta?.reads, ["a"]);
	assert.equal(holdOf(client, 40), 60);
	assert.equal(holdOf(new QueryClient(), 40), 0);
});
