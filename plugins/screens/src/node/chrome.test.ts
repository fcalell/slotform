import assert from "node:assert/strict";
import { test } from "node:test";
import { Cdp, findChrome, NO_CHROME } from "./chrome.ts";

const on =
	(...paths: string[]) =>
	(path: string) =>
		paths.includes(path);

test("CHROME_PATH wins when it is an executable", () => {
	assert.equal(
		findChrome({ CHROME_PATH: "/x/chrome", PATH: "/bin" }, on("/x/chrome")),
		"/x/chrome",
	);
});

test("a CHROME_PATH that is no executable is one line naming it", () => {
	assert.throws(
		() => findChrome({ CHROME_PATH: "/nope" }, on()),
		(error: Error) =>
			error.message.includes("CHROME_PATH /nope") &&
			!error.message.includes("\n"),
	);
});

test("PATH is searched for chromium, then google-chrome", () => {
	const env = { PATH: "/a:/b" };
	assert.equal(
		findChrome(env, on("/b/chromium", "/a/google-chrome")),
		"/b/chromium",
	);
	assert.equal(
		findChrome(env, on("/b/google-chrome-stable")),
		"/b/google-chrome-stable",
	);
});

test("no Chrome is one actionable line", () => {
	assert.throws(() => findChrome({ PATH: "/a" }, on()), new Error(NO_CHROME));
	assert.equal(NO_CHROME.includes("\n"), false);
});

// Chrome's end of the socket: it opens at once, and the test speaks for it.
class FakeSocket extends EventTarget {
	static last: FakeSocket;
	constructor() {
		super();
		FakeSocket.last = this;
		queueMicrotask(() => this.dispatchEvent(new Event("open")));
	}
	send(): void {}
	close(): void {}
	speak(message: object): void {
		this.dispatchEvent(
			new MessageEvent("message", { data: JSON.stringify(message) }),
		);
	}
}

// Cdp uses only the open, message events, send and close the fake has.
const fakeSocket = FakeSocket as unknown as typeof WebSocket;

test("a crashed tab fails its pending calls at once and every call after; other tabs go on", async (t) => {
	t.mock.property(globalThis, "WebSocket", fakeSocket);
	const cdp = await Cdp.connect("ws://chrome");
	const pending = cdp.send("Page.captureScreenshot", {}, { sessionId: "a" });
	const other = cdp.send(
		"Runtime.evaluate",
		{},
		{ sessionId: "b", timeout: 50 },
	);
	FakeSocket.last.speak({ method: "Inspector.targetCrashed", sessionId: "a" });
	await assert.rejects(pending, /Page.captureScreenshot: the tab crashed/);
	await assert.rejects(
		cdp.send("Runtime.evaluate", {}, { sessionId: "a" }),
		/Runtime.evaluate: the tab crashed/,
	);
	assert.equal(cdp.ended("b"), undefined);
	await assert.rejects(other, /timed out/);
});

test("a detached tab fails its pending calls at once", async (t) => {
	t.mock.property(globalThis, "WebSocket", fakeSocket);
	const cdp = await Cdp.connect("ws://chrome");
	const pending = cdp.send("Runtime.evaluate", {}, { sessionId: "a" });
	FakeSocket.last.speak({
		method: "Target.detachedFromTarget",
		params: { sessionId: "a" },
	});
	await assert.rejects(pending, /Runtime.evaluate: the tab closed/);
});
