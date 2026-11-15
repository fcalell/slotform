// The hooks a leaf, a frame and a collection subscribe to their reads with,
// over the binding's port (`./port.ts`); the model they plan with is
// `../read.ts`.
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
import {
	createMarks,
	type Drawn,
	type Held,
	type Holds,
	heldPlaceholder,
	holdReads,
	holdsOf,
	type More,
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
import { usePort } from "./port.ts";

// A datum's value type: a selection's, or the constant itself. Distributive,
// so a `Datum<T>` prop gives `T`.
type Unwrap<D> = D extends Selection<infer T> ? T : D;

// The leaf's one subscription: each value that is a selection is read, the
// rest are constants. One observation for any count, so the hook count is
// fixed. A read still to land draws from the placeholder and says so (`painted`).
// The plan is memoized by `values`' identity, which keeps `combine` stable
// (the binding re-runs it when its identity changes); the React Compiler gives
// a literal list that identity.
export function useSelections<const V extends readonly unknown[]>(
	values: V,
): {
	readonly [K in keyof V]: Drawn<Unwrap<V[K]>>;
} {
	const port = usePort();
	const plan = useMemo(() => planSelections(values), [values]);
	return port.useReads(plan.queries(placeholderData), plan.draw) as never;
}

// A leaf that stands its act blocked with the failed sentence of the
// selection it reads (`phase` "failed") draws that failure itself, so it is an
// observer carrying `heldPlaceholder`, the read's holder for the dev check: no
// frame is needed to draw it. It notifies on nothing and draws no busy or stale
// flag; a read an enclosing frame holds counts once more, which changes
// nothing a frame draws.
export function useDrawsFailure(values: readonly unknown[]): void {
	const port = usePort();
	const plan = useMemo(() => planSelections(values), [values]);
	port.useReads(
		plan.painted.map((read) => ({
			read,
			placeholder: heldPlaceholder,
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

// The query hashes the frames above hold, identity only: it places flags (which
// frame draws a read's busy mark and its stale and paused line) and changes no
// frame's form. A nested frame holds the read of its selection that is not in
// it. A frame that holds nothing passes its parent's holds on, and frames over
// the same keys share one identity (`holdsOf`).
const HoldsContext = createContext<Holds>(NO_HOLDS);

export function FrameHolds(props: { holds: Holds; children?: ReactNode }) {
	return createElement(HoldsContext, { value: props.holds }, props.children);
}

// Which of the frames holding one read draws its busy mark: the first to take it.
const MARKS = createMarks();

// A frame's one subscription: the same observation a leaf makes (placeholder
// on), with `derive` run in `combine`, so the frame renders when its derived
// state changes (form, count, busy) and never on a value change. Pass a
// `derive` that is stable (a module function): its identity is the combine's.
// The frame's form comes from every non-quiet read of its own selection; it
// holds at most one read, the first that no enclosing frame holds (its
// observers carry `heldPlaceholder`, which the dev check reads, and a second is
// a dev error), and returns `holds`, that hash with the enclosing ones, for its
// body to publish through `FrameHolds`; `holding` says it holds one, and
// `marks` that it draws that read's busy mark: of sibling frames over one read,
// only the first does. `retry` refetches the read it holds.
export function useFrameRead<S>(
	selection: Selection<unknown> | undefined,
	derive: (held: Held) => S,
): {
	state: S;
	retry: () => Promise<unknown>;
	holding: boolean;
	marks: boolean;
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
		() => (hash === undefined ? undefined : MARKS.take(hash, id)),
		[hash, id],
	);
	const mark = () => hash !== undefined && MARKS.marks(hash, id);
	const marks = useSyncExternalStore(MARKS.subscribe, mark, mark);
	useEffect(
		() => holdReads(plan.held ? [plan.held, ...plan.extra] : []),
		[plan],
	);
	const state = port.useReads(plan.queries, plan.combine);
	// The refetch itself, so a Retry draws its own pending until it settles.
	const retry = () => (plan.held ? port.retry(plan.held) : Promise.resolve());
	return { state, retry, holding: plan.held !== undefined, marks, holds };
}

// The collection's side of a pages read: an observer that never fetches by
// mounting, so the query is the frame's and the leaf's, and a page is fetched
// only when the viewer asks.
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
	const view = useWindow(read);
	const [pending, setPending] = useState(false);
	const [failed, setFailed] = useState(false);
	const reached = (() => {
		if (!view) return 0;
		let page = 0;
		while (view.rows[page * view.size] !== undefined) page++;
		return page;
	})();
	const next = view !== undefined && reached * view.size < view.total;
	const fetch = async () => {
		if (!view) return;
		setPending(true);
		setFailed(false);
		try {
			await view.ensure([reached]);
		} catch {
			setFailed(true);
		} finally {
			setPending(false);
		}
	};
	return { next, fetching: pending, failed, fetch };
}
