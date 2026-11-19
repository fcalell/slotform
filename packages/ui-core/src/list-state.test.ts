import assert from "node:assert/strict";
import { test } from "node:test";
import {
	chooseAllToggled,
	columnAsked,
	columnFloor,
	columnsChanged,
	columnsKey,
	columnWidth,
	gridFloor,
	idsChooser,
	levelOf,
	listedRows,
	nextSort,
	pickChooser,
	type Sort,
	sheetEntries,
	sorted,
	type TableRecord,
	TOUCH_FACT_FITS,
	touchFacts,
	touchNamed,
} from "./list-state.ts";
import type { TableColumn } from "./roster/table.ts";

test("a touch row names the columns of a kind that stands more than once", () => {
	// Staging and Production are both statuses: each says its column.
	assert.deepEqual(
		[
			...touchNamed([
				{ key: "staging", kind: "status" },
				{ key: "production", kind: "status" },
				{ key: "kind" },
			]),
		],
		["staging", "production"],
	);
	// Expected and Observed are both words, a lone status among them is not named.
	assert.deepEqual(
		[
			...touchNamed([
				{ key: "expected" },
				{ key: "observed", kind: "text" },
				{ key: "verdict", kind: "status" },
			]),
		],
		["expected", "observed"],
	);
});

test("a further age names its column", () => {
	// The row's first age trails the row and is not among the columns.
	assert.deepEqual(
		[...touchNamed([{ key: "seen", kind: "age" }, { key: "kind" }])],
		["seen"],
	);
});

test("a lone value of its kind, a number, a change and a chip name nothing", () => {
	assert.deepEqual(
		[...touchNamed([{ key: "kind" }, { key: "seats", kind: "number" }])],
		[],
	);
	assert.deepEqual(
		[
			...touchNamed([
				{ key: "a", kind: "number" },
				{ key: "b", kind: "number" },
			]),
		],
		[],
	);
});

test("a meter of a goal is good when full and neutral short of it, never near or over", () => {
	assert.equal(levelOf(1, undefined, true), "met");
	assert.equal(levelOf(1.2, undefined, true), "met");
	assert.equal(levelOf(0.95, undefined, true), "under");
	assert.equal(levelOf(0.62, undefined, true), "under");
	// A quota keeps its levels.
	assert.equal(levelOf(0.95), "near");
	assert.equal(levelOf(1.2), "over");
	assert.equal(levelOf(0.5), "under");
});

// The characters of the longest age in English, "59 seconds ago".
const age = 14;

test("a header of short words stands at the short measure; a long word asks for its room", () => {
	const short = "var(--container-measure-short)";
	assert.equal(
		columnFloor({ label: "Destination or tag manager" }, age),
		short,
	);
	assert.equal(columnFloor({ label: "Currency" }, age), short);
	const long = columnFloor({ label: "Conversion attribution_window" }, age);
	assert.ok(long.startsWith(`max(${short}, calc(19ch`));
	// The grid's floor sums the same floors.
	assert.equal(
		gridFloor([{ label: "Name" }, { label: "Currency" }], false, 0, age),
		`calc(${short} + ${short})`,
	);
	assert.ok(
		gridFloor(
			[{ label: "Name" }, { label: "Conversion attribution_window" }],
			false,
			0,
			age,
		).includes(long),
	);
});

test("a figure column with no width stands at half the short measure, its header's word over it", () => {
	const half = "calc(var(--container-measure-short) / 2)";
	assert.equal(columnFloor({ label: "N", kind: "number" }, age), half);
	assert.ok(
		columnFloor({ label: "Plays", kind: "number" }, age).startsWith(
			`max(${half}, calc(6ch`,
		),
	);
	assert.equal(
		columnFloor(
			{ label: "Plays", kind: "number", width: "measure-short" },
			age,
		),
		"var(--container-measure-short)",
	);
});

test("a head counts a tree's top-level rows, less the rows that are no step", () => {
	const journey = [
		{ key: "entry", counted: false as const },
		{ key: "a", children: [{ key: "a1" }, { key: "a2" }] },
		{ key: "b" },
		{ key: "ref", counted: false as const },
		{ key: "end", counted: false as const },
	];
	assert.equal(listedRows(journey).length, 2);
	assert.equal(listedRows([{ key: "x" }, { key: "y" }]).length, 2);
});

