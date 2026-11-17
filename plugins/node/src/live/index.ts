import { holdOf, read } from "@fcalell/plugin-query/read";
import type { Read } from "@fcalell/ui-core/read";
import type { QueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { PAUSE_AFTER, type WsClient } from "../client/index.ts";
import type { ChannelDef, MessageSchemas } from "../ws/index.ts";

// A channel as a read: docs/architecture/plugins/node.md, "Channels".

// One handler per message type; a type without one is ignored. The first
// value a handler returns is the read's first data (the snapshot). A handler
// that throws fails the read: an error with data is stale. `client` lets a
// frame write another read's key.
export type Fold<S extends MessageSchemas, T> = {
	[K in keyof S]?: (
		value: T | undefined,
		payload: z.output<S[K]>,
		ctx: { client: QueryClient },
	) => T | undefined;
};

export function channelRead<
	S extends MessageSchemas,
	C extends MessageSchemas,
	T,
>(ws: WsClient, def: ChannelDef<S, C>, fold: Fold<S, T>): Read<T> {
	const queryKey = ["ws", def.name];
	return read<T>(
		{
			queryKey,
			queryFn: ({ client, signal }) =>
				new Promise<T>((settle, fail) => {
					// The query is found, not held: `setState` is TanStack's own way
					// to move a fetch (its `streamedQuery` resets one the same way).
					const query = () =>
						client.getQueryCache().find({ queryKey, exact: true });
					let timer: ReturnType<typeof setTimeout> | undefined;
					// A first load's write waits for the minimum hold: the value so far
					// is `unwritten`, and `due` is the timer that writes it once.
					const began = Date.now();
					let loading = client.getQueryData<T>(queryKey) === undefined;
					let unwritten: T | undefined;
					let due: ReturnType<typeof setTimeout> | undefined;
					// The fold is keyed by message type at run time: Object.entries drops
					// each type's payload type, which its schema has already parsed.
					const onMessage: Record<string, (payload: never) => void> = {};
					for (const [type, handler] of Object.entries(
						fold as Record<string, NonNullable<Fold<S, T>[string]>>,
					)) {
						onMessage[type] = (payload) => {
							try {
								const next = handler(
									unwritten ?? client.getQueryData<T>(queryKey),
									payload,
									{ client },
								);
								if (next !== undefined && loading) {
									const wait = holdOf(client, Date.now() - began);
									if (due !== undefined || wait > 0) {
										unwritten = next;
										due ??= setTimeout(() => {
											due = undefined;
											loading = false;
											client.setQueryData(queryKey, unwritten);
											unwritten = undefined;
										}, wait);
										return;
									}
									loading = false;
								}
								// A write undefined is a no-op. It writes data while the fetch
								// stays open, so the first one makes the read ready.
								client.setQueryData(queryKey, next);
							} catch (error) {
								end();
								fail(error);
							}
						};
					}

					// A retry on a socket in its backoff tries it now.
					ws.reconnect();
					const sub = ws.subscribe(def, {
						onMessage: onMessage as never,
						onStatus(status) {
							if (status === "open") {
								clearTimeout(timer);
								timer = undefined;
								if (query()?.state.fetchStatus === "paused") {
									query()?.setState({ fetchStatus: "fetching" });
								}
								return;
							}
							timer ??= setTimeout(
								() => query()?.setState({ fetchStatus: "paused" }),
								PAUSE_AFTER,
							);
						},
					});
					function end(): void {
						clearTimeout(timer);
						clearTimeout(due);
						signal.removeEventListener("abort", onAbort);
						sub.unsubscribe();
					}
					function onAbort(): void {
						end();
						// TanStack has cancelled the fetch and ignores what settles it.
						settle(client.getQueryData<T>(queryKey) as T);
					}
					signal.addEventListener("abort", onAbort);
				}),
			staleTime: Number.POSITIVE_INFINITY,
			retry: false,
		},
		{ kind: "stream" },
	);
}
