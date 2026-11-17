// The act model, pure so the hooks and the binding share one core: docs/architecture/ui-core/acts.md, "Act model".
import type { Act } from "./descriptors.ts";
import {
	type Datum,
	type Drawn,
	dev,
	endedReason,
	type Fielded,
	lift,
	type Read,
} from "./read.ts";
import { ACT_TEXT, type ActText } from "./reason.ts";
import type { Words } from "./tokens.ts";

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

// Placed rejections: docs/architecture/ui-core/acts.md, "Rejections".
const placedErrors = new WeakSet<object>();

/** Marks a rejection whose sentences its own host already draws in place: the act's holder draws no line or toast for it, the act ready again. */
export function placed(error: unknown): void {
	if (typeof error === "object" && error !== null) placedErrors.add(error);
}

// Whether a host marked this rejection with `placed`.
export function isPlaced(error: unknown): boolean {
	return typeof error === "object" && error !== null && placedErrors.has(error);
}

/** An act, a link or a list of them as a region takes it: a constant, a selection of the whole, or a constant whose `label` or `blocked` is a selection (a reason from a read, a label that counts). */
export type Offered<T> = Fielded<T, ActText>;

/** An `Offered` made whole (a selection of the act with each text prop's value in its place), which the host draws as any act given as a datum. */
export function offered<T>(given: Offered<T>): Datum<T>;
export function offered<T>(given: Offered<T> | undefined): Datum<T> | undefined;
export function offered<T>(
	given: Offered<T> | undefined,
): Datum<T> | undefined {
	return lift<T, ActText>(given, ACT_TEXT);
}

export interface AttemptState<K> {
	pending?: K;
	failure?: { key: K; error: unknown };
}

// One act's attempt: pending from the press until its promise settles, its
// rejection kept as the failure until the next attempt. `latest` says whether this
// attempt is still the newest, and only the newest's outcome counts. A sync throw
// clears the state and rethrows; a result that is no promise is done at once.
export function startAttempt<K>(
	key: K,
	onAct: () => unknown,
	latest: () => boolean,
	set: (state: AttemptState<K>) => void,
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

// A control save settling: docs/architecture/ui-core/acts.md, "Control saves".
export function keepSave(
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

// An act refused because the server is out of reach: docs/architecture/ui-core/acts.md, "Rejections".
export class Unreached extends Error {
	constructor() {
		super("The server is out of reach.");
		this.name = "Unreached";
	}
}

/** What a more menu holds and whether it paints: its own items, or the one blocked item once their read ended. The items are the datum the leaf already subscribed to (`useSelections`); a menu with no items and nothing painting draws no menu. A refusal is the item's own blocked reason, so it toasts or shows as the menu does for any blocked item. */
export function moreMenu<E>(
	words: Words,
	offer: Drawn<readonly E[] | undefined>,
): { painted: boolean; items: readonly (E | Act)[] } {
	if (!offer.painted) return { painted: false, items: offer.value ?? [] };
	const ended = endedReason(words, offer.phase);
	if (ended === undefined) return { painted: true, items: [] };
	return { painted: false, items: endedItems(words, ended) };
}

// A blocked act is never pressed; its type still asks for the attempt.
const NEVER_PRESSED = (): void => undefined;

/** The one blocked item a menu stands as while its read has ended: nothing can be taken from it, and its reason says why. */
export function endedItems(words: Words, reason: string): readonly Act[] {
	return [{ label: words.more, blocked: reason, onAct: NEVER_PRESSED }];
}