test("a head counts a nested row that says it is a step, at any depth", () => {
	const branching = [
		{ key: "entry", counted: false as const },
		{
			key: "a",
			children: [
				{
					key: "option-1",
					counted: false as const,
					children: [
						{ key: "b", counted: true as const },
						{ key: "end-b", counted: false as const },
					],
				},
				{
					key: "option-2",
					counted: false as const,
					children: [
						{ key: "c", counted: true as const, children: [{ key: "c-part" }] },
						{ key: "ref", counted: false as const },
					],
				},
			],
		},
	];
	assert.deepEqual(
		listedRows(branching).map((row) => (row as { key: string }).key),
		["a", "b", "c"],
	);
});

test("a touch row keeps the short values as facts and says the long ones whole", () => {
	const long = "After the change: $480 a month, from 14 October";
	const short = "Current: 100 GB";
	assert.ok(long.length > TOUCH_FACT_FITS);
	assert.ok(short.length <= TOUCH_FACT_FITS);
	assert.deepEqual(touchFacts([short, long], undefined), {
		facts: [short],
		said: [long],
	});
	// The reason a rule moved a tick leads the facts, whatever its length.
	assert.deepEqual(touchFacts([short], long), {
		facts: [long, short],
		said: [],
	});
	assert.deepEqual(touchFacts([], undefined), { facts: [], said: [] });
});

test("touchFacts says a value past the short measure in the line", () => {
	const at = "x".repeat(TOUCH_FACT_FITS);
	const past = `${at}y`;
	assert.deepEqual(touchFacts([at, past], undefined), {
		facts: [at],
		said: [past],
	});
});

test("columnAsked gives no length where the class holds", () => {
	const chip = { label: "Kind", kind: "chip" as const };
	// The short measure is what the column's class gives.
	assert.equal(columnAsked(chip, age), undefined);
	assert.equal(columnAsked({ label: "Name" }, age), undefined);
	// A fractional column keeps its share, whatever its header or chips hold.
	assert.equal(
		columnAsked({ label: "A very_long_header_word", width: "1/4" }, age),
		undefined,
	);
	// A figure column's half measure is its own floor.
	assert.equal(
		columnAsked({ label: "N", kind: "number" }, age),
		"calc(var(--container-measure-short) / 2)",
	);
	assert.ok(
		columnAsked(chip, age, 17)?.startsWith(
			"max(var(--container-measure-short), calc(17ch",
		),
	);
});

test("a chip column's floor counts the chip's own inset, dot and gap", () => {
	const chip = { label: "Kind", kind: "chip" as const };
	assert.equal(columnFloor(chip, age, 0), "var(--container-measure-short)");
	const wide = columnFloor(chip, age, 17);
	assert.ok(wide.startsWith("max(var(--container-measure-short), calc(17ch"));
	for (const part of ["pad", "hairline", "dot", "gap"])
		assert.ok(wide.includes(`var(--spacing-${part})`), part);
	assert.ok(!wide.includes("spacing-control"));
});

test("an age column stands at its longest word, a chip or status column at the short measure", () => {
	assert.ok(
		columnFloor({ label: "Added", kind: "age" }, 14).startsWith("calc(14ch "),
	);
	assert.equal(columnWidth({ kind: "chip" }), "measure-short");
	assert.equal(columnWidth({ kind: "text" }), undefined);
	assert.equal(columnWidth({ kind: "chip", width: "1/4" }), "1/4");
});

test("a chip column with no width stands at its widest chip where the short measure cannot hold it", () => {
	const short = "var(--container-measure-short)";
	const chip = { label: "Kind", kind: "chip" as const };
	assert.equal(columnFloor(chip, age), short);
	const wide = columnFloor(chip, age, 17);
	assert.ok(wide.startsWith(`max(${short}, calc(17ch`));
	// A chip column with a width of its own keeps it.
	assert.equal(
		columnFloor({ ...chip, width: "measure-short" }, age, 17),
		short,
	);
	assert.ok(gridFloor([chip], false, 0, age, [17]).includes(wide));
});

