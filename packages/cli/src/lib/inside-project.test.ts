import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { insideProject, leaves } from "./inside-project.ts";

const cwd = resolve("/tmp/proj");

test("a path inside the project resolves against it", () => {
	assert.equal(insideProject(cwd, "src/app"), resolve(cwd, "src/app"));
	assert.equal(insideProject(cwd, "./a/../b.ts"), resolve(cwd, "b.ts"));
	assert.equal(insideProject(cwd, "..foo"), resolve(cwd, "..foo"));
});

test("the root, a parent, an escape and an absolute path outside are refused", () => {
	for (const bad of [
		"",
		".",
		"..",
		"../x",
		"a/../../x",
		"/etc/passwd",
		resolve("/tmp/proj-other/x"),
	]) {
		assert.throws(
			() => insideProject(cwd, bad),
			{ code: "PATH_OUTSIDE_PROJECT", message: /is not inside the project/ },
			bad,
		);
	}
});

test("a relative path leaves its directory only through a `..` segment", () => {
	assert.equal(leaves(".."), true);
	assert.equal(leaves(join("..", "x")), true);
	assert.equal(leaves(resolve("/elsewhere")), true);
	assert.equal(leaves(join("..foo", "app")), false);
	assert.equal(leaves("src"), false);
});

test("an absolute path inside the project is accepted", () => {
	assert.equal(insideProject(cwd, resolve(cwd, "src")), resolve(cwd, "src"));
});
