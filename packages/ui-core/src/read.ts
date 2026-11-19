// What a read is at this moment, free of any framework: docs/architecture/ui-core/reads.md, "Read model".

import { isPlain } from "./plain.ts";
import { reached } from "./reached.ts";
import { createStore } from "./store.ts";
import type { Words } from "./tokens.ts";

export interface ReadResult {
	status: "pending" | "success" | "error";
	fetchStatus: "fetching" | "paused" | "idle";
	// False while the read is not asked for (`enabled: false`, `skipToken`).
	isEnabled: boolean;
	// The data is the stand-in's, not an answer.
	isPlaceholderData: boolean;
	// An error with data: a refetch failed, the last answer stands.
	isRefetchError: boolean;
	error: unknown;
	// An infinite read.
	hasNextPage?: boolean;
	// Supplied from the handle: the read is a stream still writing.
	streamed?: boolean;
	// An infinite read fetching its next page: the frame is not busy for it.
	fetchingMore?: boolean;
}

// idle: not asked for yet. waiting: asked for, no answer. ready: real data.
// failed: no data and the read failed. missing: failed with not found.
export type ReadPhase = "idle" | "waiting" | "ready" | "failed" | "missing";

export interface ReadState {
	phase: ReadPhase;
	// Ready and refetching, or failed and retrying: never a flip back to waiting.
	busy: boolean;
	// Ready, and the last refetch failed.
	stale: boolean;
	// An infinite read with a next page.
	more: boolean;
	// A streamed read still writing.
	streaming: boolean;
	// The read waits for a connection.
	paused: boolean;
}

// `isMissing` is the handle's: it knows its error type, so no shape is
// guessed here.
export function readState(
	r: ReadResult,
	isMissing: (error: unknown) => boolean,
): ReadState {
	// A stand-in reports `success`, so it is not data; a refetch error is.
	const real =
		r.status === "error"
			? r.isRefetchError
			: r.status === "success" && !r.isPlaceholderData;
	let phase: ReadPhase;
	if (real) phase = "ready";
	else if (r.status === "error")
		phase = isMissing(r.error) ? "missing" : "failed";
	else phase = r.isEnabled ? "waiting" : "idle";
	const fetching = r.fetchStatus === "fetching";
	const streaming = real && fetching && r.streamed === true;
	return {
		phase,
		busy:
			fetching &&
			!r.fetchingMore &&
			phase !== "waiting" &&
			phase !== "idle" &&
			!streaming,
		stale: real && r.status === "error",
		more: real && r.hasNextPage === true,
		streaming,
		paused: r.fetchStatus === "paused",
	};
}

// What a frame draws from: docs/architecture/ui-core/reads.md, "Frames".
export interface Held {
	drawn?: { painted: boolean; value: unknown; more?: boolean };
	reads?: {
		result: ReadResult;
		missing: (e: unknown) => boolean;
		held: boolean;
	}[];
}

// A frame's shape: docs/architecture/ui-core/reads.md, "Phases".
export type FrameShape =
	| "ready"
	| "waiting"
	| "still"
	| "empty"
	| "failed"
	| "missing";

export interface FrameState {
	shape: FrameShape;
	// The length of a drawn list; undefined where none is drawn, while it waits
	// or stands still, and while more pages remain.
	count: number | undefined;
	// A refetch or a retry runs.
	busy: boolean;
	// A held read's: the last refetch failed, or it waits for a connection. False
	// for a frame that holds none.
	stale: boolean;
	paused: boolean;
}

// The frame's shape from its reads: docs/architecture/ui-core/reads.md, "Shape and flags".
export function frameOf(held: Held): FrameState {
	const reads = held.reads ?? [];
	const all = reads.map((r) => readState(r.result, r.missing));
	const states = all.filter((_, i) => reads[i]?.held);
	const busy = states.some((s) => s.busy);
	const stale = states.some((s) => s.stale);
	const paused = states.some((s) => s.paused);
	const ended = all.map((s) => s.phase).find(isEnded);
	if (ended) {
		return {
			shape: ended,
			count: undefined,
			busy,
			stale,
			paused,
		};
	}
	if (!held.drawn) {
		return { shape: "ready", count: undefined, busy, stale, paused };
	}
	if (held.drawn.painted) {
		return {
			shape: all.some((s) => s.phase === "idle" || s.paused)
				? "still"
				: "waiting",
			count: undefined,
			busy: false,
			stale: false,
			paused,
		};
	}
	const v = held.drawn.value;
	const more = held.drawn.more === true;
	const length = Array.isArray(v) ? v.length : undefined;
	return {
		shape: (v == null || length === 0) && !more ? "empty" : "ready",
		count: more ? undefined : length,
		busy,
		stale,
		paused,
	};
}