test("a column sorts from A or largest first, turns over, then is off", () => {
	const words = { key: "title", kind: "text" as const };
	const figures = { key: "plays", kind: "number" as const };
	const first = nextSort(undefined, words);
	assert.deepEqual(first, { key: "title", direction: "ascending" });
	const second = nextSort(first, words);
	assert.deepEqual(second, { key: "title", direction: "descending" });
	assert.equal(nextSort(second, words), undefined);
	assert.deepEqual(nextSort(undefined, figures), {
		key: "plays",
		direction: "descending",
	});
});

test("the columns key is the table's name, so a column added keeps the choice", () => {
	assert.equal(
		columnsKey([{ key: "a" }], "Library"),
		columnsKey([{ key: "a" }, { key: "b" }], "Library"),
	);
	assert.equal(
		columnsKey([{ key: "a" }, { key: "b" }], undefined),
		columnsKey([{ key: "b" }, { key: "a" }], undefined),
	);
	assert.notEqual(
		columnsKey([{ key: "a" }], undefined),
		columnsKey([{ key: "a" }, { key: "b" }], undefined),
	);
});

test("the columns differ from the table's own once the viewer's choice does", () => {
	const columns = [{ key: "a" }, { key: "b" }, { key: "c", hidden: true }];
	assert.equal(columnsChanged(columns, {}), false);
	assert.equal(columnsChanged(columns, { b: false }), true);
	assert.equal(columnsChanged(columns, { c: true }), true);
	assert.equal(columnsChanged(columns, { b: true, c: false }), false);
});

const columnOf = (key: string, kind: "number" | "text" | "age") =>
	({ key, label: key, kind, cell: () => null }) satisfies TableColumn;

const record = (id: string, cells: TableRecord["cells"]): TableRecord => ({
	id,
	href: undefined,
	editable: false,
	locked: undefined,
	warning: undefined,
	change: undefined,
	blocked: undefined,
	moved: undefined,
	act: undefined,
	more: undefined,
	drop: undefined,
	cells,
});

test("a number that is not finite sorts as an empty cell, last either way", () => {
	const values = [5, Number.NaN, 1, 9, 3, Number.NaN, 2, 8, 4, 7, 6];
	const rows = values.map((value, at) => record(`r${at}`, { ratio: value }));
	const column = columnOf("ratio", "number");
	const read = (direction: Sort["direction"]) =>
		sorted(rows, [column], { key: "ratio", direction }).map(
			(row) => row.cells.ratio,
		);
	assert.deepEqual(read("ascending"), [
		1,
		2,
		3,
		4,
		5,
		6,
		7,
		8,
		9,
		Number.NaN,
		Number.NaN,
	]);
	assert.deepEqual(read("descending"), [
		9,
		8,
		7,
		6,
		5,
		4,
		3,
		2,
		1,
		Number.NaN,
		Number.NaN,
	]);
	// A moment that does not parse is empty too.
	const ages = ["2024-01-02", "not a date", "2024-01-01"].map((age, at) =>
		record(`a${at}`, { seen: age }),
	);
	assert.deepEqual(
		sorted(ages, [columnOf("seen", "age")], {
			key: "seen",
			direction: "ascending",
		}).map((row) => row.id),
		["a2", "a0", "a1"],
	);
});

test("text sorts with numbers in it read as numbers", () => {
	const rows = ["item 10", "item 2", "Item 1"].map((title, at) =>
		record(`t${at}`, { title }),
	);
	assert.deepEqual(
		sorted(rows, [columnOf("title", "text")], {
			key: "title",
			direction: "ascending",
		}).map((row) => row.cells.title),
		["Item 1", "item 2", "item 10"],
	);
});

test("the ticks read and change the chosen ids in their order", () => {
	const rows = ["a", "b", "c"].map((id) => record(id, {}));
	const changes: string[][] = [];
	const chooser = idsChooser(rows, ["c", "a"], (ids) => changes.push(ids));
	assert.equal(chooser.ticked("a"), true);
	assert.equal(chooser.ticked("b"), false);
	assert.equal(chooser.head, "mixed");
	chooser.toggleAll();
	chooser.tickSet(["b"], ["c"]);
	assert.deepEqual(changes, [
		["c", "a", "b"],
		["a", "b"],
	]);
	assert.deepEqual(chooseAllToggled(rows, ["c", "a", "b"]), []);
});

