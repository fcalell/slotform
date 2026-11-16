// The hooks a host holds its acts' runs and a control its saves with (the
// model is `../acts.ts`), over the binding's port, and `createActs`, which
// binds the act sequence to a platform's toast and its way of opening a route.
import { useRef, useState } from "react";
import {
	drew,
	holdSave,
	isPlaced,
	isThenable,
	type RunState,
	startRun,
} from "../acts.ts";
import type { Act, ActBase, Decision } from "../descriptors.ts";
import {
	type Datum,
	draftFor,
	endedReason,
	isEnded,
	type Kept,
	readKey,
	readsOf,
} from "../read.ts";
import { pressStands } from "../reason.ts";
import type { Tone } from "../tokens.ts";
import { ask } from "./confirm.ts";
import { usePort } from "./port.ts";
import { useSelections } from "./read.ts";
import { usePressed } from "./reason.ts";
import { useWords } from "./words.ts";

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
			!live && drawn.painted && isEnded(drawn.phase) ? drawn.phase : undefined,
		value: live ? live.value : (drawn.value as T),
		change,
	};
}

// A draft over a read that ended stands with no value and blocked, like an act
// over one: a change changes nothing and `say`s why, where its host draws a
// refusal.
export function blocked<T>(
	draft: Draft<T>,
	reason: string | undefined,
	say: (reason: string) => void,
): Draft<T> {
	if (reason === undefined) return draft;
	return {
		...draft,
		change: () => {
			say(reason);
			return undefined;
		},
	};
}