// The turn an app writes into a conversation: docs/architecture/ui-core/reads.md, "Conversation turn states".
export type TurnForm =
	| "none"
	| "waiting"
	| "writing"
	| "written"
	| "stopped"
	| "failed";

export function turnOf(held: Held): { form: TurnForm; value: unknown } {
	// A painted selection holds a stand-in where its value would stand, and
	// a read that failed before it ever loaded is painted: no turn to keep.
	const value = held.drawn?.painted ? undefined : held.drawn?.value;
	// Nothing is written until there is a value that says something: a slice
	// still null, or an empty reply, is the same as none.
	const written = value != null && value !== "";
	const root = held.reads?.[0];
	const s = root && readState(root.result, root.missing);
	const holds = root?.held ?? true;
	if (s?.phase === "waiting") {
		return { form: holds ? "waiting" : "none", value };
	}
	if (isEnded(s?.phase)) {
		if (holds) return { form: written ? "stopped" : "failed", value };
		return { form: written ? "written" : "none", value };
	}
	// A refresh that failed keeps the text it had: stopped with it, else failed
	// to be tried again.
	if (s?.stale && holds) {
		return { form: written ? "stopped" : "failed", value };
	}
	// A selection holder draws its value only, and an unwritten one is no turn.
	if (!written) return { form: "none", value };
	return { form: s?.streaming ? "writing" : "written", value };
}

// The reason a blocked act or control stands under once its read ended: docs/architecture/ui-core/acts.md, "Blocked reasons".
export function endedReason(words: Words, phase?: string): string | undefined {
	return isEnded(phase) ? endedSentence(words, phase) : undefined;
}

/** Whether a frame's `shape` or a selection's `phase` says its read ended: failed, or missing. */
export function isEnded<F extends string | undefined>(
	shape: F,
): shape is F & ("failed" | "missing") {
	return shape === "failed" || shape === "missing";
}

/** The sentence a failed or missing row says under its label. */
export function endedSentence(words: Words, ended: "failed" | "missing") {
	return ended === "failed" ? words.readFailed : words.missing;
}

// The read handle, pure so the hooks and the binding share one core: docs/architecture/ui-core/reads.md, "Read handle".

const SELECTION = Symbol.for("@fcalell/ui-core/selection");
const STAND_IN = Symbol.for("@fcalell/ui-core/stand-in");

// One private-use character: a stand-in run through a template literal
// keeps a mark that `isStandIn` finds, where a bare string would be lost.
const WAITING_CHAR = "\uE000";

export interface Selection<T> {
	/** @internal */ readonly [SELECTION]: {
		readonly reads: readonly Read<unknown>[];
		// Per read, in order: used only through `or`, so it never paints, holds
		// or fails a frame.
		readonly quiet: readonly boolean[];
		// One datum and one "is real data" per read, in order.
		readonly pick: (data: readonly unknown[], real: readonly boolean[]) => T;
	};
	at<U>(fn: (value: T) => U): Selection<U>;
	/** Real data when its reads have it, `fallback` in every other state (waiting, idle, paused, failed, missing). It never paints, holds or fails a frame, and a read used only through it is quiet. For enrichments only (a name, a badge, a board's column order, a link): a read whose rows, options, facts or text a component draws is never `or`. */
	or<F>(fallback: F): Selection<T | F>;
}

// How a read's query behaves: docs/architecture/ui-core/reads.md, "Read kinds".
export type ReadKind = "query" | "pages" | "window" | "stream";

/** The input of a paginated read less what pages it and orders it (`cursor`, `offset`, `limit`, `sort`): what a selection over the read names. */
export type QueryOf<I> = I extends object
	? Omit<I, "cursor" | "offset" | "limit" | "sort">
	: never;

/** The order a read of a procedure that declares `sort` can be given: the columns it names and the read in that order. */
export interface Sorting<T, Q> {
	readonly columns: readonly string[];
	readonly by: (
		sort: { column: string; direction: "asc" | "desc" } | undefined,
	) => Read<T, Q>;
}

// What the binding that runs a read gives it: docs/architecture/ui-core/reads.md, "Read handle".
export interface ReadBinding {
	readonly key: string;
}

