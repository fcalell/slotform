import { Button as BaseButton } from "@base-ui/react/button";
import { chosenAbsent, kindOf, NO_FAILURE } from "@fcalell/ui-core/action-bar";
import { cn } from "@fcalell/ui-core/cn";
import type { ChosenCount, LinkAct } from "@fcalell/ui-core/descriptors";
import { formatterFor } from "@fcalell/ui-core/format";
import type { Acting } from "@fcalell/ui-core/react/acts";
import { ReasonHostContext } from "@fcalell/ui-core/react/reason";
import { useTouched } from "@fcalell/ui-core/react/touched";
import { useWords } from "@fcalell/ui-core/react/words";
import { pressStands } from "@fcalell/ui-core/reason";
import { filled } from "@fcalell/ui-core/tokens";
import {
	ACTION_BAR,
	ACTION_BAR_ACTS,
	ACTION_BAR_ALL,
	ACTION_BAR_CHOSEN,
	ACTION_BAR_CHOSEN_COLUMN,
	PRESS_WASH,
	text,
} from "@fcalell/ui-core/variants";
import { useState } from "react";
import { IconButtonBase } from "../../atoms/button/glyph.tsx";
import { ButtonLink } from "../../atoms/button/link.tsx";
import { Reason } from "../../atoms/button/reason.tsx";
import type { Act } from "../../lib/act.ts";
import { useAct } from "../../lib/act.ts";
import { ActInert, SubmitContext } from "../../lib/form.ts";
import { PendingBar } from "../banner/pending.tsx";
import { ButtonBase } from "../button/base.tsx";
import { MenuBase } from "../menu/base.tsx";
import type { ActionBarProps } from "./index.tsx";

// The bar is the `acts` container, its acts laid out by its width alone
// (`acts-stacked:`): plugins/react-ui/guide/acts.md, "ActionBar". The tree
// holds the acts in reading order, the filled act
// last, so a stacked bar runs in reverse to draw it on top.
const BAR = "@container/acts flex flex-col w-full";
const ACTS =
	"flex flex-wrap items-center justify-end min-w-0 acts-stacked:flex-col-reverse acts-stacked:items-stretch acts-stacked:*:w-full";
const LINE = "text-end acts-stacked:text-start";

// A pending bar stands over the bar it replaces: the loaded bar holds the
// row's height at every density and wrap, unseen, inert and out of the tree
// readers walk, and the pending bar fills that box.
const HOLD = "relative self-stretch";
const OVER = "absolute inset-0";
const GHOST = "invisible";

// A chosen bar is one row that wraps only when it must: the count, then the
// act that chooses every row while some stand unchosen and the icon that
// clears the choice, at its start, and the acts at its end (the more menu, then
// the filled act). The count sets tabular digits, so it moves only when its
// digits do.
const SELECTION = "flex flex-wrap items-center justify-between self-stretch";
const CHOSEN_ACTS = "flex items-center";
const COUNT = "flex items-center shrink-0";
const ALL = cn(
	"inline-flex shrink-0 items-center whitespace-nowrap text-ink-meta",
	PRESS_WASH,
);
const ALL_LABEL = "whitespace-nowrap";
const SENTENCE = "shrink-0 whitespace-nowrap tabular-nums";
const NUMBER = formatterFor("number");
/** What a docked foot gives the bar it draws; no app sets it, so it is outside `ActionBarProps`. */
interface ActionBarInternal {
	/** The bar keeps the reason's line before a reason shows, so showing it never moves the act it describes. */
	kept?: boolean;
	/** The holder that hosts this bar's acts' attempt, when the bar is not the only host (a sheet holds its dismissal while its bar's act pends). Absent, the bar hosts its own. */
	acting?: Acting<number>;
	/** The read the filled act submits waits or stands still: the act paints, inert, in its loaded box. */
	painted?: boolean;
	/** The read the filled act submits has ended: the act stands blocked under this reason, the failed sentence or `words.missing`. The body already says why, so the bar draws the sentence on a press only, while that press stands. */
	ended?: string;
	/** The filled act is its form's submit button, so Enter in a field presses it. */
	submits?: boolean;
	/** A press of the filled act while it is blocked: the form it submits shows what blocks it. */
	onBlocked?: () => void;
}

function AllAct(props: { label: string; onAct: () => void }) {
	return (
		<BaseButton onClick={props.onAct} className={cn(ACTION_BAR_ALL, ALL)}>
			<span className={cn(text({ role: "meta" }), ALL_LABEL)}>
				{props.label}
			</span>
		</BaseButton>
	);
}

/** A chosen bar's count, then the act that chooses every row while some stand unchosen and the one that clears the choice. */
function Count({ chosen }: { chosen: ChosenCount }) {
	const words = useWords();
	const { onAll } = chosen;
	const counts = {
		count: NUMBER.format(chosen.count),
		of: NUMBER.format(chosen.of),
	};
	const said =
		chosen.noun === undefined
			? filled(words.chosenOf, counts)
			: filled(words.chosenNounOf, { ...counts, noun: chosen.noun });
	return (
		<div className={cn(ACTION_BAR_CHOSEN, COUNT)}>
			<span role="status" className={cn(text({ role: "meta" }), SENTENCE)}>
				{said}
			</span>
			{onAll && chosen.count < chosen.of ? (
				<AllAct label={words.chooseAll} onAct={() => onAll(true)} />
			) : null}
			{onAll && chosen.count > 0 ? (
				<IconButtonBase
					icon="X"
					label={words.chooseNone}
					onClick={() => onAll(false)}
				/>
			) : null}
		</div>
	);
}

