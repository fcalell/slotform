import assert from "node:assert/strict";
import { test } from "node:test";
import { lockIsStale, parseState, runsProfile, stateDir } from "./browser.ts";

test("the state lives in the runtime dir, else the OS tmp dir", () => {
	assert.equal(
		stateDir({ XDG_RUNTIME_DIR: "/run/user/1" }),
		"/run/user/1/stack",
	);
	assert.match(stateDir({}), /stack$/);
});

test("a state file needs a port and a pid", () => {
	assert.deepEqual(parseState('{"port":9,"pid":4}'), { port: 9, pid: 4 });
	assert.deepEqual(parseState('{"port":9,"pid":4,"kept":true}'), {
		port: 9,
		pid: 4,
		kept: true,
	});
	assert.equal(parseState('{"port":9}'), undefined);
	assert.equal(parseState("not json"), undefined);
});

test("a lock is stale when its owner is gone", () => {
	assert.equal(
		lockIsStale("42", 0, () => false),
		true,
	);
	assert.equal(
		lockIsStale("42", 99_999, () => true),
		false,
	);
});

test("a lock without a pid yet is stale only past its grace", () => {
	assert.equal(
		lockIsStale("", 500, () => true),
		false,
	);
	assert.equal(
		lockIsStale("", 20_000, () => true),
		true,
	);
});

test("a stale pid is the profile's Chrome only when its command line names the profile", () => {
	const profile = "/run/user/1/stack/chrome-profile";
	assert.equal(
		runsProfile(
			`/bin/chromium --headless=new --user-data-dir=${profile} about:blank\n`,
			profile,
		),
		true,
	);
	// The pid recycled to an unrelated process of the same user.
	assert.equal(runsProfile("/usr/bin/vim notes.md\n", profile), false);
	// A pid that is gone: ps prints nothing.
	assert.equal(runsProfile("", profile), false);
	assert.equal(
		runsProfile(`/bin/chromium --user-data-dir=${profile}-other`, profile),
		false,
	);
	// A profile path with a space (a macOS tmp dir may hold one).
	const spaced = "/tmp/My Dir/stack/chrome-profile";
	assert.equal(
		runsProfile(`/bin/chromium --user-data-dir=${spaced} about:blank`, spaced),
		true,
	);
});
