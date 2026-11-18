// The hooks a leaf, a frame and a collection subscribe to their reads with: docs/architecture/ui-core/reads.md, "Read hooks".
import {
	createContext,
	createElement,
	type ReactNode,
	use,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { reached } from "../reached.ts";
import {
	combine,
	createFlags,
	type Datum,
	type Drawn,
	endedReason,
	type Fielded,
	frameOf,
	type Held,
	type Holds,
	heldStandIn,
	holdReads,
	holdsOf,
	isEnded,
	isSelection,
	lift,
	type More,
	moreOf,
	NO_HOLDS,
	placeholderData,
	planFrame,
	planSelections,
	type Read,
	type ReadAnswer,
	type Selection,
	type WindowState,
	type WindowView,
} from "../read.ts";
import { OPTION_TEXT, type OptionText } from "../reason.ts";
import type { Words } from "../tokens.ts";
import { reachesEnd } from "../window.ts";
import { usePort } from "./port.ts";

// Distributive, so a `Datum<T>` prop gives `T`.
type Unwrap<D> = D extends Selection<infer T> ? T : D;

// The leaf's one subscription: docs/architecture/ui-core/reads.md, "Read hooks".
export function useSelections<const V extends readonly unknown[]>(
	values: V,
): {
	readonly [K in keyof V]: Drawn<Unwrap<V[K]>>;
} {
	const port = usePort();
	const plan = useMemo(() => planSelections(values), [values]);
	// `draw` answers `Drawn<unknown>` per value; each is its value's type, which
	// the plan, built over `readonly unknown[]`, does not carry.
	return port.useReads(plan.queries(placeholderData), plan.draw) as never;
}

// A leaf that stands its act blocked with the failed sentence of the
// selection it reads (`phase` "failed") draws that failure itself, so it is an
// observer carrying `heldStandIn`, the read's holder for the dev check: no
// frame is needed to draw it. It notifies on nothing and draws no busy or stale
// flag; a read an enclosing frame holds counts once more, which changes
// nothing a frame draws.
export function useDrawsFailure(values: readonly unknown[]): void {
	const port = usePort();
	const plan = useMemo(() => planSelections(values), [values]);
	port.useReads(
		plan.painted.map((read) => ({
			read,
			standIn: heldStandIn,
			silent: true,
		})),
	);
}

// The one boolean a holder with no value of its own needs (a bar's filled act):
// whether any of these selections has no data. Its `combine` returns the
// boolean, so the holder renders when that answer changes and never on a
// value's.
export function usePainted(values: readonly unknown[]): boolean {
	const port = usePort();
	const plan = useMemo(() => planSelections(values), [values]);
	const combine = useMemo(
		() => (results: readonly ReadAnswer[]) =>
			plan.draw(results).some((drawn) => drawn.painted),
		[plan],
	);
	return port.useReads(plan.queries(placeholderData), combine);
}

// The query hashes the frames above hold: docs/architecture/ui-core/reads.md, "Holding a read".
const HoldsContext = createContext<Holds>(NO_HOLDS);

export function FrameHolds(props: { holds: Holds; children?: ReactNode }) {
	return createElement(HoldsContext, { value: props.holds }, props.children);
}

const FLAGS = createFlags();

// A frame's one subscription: docs/architecture/ui-core/reads.md, "Holding a read".
export function useFrameRead<S>(
	selection: Selection<unknown> | undefined,
	derive: (held: Held) => S,
): {
	state: S;
	retry: () => Promise<unknown>;
	holding: boolean;
	flags: boolean;
	holds: Holds;
} {
	const port = usePort();
	const enclosing = use(HoldsContext);
	const plan = useMemo(
		() =>
			planFrame(
				selection,
				derive,
				(r) => ({ fetchMore: port.fetchingNext(r) }),
				enclosing,
			),
		[selection, derive, port, enclosing],
	);
	const holds = holdsOf(enclosing, plan.held);
	const id = useId();
	const hash = plan.held?.key;
	useEffect(
		() => (hash === undefined ? undefined : FLAGS.take(hash, id)),
		[hash, id],
	);
	const flagged = () => hash !== undefined && FLAGS.flags(hash, id);
	const flags = useSyncExternalStore(FLAGS.subscribe, flagged, flagged);
	useEffect(
		() => holdReads(plan.held ? [plan.held, ...plan.extra] : []),
		[plan],
	);
	const state = port.useReads(plan.queries, plan.combine);
	// The refetch itself, so a Retry draws its own pending until it settles.
	const retry = () => (plan.held ? port.retry(plan.held) : Promise.resolve());
	return { state, retry, holding: plan.held !== undefined, flags, holds };
}

/** A frame's one subscription to its read (a read or a selection): the shape it draws (from its own selection's reads), its count, whether it refetches, whether it holds its read (it draws that read's busy, stale and paused flags), whether it `flags` it (of sibling frames over one read, the first draws the busy mark), the hashes it and its ancestors hold (`held`, for its body to publish) and the retry. */
export function useFrame(read?: Selection<unknown>) {
	const {
		state,
		retry,
		holding,
		flags,
		holds: held,
	} = useFrameRead(read, frameOf);
	return {
		...state,
		holds: holding,
		flags,
		held,
		retry,
	};
}

export type Frame = ReturnType<typeof useFrame>;

/** A collection's subscription to its items: what it draws (the stand-in while its read waits) and its own frame, from its own selection alone, so its failed, missing and empty shapes never depend on what stands above it. A constant has no frame to speak of: it draws as given. */
export function useCollection<T>(items: Datum<readonly T[]>) {
	const [drawn] = useSelections([items] as const);
	const frame = useFrame(isSelection(items) ? items : undefined);
	// `Unwrap` over a generic `T` stays unresolved; it is `readonly T[]`.
	return { drawn: drawn as Drawn<readonly T[]>, frame };
}

/** A row's subscription to the selections it draws (a definition's value and description, a meter's label, value and max): the row is their frame, as a collection is its items'. It holds the one read no enclosing frame holds, so a row outside every frame draws its own failure (`ended`: its read failed or is missing) and its retry, and a row whose read an enclosing frame holds draws nothing of its own: that frame's failed shape stands once, in its place. `busy` is the retry running. */
export function useRow(data: readonly unknown[]) {
	// The selection is memoized by the list's identity, as `useSelections`' plan
	// is (the React Compiler gives a literal list that identity).
	const selection = useMemo(() => {
		const drawn = data.filter(isSelection);
		return drawn.length > 0 ? combine(drawn, () => null) : undefined;
	}, [data]);
	const frame = useFrame(selection);
	const ended = frame.holds && isEnded(frame.shape) ? frame.shape : undefined;
	return { ended, busy: frame.busy, retry: frame.retry };
}

// A control holds its options' read and draws no flags of it: nothing about
// the read's refetching is its to say, so the frame's state is not derived.
const NO_FLAGS = () => null;

/** A control's subscription to its options: what it draws (the stand-in while its read waits, with the phase it stands in) and the retry. It holds the read no frame above holds, so a control in a toolbar outside any frame says its failure itself, but draws no busy or stale flag. A constant draws as given, and a constant whose `label`, `line` or `blocked` is a selection draws as the selection of the whole (`lift`). */
export function useOptions<O>(given: Fielded<O, OptionText>) {
	const options = lift<O, OptionText>(given, OPTION_TEXT, "options");
	const [drawn] = useSelections([options] as const);
	const { retry } = useFrameRead(
		isSelection(options) ? options : undefined,
		NO_FLAGS,
	);
	// `Unwrap` over a generic `O` stays unresolved; it is `O`.
	return { drawn: drawn as Drawn<O>, retry };
}

/** What the bar that submits a frame's data takes from the frame's own read: whether its filled act paints (the read waits or stands still, so the bar keeps its loaded box) and the reason it stands blocked under (the read failed or is missing). A group's read is not the form's, so it never reaches the bar. */
export function submitOf(words: Words, shape: Frame["shape"]) {
	return {
		waiting: shape === "waiting" || shape === "still",
		ended: endedReason(words, shape),
	};
}

/** Whether a frame has a body to draw: its failed, missing or empty shape, or children that draw. A frame with neither draws no body box, since an empty one only takes its padding. */
export function hasBody(frame: Frame, children: ReactNode): boolean {
	return (
		isEnded(frame.shape) ||
		frame.shape === "empty" ||
		(children !== undefined && children !== null && children !== false)
	);
}

// The collection's side of a pages read: an observer that never fetches by
// mounting, so the query is the frame's and the leaf's, and a page is fetched
// only when the more row asks (`fetchesMore`).
export function useMore(read: Read<unknown>): More {
	return usePort().useNextPage(read);
}

// The rows of a state in their places, a hole for each not loaded.
function rowsOf(state: WindowState): unknown[] {
	const rows = new Array<unknown>(state.total);
	for (const [page, loaded] of Object.entries(state.pages) as [
		string,
		readonly unknown[],
	][]) {
		const from = Number(page) * state.size;
		loaded.forEach((row, at) => {
			if (from + at < state.total) rows[from + at] = row;
		});
	}
	return rows;
}

/** A collection's side of a window read: the same query the frame holds and the leaf draws, observed with the previous query's data kept until the new one has a first page (a changed input is a new key; the old rows stay drawn). It never fetches by mounting; the view asks for the pages it mounts through `ensure`. Undefined until the first page is in. */
export function useWindow(
	read: Read<unknown> | undefined,
): WindowView | undefined {
	const port = usePort();
	const { state, kept } = port.useWindowState(read);
	const latest = useRef(read);
	latest.current = read;
	const ensure = useCallback(
		(pages: readonly number[]) =>
			latest.current
				? port.ensurePages(latest.current, pages)
				: Promise.resolve(),
		[port],
	);
	return useMemo(
		() =>
			state
				? {
						total: state.total,
						size: state.size,
						rows: rowsOf(state),
						kept,
						ensure,
					}
				: undefined,
		[state, kept, ensure],
	);
}

/** The collection's side of a window read below the scroller (or one whose rows are only listed): "Show more" loads the page after the rows loaded from the start. */
export function useWindowMore(read: Read<unknown>): More {
	const port = usePort();
	const { state } = port.useWindowState(read);
	const [pending, setPending] = useState(false);
	const [failed, setFailed] = useState(false);
	const fetch = async () => {
		if (!state) return;
		setPending(true);
		setFailed(false);
		try {
			await port.ensurePages(read, [reached(state)]);
		} catch {
			setFailed(true);
		} finally {
			setPending(false);
		}
	};
	return { next: moreOf(state), fetching: pending, failed, fetch };
}

/** Whether a windowed collection's mounted rows reach the last of its `count` loaded (`reachesEnd`), for its more row to fetch without a press. Hand `onLast` the highest index mounted each time the mounted rows change. `reached` holds for the count it was seen at, so a page that lands is not taken for the end again before the rows have ranged over it. */
export function useReach(count: number): {
	reached: boolean;
	onLast: (last: number) => void;
} {
	const [seen, setSeen] = useState<number>();
	const onLast = useCallback(
		(last: number) => setSeen(reachesEnd(last, count) ? count : undefined),
		[count],
	);
	return { reached: seen === count, onLast };
}
