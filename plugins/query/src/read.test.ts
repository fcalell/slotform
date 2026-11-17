import assert from "node:assert/strict";
import { test } from "node:test";
import {
	createFlags,
	isSelection,
	isStandIn,
	lift,
	sampleOf,
} from "@fcalell/ui-core/read";
import { replaceEqualDeep } from "@tanstack/react-query";
import { isStreamQuery, read } from "./read.ts";

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

test("a list selection's sample is one record as its selector maps it", () => {
	const list = read<{ id: string; on: boolean }[]>({
		queryKey: ["list"],
		queryFn: async () => [],
	});
	const rows = list.at((records) =>
		records.map((r) => ({ key: r.id, title: `${r.id}`, dot: r.on })),
	);
	const sample = sampleOf(rows);
	assert.ok(sample);
	assert.equal(sample.title, "");
	assert.equal(isStandIn(sample.key), false);
	assert.deepEqual(Object.keys(sample), ["key", "title", "dot"]);
	// A group's rows found first map one row too.
	const groups = read<{ id: string; rows: { at: string }[] }[]>({
		queryKey: ["groups"],
		queryFn: async () => [],
	});
	const grouped = groups.at((all) =>
		(all.find((g) => g.id === "open")?.rows ?? []).map((r) => ({
			title: r.at,
			leading: { status: "done" },
		})),
	);
	assert.deepEqual(sampleOf(grouped), {
		title: "",
		leading: { status: "done" },
	});
	// The read itself and a selector that throws keep no sample.
	assert.equal(sampleOf(list), undefined);
	assert.equal(
		sampleOf(
			list.at((records) =>
				records.map(() => {
					throw new Error("no");
				}),
			),
		),
		undefined,
	);
});

test("of the frames holding one read, the first to take it draws its mark", () => {
	const flags = createFlags();
	let heard = 0;
	flags.subscribe(() => {
		heard++;
	});
	const releaseA = flags.take("landing", "a");
	flags.take("landing", "b");
	flags.take("other", "c");
	assert.equal(flags.flags("landing", "a"), true);
	assert.equal(flags.flags("landing", "b"), false);
	assert.equal(flags.flags("other", "c"), true);
	releaseA();
	assert.equal(flags.flags("landing", "a"), false);
	assert.equal(flags.flags("landing", "b"), true);
	assert.equal(heard, 4);
});

test("the sample is a stand-in, and a walk over it that never ends is cut off", () => {
	const list = read<{ id: string; parent?: string }[]>({
		queryKey: ["walk"],
		queryFn: async () => [],
	});
	// A selector that follows `parent` while there is one reads a key that is always
	// there over the stand-in and the sample: it throws, never loops. The
	// sample takes none and the selection's region stands as the stand-in.
	const depthOf = (records: { id: string; parent?: string }[]) => {
		const byId = new Map(records.map((r) => [r.id, r]));
		let node: { id: string; parent?: string } | undefined = records[0];
		let depth = 0;
		while (node?.parent) {
			node =
				byId.get(node.parent) ??
				({ id: "", parent: node.parent } as typeof node);
			depth++;
		}
		return [{ depth }];
	};
	assert.equal(sampleOf(list.at(depthOf)), undefined);
	// A selector that guards its walk with `isStandIn` ends on the sample, which
	// it now finds (it did not, so the walk went on).
	const walk = list.at((records) => {
		let node: unknown = records[0];
		let depth = 0;
		while (!isStandIn(node) && depth < 3) {
			node = (node as { parent?: string }).parent;
			depth++;
		}
		return [{ depth }];
	});
	assert.deepEqual(sampleOf(walk), { depth: 0 });
});

test("lift makes a constant whose text props hold selections one selection", () => {
	const reason = one.at((n) => (n > 1 ? "Too many" : undefined));
	const act = { label: "Run", blocked: reason, onAct: () => 1 };
	const lifted = lift(act, ["label", "blocked"]);
	assert.equal(isSelection(lifted), true);
	assert.equal(lift(act, ["label", "blocked"]), lifted);
	const drawn = pickOf(lifted, [2]) as typeof act;
	assert.equal(drawn.blocked, "Too many");
	assert.equal(drawn.label, "Run");
	assert.equal(drawn.onAct, act.onAct);
});

test("lift walks a list, and the list under its nesting key", () => {
	const note = one.at((n) => `n${n}`);
	const options = [
		{ label: "A", options: [{ value: "a", label: "A", description: note }] },
	];
	const drawn = pickOf(
		lift(options, ["description"], "options"),
		[3],
	) as typeof options;
	assert.equal(drawn[0]?.options[0]?.description, "n3");
	// Without a nesting key the inner list is not walked.
	assert.equal(lift(options, ["description"]), options);
	// Another key nests as well as `options` does.
	const items = [{ label: "A", items: [{ label: "a", description: note }] }];
	const nested = pickOf(
		lift(items, ["description"], "items"),
		[4],
	) as typeof items;
	assert.equal(nested[0]?.items[0]?.description, "n4");
});

test("lift leaves a value with no selection, or a selection, as it is", () => {
	const plain = { label: "Run", onAct: () => 1 };
	assert.equal(lift(plain, ["label", "blocked"]), plain);
	assert.equal(lift(one, ["label"]), one);
	assert.equal(lift(undefined, ["label"]), undefined);
});
