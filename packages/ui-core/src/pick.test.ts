import assert from "node:assert/strict";
import { test } from "node:test";
import { optionRows, pickCurrent } from "./pick.ts";

const options = [
	{ value: null, label: "None" },
	{ value: "a", label: "A" },
];

test("a pick holding nothing reads as the empty choice", () => {
	assert.equal(pickCurrent(options, undefined, false)?.label, "None");
	assert.equal(pickCurrent(options, "a", false)?.label, "A");
});

test("a pick of several holding nothing reads as none", () => {
	assert.equal(pickCurrent(options, undefined, true), undefined);
});

test("a long list puts each group's label ahead of its options and drops an empty group", () => {
	const a = { value: "a", label: "A" };
	const b = { value: "b", label: "B" };
	const c = { value: "c", label: "C" };
	assert.deepEqual(
		optionRows([
			{ label: "First", options: [a, b] },
			{ label: "Empty", options: [] },
			{ label: "Last", options: [c] },
		]),
		[
			{ label: "First" },
			{ option: a, index: 0 },
			{ option: b, index: 1 },
			{ label: "Last" },
			{ option: c, index: 2 },
		],
	);
	assert.deepEqual(optionRows([{ options: [a] }]), [{ option: a, index: 0 }]);
});