const shape = (entries: ReturnType<typeof sheetEntries>) =>
	entries.map((entry) =>
		entry.kind === "band"
			? `${entry.key}(${entry.count})${entry.ruled ? "|" : ""}`
			: `${entry.key}${entry.ruled ? "|" : ""}`,
	);

test("a sheet's bands stand before each group's first row, empty ones after the last", () => {
	const bands = [{ key: "a" }, { key: "b" }, { key: "c" }];
	const rows = [
		{ key: "loose", depth: 0, group: -1 },
		{ key: "a1", depth: 0, group: 0 },
		{ key: "a2", depth: 0, group: 0 },
		{ key: "c1", depth: 0, group: 2 },
	];
	assert.deepEqual(shape(sheetEntries(rows, bands, true)), [
		"loose",
		"band:a(2)|",
		"a1",
		"a2|",
		"band:b(0)|",
		"band:c(1)",
		"c1",
	]);
	assert.deepEqual(shape(sheetEntries([], bands, false)), [
		"band:a(0)",
		"band:b(0)",
		"band:c(0)",
	]);
});

test("a lone band holding every row counts none when the head counts them", () => {
	const rows = [
		{ key: "x", depth: 0, group: 0 },
		{ key: "y", depth: 0, group: 0 },
	];
	assert.deepEqual(shape(sheetEntries(rows, [{ key: "a" }], true)), [
		"band:a(0)",
		"x",
		"y|",
	]);
	assert.deepEqual(shape(sheetEntries(rows, [{ key: "a" }], false)), [
		"band:a(2)",
		"x",
		"y|",
	]);
});

test("a tree's children stand with their parent at their depth, outside any count", () => {
	const entries = sheetEntries(
		[
			{ key: "p", depth: 0, group: 0 },
			{ key: "child", depth: 1, group: -1 },
			{ key: "q", depth: 0, group: 1 },
		],
		[{ key: "a" }, { key: "b" }],
		false,
	);
	assert.deepEqual(shape(entries), [
		"band:a(1)",
		"p",
		"child|",
		"band:b(1)|",
		"q",
	]);
	assert.deepEqual(
		entries
			.filter((entry) => entry.kind === "row")
			.map((entry) => [entry.index, entry.depth]),
		[
			[0, 0],
			[1, 1],
			[2, 0],
		],
	);
});

test("a sheet with no bands rules every row after the first", () => {
	assert.deepEqual(
		shape(
			sheetEntries(
				[
					{ key: "x", depth: 0, group: -1 },
					{ key: "y", depth: 0, group: -1 },
				],
				undefined,
				false,
			),
		),
		["x", "y|"],
	);
});

test("a query pick's head stays checked while only blocked rows are unticked", () => {
	const rows = [
		record("a", {}),
		{ ...record("b", {}), blocked: "Locked" },
		record("c", {}),
	];
	const picks: unknown[] = [];
	const query = { q: "x" };
	const span = { query, total: 10 };
	const all = pickChooser<{ q: string }>(
		rows,
		{ ids: [] },
		(next) => picks.push(next),
		span,
	);
	all.toggleAll();
	assert.deepEqual(picks, [{ query, except: ["b"] }]);
	const chosen = pickChooser<{ q: string }>(
		rows,
		{ query, except: ["b"] },
		() => {},
		span,
	);
	assert.equal(chosen.head, true);
	assert.equal(chosen.count, 9);
	const unticked = pickChooser<{ q: string }>(
		rows,
		{ query, except: ["b", "a"] },
		() => {},
		span,
	);
	assert.equal(unticked.head, "mixed");
	assert.equal(unticked.count, 8);
});

test("a query pick's head is unchecked once every row it reaches is unticked", () => {
	const rows = [record("a", {}), { ...record("b", {}), blocked: "Locked" }];
	const none = pickChooser<{ q: string }>(
		rows,
		{ query: { q: "x" }, except: ["a", "b"] },
		() => {},
		{ query: { q: "x" }, total: 2 },
	);
	assert.equal(none.count, 0);
	assert.equal(none.head, false);
});