// A read is its own identity selection, so `Section items={deploys}` takes a root.
// `Q` is the query it answers, a paginated read's input less the paging (for
// the selector a mutation takes); it rides the type only.
export interface Read<T, Q = unknown> extends Selection<T>, ReadBinding {
	readonly missing: (error: unknown) => boolean;
	readonly kind: ReadKind;
	/** A paginated read's query: its input less the paging and the sort. */
	readonly query?: Q;
	/** Present when the procedure declares `sort`: a Table over the read sends its header sort through the input. */
	readonly sorting?: Sorting<T, Q>;
	/** A window read's page at an offset, which `ensurePages` loads. */
	readonly page?: (offset: number) => Promise<WindowPage>;
}

export interface ReadHow<T = unknown, Q = unknown> {
	missing?: (error: unknown) => boolean;
	kind?: ReadKind;
	query?: Q;
	sorting?: Sorting<T, Q>;
	page?: (offset: number) => Promise<WindowPage>;
}

// A `paginated: "window"` procedure's answer.
export interface WindowPage {
	data: readonly unknown[];
	total: number;
	offset: number;
}

// What a window read's query holds: the total, the page size, and the pages
// loaded by their number (offset over size). Page 0 is always there, so the
// rows from the start (the value a plain collection draws) never go.
export interface WindowState {
	total: number;
	size: number;
	pages: Readonly<Record<number, readonly unknown[]>>;
}

// A data prop's type: a constant, or a selection the leaf subscribes to.
export type Datum<T> = T | Selection<T>;

/** `T` whose props named `K` (on it, on each member of a list, and on the `options` of a group) may each be a selection. */
export type Lifted<T, K extends string> = T extends readonly (infer E)[]
	? readonly Lifted<E, K>[]
	: T extends (...args: never[]) => unknown
		? T
		: T extends object
			? {
					[P in keyof T]: P extends K
						? T[P] | Selection<T[P]>
						: P extends "options"
							? Lifted<T[P], K>
							: T[P];
				}
			: T;

/** A data prop whose text props may be selections too: a constant, a selection of the whole, or a constant with selections in its `K` props (an act's `blocked`, an option's `description`). */
export type Fielded<T, K extends string> = Datum<T> | Lifted<T, K>;

// Walks a list or a plain object one level (and the list under its `nesting`
// key, a group's options), handing every selection held in a `keys` prop to
// `take` and putting back what it returns; a value with none is returned as it
// is.
function walk(
	value: unknown,
	keys: readonly string[],
	nesting: string | undefined,
	take: (found: Selection<unknown>) => unknown,
): unknown {
	if (Array.isArray(value)) {
		let changed = false;
		const out = value.map((one) => {
			const next = walk(one, keys, nesting, take);
			if (next !== one) changed = true;
			return next;
		});
		return changed ? out : value;
	}
	if (!isPlain(value) || isSelection(value)) return value;
	let out: Record<string, unknown> | undefined;
	for (const key of Object.keys(value)) {
		const field = value[key];
		const next =
			keys.includes(key) && isSelection(field)
				? take(field)
				: key === nesting && Array.isArray(field)
					? walk(field, keys, nesting, take)
					: field;
		if (next !== field) {
			out ??= { ...value };
			out[key] = next;
		}
	}
	return out ?? value;
}

const lifts = new WeakMap<object, Map<string, unknown>>();

/** A data prop made whole: a constant (or a list of them) whose `keys` props hold selections becomes one selection of the constant with each prop's value in its place, so a host that draws a `Datum` draws the prop's read as it draws the whole thing's (painted, inert, while a read waits; failed or missing, the act blocked with the sentence). `nesting` names the prop that holds a list of the same kind (a group's `options`), which is walked too; absent, none is. A value with no selection in those props is returned as it is. Cached by the value's identity, so a render that passes the same value gets the same selection. */
export function lift<T, K extends string>(
	value: Fielded<T, K>,
	keys: readonly K[],
	nesting?: string,
): Datum<T>;
export function lift<T, K extends string>(
	value: Fielded<T, K> | undefined,
	keys: readonly K[],
	nesting?: string,
): Datum<T> | undefined;
export function lift<T, K extends string>(
	value: Fielded<T, K> | undefined,
	keys: readonly K[],
	nesting?: string,
): Datum<T> | undefined {
	if (typeof value !== "object" || value === null || isSelection(value)) {
		return value as Datum<T> | undefined;
	}
	const id = `${keys.join(",")}/${nesting ?? ""}`;
	const held = lifts.get(value)?.get(id);
	if (held !== undefined) return held as Datum<T>;
	const found: Selection<unknown>[] = [];
	walk(value, keys, nesting, (one) => {
		found.push(one);
		return one;
	});
	const made =
		found.length === 0
			? value
			: combine(found, (...values) => {
					let at = 0;
					return walk(value, keys, nesting, () => values[at++]);
				});
	const cache = lifts.get(value) ?? new Map<string, unknown>();
	cache.set(id, made);
	lifts.set(value, cache);
	return made as Datum<T>;
}

