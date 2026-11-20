import { isNotFound } from "@slotform/api/client";
import {
	dev,
	heldStandIn,
	type Page,
	placeholderData,
	type Read,
	type ReadHow,
	readOf,
	type SortSchema,
	type WindowPage,
	type WindowState,
} from "@slotform/ui-core/read";
import type {
	Query,
	QueryCache,
	QueryClient,
	QueryFunction,
	QueryFunctionContext,
	QueryKey,
	SkipToken,
	UseQueryOptions,
} from "@tanstack/react-query";
import {
	hashKey,
	skipToken,
	experimental_streamedQuery as streamedQuery,
} from "@tanstack/react-query";
import { READ_KEYS, type ReadKey } from "./read-keys.ts";

// The TanStack half of a read: docs/architecture/plugins/query.md, "Reads".

declare module "@slotform/ui-core/read" {
	interface ReadBinding {
		// No `select` and no `placeholderData`: a leaf adds its own.
		// biome-ignore lint/suspicious/noExplicitAny: a read of any output is one options type (variance)
		readonly options: UseQueryOptions<any, any, any, any>;
	}
}

/** How many pages a window keeps before the farthest from the viewer's are dropped. */
const WINDOW_PAGES = 24;

/** The state with `page` added and, past `WINDOW_PAGES`, the pages farthest from every page in `wanted` dropped (never page 0, nor a wanted one). */
function withPage(
	state: WindowState,
	page: number,
	rows: readonly unknown[],
	wanted: readonly number[],
): WindowState {
	const kept: Record<number, readonly unknown[]> = {
		...state.pages,
		[page]: rows,
	};
	const keys = Object.keys(kept).map(Number);
	const far = (p: number) =>
		Math.min(...wanted.map((w) => Math.abs(w - p)), Number.POSITIVE_INFINITY);
	const droppable = keys
		.filter((p) => p !== 0 && p !== page && !wanted.includes(p))
		.sort((a, b) => far(b) - far(a));
	for (const p of droppable.slice(0, Math.max(0, keys.length - WINDOW_PAGES))) {
		delete kept[p];
	}
	return { ...state, pages: kept };
}

// What is in flight and what failed lately, per client: the table and a more
// row over one read load a page once.
const inflight = new WeakMap<QueryClient, Map<string, Promise<void>>>();
const failed = new WeakMap<QueryClient, Map<string, number>>();
// A page that failed is asked for again after this long (ms), by the next scroll.
const RETRY_AFTER = 2000;

/** Loads the pages of a window read that are not loaded, each once whoever asks, into the read's query. Rejects when one failed; a failed page is not asked for again before `RETRY_AFTER`. A page numbered past the total, or a read with no query yet, loads nothing. */
export async function ensurePages(
	client: QueryClient,
	read: Read<unknown>,
	wanted: readonly number[],
): Promise<void> {
	const { queryKey } = read.options;
	const state = client.getQueryData<WindowState>(queryKey as QueryKey);
	if (!state || !read.page) return;
	const hash = read.key;
	const flying = inflight.get(client) ?? new Map<string, Promise<void>>();
	inflight.set(client, flying);
	const lately = failed.get(client) ?? new Map<string, number>();
	failed.set(client, lately);
	const missing = wanted.filter(
		(page) =>
			page >= 0 && page * state.size < state.total && !state.pages[page],
	);
	await Promise.all(
		missing.map((page) => {
			const id = `${hash}:${page}`;
			const running = flying.get(id);
			if (running) return running;
			if (Date.now() - (lately.get(id) ?? 0) < RETRY_AFTER) {
				return Promise.reject(new Error(`Page ${page} failed`));
			}
			const load = (read.page as NonNullable<Read<unknown>["page"]>)(
				page * state.size,
			)
				.then((answer) => {
					lately.delete(id);
					const now = client.getQueryData<WindowState>(queryKey as QueryKey);
					if (!now || now.size !== state.size) return;
					// The data moved under the window: its pages no longer line up.
					if (answer.total !== now.total) {
						void client.invalidateQueries({
							queryKey: queryKey as QueryKey,
							exact: true,
						});
						return;
					}
					client.setQueryData(
						queryKey as QueryKey,
						withPage(now, page, answer.data, wanted),
					);
				})
				.catch((error) => {
					lately.set(id, Date.now());
					throw error;
				})
				.finally(() => flying.delete(id));
			flying.set(id, load);
			return load;
		}),
	);
}

// What a first load's data waits for (ms), from the client's default query
// `meta.hold` that `QueryProvider` sets; 0 with none set.
export function holdOf(client: QueryClient, elapsed: number): number {
	const hold = client.getDefaultOptions().queries?.meta?.hold;
	return typeof hold === "function"
		? (hold as (e: number) => number)(elapsed)
		: 0;
}

