// What an act is made of, apart from how it is drawn and what runs it: whether
// an `onAct` hands back its promise so the act can hold it, an act as a slot
// takes it (`Offered`), the run and save logic the hooks in `./react/acts.ts`
// wrap, and the marks a host leaves on a rejection it drew. Pure, so the hooks
// and the binding share one core.
import { type Datum, dev, type Fielded, lift, type Read } from "./read.ts";
import { ACT_TEXT, type ActText } from "./reason.ts";

// One thing a procedure's input schema refused: the schema's own message as a
// sentence, and the path of the value it refused (`["address", "city"]`, empty
// for the input as a whole).
export interface Issue {
	path: readonly (string | number)[];
	message: string;
}

export function isThenable(v: unknown): v is PromiseLike<unknown> {
	return (
		(typeof v === "object" || typeof v === "function") &&
		v !== null &&
		typeof (v as { then?: unknown }).then === "function"
	);
}

// Rejections a host drew (a line, a toast, a field's error): the binding's dev
// check of failed mutations stays quiet for them. Only objects can be marked.
const drawn = new WeakSet<object>();

export function drew(error: unknown): void {
	if (dev() && typeof error === "object" && error !== null) drawn.add(error);
}

// Whether a host marked this rejection with `drew`.
export function wasDrawn(error: unknown): boolean {
	return typeof error === "object" && error !== null && drawn.has(error);
}

// Rejections whose every sentence already stands where it belongs (a form's
// refused values, each under the field it names): the host that ran the act
// draws no line and no toast of its own for one, so the sentence stands once.
const placedErrors = new WeakSet<object>();

/** Marks a rejection whose sentences its own host already draws in place: the act's holder draws no line or toast for it, the act ready again. */
export function placed(error: unknown): void {
	if (typeof error === "object" && error !== null) placedErrors.add(error);
}

// Whether a host marked this rejection with `placed`.
export function isPlaced(error: unknown): boolean {
	return typeof error === "object" && error !== null && placedErrors.has(error);
}

/** An act, a link or a list of them as a slot takes it: a constant, a selection of the whole, or a constant whose `label` or `blocked` is a selection (a reason from a read, a label that counts). */
export type Offered<T> = Fielded<T, ActText>;

/** An `Offered` made whole (a selection of the act with each text prop's value in its place), which the host draws as any act given as a datum. */
export function offered<T>(given: Offered<T>): Datum<T>;
export function offered<T>(given: Offered<T> | undefined): Datum<T> | undefined;
export function offered<T>(
	given: Offered<T> | undefined,
): Datum<T> | undefined {
	return lift<T, ActText>(given, ACT_TEXT);
}

export interface RunState<K> {
	pending?: K;
	failure?: { key: K; error: unknown };
}

// One act's run: pending from the press until its promise settles, its
// rejection kept as the failure until the next run. `latest` says whether this
// run is still the newest, and only the newest's outcome counts. A sync throw
// clears the state and rethrows; a result that is no promise is done at once.
export function startRun<K>(
	key: K,
	onAct: () => unknown,
	latest: () => boolean,
	set: (state: RunState<K>) => void,
): void {
	let result: unknown;
	try {
		result = onAct();
	} catch (error) {
		set({});
		throw error;
	}
	if (!isThenable(result)) {
		set({});
		return;
	}
	set({ pending: key });
	result.then(
		() => {
			if (latest()) set({});
		},
		(error) => {
			// The host's line draws the newest failure; a superseded one is moot.
			drew(error);
			if (latest()) set({ failure: { key, error } });
		},
	);
}

// What happens to a control's held value when its save settles. Only the
// latest save counts: a resolved one releases once its reads' refetch is over
// (`settled`, and only if nothing was edited meanwhile), a rejected one rolls
// back.
export function holdSave(
	save: PromiseLike<unknown>,
	reads: readonly Read<unknown>[],
	settled: (reads: readonly Read<unknown>[]) => Promise<void>,
	to: {
		latest: () => boolean;
		release: () => void;
		rollback: (error: unknown) => void;
	},
): void {
	save.then(
		() =>
			settled(reads).then(() => {
				if (to.latest()) to.release();
			}),
		(error) => {
			if (to.latest()) to.rollback(error);
			else drew(error);
		},
	);
}

// An act refused before it was sent because the server is out of reach. The
// host draws it as any failed press, the generic sentence with no Retry; the
// connection's own sentence is the app's offline banner.
export class Unreached extends Error {
	constructor() {
		super("The server is out of reach.");
		this.name = "Unreached";
	}
}
