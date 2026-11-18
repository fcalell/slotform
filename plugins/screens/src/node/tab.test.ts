import assert from "node:assert/strict";
import { test } from "node:test";
import { busyRequests, HELD_MS, type OpenRequest, Tab } from "./tab.ts";

const request = (over: Partial<OpenRequest>): OpenRequest => ({
	type: "Fetch",
	mime: "",
	headersAt: 0,
	...over,
});

test("a request awaiting its headers keeps the page busy", () => {
	assert.equal(busyRequests([request({})], 99_999), 1);
});

test("a response just started keeps it busy, and a held one does not", () => {
	const now = 10_000;
	const fresh = request({ headersAt: now - 100, mime: "application/json" });
	const held = request({ headersAt: now - HELD_MS, mime: "application/json" });
	assert.equal(busyRequests([fresh], now), 1);
	assert.equal(busyRequests([held], now), 0);
});

test("an event stream or an EventSource never counts", () => {
	const now = 10_000;
	const stream = request({ headersAt: now, mime: "text/event-stream" });
	const source = request({ type: "EventSource" });
	assert.equal(busyRequests([stream, source, request({})], now), 1);
});

// A tab over a recording Cdp: the input events it sends, in order.
async function recorded(touch: boolean) {
	const sent: { method: string; params: unknown }[] = [];
	const cdp = {
		send: async (method: string, params: unknown) => {
			sent.push({ method, params });
		},
		on: () => () => {},
	};
	// The fake has only the part of Cdp a Tab calls.
	const tab = await Tab.open(cdp as never, "session", "target");
	tab.touch = touch;
	// Only what the test sends: not the events `open` enables.
	sent.length = 0;
	return { tab, sent };
}

test("rest moves the pointer off the page, so no hover or tooltip carries over a width", async () => {
	const { tab, sent } = await recorded(false);
	await tab.click(40, 50);
	await tab.rest();
	const last = sent.at(-1);
	assert.equal(last?.method, "Input.dispatchMouseEvent");
	assert.deepEqual(last?.params, { type: "mouseMoved", x: -1, y: -1 });
});

test("rest sends nothing to a touch tab, which has no pointer", async () => {
	const { tab, sent } = await recorded(true);
	await tab.rest();
	assert.equal(sent.length, 0);
});

// A tab over a Cdp that answers `Page.navigate` with `reply` and lets the test
// fire the tab's events.
function navigating(reply: object, ended?: string) {
	const handlers: {
		method: string;
		handler: (p: unknown, s: string) => void;
	}[] = [];
	const cdp = {
		send: async (method: string) => (method === "Page.navigate" ? reply : {}),
		on: (method: string, handler: (p: unknown, s: string) => void) => {
			const entry = { method, handler };
			handlers.push(entry);
			return () => handlers.splice(handlers.indexOf(entry), 1);
		},
		ended: () => ended,
	};
	const fire = (method: string, params: unknown) => {
		for (const entry of handlers)
			if (entry.method === method) entry.handler(params, "session");
	};
	// The fake has only the part of Cdp a Tab calls.
	return { cdp: cdp as never, fire, handlers };
}

test("a same-document goto (no loaderId) is done at the reply, with no load event", async () => {
	const { cdp } = navigating({ frameId: "f" });
	const tab = await Tab.open(cdp, "session", "target");
	await tab.goto("http://x/page#top", 200);
});

test("goto waits for its own document's load, not another one's", async () => {
	const { cdp, fire } = navigating({ frameId: "f", loaderId: "new" });
	const tab = await Tab.open(cdp, "session", "target");
	let done = false;
	const going = tab.goto("http://x/next", 2000).then(() => {
		done = true;
	});
	fire("Page.lifecycleEvent", { loaderId: "old", name: "load" });
	await new Promise((resolve) => setTimeout(resolve, 120));
	assert.equal(done, false);
	fire("Page.lifecycleEvent", { loaderId: "new", name: "load" });
	await going;
});

test("goto on a crashed tab fails at once, naming the crash", async () => {
	const { cdp } = navigating(
		{ frameId: "f", loaderId: "new" },
		"the tab crashed",
	);
	const tab = await Tab.open(cdp, "session", "target");
	await assert.rejects(tab.goto("http://x/next", 30_000), /the tab crashed/);
});

test("a closed tab leaves no handler on the shared connection", async () => {
	const { cdp, handlers } = navigating({ frameId: "f" });
	const tab = await Tab.open(cdp, "session", "target");
	assert.notEqual(handlers.length, 0);
	await tab.close();
	assert.equal(handlers.length, 0);
});