// What a leaf draws for one value: docs/architecture/ui-core/reads.md, "Phases".
export type DrawnPhase = "waiting" | "still" | "failed" | "missing";
export type Drawn<T> =
	| { readonly painted: false; readonly value: T }
	| {
			readonly painted: true;
			readonly value: unknown;
			readonly phase: DrawnPhase;
	  };

// Whether a leaf draws its paint: docs/architecture/ui-core/reads.md, "Phases".
export function paints(drawn: Drawn<unknown>): boolean {
	return (
		drawn.painted && (drawn.phase === "waiting" || drawn.phase === "still")
	);
}

// What a text region given as a `Datum` draws: its paint while its own read
// waits, its text once landed, and nothing for an empty text or a read that
// ended. A constant is landed, so it stands as given whatever paints beside it.
export function shownText(
	drawn: Drawn<string | undefined>,
): { painted: true } | { painted: false; text: string } | undefined {
	if (paints(drawn)) return { painted: true };
	if (drawn.painted || !drawn.value) return undefined;
	return { painted: false, text: drawn.value };
}

// The stand-in: docs/architecture/ui-core/reads.md, "Stand-in and selectors".
const NO_KEYS = new Set(["then", "toJSON", "$$typeof"]);

// The walk limit over a stand-in or a sample: docs/architecture/ui-core/reads.md, "Stand-in and selectors".
const WALK_LIMIT = 10_000;
let depth = 0;
let steps = 0;

// `run` with the walk budget: the outermost run starts it, a nested one (a
// selection built on another's) spends the same.
function bounded<T>(run: () => T): T {
	if (depth === 0) steps = 0;
	depth++;
	try {
		return run();
	} finally {
		depth--;
	}
}

function step(): void {
	if (depth > 0 && ++steps > WALK_LIMIT)
		throw new Error(
			`a selector read the stand-in more than ${WALK_LIMIT} times: a walk that follows a key which is always there never ends, so bound it (a counter, or the real data's own end)`,
		);
}
const emptyIterator = function* () {};
const toPrimitive = (hint: string) => (hint === "string" ? WAITING_CHAR : 0);

// biome-ignore lint/suspicious/noExplicitAny: the stand-in stands in for every type
const P: any = new Proxy(() => P, {
	get(_, key) {
		if (key === STAND_IN) return true;
		step();
		if (key === Symbol.toPrimitive) return toPrimitive;
		if (key === Symbol.iterator) return emptyIterator;
		if (typeof key === "symbol" || NO_KEYS.has(key)) return undefined;
		return P;
	},
	apply: () => P,
	has: () => true,
	ownKeys: () => [],
	set: () => false,
	defineProperty: () => false,
	deleteProperty: () => false,
});

// The stand-in, the sample (a list's one record, which stands only inside
// `sampleOf`) or a string a template made of either.
export function isStandIn(v: unknown): boolean {
	return (
		v === P || v === S || (typeof v === "string" && v.includes(WAITING_CHAR))
	);
}

// Two constant functions, compared by identity: docs/architecture/ui-core/reads.md, "Stand-in and selectors".
export const placeholderData = (): unknown => P;
export const heldStandIn = (): unknown => P;

