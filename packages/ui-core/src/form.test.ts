import assert from "node:assert/strict";
import { test } from "node:test";
import {
	changedSince,
	derive,
	emptied,
	firstRefused,
	heldPick,
	isEmpty,
	leftWith,
	pickWords,
	sameHeld,
	toInput,
	toShown,
} from "./form.ts";
import { createLeave } from "./leave.ts";
import { ENGLISH, filled } from "./tokens.ts";

const input = (minItems?: number) => ({
	type: "object",
	properties: {
		helpers: {
			type: "array",
			items: { type: "string", enum: ["explore", "plan"] },
			...(minItems === undefined ? {} : { minItems }),
		},
	},
	required: ["helpers"],
});

test("a pick of several with no pick holds the empty list", () => {
	const helpers = derive(input(), "helpers", undefined);
	assert.equal(isEmpty(helpers, toShown(helpers, undefined)), false);
	assert.deepEqual(toInput(helpers, [], ENGLISH), { value: [] });
});

test("a pick of several that asks for one is empty with no pick", () => {
	assert.equal(isEmpty(derive(input(1), "helpers", undefined), []), true);
	assert.equal(
		isEmpty(derive(input(1), "helpers", undefined), ["explore"]),
		false,
	);
});

test("a typing control with no value is handed the empty string, a pick nothing", () => {
	const schema = {
		type: "object",
		properties: {
			args: { type: "object" },
			note: { type: "string" },
			mode: { type: "string", enum: ["a", "b"] },
		},
	};
	assert.equal(toShown(derive(schema, "args", "json"), null), "");
	assert.equal(toShown(derive(schema, "note", undefined), undefined), "");
	assert.equal(
		toShown(derive(schema, "mode", undefined), undefined),
		undefined,
	);
	assert.equal(
		toShown(derive(schema, "args", "json"), { a: 1 }),
		'{\n  "a": 1\n}',
	);
});

const said = { none: "None", choose: "Choose" };

test("a required pick's placeholder is its empty word, else Choose", () => {
	assert.equal(pickWords({ required: true }, said).one, "Choose");
	assert.equal(pickWords({ required: true, empty: "Any" }, said).one, "Any");
	assert.equal(pickWords({ required: false }, said).one, undefined);
});

test("an optional pick of several reads None", () => {
	assert.equal(pickWords({ required: false }, said).several, "None");
	assert.equal(pickWords({ required: false, empty: "Any" }, said).none, "Any");
});

test("an untouched string pick holds nothing", () => {
	assert.equal(heldPick(""), undefined);
	assert.equal(heldPick("a"), "a");
});

test("an enum with a default always holds a value, so it is required; a truly optional one is not", () => {
	const schema = {
		type: "object",
		properties: {
			density: {
				type: "string",
				enum: ["compact", "full"],
				default: "compact",
			},
			kind: { type: "string", enum: ["a", "b"] },
			note: { anyOf: [{ type: "string", enum: ["a"] }, { type: "null" }] },
		},
	};
	const density = derive(schema, "density", undefined);
	assert.equal(density.required, true);
	assert.equal(toShown(density, undefined), "compact");
	assert.equal(derive(schema, "kind", undefined).required, false);
	assert.equal(derive(schema, "note", undefined).required, false);
});

// The schema `z.object({ title: z.string().min(3).max(8), count: z.number().min(1).max(9), mail: z.email(), site: z.url() })` emits.
const checks = {
	type: "object",
	properties: {
		title: { type: "string", minLength: 3, maxLength: 8 },
		count: { type: "number", minimum: 1, maximum: 9 },
		mail: {
			type: "string",
			format: "email",
			pattern:
				"^(?:[A-Za-z0-9_'+\\-]+\\.)*[A-Za-z0-9_'+\\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$",
		},
		site: { type: "string", format: "uri" },
		when: { type: "string", format: "date-time", pattern: "^\\d{4}-" },
		slug: { type: "string", pattern: "^[a-z]+$" },
		given: { type: "integer", exclusiveMinimum: 0, exclusiveMaximum: 10 },
	},
};
const made = (key: string, value: string, hint?: "date") =>
	toInput(derive(checks, key, hint), value, ENGLISH);

test("a value the schema's checks refuse is the field's issue before the send", () => {
	assert.deepEqual(made("title", "ab"), {
		issue: filled(ENGLISH.fewestCharacters, { min: "3" }),
	});
	assert.deepEqual(made("title", "abcdefghi"), {
		issue: filled(ENGLISH.mostCharacters, { max: "8" }),
	});
	assert.deepEqual(made("title", "abc"), { value: "abc" });
	assert.deepEqual(made("count", "0"), {
		issue: filled(ENGLISH.leastNumber, { min: "1" }),
	});
	assert.deepEqual(made("count", "10"), {
		issue: filled(ENGLISH.mostNumber, { max: "9" }),
	});
	assert.deepEqual(made("count", "4"), { value: 4 });
	assert.deepEqual(made("mail", "ann@"), { issue: ENGLISH.badFormat });
	assert.deepEqual(made("mail", "ann@example.org"), {
		value: "ann@example.org",
	});
	assert.deepEqual(made("site", "example.org"), { issue: ENGLISH.badFormat });
	assert.deepEqual(made("site", "https://example.org"), {
		value: "https://example.org",
	});
	// A moment is sent as a `Date`, which the string's pattern does not judge.
	assert.deepEqual(made("when", "2024-05-01", "date"), {
		value: new Date("2024-05-01"),
	});
	assert.equal(made("count", "Infinity"), "invalid");
	assert.equal(made("count", "1e999"), "invalid");
});

