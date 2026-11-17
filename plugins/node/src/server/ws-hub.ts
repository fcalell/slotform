import type { z } from "zod";
import type {
	ChannelDef,
	ClientFrame,
	MessageSchemas,
	ServerFrame,
} from "../ws/index.ts";
import { clientFrameSchema, SESSION_ENDED } from "../ws/index.ts";
import type { ServiceLogger } from "./log.ts";

// The slice of a live socket the hub needs. Structurally satisfied by
// @hono/node-server's WSContext; the object's identity keys subscriptions.
export interface HubSocket {
	send(data: string): void;
	close(code?: number, reason?: string): void;
	readyState: number;
	// The upgrade's `ws` socket: the hub reads its send buffer and its liveness.
	raw?: unknown;
}

// What of a `ws` socket the hub reads. `raw` is this on every socket
// @hono/node-server hands over; its `WebSocketLike` type omits it.
interface RawSocket {
	bufferedAmount: number;
	terminate(): void;
	ping(): void;
	on(event: "pong", listener: () => void): void;
}

// A socket the server hands over always has its `ws` socket; WSContext types
// it optional.
function rawOf(socket: HubSocket): RawSocket {
	if (!socket.raw) throw new Error("ws: socket has no raw ws socket");
	return socket.raw as RawSocket;
}

// How often the hub pings every open socket: one that has answered nothing
// since the last sweep is dead and terminated, so a client that vanished
// without a close (no wifi, no FIN) stops being present and stops receiving
// broadcasts.
export const IDLE_SWEEP_MS = 30_000;

// A socket with more than this queued unsent is a stalled link: it is
// terminated, and the client reconnects and is snapshotted again.
export const MAX_BUFFERED_BYTES = 4 * 1024 * 1024;

const OPEN = 1;

const PONG = JSON.stringify({ t: "pong" } satisfies ServerFrame);

// Who opened the socket, as the app's auth resolved it from the upgrade
// request's cookie: better-auth's `getSession` answer, shaped like
// `AuthApi.getSession` (plugin-auth), which this package cannot import.
export interface ConnectionSession {
	user: Record<string, unknown>;
	session: Record<string, unknown>;
}

export interface ChannelConnection<S extends MessageSchemas> {
	// Stable for the socket's life: what a handler keys per-connection
	// state on (presence, a watch), the same across every message and the
	// unsubscribe.
	id: string;
	// The session the socket was opened with, fixed at the upgrade, null only when the app has no auth.
	// Connection sessions: docs/architecture/plugins/node.md, "Channels".
	readonly session: ConnectionSession | null;
	send<K extends keyof S & string>(type: K, payload: z.input<S[K]>): void;
}

export interface ChannelHandlers<
	S extends MessageSchemas,
	C extends MessageSchemas,
> {
	// Runs per subscribing connection — the snapshot-on-subscribe hook.
	onSubscribe?(conn: ChannelConnection<S>): void | Promise<void>;
	// Runs once when a subscribed connection unsubscribes or its socket
	// closes, so per-connection state never outlives the socket.
	onUnsubscribe?(conn: ChannelConnection<S>): void | Promise<void>;
	onMessage?: {
		[K in keyof C]?: (
			payload: z.output<C[K]>,
			conn: ChannelConnection<S>,
		) => void | Promise<void>;
	};
}

export interface ChannelHandle<S extends MessageSchemas> {
	broadcast<K extends keyof S & string>(type: K, payload: z.input<S[K]>): void;
}

export interface WsHub {
	channel<S extends MessageSchemas, C extends MessageSchemas>(
		def: ChannelDef<S, C>,
		handlers?: ChannelHandlers<S, C>,
	): ChannelHandle<S>;
	// Closes every socket opened with the session whose id this is (its
	// `session.id`), unsubscribing it from each channel first. For a session
	// the app ends outside auth's own endpoints (a row deleted by hand); one
	// auth ends closes its sockets by itself.
	closeSession(sessionId: string): void;
}

interface RegisteredChannel {
	def: ChannelDef;
	handlers: ChannelHandlers<MessageSchemas, MessageSchemas>;
	sockets: Set<HubSocket>;
}

interface WsHubInternal {
	hub: WsHub;
	// Starts the idle sweep; the returned function stops it.
	startSweep(): () => void;
	// The per-connection event handlers create-node-server hands to
	// upgradeWebSocket. Own minimal shape so this module never imports hono.
	connectionHandlers(session: ConnectionSession | null): {
		onOpen(event: unknown, ws: HubSocket): void;
		onMessage(event: { data: unknown }, ws: HubSocket): void;
		onClose(event: unknown, ws: HubSocket): void;
		onError(event: unknown, ws: HubSocket): void;
	};
}