// The sample: the stand-in, except that a list's search finds its one
// record (`find`, `filter`, a copy or a sort gives the sample back), mapping
// it maps that record once (`map`, `flatMap`) and iterating it yields it, so a
// selector that finds a group and maps its rows reaches one row. It stands
// only inside `sampleOf`, which hands out no part of it.
type Each = (value: unknown, index: number, list: unknown) => unknown;
const SAMPLE_LIST: Record<string, (fn?: unknown) => unknown> = {
	map: (fn) => [(fn as Each)(S, 0, S)],
	flatMap: (fn) => [(fn as Each)(S, 0, S)].flat(),
	find: () => S,
	filter: () => S,
	slice: () => S,
	sort: () => S,
	toSorted: () => S,
	reverse: () => S,
	concat: () => S,
};
const sampleIterator = function* () {
	yield S;
};
// biome-ignore lint/suspicious/noExplicitAny: the sample stands in for every type
const S: any = new Proxy(() => S, {
	get(_, key) {
		if (key === STAND_IN) return true;
		step();
		if (key === Symbol.toPrimitive) return toPrimitive;
		if (key === Symbol.iterator) return sampleIterator;
		if (typeof key === "symbol" || NO_KEYS.has(key)) return undefined;
		return SAMPLE_LIST[key] ?? S;
	},
	apply: () => S,
	has: () => true,
	ownKeys: () => [],
	set: () => false,
	defineProperty: () => false,
	deleteProperty: () => false,
});

// One item as a list selection draws it, for the waiting shape: the
// selection's pick run over the sample, a record whose lists hold one record,
// so a selector that maps each record (`list.map(toRow)`, a group's rows found
// first or not) gives the regions a loaded item fills (a leading mark, a
// trailing value), each value it took from the record the empty string.
// Undefined where the selection reads more than one read, its selector throws
// over the sample, or it gives no list of one item.
export function sampleOf<T>(
	v: Selection<readonly T[]>,
): Exclude<T, undefined> | undefined {
	const { reads, pick } = v[SELECTION];
	if (reads.length !== 1) return undefined;
	try {
		const value: unknown = bounded(() => pick([S], [false]));
		if (!Array.isArray(value) || value.length !== 1) return undefined;
		const [one] = value;
		if (one === undefined || one === null || isStandIn(one)) return undefined;
		return slotted(one) as Exclude<T, undefined>;
	} catch {
		return undefined;
	}
}

// A sample's stand-in values as the empty string, through its plain objects
// and arrays: a region that is there, with nothing in it.
function slotted(v: unknown): unknown {
	if (isStandIn(v)) return "";
	if (Array.isArray(v)) return v.map(slotted);
	if (isPlain(v))
		return Object.fromEntries(
			Object.entries(v).map(([key, value]) => [key, slotted(value)]),
		);
	return v;
}

export function isSelection(v: unknown): v is Selection<unknown> {
	return typeof v === "object" && v !== null && SELECTION in v;
}

// A selector that throws over the stand-in: docs/architecture/ui-core/reads.md, "Stand-in and selectors".
function guarded<T>(data: readonly unknown[], run: () => T): T {
	try {
		return bounded(run);
	} catch (error) {
		if (!data.some(isStandIn)) throw error;
		return P;
	}
}

// A selection is never a plain object: docs/architecture/ui-core/reads.md, "Stand-in and selectors".
const SELECTION_PROTOTYPE = {};

function selection<T>(
	reads: readonly Read<unknown>[],
	quiet: readonly boolean[],
	pick: (data: readonly unknown[], real: readonly boolean[]) => T,
): Selection<T> {
	return Object.assign(Object.create(SELECTION_PROTOTYPE) as Selection<T>, {
		[SELECTION]: { reads, quiet, pick },
		at: (fn) =>
			selection(reads, quiet, (data, real) =>
				guarded(data, () => fn(pick(data, real))),
			),
		or: (fallback) =>
			selection(
				reads,
				reads.map(() => true),
				(data, real) => (real.every(Boolean) ? pick(data, real) : fallback),
			),
	} satisfies Partial<Selection<T>>);
}

// stack's paginated envelope, the one output a `pages` read is made over.
export type Page = { data: unknown[]; nextCursor: string | null };
type Pages = { pages: readonly Page[] };

// A window read's data has its pages by number, an infinite read's in an array.
const isWindowState = (data: unknown): data is WindowState =>
	!Array.isArray((data as Pages).pages);

// More pages remain when the last one names a cursor (a window: the rows
// loaded from the start fall short of the total). False over the stand-in
// and over no data.
export function moreOf(data: unknown): boolean {
	if (data === undefined || isStandIn(data)) return false;
	if (isWindowState(data)) return reached(data) * data.size < data.total;
	const last = (data as Pages).pages.at(-1);
	return last !== undefined && last.nextCursor != null;
}