/** The draft a `FormField` hosts for its control's save, and the line the save's rejection draws in: the latest save's alone, cleared by the next change. Over a read that ended the control is blocked and the line holds the read's sentence once pressed, until the read answers. */
export function useFieldDraft<T>(value: Datum<T>): {
	draft: Draft<T>;
	refused: string | undefined;
} {
	const port = usePort();
	const words = useWords();
	const [refused, refuse] = useState<string>();
	const draft = useDraft(value, (error) =>
		refuse(port.refusal(error) ?? words.actFailed),
	);
	const reason = endedReason(words, draft.ended);
	const [pressed, press] = usePressed(reason);
	return {
		draft: blocked(
			{
				...draft,
				change: (next, save) => {
					refuse(undefined);
					return draft.change(next, save);
				},
			},
			reason,
			press,
		),
		refused: refused ?? (pressed ? reason : undefined),
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

/** What a platform's toast offers: how the act it reports ended, an act (a route or a retry), and a call once it has left. */
export interface ToastOptions {
	tone?: Tone;
	act?: Act;
	onGone?: () => void;
}

/** The two calls the act sequence makes of its platform: a toast, and the opening of an act's `to`. */
export interface ActPlatform {
	toast(sentence: string, options?: ToastOptions): void;
	open(href: string): unknown;
}

/** What `run` takes: the `onAct`, its wiring (`confirm`, `done`, `to`, and the `sheet` it opens instead of running), and the label and `destructive` a `confirm`'s decision draws its act with. */
export type Runnable = Partial<ActBase> & {
	confirm?: Decision;
	done?: string;
	to?: string;
	sheet?: unknown;
	label?: string;
	destructive?: boolean;
};

// What an act's holder reads: which act pends (inert at once; the pending look
// comes after `ACT_DELAY`), whether it holds its siblings (while one pends),
// the line its failure is drawn in, the call that runs an act, and which act's
// sheet is open (drawn by the holder through `ActSheet`, from that act's current
// `sheet`: the open state is all the holder keeps).
export interface Acting<K> {
	pending: K | undefined;
	holds: boolean;
	line: string | undefined;
	run(key: K, act: Runnable): void;
	sheet: { key: K; open: boolean; close: () => void } | undefined;
}

/** The act hooks over a platform's toast and route opening: `useAct`, a holder's run of its acts, and `useHeldDraft`, a bare control's draft. */
export function createActs(platform: ActPlatform): {
	useAct: <K = true>(where: "line" | "toast") => Acting<K>;
	useHeldDraft: <T>(value: Datum<T>) => Draft<T>;
} {
	/** A holder's run of its acts, and the one sequence every act goes through: its `confirm` asked (declined, nothing runs), then its `onAct`, then its `done` toasted, then its `to` followed; an act with a `sheet` opens it instead of running. `where` is the place a rejection is drawn: the holder's own `line`, or a failed toast whose Retry runs the act again (its `onAct`, `done` and `to`, not asked again). The sentence is the server's refusal, else the generic one; a refusal the server answered (a 4xx) has no Retry, as it would answer the same again; an act refused for the connection draws the generic one, with no Retry either, and the connection's own sentence is the offline banner's alone. */
	function useAct<K = true>(where: "line" | "toast"): Acting<K> {
		const port = usePort();
		const words = useWords();
		const run = useRun<K>();
		const [opened, setOpened] = useState<{ key: K; open: boolean }>();
		const sentenceOf = (error: unknown) =>
			port.refusal(error) ?? words.actFailed;
		const { pending, failure } = run;
		// The act's work: `onAct`, then `done`, then `to`, each once the one before
		// resolved (at once for an `onAct` that returns nothing).
		const work = (act: Runnable): unknown => {
			const result = act.onAct?.();
			const finish = () => {
				if (act.done) platform.toast(act.done);
				if (act.to) platform.open(act.to);
			};
			if (!isThenable(result)) {
				finish();
				return result;
			}
			return Promise.resolve(result).then((value) => {
				finish();
				return value;
			});
		};
		const go = (key: K, act: Runnable) => {
			if (act.sheet) {
				setOpened({ key, open: true });
				return;
			}
			run.run(key, () => {
				const result = work(act);
				if (where === "line" || !isThenable(result)) return result;
				return Promise.resolve(result).catch((error: unknown) => {
					drew(error);
					if (isPlaced(error)) return;
					platform.toast(sentenceOf(error), {
						tone: "failed",
						act: port.retries(error)
							? { label: words.retry, onAct: () => work(act) }
							: undefined,
					});
				});
			});
		};
		return {
			pending,
			holds: pending !== undefined,
			line:
				failure && !isPlaced(failure.error)
					? sentenceOf(failure.error)
					: undefined,
			run: (key, act) => {
				if (!act.confirm) return go(key, act);
				ask({
					...act.confirm,
					act: {
						label: act.label ?? words.done,
						destructive: act.destructive,
					},
				}).then((taken) => {
					if (taken) go(key, act);
				});
			},
			sheet: opened && {
				key: opened.key,
				open: opened.open,
				close: () => setOpened({ key: opened.key, open: false }),
			},
		};
	}

	/** A bare control's draft: its rejection toasts, and the toast's Retry saves the same value again, unless the server refused it (a 4xx). Over a read that ended the control is blocked and the press toasts the read's sentence. A control in a `FormField` is handed the field's draft instead (`useFieldDraft`), so the field's line draws the rejection. */
	function useHeldDraft<T>(value: Datum<T>): Draft<T> {
		const port = usePort();
		const words = useWords();
		const draft = useDraft(value, (error, again) => {
			platform.toast(port.refusal(error) ?? words.actFailed, {
				tone: "failed",
				act: port.retries(error)
					? { label: words.retry, onAct: again }
					: undefined,
			});
		});
		const reason = endedReason(words, draft.ended);
		// One sentence stands at a time: a drag or a run of keystrokes over it does
		// not stack toasts, and it is said again once its toast has left (or the
		// read has answered).
		const [saidUnder, setSaid] = useState<string>();
		const said = pressStands(reason, saidUnder);
		return blocked(draft, reason, (sentence) => {
			if (said) return;
			setSaid(sentence);
			platform.toast(sentence, {
				tone: "failed",
				onGone: () => setSaid(undefined),
			});
		});
	}

	return { useAct, useHeldDraft };
}