export function createWsHub(log: ServiceLogger): WsHubInternal {
	const channels = new Map<string, RegisteredChannel>();
	const open = new Map<HubSocket, ConnectionSession | null>();
	const ids = new WeakMap<HubSocket, string>();
	const tails = new WeakMap<HubSocket, Promise<void>>();
	// Sockets that answered (a pong or any frame) since the last sweep.
	const alive = new WeakSet<HubSocket>();
	let nextId = 0;
	function idOf(socket: HubSocket): string {
		let id = ids.get(socket);
		if (id === undefined) {
			nextId += 1;
			id = `c${nextId}`;
			ids.set(socket, id);
		}
		return id;
	}

	function deliver(socket: HubSocket, frame: string): void {
		if (rawOf(socket).bufferedAmount > MAX_BUFFERED_BYTES) {
			rawOf(socket).terminate();
			return;
		}
		socket.send(frame);
	}

	function frameFor(ch: string, type: string, payload: unknown): string {
		const frame: ServerFrame = { t: "msg", ch, type, payload };
		return JSON.stringify(frame);
	}

	function connectionFor(
		registered: RegisteredChannel,
		socket: HubSocket,
		session: ConnectionSession | null,
	): ChannelConnection<MessageSchemas> {
		return {
			id: idOf(socket),
			session,
			send(type, payload) {
				const schema = registered.def.server[type];
				if (!schema) {
					throw new Error(
						`ws channel ${registered.def.name}: unknown server message type "${String(type)}"`,
					);
				}
				deliver(
					socket,
					frameFor(registered.def.name, type, schema.parse(payload)),
				);
			},
		};
	}

	const hub: WsHub = {
		channel(def, handlers = {}) {
			if (channels.has(def.name)) {
				throw new Error(`ws channel ${def.name}: already registered`);
			}
			// The registry holds channels of every schema: the generics are erased
			// here, and each frame is parsed by its own channel's schemas.
			const registered: RegisteredChannel = {
				def: def as ChannelDef,
				handlers: handlers as ChannelHandlers<MessageSchemas, MessageSchemas>,
				sockets: new Set(),
			};
			channels.set(def.name, registered);
			return {
				broadcast(type, payload) {
					const schema = def.server[type];
					if (!schema) {
						throw new Error(
							`ws channel ${def.name}: unknown server message type "${String(type)}"`,
						);
					}
					const frame = frameFor(def.name, type, schema.parse(payload));
					for (const socket of registered.sockets) {
						if (socket.readyState === OPEN) deliver(socket, frame);
					}
				},
			};
		},
		closeSession(sessionId) {
			for (const [socket, session] of open) {
				if (session?.session.id !== sessionId) continue;
				open.delete(socket);
				dropSocket(socket, session);
				socket.close(SESSION_ENDED.code, SESSION_ENDED.reason);
			}
		},
	};

	function unsubscribe(
		registered: RegisteredChannel,
		socket: HubSocket,
		session: ConnectionSession | null,
	): void {
		if (!registered.sockets.delete(socket)) return;
		void Promise.resolve(
			registered.handlers.onUnsubscribe?.(
				connectionFor(registered, socket, session),
			),
		).catch((error) => {
			log.error(
				`ws channel ${registered.def.name}: onUnsubscribe failed: ${String(error)}`,
			);
		});
	}

	function dropSocket(
		socket: HubSocket,
		session: ConnectionSession | null,
	): void {
		for (const registered of channels.values()) {
			unsubscribe(registered, socket, session);
		}
	}

	function parseFrame(raw: unknown): ClientFrame | null {
		if (typeof raw !== "string") return null;
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			log.error("ws: dropped non-JSON frame");
			return null;
		}
		const frame = clientFrameSchema.safeParse(parsed);
		if (!frame.success) {
			log.error("ws: dropped malformed frame");
			return null;
		}
		return frame.data;
	}

	async function handleFrame(
		frame: Exclude<ClientFrame, { t: "ping" }>,
		socket: HubSocket,
		session: ConnectionSession | null,
	): Promise<void> {
		// Queued behind a slow handler, the frame may find its socket closed.
		if (!open.has(socket)) return;
		const registered = channels.get(frame.ch);
		if (!registered) {
			log.error(`ws: dropped frame for unknown channel "${frame.ch}"`);
			return;
		}
		if (frame.t === "sub") {
			registered.sockets.add(socket);
			await registered.handlers.onSubscribe?.(
				connectionFor(registered, socket, session),
			);
			return;
		}
		if (frame.t === "unsub") {
			unsubscribe(registered, socket, session);
			return;
		}
		const handler = registered.handlers.onMessage?.[frame.type];
		const schema = registered.def.client[frame.type];
		if (!handler || !schema) {
			log.error(
				`ws channel ${frame.ch}: dropped unknown client message type "${frame.type}"`,
			);
			return;
		}
		const payload = schema.safeParse(frame.payload);
		if (!payload.success) {
			log.error(
				`ws channel ${frame.ch}: dropped invalid "${frame.type}" payload`,
			);
			return;
		}
		await handler(payload.data, connectionFor(registered, socket, session));
	}

	return {
		hub,
		startSweep() {
			const timer = setInterval(() => {
				for (const socket of open.keys()) {
					if (alive.delete(socket)) rawOf(socket).ping();
					else rawOf(socket).terminate();
				}
			}, IDLE_SWEEP_MS);
			timer.unref();
			return () => clearInterval(timer);
		},
		connectionHandlers: (session) => ({
			onOpen(_event, ws) {
				open.set(ws, session);
				alive.add(ws);
				rawOf(ws).on("pong", () => alive.add(ws));
			},
			onMessage(event, ws) {
				alive.add(ws);
				const frame = parseFrame(event.data);
				if (!frame) return;
				// Answered ahead of the queue, so a slow handler never reads as a dead socket.
				if (frame.t === "ping") {
					ws.send(PONG);
					return;
				}
				// One socket's frames run in the order they arrived: an `unsub` never
				// overtakes the `sub` whose `onSubscribe` is still running.
				const queued = (tails.get(ws) ?? Promise.resolve())
					.then(() => handleFrame(frame, ws, session))
					.catch((error) => {
						log.error(`ws: handler failed: ${String(error)}`);
					});
				tails.set(ws, queued);
			},
			onClose(_event, ws) {
				open.delete(ws);
				dropSocket(ws, session);
			},
			onError(_event, ws) {
				open.delete(ws);
				dropSocket(ws, session);
			},
		}),
	};
}
