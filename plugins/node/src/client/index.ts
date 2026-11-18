import type { Reach } from "@fcalell/plugin-query/acts";
import { read } from "@fcalell/plugin-query/read";
import type { Read } from "@fcalell/ui-core/read";
import { createStore } from "@fcalell/ui-core/store";
import type { z } from "zod";
import type { ChannelDef, ClientFrame, MessageSchemas } from "../ws/index.ts";
import { SESSION_ENDED, serverFrameSchema } from "../ws/index.ts";

// How long the socket may stay down before the read is paused: long enough
// that a load's connecting and a blink of the network say nothing.
export const PAUSE_AFTER = 2000;

export type WsStatus = "connecting" | "open" | "closed";

export interface SubscriptionHandlers<S extends MessageSchemas> {
	onMessage: {
		[K in keyof S]?: (payload: z.output<S[K]>) => void;
	};
	onStatus?(status: WsStatus): void;
}

export interface Subscription<C extends MessageSchemas> {
	send<K extends keyof C & string>(type: K, payload: z.input<C[K]>): void;
	unsubscribe(): void;
}

// The socket as a read of its own: connecting, open, or lost (down for longer
// than `PAUSE_AFTER`). `answered` is when the server last answered, as an ISO
// time, once it has.
export interface Connection {
	state: "connecting" | "open" | "lost";
	answered: string | undefined;
}

export interface WsClient {
	subscribe<S extends MessageSchemas, C extends MessageSchemas>(
		def: ChannelDef<S, C>,
		handlers: SubscriptionHandlers<S>,
	): Subscription<C>;
	// Tries the socket now, skipping what is left of the backoff and
	// abandoning one still connecting; a no-op while it is open. A retry that
	// keeps every draft, where a reload would lose them. On a client that never
	// connected, or whose session ended, it opens the socket.
	reconnect(): void;
	close(): void;
	// The status read never opens the socket: docs/architecture/plugins/node.md, "Client socket".
	readonly connection: Read<Connection>;
}

interface LiveSubscription {
	def: ChannelDef;
	handlers: SubscriptionHandlers<MessageSchemas>;
}

const BACKOFF_BASE_MS = 250;
const BACKOFF_CAP_MS = 5000;
// A socket still connecting after this is abandoned and retried.
export const CONNECT_TIMEOUT_MS = 4000;
// The backoff resets only for a socket that stayed open this long, so a server
// that accepts and closes at once does not get retried at the base delay.
export const MIN_UPTIME_MS = 5000;
// How long a probe ping waits for any frame before the socket is dropped as dead.
export const PING_TIMEOUT_MS = 2000;
// Sends made while the socket is not open wait here; past the bound the oldest is dropped.
export const SEND_QUEUE_MAX = 100;

// One shared socket per client, reconnecting with backoff: docs/architecture/plugins/node.md, "Client socket".
function defaultUrl(): string {
	// Via globalThis so the module type-checks and loads outside the DOM;
	// only the no-url default actually requires a browser.
	const loc = (globalThis as { location?: { protocol: string; host: string } })
		.location;
	if (!loc) {
		throw new Error("ws client: no url given and no browser location");
	}
	return `${loc.protocol === "https:" ? "wss" : "ws"}://${loc.host}/ws`;
}