test("a hint the schema does not fit throws", () => {
	assert.throws(() => derive(checks, "count", "mono"), /not a string/);
	assert.throws(() => derive(checks, "when", "secret"), /date-time/);
});

test("a whole number and exclusive bounds are checked; a bare pattern is the server's", () => {
	assert.deepEqual(made("given", "0"), {
		issue: filled(ENGLISH.moreThan, { min: "0" }),
	});
	assert.deepEqual(made("given", "10"), {
		issue: filled(ENGLISH.lessThan, { max: "10" }),
	});
	assert.deepEqual(made("given", "2.5"), { issue: ENGLISH.wholeNumber });
	assert.deepEqual(made("given", "3"), { value: 3 });
	// `.regex(/x/i)` emits `x` with no flags, so the client does not judge it.
	assert.deepEqual(made("slug", "ABC"), { value: "ABC" });
});

const fields = {
	type: "object",
	properties: {
		on: { type: "boolean" },
		tags: { type: "array", items: { type: "string", enum: ["a", "b"] } },
		note: { type: "string" },
	},
};
const of = (key: string) => derive(fields, key, undefined);

test("a value put back is the one it was, read against its control's empty", () => {
	// A switch with no first value, toggled on then off.
	assert.equal(sameHeld(of("on"), false, undefined), true);
	assert.equal(sameHeld(of("on"), true, undefined), false);
	// A pick of several compares as a set.
	assert.equal(sameHeld(of("tags"), ["b", "a"], ["a", "b"]), true);
	assert.equal(sameHeld(of("tags"), ["a"], ["a", "b"]), false);
	assert.equal(sameHeld(of("note"), "", undefined), true);
});

test("what changed since a send is the fields whose value moved", () => {
	const shown = new Map([
		["note", of("note")],
		["on", of("on")],
	]);
	assert.deepEqual(
		[...changedSince(shown, { note: "a" }, { note: "ab", on: false })],
		["note"],
	);
	assert.deepEqual([...changedSince(shown, { on: true }, { on: true })], []);
});

test("a refusal hands focus to the first refused field that can take it", () => {
	const order = [
		{ key: "title", disabled: false },
		{ key: "body", disabled: true },
		{ key: "slug", disabled: false },
	];
	assert.equal(
		firstRefused(order, [{ path: ["slug"] }, { path: ["body"] }]),
		"slug",
	);
	assert.equal(firstRefused(order, [{ path: ["elsewhere"] }]), undefined);
});

test("a form whose values are put back no longer asks to leave", async () => {
	const leave = createLeave();
	leave.edit(true);
	assert.equal(leave.asks(), true);
	leave.edit(false);
	assert.equal(leave.asks(), false);
	assert.equal(await leave.attempt(async () => false), true);
});

test("a leave tells its subscribers each time whether it asks may turn", async () => {
	const leave = createLeave();
	const seen: boolean[] = [];
	const stop = leave.subscribe(() => seen.push(leave.asks()));
	leave.edit(true);
	leave.press();
	leave.settle(true);
	await leave.attempt(async () => true);
	stop();
	leave.edit(true);
	assert.deepEqual(seen, [true, false, true, false]);
});

test("a field left, or every field on a press, lets its typed issue stand", () => {
	const left = leftWith(new Set(), ["title"]);
	assert.deepEqual([...left], ["title"]);
	assert.equal(leftWith(left, ["title"]), left);
	assert.deepEqual([...leftWith(left, ["title", "count"])], ["title", "count"]);
});

const emptying = {
	type: "object",
	properties: {
		maybe: { anyOf: [{ type: "string" }, { type: "null" }] },
		many: { type: "array", items: { type: "string", enum: ["a", "b"] } },
		typed: { type: "string" },
		count: { type: "number" },
		flag: { type: "boolean" },
	},
	required: ["maybe", "many", "typed", "count"],
};
const emptiedOf = (key: string, hint?: "lines") =>
	emptied(derive(emptying, key, hint));

test("an emptied field sends what its shape holds, or says why it sends nothing", () => {
	assert.deepEqual(emptiedOf("maybe"), { value: null });
	assert.deepEqual(emptiedOf("many"), { value: [] });
	assert.deepEqual(emptiedOf("many", "lines"), { value: [] });
	assert.deepEqual(emptiedOf("typed"), { value: "" });
	assert.equal(emptiedOf("count"), "required");
	assert.equal(emptiedOf("flag"), "absent");
});

test("a blank word leaves a name the values do not own as the blank, an inherited one included", () => {
	assert.equal(
		filled("{constructor} of {at}", { at: "2" }),
		"{constructor} of 2",
	);
	assert.equal(filled("{toString}", {}), "{toString}");
});
