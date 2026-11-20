import assert from "node:assert/strict";
import { test } from "node:test";
import { ORPCError } from "@orpc/client";
import { Unreached } from "@slotform/ui-core/acts";
import { refusal, retries } from "./acts.ts";

const answered = (status: number) =>
	new ORPCError("FAILED", { status, message: "Not now." });

test("a refusal the server answered is not run again", () => {
	for (const status of [400, 401, 403, 404, 409, 422]) {
		assert.equal(retries(answered(status)), false, String(status));
	}
});

test("a fault, a timeout or a rate limit is run again", () => {
	for (const status of [408, 429, 500, 502, 503]) {
		assert.equal(retries(answered(status)), true, String(status));
	}
	assert.equal(retries(new TypeError("Failed to fetch")), true);
});

test("a connection known to be out is the banner's", () => {
	assert.equal(retries(new Unreached()), false);
});

test("a refusal reads as the server worded it, for a 4xx no other screen says", () => {
	assert.equal(refusal(answered(409)), "Not now.");
	assert.equal(
		refusal(new ORPCError("CONFLICT", { message: "that name is taken" })),
		"That name is taken.",
	);
	for (const status of [401, 403, 404, 429, 500]) {
		assert.equal(refusal(answered(status)), undefined, String(status));
	}
	assert.equal(refusal(new TypeError("Failed to fetch")), undefined);
});

test("a blank message or the code's stock text is no refusal", () => {
	assert.equal(
		refusal(new ORPCError("CONFLICT", { status: 409, message: "  " })),
		undefined,
	);
	assert.equal(refusal(new ORPCError("CONFLICT")), undefined);
});

test("a refusal of the input is the schema's first issue", () => {
	const error = new ORPCError("BAD_REQUEST", {
		data: {
			issues: [
				{ message: "enter a name", path: ["name"] },
				{ message: "Too long", path: [{ key: "note" }] },
			],
		},
	});
	assert.equal(refusal(error), "Enter a name.");
});