// A pages read's value is the flat list, so `Pane read={deploys}` with
// `Section items={deploys}` is the same idiom as a plain read. A window's is
// the rows loaded from the start. The stand-in stays itself, painted.
function flatten(data: unknown): unknown {
	if (data === undefined || isStandIn(data)) return data;
	if (isWindowState(data)) {
		return Array.from({ length: reached(data) }, (_, page) => [
			...(data.pages[page] ?? []),
		]).flat();
	}
	return (data as Pages).pages.flatMap((page) => page.data);
}

// A read that pages: its rows continue in a next page, or in the pages a
// window has not loaded.
const pages = (kind: ReadKind) => kind === "pages" || kind === "window";

// A value as a string two equal values share, whatever the order of their
// plain objects' keys.
const stable = (value: unknown): string =>
	JSON.stringify(value, (_, v: unknown) =>
		isPlain(v)
			? Object.fromEntries(
					Object.keys(v)
						.sort()
						.map((key) => [key, v[key]]),
				)
			: v,
	);

/** Whether two queries are one: a selection over a query holds only while the read still answers it. */
export function sameQuery(a: unknown, b: unknown): boolean {
	return stable([a ?? null]) === stable([b ?? null]);
}

export function combine<const S extends readonly Selection<unknown>[], R>(
	selections: S,
	fn: (
		...values: {
			-readonly [K in keyof S]: S[K] extends Selection<infer T> ? T : never;
		}
	) => R,
): Selection<R> {
	const parts = selections.map((s) => s[SELECTION]);
	return selection(
		parts.flatMap((p) => p.reads),
		parts.flatMap((p) => p.quiet),
		(data, real) =>
			guarded(data, () => {
				let from = 0;
				const values = parts.map((p) => {
					const to = from + p.reads.length;
					const value = p.pick(data.slice(from, to), real.slice(from, to));
					from = to;
					return value;
				});
				// Each part's value is its selection's `T`, which the mapped parameter
				// type of `fn` states and `parts.map` loses.
				return fn(...(values as never));
			}),
	);
}

// The part of `.stack/schema.ts` the sort reads: docs/architecture/ui-core/reads.md, "Sort".
export type SortSchema = Readonly<
	Record<string, { readonly input: object | null } | undefined>
>;

// One read a hook observes through the binding. A painted one carries the
// `standIn` that marks its observer (`placeholderData` for a leaf that
// draws it, `heldStandIn` for a holder); a quiet one carries none, so the
// dev check never counts it. A `silent` observer re-renders on nothing.
export interface Observed {
	read: Read<unknown>;
	standIn?: () => unknown;
	silent?: boolean;
}

// What the binding answers for one observed read: its result's fields the
// model reads, and its data.
export interface ReadAnswer extends ReadResult {
	data: unknown;
}

// The pure core of both hooks. `reads` are the distinct queries the values
// need, deduped by key (two observers of one key in one `QueriesObserver` warn);
// `painted` are those some value uses plainly (the quiet ones are subscribed and
// nothing more); `queries` are the observed reads, the painted ones given
// `standIn`; `draw` maps their answers back onto the values, in order.
const isReal = (r: ReadAnswer) => !r.isPlaceholderData && r.data !== undefined;

// Why a read has no data: it ended, nothing is coming, or the answer is.
function phaseOf(r: ReadAnswer, read: Read<unknown>): DrawnPhase {
	if (r.status === "error") return read.missing(r.error) ? "missing" : "failed";
	return !r.isEnabled || r.fetchStatus === "paused" ? "still" : "waiting";
}

