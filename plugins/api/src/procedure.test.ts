import assert from "node:assert/strict";
import { test } from "node:test";
import { createProcedure, noSuch, type ProcedureConfig } from "./procedure.ts";
import { routerSchema } from "./schema.ts";

test("a scope's refusal is a NOT_FOUND naming the scope in lower-case words", () => {
	const said = (name: string) => noSuch({ name }).message;
	assert.equal(noSuch({ name: "project" }).code, "NOT_FOUND");
	assert.equal(said("project"), "No such project");
	assert.equal(said("lineItem"), "No such line item");
	assert.equal(said("line_item"), "No such line item");
	assert.equal(said("LineItem"), "No such line item");
	assert.equal(said("apiKeyV2"), "No such api key v2");
	assert.equal(said("HTTPServer"), "No such http server");
});

test("an rbac request names at least one action", () => {
	type Statements = { task: readonly ["read", "update"] };
	type Request = NonNullable<ProcedureConfig<Statements>["rbac"]>;
	const named: Request = ["task", ["read"]];
	// @ts-expect-error an empty action list is refused at the type
	const empty: Request = ["task", []];
	assert.deepEqual([named[0], empty[0]], ["task", "task"]);
});

test("a bare handler is a mutation", () => {
	const procedure = createProcedure<Record<string, unknown>>();
	const schema = routerSchema({ save: procedure().handler(() => "saved") });
	assert.equal(schema.save?.kind, "mutation");
});

test("a sort without pagination is refused", () => {
	const procedure = createProcedure<Record<string, unknown>>();
	assert.throws(
		() => procedure({ sort: ["title"] }),
		/`sort` needs `paginated`/,
	);
});
