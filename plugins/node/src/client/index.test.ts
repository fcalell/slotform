import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { z } from "zod";
import { defineChannel } from "../ws/index.ts";
import {
	CONNECT_TIMEOUT_MS,
	createWsClient,
	MIN_UPTIME_MS,
	PING_TIMEOUT_MS,
	SEND_QUEUE_MAX,
} from "./index.ts";

type Listener = (event: { code?: number; data?: unknown }) => void;

class FakeSocket {
	static readonly OPEN = 1;
	static all: FakeSocket[] = [];
	readyState = 0;
	sent: string[] = [];
	closes = 0;
	private listeners = new Map<string, Listener[]>();
	readonly url: string;
	constructor(url: string) {
		this.url = url;
		FakeSocket.all.push(this);
	}
	addEventListener(type: string, listener: Listener): void {
		this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
	}
	send(data: string): void {
		this.sent.push(data);
	}
	close(): void {
		this.closes += 1;
	}
	emit(type: string, event: { code?: number; data?: unknown } = {}): void {
		if (type === "open") this.readyState = FakeSocket.OPEN;
		for (const listener of this.listeners.get(type) ?? []) listener(event);
	}
}

const chat = defineChannel("chat", {
	server: { said: z.string() },
	client: { say: z.string() },
});

const realWebSocket = globalThis.WebSocket;
const sockets = () => FakeSocket.all;
const last = () => sockets()[sockets().length - 1] as FakeSocket;
const frames = (socket: FakeSocket) =>
	socket.sent.map((text) => JSON.parse(text));

beforeEach(() => {
	FakeSocket.all = [];
	(globalThis as { WebSocket: unknown }).WebSocket = FakeSocket;
	mock.timers.enable({ apis: ["setTimeout"] });
	// Full jitter at its cap: the delay is the backoff step itself.
	mock.method(Math, "random", () => 1);
});

afterEach(() => {
	mock.timers.reset();
	mock.restoreAll();
	(globalThis as { WebSocket: unknown }).WebSocket = realWebSocket;
});

function open() {
	const client = createWsClient({ url: "ws://x/ws" });
	const sub = client.subscribe(chat, { onMessage: {} });
	last().emit("open");
	return { client, sub };
}

test("a socket still connecting after the timeout is abandoned and retried", () => {
	createWsClient({ url: "ws://x/ws" }).subscribe(chat, { onMessage: {} });
	const first = last();
	mock.timers.tick(CONNECT_TIMEOUT_MS);
	assert.equal(first.closes, 1);
	mock.timers.tick(250);
	assert.equal(sockets().length, 2);
});

test("reconnect abandons a socket that is still connecting", () => {
	const client = createWsClient({ url: "ws://x/ws" });
	client.subscribe(chat, { onMessage: {} });
	const first = last();
	client.reconnect();
	assert.equal(first.closes, 1);
	assert.equal(sockets().length, 2);
});

test("the backoff resets only after the socket stayed open", () => {
	open();
	const first = last();
	first.emit("close", { code: 1006 });
	mock.timers.tick(250);
	last().emit("open");
	last().emit("close", { code: 1006 });
	// The second drop came before MIN_UPTIME_MS: the delay kept growing.
	mock.timers.tick(250);
	assert.equal(sockets().length, 2);
	mock.timers.tick(250);
	assert.equal(sockets().length, 3);
	last().emit("open");
	mock.timers.tick(MIN_UPTIME_MS);
	last().emit("close", { code: 1006 });
	mock.timers.tick(250);
	assert.equal(sockets().length, 4);
});

test("the delay is jittered below the backoff step", () => {
	mock.method(Math, "random", () => 0.5);
	open();
	last().emit("close", { code: 1006 });
	mock.timers.tick(124);
	assert.equal(sockets().length, 1);
	mock.timers.tick(1);
	assert.equal(sockets().length, 2);
});