export function planSelections(values: readonly unknown[]): {
	reads: readonly Read<unknown>[];
	painted: readonly Read<unknown>[];
	queries: (standIn: () => unknown) => Observed[];
	draw: (results: readonly ReadAnswer[]) => readonly Drawn<unknown>[];
} {
	const reads: Read<unknown>[] = [];
	const slots = new Map<string, number>();
	const slotOf = (r: Read<unknown>) => {
		let slot = slots.get(r.key);
		if (slot === undefined) slot = reads.push(r) - 1;
		slots.set(r.key, slot);
		return slot;
	};
	const plan = values.map((v) =>
		isSelection(v)
			? { ...v[SELECTION], at: v[SELECTION].reads.map(slotOf) }
			: null,
	);
	const plain = new Set(
		plan.flatMap((p) => p?.at.filter((_, k) => !p.quiet[k]) ?? []),
	);

	return {
		reads,
		painted: reads.filter((_, slot) => plain.has(slot)),
		queries: (standIn) =>
			reads.map((read, slot) =>
				plain.has(slot) ? { read, standIn } : { read },
			),
		draw: (results) =>
			values.map((value, i) => {
				const p = plan[i];
				if (!p) return { painted: false, value };
				const inputs = p.at.map((slot) => results[slot] as ReadAnswer);
				const real = inputs.map(isReal);
				// Only a read the selection uses plainly holds it back: a quiet one
				// that has no data gives its `or` fallback.
				const open = inputs.flatMap((_, k) =>
					p.quiet[k] || real[k] ? [] : [k],
				);
				if (open.length === 0) {
					return {
						painted: false,
						value: p.pick(
							inputs.map((r) => r.data),
							real,
						),
					};
				}
				const phases = open.map((k) =>
					phaseOf(inputs[k] as ReadAnswer, p.reads[k] as Read<unknown>),
				);
				const ended = phases.find(isEnded);
				// A waiting region picks over the stand-in where a read has no data,
				// so a selector walks P and never meets `undefined`; a combine keeps
				// the real data of its other reads.
				return {
					painted: true,
					phase: ended ?? (phases.includes("still") ? "still" : "waiting"),
					value:
						p.pick(
							inputs.map((r) => r.data ?? P),
							real,
						) ?? P,
				};
			}),
	};
}

export function isRead(v: unknown): v is Read<unknown> {
	return isSelection(v) && v[SELECTION].reads[0] === v;
}

// The pure core of `useFrameRead`: docs/architecture/ui-core/reads.md, "Holding a read".
export function planFrame<S>(
	selection: Selection<unknown> | undefined,
	derive: (held: Held) => S,
	query: (read: Read<unknown>) => { fetchMore?: boolean } | undefined,
	enclosing: Holds,
): {
	// The observed reads: every painted read carries `heldStandIn`, so the
	// frame is a holder of each in the dev check, not a painter.
	queries: Observed[];
	held: Read<unknown> | undefined;
	extra: readonly Read<unknown>[];
	combine: (results: readonly ReadAnswer[]) => S;
} {
	const plan = planSelections(selection === undefined ? [] : [selection]);
	const [held, ...extra] = plan.painted.filter((r) => !enclosing.has(r.key));
	return {
		queries: plan.queries(heldStandIn),
		held,
		extra,
		combine: (results) => {
			const reads = plan.reads.flatMap((r, i) => {
				const result = results[i];
				if (!plan.painted.includes(r) || !result) return [];
				const forward = r.kind === "pages" && query(r)?.fetchMore === true;
				// A next page that failed is the collection's line (its more row), not
				// the read's: the frame holds the pages it has, so it is not stale.
				const nextFailed =
					forward && result.status === "error" && result.isRefetchError;
				return [
					{
						result: {
							...result,
							...(nextFailed && {
								status: "success" as const,
								isRefetchError: false,
								error: null,
							}),
							streamed: r.kind === "stream",
							hasNextPage: pages(r.kind) && moreOf(result.data),
							fetchingMore: forward && result.fetchStatus === "fetching",
						},
						missing: r.missing,
						held: r === held,
					},
				];
			});
			return derive({
				...(selection !== undefined && {
					drawn: {
						...(plan.draw(results)[0] as Drawn<unknown>),
						more: plan.painted.some(
							(r) =>
								pages(r.kind) && moreOf(results[plan.reads.indexOf(r)]?.data),
						),
					},
				}),
				reads,
			});
		},
	};
}

// The datum's one read, when it pages (a pages read, or a window): the
// collection's more row fetches through it.
export function pagesOf(v: unknown): Read<unknown> | undefined {
	if (!isSelection(v)) return undefined;
	const reads = v[SELECTION].reads;
	const only = reads.length === 1 ? reads[0] : undefined;
	return only && pages(only.kind) ? only : undefined;
}

// The datum itself, when it is a window read: a collection under a scroller
// sizes it to the read's total (`useWindow`) instead of paging it in.
export function windowOf(v: unknown): Read<unknown> | undefined {
	return isRead(v) && v.kind === "window" ? v : undefined;
}

export function readsOf(v: unknown): readonly Read<unknown>[] {
	return isSelection(v) ? v[SELECTION].reads : [];
}

export function readKey(v: unknown): string | undefined {
	return isSelection(v)
		? v[SELECTION].reads.map((r) => r.key).join("|")
		: undefined;
}