// A client the app supplied takes the hold beside its own defaults, merged by
// hand: `setDefaultOptions` replaces them all.
export function withHold(
	client: QueryClient,
	hold: ((elapsed: number) => number) | undefined,
): QueryClient {
	const defaults = client.getDefaultOptions();
	if (hold && defaults.queries?.meta?.hold !== hold) {
		client.setDefaultOptions({
			...defaults,
			queries: {
				...defaults.queries,
				meta: { ...defaults.queries?.meta, hold },
			},
		});
	}
	return client;
}

// A first load's data resolves no earlier than the minimum hold allows. Only
// this read's own write waits (never TanStack's scheduler), a refetch or a
// later page is not held, and a cancelled fetch is let go at once: TanStack
// ignores what it settles.
function held<F extends (ctx: QueryFunctionContext) => unknown>(queryFn: F): F {
	// The wrapper has `queryFn`'s own signature; the compiler cannot see that through `F`.
	return (async (ctx: QueryFunctionContext) => {
		const first = ctx.client.getQueryData(ctx.queryKey) === undefined;
		const start = Date.now();
		const data = await queryFn(ctx);
		if (!first) return data;
		const wait = holdOf(ctx.client, Date.now() - start);
		if (wait <= 0 || ctx.signal.aborted) return data;
		await new Promise<void>((done) => {
			const timer = setTimeout(finish, wait);
			function finish(): void {
				clearTimeout(timer);
				ctx.signal.removeEventListener("abort", finish);
				done();
			}
			ctx.signal.addEventListener("abort", finish);
		});
		return data;
	}) as unknown as F;
}

// Whether a query belongs to a stream read (a channel read, the connection):
// it stays fetching for as long as it is subscribed, so it is not a load.
export const isStreamQuery = (query: { meta?: Record<string, unknown> }) =>
	query.meta?.stream === true;

/** A stream read: `stop` ends the run in flight, whose query lands success with the data so far, and resolves with that data; with no run in flight it resolves with `undefined`. */
export interface StreamRead<T, Q = unknown> extends Read<T, Q> {
	stop(): Promise<T | undefined>;
}

// A stream's query function, each run under its own controller that aborts
// with TanStack's signal or with `stop`. Reading `context.signal` tells
// TanStack the signal is consumed, so it still cancels the run when the last
// observer leaves.
function stoppable<T>(
	queryFn: QueryFunction<T, QueryKey> | SkipToken | undefined,
): {
	queryFn: QueryFunction<T, QueryKey> | SkipToken | undefined;
	stop: () => Promise<T | undefined>;
} {
	let current: { controller: AbortController; run: Promise<T> } | undefined;
	const stop = async (): Promise<T | undefined> => {
		if (!current) return undefined;
		current.controller.abort();
		return current.run;
	};
	if (typeof queryFn !== "function") return { queryFn, stop };
	return {
		queryFn: (context) => {
			const controller = new AbortController();
			const { signal } = context;
			const abort = () => controller.abort();
			signal.addEventListener("abort", abort, { once: true });
			if (signal.aborted) abort();
			const run = (async () => {
				try {
					return await queryFn({ ...context, signal: controller.signal });
				} finally {
					signal.removeEventListener("abort", abort);
					if (current?.controller === controller) current = undefined;
				}
			})();
			current = { controller, run };
			return run;
		},
		stop,
	};
}

// The error type is the options' own: oRPC's `queryOptions` names its `Error`,
// and a `refetchInterval` callback typed on it would not fit `unknown`.
export function read<T, E = unknown, Q = unknown>(
	options: UseQueryOptions<T, E, T, QueryKey>,
	how: ReadHow<T, Q> & { kind: "stream" },
): StreamRead<T, Q>;
export function read<T, E = unknown, Q = unknown>(
	options: UseQueryOptions<T, E, T, QueryKey>,
	how?: ReadHow<T, Q>,
): Read<T, Q>;
export function read<T, E = unknown, Q = unknown>(
	options: UseQueryOptions<T, E, T, QueryKey>,
	how: ReadHow<T, Q> = {},
): Read<T, Q> | StreamRead<T, Q> {
	const kind = how.kind ?? "query";
	const bound = (queryOptions: Read<T>["options"]) =>
		readOf<T, Q>(queryOptions, hashKey(queryOptions.queryKey), {
			...how,
			kind,
			missing: how.missing ?? isNotFound,
		});
	const queryFn = options.queryFn;
	if (kind === "stream") {
		// A stream is not a load: docs/architecture/plugins/query.md, "Reads".
		const runs = stoppable(queryFn);
		return Object.assign(
			bound({
				...options,
				queryFn: runs.queryFn,
				meta: { ...options.meta, stream: true },
			}),
			{ stop: runs.stop },
		);
	}
	const own =
		typeof queryFn === "function"
			? { ...options, queryFn: held(queryFn) }
			: options;
	// A pages read's options are infinite ones. `_type` makes the query infinite
	// whichever observer creates it, a leaf's plain `useQueries` included (a
	// TanStack internal, since 5.100.2).
	return bound(kind === "pages" ? { ...own, _type: "infinite" } : own);
}