test("close code 1008 stops reconnecting until reconnect()", () => {
	const { client } = open();
	last().emit("close", { code: 1008 });
	mock.timers.tick(60_000);
	assert.equal(sockets().length, 1);
	client.reconnect();
	assert.equal(sockets().length, 2);
});

test("a send before the socket opens is queued, bounded, and flushed after the sub frames", () => {
	const client = createWsClient({ url: "ws://x/ws" });
	const sub = client.subscribe(chat, { onMessage: {} });
	for (let i = 0; i < SEND_QUEUE_MAX + 1; i += 1) sub.send("say", String(i));
	last().emit("open");
	const sent = frames(last());
	assert.deepEqual(sent[0], { t: "sub", ch: "chat" });
	assert.equal(sent.length, 1 + SEND_QUEUE_MAX);
	// The oldest was dropped.
	assert.equal(sent[1].payload, "1");
	assert.equal(sent[SEND_QUEUE_MAX].payload, String(SEND_QUEUE_MAX));
});

test("a send after close throws", () => {
	const { client, sub } = open();
	client.close();
	assert.throws(() => sub.send("say", "late"), /closed/);
});

// Runs `run` with page events on the global, keeping each type's listener.
function withPageEvents(run: (listeners: Map<string, () => void>) => void) {
	const listeners = new Map<string, () => void>();
	const target = globalThis as unknown as {
		addEventListener?: (type: string, listener: () => void) => void;
		removeEventListener?: (type: string, listener: () => void) => void;
	};
	target.addEventListener = (type, listener) => listeners.set(type, listener);
	target.removeEventListener = () => {};
	try {
		run(listeners);
	} finally {
		delete target.addEventListener;
		delete target.removeEventListener;
	}
}

test("a probe with no reply drops the socket and reconnects", () => {
	withPageEvents((listeners) => {
		open();
		const first = last();
		listeners.get("online")?.();
		assert.deepEqual(frames(first).at(-1), { t: "ping" });
		mock.timers.tick(PING_TIMEOUT_MS);
		assert.equal(first.closes, 1);
		mock.timers.tick(250);
		assert.equal(sockets().length, 2);
	});
});

test("a reply to the probe keeps the socket", () => {
	withPageEvents((listeners) => {
		open();
		const first = last();
		listeners.get("online")?.();
		assert.deepEqual(frames(first).at(-1), { t: "ping" });
		first.emit("message", { data: JSON.stringify({ t: "pong" }) });
		mock.timers.tick(PING_TIMEOUT_MS * 2);
		assert.equal(first.closes, 0);
		assert.equal(sockets().length, 1);
	});
});

test("a new subscribe reopens a socket whose session ended", () => {
	const { client } = open();
	last().emit("close", { code: 1008 });
	assert.equal(sockets().length, 1);
	client.subscribe(chat, { onMessage: {} });
	assert.equal(sockets().length, 2);
});

test("a frame from a retired socket does not clear the new socket's probe", () => {
	withPageEvents((listeners) => {
		const client = createWsClient({ url: "ws://x/ws" });
		client.subscribe(chat, { onMessage: {} });
		const retired = last();
		client.reconnect();
		const current = last();
		current.emit("open");
		listeners.get("online")?.();
		retired.emit("message", { data: JSON.stringify({ t: "pong" }) });
		mock.timers.tick(PING_TIMEOUT_MS);
		assert.equal(current.closes, 1);
	});
});

test("constructing a client registers no page listener until its socket opens", () => {
	let registered = 0;
	const target = globalThis as unknown as {
		addEventListener?: (type: string, listener: () => void) => void;
		removeEventListener?: (type: string, listener: () => void) => void;
	};
	target.addEventListener = () => {
		registered += 1;
	};
	target.removeEventListener = () => {};
	try {
		const client = createWsClient({ url: "ws://x/ws" });
		assert.equal(registered, 0);
		client.subscribe(chat, { onMessage: {} });
		assert.equal(registered, 1);
	} finally {
		delete target.addEventListener;
		delete target.removeEventListener;
	}
});
