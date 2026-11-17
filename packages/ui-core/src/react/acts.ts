// The hooks a host holds its acts' attempts and a control its saves with, and `createActs`: docs/architecture/ui-core/acts.md, "Act model".
import { useRef, useState } from "react";
import {
	type AttemptState,
	drew,
	isPlaced,
	isThenable,
	keepSave,
	startAttempt,
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
	/** The value is not here (its read waits, stands still or ended): `value` is the stand-in. */
	painted: boolean;
	/** The read the value is a selection over ended: the control stands with no value and blocked, a change saying so instead of changing. */
	ended: "failed" | "missing" | undefined;
	value: T;
	// `change` and how a save settles: docs/architecture/ui-core/acts.md, "Control saves".
	change: (next: T, save?: () => unknown) => Promise<void> | undefined;
}

// A field's value: docs/architecture/ui-core/acts.md, "Field values".
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
		keepSave(saving, readsOf(value), port.settled, {
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

export interface Attempt<K> {
	pending: K | undefined;
	// The newest attempt's rejection, until the next attempt.
	failure: { key: K; error: unknown } | undefined;
	attempt: (key: K, onAct: () => unknown) => void;
}

// A host's hold on its acts' attempts (`../acts.ts`): `key` names which act is attempted,
// for a host with several. The newest attempt wins. An attempt needs no read, so the
// port with no binding calls the act as it is.
export function useAttempt<K = true>(): Attempt<K> {
	const port = usePort();
	const [state, setState] = useState<AttemptState<K>>({});
	const latest = useRef(0);
	return {
		pending: state.pending,
		failure: state.failure,
		attempt: (key, onAct) => {
			const seq = ++latest.current;
			startAttempt(
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

/** What `attempt` takes: the `onAct`, its wiring (`confirm`, `done`, `to`, and the `sheet` it opens instead of running), and the label and `destructive` a `confirm`'s decision draws its act with. */
export type Attemptable = Partial<ActBase> & {
	confirm?: Decision;
	done?: string;
	to?: string;
	sheet?: unknown;
	label?: string;
	destructive?: boolean;
};

// What an act's holder reads: which act pends (inert at once; the pending look
// comes after `ACT_DELAY`), whether it holds its siblings (while one pends),
// the line its failure is drawn in, the call that attempts an act, and which act's
// sheet is open (drawn by the holder through `ActSheet`, from that act's current
// `sheet`: the open state is all the holder keeps).
export interface Acting<K> {
	pending: K | undefined;
	holds: boolean;
	line: string | undefined;
	attempt(key: K, act: Attemptable): void;
	sheet: { key: K; open: boolean; close: () => void } | undefined;
}

/** The act hooks over a platform's toast and route opening: `useAct`, a holder's attempt of its acts, and `useHeldDraft`, a bare control's draft. */
export function createActs(platform: ActPlatform): {
	useAct: <K = true>(where: "line" | "toast") => Acting<K>;
	useHeldDraft: <T>(value: Datum<T>) => Draft<T>;
} {
	/** A holder's attempt of its acts, and the one sequence every act goes through: its `confirm` asked (declined, nothing runs), then its `onAct`, then its `done` toasted, then its `to` followed; an act with a `sheet` opens it instead of running. `where` is the place a rejection is drawn: the holder's own `line`, or a failed toast whose Retry runs the act again (its `onAct`, `done` and `to`, not asked again). The sentence is the server's refusal, else the generic one; a refusal the server answered (a 4xx) has no Retry, as it would answer the same again; an act refused for the connection draws the generic one, with no Retry either, and the connection's own sentence is the offline banner's alone. */
	function useAct<K = true>(where: "line" | "toast"): Acting<K> {
		const port = usePort();
		const words = useWords();
		const attempt = useAttempt<K>();
		const [opened, setOpened] = useState<{ key: K; open: boolean }>();
		const sentenceOf = (error: unknown) =>
			port.refusal(error) ?? words.actFailed;
		const { pending, failure } = attempt;
		// The act's work: `onAct`, then `done`, then `to`, each once the one before
		// resolved (at once for an `onAct` that returns nothing).
		const work = (act: Attemptable): unknown => {
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
		const go = (key: K, act: Attemptable) => {
			if (act.sheet) {
				setOpened({ key, open: true });
				return;
			}
			attempt.attempt(key, () => {
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
			attempt: (key, act) => {
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