/** A stream read whose value folds the chunks of `stream` from `initialValue` through `reducer`, written to its query as each arrives. `onDone` gets the whole value when the stream ends on its own, never after `stop` or a cancel. */
export function streamRead<C, T>({
	queryKey,
	stream,
	reducer,
	initialValue,
	onDone,
}: {
	queryKey: QueryKey;
	stream: (signal: AbortSignal) => AsyncIterable<C>;
	reducer: (value: T, chunk: C) => T;
	initialValue: T;
	onDone?: (value: T) => void;
}): StreamRead<T> {
	const streamed = streamedQuery<C, T>({
		streamFn: ({ signal }) => stream(signal),
		reducer,
		initialValue,
	});
	return read<T>(
		{
			queryKey,
			queryFn: async (context) => {
				const value = await streamed(context);
				if (!context.signal.aborted) onDone?.(value);
				return value;
			},
			staleTime: Number.POSITIVE_INFINITY,
			retry: false,
		},
		{ kind: "stream" },
	);
}

// The columns a procedure declares to sort by, from its input's JSON Schema.
function sortColumns(
	schema: SortSchema,
	path: readonly string[],
): readonly string[] | undefined {
	const properties = (
		schema[path.join(".")]?.input as Record<string, unknown> | null | undefined
	)?.properties as
		| Record<string, { properties?: Record<string, { enum?: unknown }> }>
		| undefined;
	const columns = properties?.sort?.properties?.column?.enum;
	return Array.isArray(columns) ? (columns as string[]) : undefined;
}

// A paginated read's query: the input less what pages and orders it.
function queryOfInput(input: unknown): unknown {
	if (typeof input !== "object" || input === null) return undefined;
	const { cursor, offset, limit, sort, ...query } = input as Record<
		string,
		unknown
	>;
	return query;
}

type Sort = { column: string; direction: "asc" | "desc" } | undefined;

// The cast only widens: `READ_KEYS` is a tuple of strings, and `includes` takes a wider key.
const isReadKey = (key: string | symbol): key is ReadKey =>
	(READ_KEYS as readonly (string | symbol)[]).includes(key);

// oRPC's utils are a proxy that makes a child on every string key, and a
// procedure's `queryOptions` is a function whose own keys are the child's. The
// wrapper follows the same shape: `read`, `pages` and `window` are functions
// that forward their keys to the child of that name, so a procedure called
// `read`, `pages` or `window` keeps its utils.
export function withRead(
	// biome-ignore lint/suspicious/noExplicitAny: oRPC's utils proxy is dynamically typed
	target: any,
	schema: SortSchema,
	// biome-ignore lint/suspicious/noExplicitAny: oRPC's utils proxy is dynamically typed
): any {
	return readsAt(target, schema, []);
}

// `path` is the procedure the utils belong to, as the schema names it.
function readsAt(
	// biome-ignore lint/suspicious/noExplicitAny: oRPC's utils proxy is dynamically typed
	target: any,
	schema: SortSchema,
	path: readonly string[],
	// biome-ignore lint/suspicious/noExplicitAny: oRPC's utils proxy is dynamically typed
): any {
	const columns = sortColumns(schema, path);
	// A read of the procedure over `input`. A procedure that declares `sort`
	// gives the read its `sorting`: the same read with the sort in its input.
	const build = (key: ReadKey, input: unknown): Read<unknown> => {
		const how: ReadHow<unknown, unknown> =
			key === "read"
				? {}
				: {
						query: queryOfInput(input),
						sorting:
							columns && input !== skipToken
								? {
										columns,
										by: (sort: Sort) =>
											build(key, { ...(input as object), sort }),
									}
								: undefined,
					};
		if (key === "read") return read(target.queryOptions({ input }));
		// The cursor is the page param; the first page has none.
		if (key === "pages") {
			return read(
				target.infiniteOptions({
					input:
						input === skipToken
							? skipToken
							: (cursor: string | undefined) => ({
									...(input as object),
									cursor,
								}),
					initialPageParam: undefined,
					getNextPageParam: (last: Page) => last.nextCursor,
				}),
				{ ...how, kind: "pages" },
			);
		}
		return windowRead(target, input, how);
	};
	const make = (key: ReadKey) => (input?: unknown) => build(key, input);
	return new Proxy(target, {
		get(_, key) {
			if (isReadKey(key)) {
				const child = readsAt(Reflect.get(target, key), schema, [...path, key]);
				return new Proxy(make(key), { get: (_, k) => Reflect.get(child, k) });
			}
			const value = Reflect.get(target, key);
			if (typeof key !== "string") return value;
			return value !== null &&
				(typeof value === "object" || typeof value === "function")
				? readsAt(value, schema, [...path, key])
				: value;
		},
	});
}