export function ActionBarBase({
	acts: offered,
	chosen,
	pending,
	kept,
	acting: given,
	painted = false,
	ended,
	submits = false,
	onBlocked,
}: ActionBarProps & ActionBarInternal) {
	const words = useWords();
	const own = useAct<number>("line");
	// A failure draws in the bar's line under the acts; the same line says the
	// connection refused an act.
	const acting = given ?? own;
	// The filled act is the one a read's end blocks. Its sentence is the body's
	// already, so it draws on a press, not at rest.
	const acts =
		ended === undefined
			? offered
			: offered.map((act, at) =>
					at === offered.length - 1 ? { ...act, blocked: ended } : act,
				);
	const { touched, leave } = useTouched();
	// The reason a blocked act was pressed under: the press stands while that act
	// is blocked by it (`pressStands`).
	const [pressedUnder, setPressedUnder] = useState<string>();
	const pressed = pressStands(ended, pressedUnder);
	// A blocked act waits for a touch: inert and silent until it is pressed, or
	// until its form or sheet has taken input; then its reason stands, in the line
	// a failure would draw in (the pressed act's, else the last blocked act's).
	// The filled act's, once its read ended, is the body's and draws on a press
	// alone.
	const reasoned = ended === undefined ? acts : acts.slice(0, -1);
	const reason = reasoned.findLast((act) => act.blocked !== undefined)?.blocked;
	const pressedReason = reasoned.some((act) =>
		pressStands(act.blocked, pressedUnder),
	)
		? pressedUnder
		: undefined;
	const standing = pressedReason ?? (touched ? reason : undefined);
	// The line stands only while it says something: a failure, a reason standing
	// in answer to the viewer's press or input, or the ended read's sentence on
	// a press. A blocked act takes no room before then, and the line leaves
	// with what it said; only a docked foot's bar keeps its box (`kept`).
	const said = acting.line ?? standing ?? (pressed ? ended : undefined);
	const failed =
		acting.line !== undefined && acting.pending === undefined && !pressed;
	const lastAt = acts.length - 1;
	const ordered = acts.map((act, at) => [act, at] as const);
	// The press ends the form's edit before the filled act runs, so an act that
	// navigates is not asked; a rejection puts the edit back.
	const press = (act: Act, at: number) => {
		const { onAct } = act;
		return acting.attempt(at, {
			...act,
			onAct: at === lastAt && onAct ? () => leave.run(onAct) : onAct,
		});
	};
	// The bar under a `PendingBar` is drawn with no act that submits or presses.
	// A link (a way back, a way home) goes to its route as an anchor, quiet
	// unless it is the filled act; blocked, it stands as a blocked act does,
	// its reason in the bar's line.
	const button = (
		[act, at]: readonly [Act | LinkAct, number],
		ghost: boolean,
	) => {
		const last = at === lastAt;
		const running = acting.pending === at;
		if ("href" in act && act.blocked === undefined)
			return (
				<ButtonLink
					key={act.label}
					act={kindOf({ quiet: true }, last)}
					icon={act.icon}
					label={act.label}
					href={act.href}
				/>
			);
		return (
			<ReasonHostContext
				key={act.label}
				value={() => {
					setPressedUnder(act.blocked);
					if (last) onBlocked?.();
				}}
			>
				<SubmitContext value={!ghost && last && submits}>
					<ActInert value={ghost || (acting.holds && !running)}>
						<ButtonBase
							act={kindOf("href" in act ? {} : act, last)}
							label={act.label}
							onAct={"href" in act ? undefined : () => press(act, at)}
							pending={running}
							blocked={act.blocked}
							painted={last && painted}
						/>
					</ActInert>
				</SubmitContext>
			</ReasonHostContext>
		);
	};
	const acted = (ghost: boolean) => (
		<div className={cn(ACTION_BAR_ACTS, ACTS)}>
			{ordered.map((entry) => button(entry, ghost))}
		</div>
	);
	// A chosen bar's acts: the filled act stands and the others fold into the
	// more menu, by rule and not by room, so the row is the same at every width.
	const primary = ordered.at(-1);
	const folded = ordered.slice(0, -1).map(([act]) => act);
	const chose = (ghost: boolean) => (
		<div className={cn(ACTION_BAR_ACTS, CHOSEN_ACTS)}>
			{folded.length > 0 ? (
				<MenuBase label={words.more} title={words.more} items={folded} />
			) : null}
			{primary ? button(primary, ghost) : null}
		</div>
	);
	// One act clears the rows while any are chosen, one chooses every row while
	// some stand unchosen; the table's head tick is the second where it stands, and the
	// bar cannot tell which form the table drew in its own column, so both stand.
	const bar = (ghost: boolean) => (
		<div className={cn(ACTION_BAR, BAR, chosen && ACTION_BAR_CHOSEN_COLUMN)}>
			{chosen ? (
				<div className={cn(ACTION_BAR_CHOSEN, SELECTION)}>
					<Count chosen={chosen} />
					{chose(ghost)}
				</div>
			) : (
				acted(ghost)
			)}
			{said === undefined && !kept ? null : (
				<div className={LINE}>
					<Reason kept={kept} failed={failed} shown={said !== undefined}>
						{said ?? NO_FAILURE}
					</Reason>
				</div>
			)}
		</div>
	);
	// Nothing chosen, or nothing to choose: no bar.
	if (chosen && chosenAbsent(chosen)) return null;
	if (pending === undefined) return bar(false);
	return (
		<div className={HOLD}>
			<div inert aria-hidden className={GHOST}>
				{bar(true)}
			</div>
			<div className={OVER}>
				<PendingBar {...pending} />
			</div>
		</div>
	);
}