export function createWsClient(
	options: {
		url?: string;
		// Request headers for the upgrade, for a client that is no browser: an
		// agent daemon on Node sends `{ authorization: "Bearer <device key>" }`.
		// A browser's WebSocket takes none and ignores them, and signs in with
		// its cookie.
		headers?: Record<string, string>;
	} = {},
): WsClient {
	const url = options.url ?? defaultUrl();

	const subscriptions = new Set<LiveSubscription>();
	let socket: WebSocket | null = null;
	let closed = false;
	let attempt = 0;
	// Set by a 1008 close: docs/architecture/plugins/node.md, "Client socket".
	let ended = false;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let connectTimer: ReturnType<typeof setTimeout> | undefined;
	let uptimeTimer: ReturnType<typeof setTimeout> | undefined;
	let pingTimer: ReturnType<typeof setTimeout> | undefined;
	const queue: string[] = [];
	// What the connection read watches: the socket's last status (none before
	// it first connects) and when it last answered.
	const current = createStore<WsStatus | undefined>(undefined);
	let answered: string | undefined;

	function notify(status: WsStatus): void {
		if (current.get() === "open" && status !== "open") {
			answered = new Date().toISOString();
		}
		current.set(status);
		for (const sub of subscriptions) {
			sub.handlers.onStatus?.(status);
		}
	}

	function sendFrame(frame: ClientFrame): void {
		if (closed) throw new Error("ws client: closed");
		const text = JSON.stringify(frame);
		if (socket && socket.readyState === WebSocket.OPEN) {
			socket.send(text);
			return;
		}
		queue.push(text);
		if (queue.length > SEND_QUEUE_MAX) queue.shift();
	}

	function dispatch(raw: unknown): void {
		if (typeof raw !== "string") return;
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			console.error("ws client: dropped non-JSON frame");
			return;
		}
		const frame = serverFrameSchema.safeParse(parsed);
		if (!frame.success) {
			console.error("ws client: dropped malformed frame");
			return;
		}
		if (frame.data.t === "pong") return;
		// A snapshot for one subscriber is a fresh state for every other.
		for (const sub of subscriptions) {
			if (sub.def.name !== frame.data.ch) continue;
			const schema = sub.def.server[frame.data.type];
			const handler = sub.handlers.onMessage[frame.data.type];
			if (!schema || !handler) continue;
			const payload = schema.safeParse(frame.data.payload);
			if (!payload.success) {
				console.error(
					`ws client: dropped invalid "${frame.data.type}" payload on ${frame.data.ch}`,
				);
				return;
			}
			handler(payload.data);
		}
	}

	const channelsOf = () => new Set([...subscriptions].map((s) => s.def.name));

	function connect(): void {
		if (closed) return;
		watchPage();
		ended = false;
		notify("connecting");
		// Node's WebSocket (undici) takes the upgrade's headers as an init
		// object in place of the protocols; the DOM type has no such overload.
		const ws = options.headers
			? new (
					WebSocket as unknown as new (
						url: string,
						init: { headers: Record<string, string> },
					) => WebSocket
				)(url, { headers: options.headers })
			: new WebSocket(url);
		socket = ws;
		connectTimer = setTimeout(lose, CONNECT_TIMEOUT_MS);
		ws.addEventListener("open", () => {
			if (socket !== ws) return;
			clearTimeout(connectTimer);
			uptimeTimer = setTimeout(() => {
				attempt = 0;
			}, MIN_UPTIME_MS);
			for (const ch of channelsOf()) {
				ws.send(JSON.stringify({ t: "sub", ch }));
			}
			for (const text of queue.splice(0)) ws.send(text);
			notify("open");
		});
		ws.addEventListener("message", (event) => {
			if (socket !== ws) return;
			// Any frame proves the socket answers.
			clearTimeout(pingTimer);
			pingTimer = undefined;
			dispatch(event.data);
		});
		ws.addEventListener("close", (event) => {
			if (socket !== ws) return;
			ended = event.code === SESSION_ENDED.code;
			lose();
		});
	}

	// Lets the current socket go without waiting for its close event, which a
	// dead link may never deliver.
	function retire(): void {
		clearTimeout(connectTimer);
		clearTimeout(uptimeTimer);
		clearTimeout(pingTimer);
		pingTimer = undefined;
		const old = socket;
		socket = null;
		old?.close();
	}

	// The socket is gone: closed, never opened, or a probe went unanswered.
	function lose(): void {
		retire();
		notify("closed");
		scheduleReconnect();
	}

	// An app-level ping, since a browser cannot read protocol pings: a socket
	// that answers nothing is lost.
	function probe(): void {
		if (!socket || socket.readyState !== WebSocket.OPEN || pingTimer) return;
		socket.send(JSON.stringify({ t: "ping" } satisfies ClientFrame));
		pingTimer = setTimeout(lose, PING_TIMEOUT_MS);
	}

	// The page comes back (visible, online): the socket may have died unseen.
	function wake(): void {
		if (socket) probe();
		else if (reconnectTimer) reconnect();
	}

	const page = globalThis as {
		addEventListener?: (type: string, listener: () => void) => void;
		removeEventListener?: (type: string, listener: () => void) => void;
		document?: { visibilityState: string } & Pick<
			EventTarget,
			"addEventListener" | "removeEventListener"
		>;
	};
	const onVisible = () => {
		if (page.document?.visibilityState === "visible") wake();
	};
	// Registered when the first socket opens, so a client made at module level reads no environment.
	let watching = false;
	function watchPage(): void {
		if (watching) return;
		watching = true;
		page.addEventListener?.("online", wake);
		page.document?.addEventListener("visibilitychange", onVisible);
	}

	function scheduleReconnect(): void {
		if (closed || ended || reconnectTimer) return;
		// Full jitter: clients dropped together do not retry together.
		const delay =
			Math.random() * Math.min(BACKOFF_BASE_MS * 2 ** attempt, BACKOFF_CAP_MS);
		attempt += 1;
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			connect();
		}, delay);
	}

	function reconnect(): void {
		if (closed || socket?.readyState === WebSocket.OPEN) return;
		if (reconnectTimer) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
		retire();
		attempt = 0;
		connect();
	}

	// `reach` is handed the data of the read that carries it: this read's.
	const reach: Reach = (data) => (data as Connection).state === "lost";

	const connection = read<Connection>(
		{
			queryKey: ["ws", "connection"],
			queryFn: ({ client, signal }) =>
				new Promise<Connection>((settle) => {
					const key = ["ws", "connection"];
					let timer: ReturnType<typeof setTimeout> | undefined;
					const write = (state: Connection["state"]) =>
						client.setQueryData<Connection>(key, { state, answered });
					// Lost stays until the socket opens: a retry's "connecting" is
					// not an answer.
					const watch = () => {
						const status = current.get();
						if (status === undefined) return;
						if (status === "open") {
							clearTimeout(timer);
							timer = undefined;
							write("open");
							return;
						}
						if (client.getQueryData<Connection>(key)?.state !== "lost") {
							write("connecting");
						}
						timer ??= setTimeout(() => write("lost"), PAUSE_AFTER);
					};
					// Before the socket first connects nothing is down yet.
					if (current.get() === undefined) write("connecting");
					else watch();
					const unwatch = current.subscribe(watch);
					signal.addEventListener("abort", () => {
						clearTimeout(timer);
						unwatch();
						// The key was written above, and its gcTime never expires it.
						settle(client.getQueryData<Connection>(key) as Connection);
					});
				}),
			staleTime: Number.POSITIVE_INFINITY,
			retry: false,
			// Always, so a connection first mounted offline still records `lost`;
			// kept forever, so the guard always finds it.
			networkMode: "always",
			gcTime: Number.POSITIVE_INFINITY,
			meta: { reach },
		},
		{ kind: "stream" },
	);

	return {
		connection,
		subscribe(def, handlers) {
			// The set holds subscriptions of every schema: the generics are erased
			// here, and each frame is parsed by its own channel's schemas.
			const live: LiveSubscription = {
				def: def as ChannelDef,
				handlers: handlers as SubscriptionHandlers<MessageSchemas>,
			};
			subscriptions.add(live);
			if (socket && socket.readyState === WebSocket.OPEN) {
				sendFrame({ t: "sub", ch: def.name });
				handlers.onStatus?.("open");
			} else if (!socket && !reconnectTimer && !closed) {
				// Never connected, or the session ended: this opens it, and says
				// "connecting" to the new subscription with the rest.
				connect();
			} else {
				handlers.onStatus?.(closed ? "closed" : "connecting");
			}
			return {
				send(type, payload) {
					const schema = def.client[type];
					if (!schema) {
						throw new Error(
							`ws client: unknown client message type "${String(type)}" on ${def.name}`,
						);
					}
					sendFrame({
						t: "msg",
						ch: def.name,
						type,
						payload: schema.parse(payload),
					});
				},
				unsubscribe() {
					if (!subscriptions.delete(live)) return;
					if (channelsOf().has(def.name)) return;
					if (socket && socket.readyState === WebSocket.OPEN) {
						sendFrame({ t: "unsub", ch: def.name });
					}
				},
			};
		},
		reconnect,
		close() {
			closed = true;
			page.removeEventListener?.("online", wake);
			page.document?.removeEventListener("visibilitychange", onVisible);
			clearTimeout(connectTimer);
			clearTimeout(uptimeTimer);
			clearTimeout(pingTimer);
			if (reconnectTimer) {
				clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}
			socket?.close();
			socket = null;
		},
	};
}
