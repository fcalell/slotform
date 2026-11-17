import assert from "node:assert/strict";
import { test } from "node:test";
import { createTenancy } from "./tenancy.ts";

// `can` reads only the roles, so no database is needed.
const { can } = createTenancy(null, {
	admin: { task: ["read", "update"] },
	member: {},
});

test("can grants what a role holds", () => {
	assert.equal(can("admin", { task: ["read"] }), true);
	assert.equal(can("admin", { task: ["read", "update"] }), true);
	assert.equal(can("admin", { task: ["delete"] }), false);
});

test("can refuses a request with no actions", () => {
	assert.equal(can("admin", {}), false);
	assert.equal(can("admin", { task: [] }), false);
	assert.equal(can("admin", { task: ["read"], note: [] }), false);
	assert.equal(can("member", {}), false);
	assert.equal(can("nobody", { task: [] }), false);
});