// Dev checks read the query cache's own observers: docs/architecture/ui-core/reads.md, "Dev checks".
export const dev = () => process.env.NODE_ENV !== "production";

// What a frame publishes to its body: docs/architecture/ui-core/reads.md, "Holding a read".
export type Holds = ReadonlySet<string>;

// What a frame outside every frame sees: nothing held.
export const NO_HOLDS: Holds = new Set();

// Holds are interned by their joined keys, so frames over the same keys
// publish one identity and a context change re-renders nothing for them. The
// table is bounded: a clear only costs one re-render.
const interned = new Map<string, Holds>();
const INTERNED_MAX = 256;

export function holdsOf(
	enclosing: Holds,
	held: Read<unknown> | undefined,
): Holds {
	if (!held) return enclosing;
	const keys = [...enclosing, held.key];
	const id = keys.join("|");
	let holds = interned.get(id);
	if (!holds) {
		if (interned.size >= INTERNED_MAX) interned.clear();
		holds = new Set(keys);
		interned.set(id, holds);
	}
	return holds;
}

// Frames that hold one read share its busy mark: docs/architecture/ui-core/reads.md, "Holding a read".
export interface Flags {
	take: (hash: string, id: string) => () => void;
	flags: (hash: string, id: string) => boolean;
	subscribe: (listener: () => void) => () => void;
}

export function createFlags(): Flags {
	const held = new Map<string, string[]>();
	const takers = createStore(held);
	return {
		take: (hash, id) => {
			const list = held.get(hash) ?? [];
			list.push(id);
			held.set(hash, list);
			takers.emit();
			return () => {
				const left = (held.get(hash) ?? []).filter((taker) => taker !== id);
				if (left.length === 0) held.delete(hash);
				else held.set(hash, left);
				takers.emit();
			};
		},
		flags: (hash, id) => held.get(hash)?.[0] === id,
		subscribe: takers.subscribe,
	};
}

// A frame holds one read: docs/architecture/ui-core/reads.md, "Holding a read".
export function holdReads(reads: readonly Read<unknown>[]): void {
	if (!dev()) return;
	const keys = reads.map((r) => r.key);
	for (const key of keys.slice(1)) {
		console.error(
			`A frame holds one read, and this one has a second: ${keys[0]} and ${key}. Give each read its own Pane, Section, Sheet or Form, or use \`or\` for a read that only names or orders.`,
		);
	}
}

// A read over the binding's `options`, whose query is `key`: its own identity
// selection, whose value is the flat list for a read that pages. The binding's
// `read` builds it once it has made the options.
export function readOf<T, Q = unknown>(
	options: unknown,
	key: string,
	how: ReadHow<T, Q> & { missing: (error: unknown) => boolean },
): Read<T, Q> {
	const kind = how.kind ?? "query";
	// The identity selection holds the read itself, so its reads list closes the
	// loop once the read exists.
	const reads: Read<unknown>[] = [];
	// Assigned onto the selection, so the read keeps its prototype.
	const self: Read<T, Q> = Object.assign(
		selection<T>(
			reads,
			[false],
			(data) => (pages(kind) ? flatten(data[0]) : data[0]) as T,
		),
		{
			options,
			key,
			missing: how.missing,
			kind,
			query: how.query,
			sorting: how.sorting,
			page: how.page,
		},
	);
	reads.push(self);
	return self;
}

export interface More {
	// Another page remains.
	next: boolean;
	fetching: boolean;
	failed: boolean;
	fetch: () => Promise<unknown>;
}

// Whether a collection's more row fetches the next page itself, without the
// press: when it is `wanted` (the first page came back empty, or the rows a
// long windowed collection mounts reach its last loaded row, `reachesEnd`)
// and a next page remains that is not already loading or failed.
export function fetchesMore(more: More, wanted: boolean): boolean {
	return wanted && more.next && !more.fetching && !more.failed;
}

/** A window read's rows as a view can mount them. */
export interface WindowView {
	/** The rows the filter matches: the scroller's length. */
	total: number;
	/** Rows per page. */
	size: number;
	/** `total` long, the rows loaded in their places and holes elsewhere (read them by index, or `forEach` to skip the holes). */
	rows: readonly unknown[];
	/** These are the previous query's rows, kept drawn until the new query's first page lands. */
	kept: boolean;
	/** Loads the pages numbered (those not loaded, each once); rejects when one failed. */
	ensure: (pages: readonly number[]) => Promise<void>;
}
