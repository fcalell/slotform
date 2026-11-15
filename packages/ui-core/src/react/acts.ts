// The hooks a host holds its acts' runs and a control its saves with (the
// model is `../acts.ts`), over the binding's port.
import { useRef, useState } from "react";
import {
	drew,
	holdSave,
	isThenable,
	type RunState,
	startRun,
} from "../acts.ts";
import { type Datum, draftFor, type Kept, readKey, readsOf } from "../read.ts";
import { usePort } from "./port.ts";
import { useSelections } from "./read.ts";

export interface Draft<T> {
	/** The value is not here (its read waits, stands still or ended): `value` is the placeholder. */
	painted: boolean;
	/** The read the value is a selection over ended: the control stands with no value and blocked, a change saying so instead of changing. */
	ended: "failed" | "missing" | undefined;
	value: T;
	// A plain edit is kept over a selection until its read's key changes. A
	// `save` that returns a promise holds `next` (a constant's too) instead, and
	// the latest save's outcome decides: resolved, the hold waits for the
	// refetch its invalidation started on this value's reads, then the value
	// follows its datum unless edited since; rejected, it falls back to the
	// datum and `failed` hears the error with a way to save the same value again.
	// It returns that save's promise (never rejecting: the rejection is `failed`'s
	// to draw), so an act that saves again holds the run.
	change: (next: T, save?: () => unknown) => Promise<void> | undefined;
}

// A field's value: its selection until the viewer edits it, the edit after. An
// edit belongs to the read it was made over, so a selection over another read
// drops it (`draftFor`). A constant is the app's own state: it passes through,
// so a value the app changes shows, and a plain edit has nothing to keep.
export function useDraft<T>(
	value: Datum<T>,
	failed?: (error: unknown, again: () => unknown) => void,
): Draft<T> {
	const port = usePort();
	const [drawn] = useSelections([value] as const);
	const key = readKey(value);
	const [kept, setKept] = useState<Kept<T> | null>(null);
	const [held, setHeld] = useState<Kept<T> | null>(null);
	const latest = useRef(0);
	const liveKept = draftFor(kept, key);
	const liveHeld = draftFor(held, key);
	if (kept && !liveKept) setKept(null);
	if (held && !liveHeld) setHeld(null);
	const live = liveHeld ?? liveKept;
	const change = (next: T, save?: () => unknown): Promise<void> | undefined => {
		const seq = ++latest.current;
		const saving = save && port.act(save);
		if (!isThenable(saving)) {
			setHeld(null);
			if (key !== undefined) setKept({ key, value: next });
			return undefined;
		}
		setKept(null);
		setHeld({ key, value: next });
		holdSave(saving, readsOf(value), port.settled, {
			latest: () => seq === latest.current,
			release: () => setHeld(null),
			rollback: (error) => {
				setHeld(null);
				if (!failed) return;
				drew(error);
				failed(error, () => change(next, save));
			},
		});
		return Promise.resolve(saving).then(
			() => undefined,
			() => undefined,
		);
	};
	return {
		painted: !live && drawn.painted,
		ended:
			!live &&
			drawn.painted &&
			(drawn.phase === "failed" || drawn.phase === "missing")
				? drawn.phase
				: undefined,
		value: live ? live.value : (drawn.value as T),
		change,
	};
}

export interface Run<K> {
	pending: K | undefined;
	// The newest run's rejection, until the next run.
	failure: { key: K; error: unknown } | undefined;
	run: (key: K, onAct: () => unknown) => void;
}

// A host's hold on its acts' runs (`../acts.ts`): `key` names which act runs,
// for a host with several. The newest run wins. A run needs no read, so the
// port with no binding calls the act as it is.
export function useRun<K = true>(): Run<K> {
	const port = usePort();
	const [state, setState] = useState<RunState<K>>({});
	const latest = useRef(0);
	return {
		pending: state.pending,
		failure: state.failure,
		run: (key, onAct) => {
			const seq = ++latest.current;
			startRun(
				key,
				() => port.act(onAct),
				() => seq === latest.current,
				setState,
			);
		},
	};
}