// A window read: one query whose data is a `WindowState`. It loads the first
// page, and (on a refetch) the pages the window held, so an invalidation
// redraws what the viewer sees; the others load as the collection asks
// (`ensurePages`). Its key is the procedure's, typed `window`, with the input
// less the offset, so two windows over one query share a cache entry.
// biome-ignore lint/suspicious/noExplicitAny: oRPC's utils proxy is dynamically typed
function windowRead(target: any, input: unknown, how: ReadHow): Read<unknown> {
	const at = (offset: number) =>
		target.queryOptions({
			input: input === skipToken ? skipToken : { ...(input as object), offset },
		});
	const base = at(0);
	const [route, options] = base.queryKey as [unknown, Record<string, unknown>];
	const { offset: _, ...merged } = (options.input ?? {}) as Record<
		string,
		unknown
	>;
	const queryKey = [
		route,
		{
			...options,
			type: "window",
			input: input === skipToken ? undefined : merged,
		},
	];
	const page = (offset: number): Promise<WindowPage> =>
		at(offset).queryFn({}) as Promise<WindowPage>;
	return read(
		{
			...base,
			queryKey,
			queryFn:
				input === skipToken
					? skipToken
					: async (context: QueryFunctionContext) => {
							const previous = context.client.getQueryData<WindowState>(
								context.queryKey,
							);
							const first = await at(0).queryFn({ signal: context.signal });
							const size = Math.max(first.data.length, 1);
							// The pages the window held come again with the first, so a
							// refetch (an invalidation) redraws what the viewer sees.
							const held =
								previous?.size === size
									? Object.keys(previous.pages)
											.map(Number)
											.filter((p) => p > 0 && p * size < first.total)
									: [];
							const rest = await Promise.all(
								held.map((p) =>
									at(p * size)
										.queryFn({ signal: context.signal })
										.then((answer: WindowPage) => [p, answer.data] as const)
										// A held page that fails is left out: `ensurePages` loads it again when the viewer asks for it.
										.catch(() => undefined),
								),
							);
							return {
								total: first.total,
								size,
								pages: Object.fromEntries([
									[0, first.data],
									...rest.filter((entry) => entry !== undefined),
								]),
							} satisfies WindowState;
						},
		},
		{ ...how, kind: "window", page },
	);
}

// `createQueryClient`'s default `retry`: one retry of a failure that may pass,
// none of a not-found, which is an answer and only delays the missing shape.
export function retryOnce(failures: number, error: unknown): boolean {
	return !isNotFound(error) && failures < 1;
}

// `watchUnheld`: docs/architecture/plugins/query.md, "Reads".
export function watchUnheld(cache: QueryCache): () => void {
	if (!dev()) return () => {};
	const named = new Map<string, number>();
	const tagged = (query: Query, tag: () => unknown) =>
		query.observers.some((o) => o.options.placeholderData === tag);
	const report = (query: Query) => {
		const key = query.queryHash;
		if (
			query.state.status !== "error" ||
			query.meta?.ambient === true ||
			query.state.data !== undefined ||
			!tagged(query, placeholderData) ||
			tagged(query, heldStandIn) ||
			named.get(key) === query.state.errorUpdatedAt
		) {
			return;
		}
		named.set(key, query.state.errorUpdatedAt);
		console.error(
			`The read ${key} failed and no frame holds it, so its failure draws nowhere. Give its Pane, Section, Sheet or Form \`read\`.`,
		);
	};
	let stopped = false;
	const unsubscribe = cache.subscribe((event) => {
		if (event.type === "updated" && event.action.type === "error") {
			report(event.query);
		} else if (
			event.type === "observerAdded" ||
			event.type === "observerRemoved"
		) {
			const hash = event.query.queryHash;
			setTimeout(() => {
				const query = stopped ? undefined : cache.get(hash);
				if (query) report(query);
			}, 0);
		}
	});
	return () => {
		stopped = true;
		unsubscribe();
	};
}
