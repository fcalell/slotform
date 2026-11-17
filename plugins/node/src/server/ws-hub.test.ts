import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { z } from "zod";
import { defineChannel } from "../ws/index.ts";
import {
	createWsHub,
	type HubSocket,
	IDLE_SWEEP_MS,
	MAX_BUFFERED_BYTES,
} from "./ws-hub.ts";

const log = { info() {}, error() {} };

const room = defineChannel("room", {
	server: { said: z.string() },
	client: { say: z.string() },
});

function fakeSocket(bufferedAmount = 0, terminate = () => {}) {
	const sent: unknown[] = [];
	const state = { pings: 0, pong: () => {} };
	const socket: HubSocket = {
		readyState: 1,
		raw: {
			bufferedAmount,
			terminate,
			ping() {
				state.pings += 1;
			},
			on(_event: "pong", listener: () => void) {
				state.pong = listener;
			},
		},
		send: (data) => {
			sent.push(JSON.parse(data));
		},
		close() {},
	};
	return { socket, sent, state };
}

const frame = (value: unknown) => ({ data: JSON.stringify(value) });
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("a ping is answered at once, ahead of a slow handler", () => {
	const { hub, connectionHandlers } = createWsHub(log);
	hub.channel(room, { onSubscribe: () => new Promise(() => {}) });
	const handlers = connectionHandlers(null);
	const { socket, sent } = fakeSocket();
	handlers.onOpen({}, socket);
	handlers.onMessage(frame({ t: "sub", ch: "room" }), socket);
	handlers.onMessage(frame({ t: "ping" }), socket);
	assert.deepEqual(sent, [{ t: "pong" }]);
});

test("one socket's frames run in order: an unsub waits for the sub's onSubscribe", async () => {
	const { hub, connectionHandlers } = createWsHub(log);
	const order: string[] = [];
	hub.channel(room, {
		async onSubscribe() {
			order.push("subscribe:start");
			await settle();
			order.push("subscribe:end");
		},
		onUnsubscribe() {
			order.push("unsubscribe");
		},
	});
	const handlers = connectionHandlers(null);
	const { socket } = fakeSocket();
	handlers.onOpen({}, socket);
	handlers.onMessage(frame({ t: "sub", ch: "room" }), socket);
	handlers.onMessage(frame({ t: "unsub", ch: "room" }), socket);
	await settle();
	await settle();
	assert.deepEqual(order, ["subscribe:start", "subscribe:end", "unsubscribe"]);
});

test("a sub queued behind a slow handler does not revive a socket that closed", async () => {
	const { hub, connectionHandlers } = createWsHub(log);
	const handle = hub.channel(room, {
		onSubscribe: (conn) => {
			subscribed.push(conn.id);
			if (subscribed.length === 1)
				return new Promise<void>((r) => (release = r));
		},
	});
	const subscribed: string[] = [];
	let release = () => {};
	const handlers = connectionHandlers(null);
	const { socket, sent } = fakeSocket();
	handlers.onOpen({}, socket);
	handlers.onMessage(frame({ t: "sub", ch: "room" }), socket);
	handlers.onMessage(frame({ t: "sub", ch: "room" }), socket);
	await settle();
	handlers.onClose({}, socket);
	release();
	await settle();
	await settle();
	// The second sub came after the close: it never ran, and the dead socket is
	// not registered again to receive broadcasts.
	assert.equal(subscribed.length, 1);
	handle.broadcast("said", "hi");
	assert.deepEqual(sent, []);
});

test("a broadcast terminates a socket whose send buffer is over the limit", async () => {
	const { hub, connectionHandlers } = createWsHub(log);
	const handle = hub.channel(room);
	const handlers = connectionHandlers(null);
	let terminated = 0;
	const stalled = fakeSocket(MAX_BUFFERED_BYTES + 1, () => {
		terminated += 1;
	});
	const healthy = fakeSocket();
	for (const { socket } of [stalled, healthy]) {
		handlers.onOpen({}, socket);
		handlers.onMessage(frame({ t: "sub", ch: "room" }), socket);
	}
	await settle();
	handle.broadcast("said", "hi");
	assert.equal(terminated, 1);
	assert.deepEqual(stalled.sent, []);
	assert.deepEqual(healthy.sent, [
		{ t: "msg", ch: "room", type: "said", payload: "hi" },
	]);
});

test("the idle sweep pings a socket that answered and terminates one that did not", () => {
	mock.timers.enable({ apis: ["setInterval"] });
	try {
		const { connectionHandlers, startSweep } = createWsHub(log);
		const handlers = connectionHandlers(null);
		let terminated = 0;
		const quiet = fakeSocket(0, () => {
			terminated += 1;
		});
		const chatty = fakeSocket();
		handlers.onOpen({}, quiet.socket);
		handlers.onOpen({}, chatty.socket);
		const stop = startSweep();
		mock.timers.tick(IDLE_SWEEP_MS);
		assert.deepEqual(
			[quiet.state.pings, chatty.state.pings, terminated],
			[1, 1, 0],
		);
		chatty.state.pong();
		mock.timers.tick(IDLE_SWEEP_MS);
		assert.deepEqual(
			[quiet.state.pings, chatty.state.pings, terminated],
			[1, 2, 1],
		);
		stop();
	} finally {
		mock.timers.reset();
	}
});
