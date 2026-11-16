import {
	type PendingRun,
	pendingShare,
	timeLeft,
} from "@fcalell/ui-core/clock";
import { cn } from "@fcalell/ui-core/cn";
import type { LinkAct } from "@fcalell/ui-core/descriptors";
import { usePending } from "@fcalell/ui-core/react/clock";
import { ReasonHostContext, usePressed } from "@fcalell/ui-core/react/reason";
import { useTouched } from "@fcalell/ui-core/react/touched";
import {
	PENDING_BAR,
	PENDING_FILL,
	PENDING_LEFT,
	PENDING_ROW,
	PENDING_TRACK,
	text,
	YIELDS_FIRST,
} from "@fcalell/ui-core/variants";
import { useMemo, useState } from "react";
import type { Act } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import { useReducedMotion } from "../../lib/media.ts";
import type { VarStyle } from "../../lib/style.ts";
import { Reason } from "../../parts/button/reason.tsx";
import { Spinner } from "../../parts/spinner/index.tsx";
import { ActFace } from "../button/face.tsx";

// The bar over a blocked act's reason, at the end on the desktop; on touch
// the track stacks over the act as an ActionBar's acts do.
const BAR = "flex flex-col items-end touch:items-stretch";
const ROW = "flex items-center self-stretch touch:flex-col touch:items-stretch";
const TRACK = `relative flex items-center grow ${YIELDS_FIRST} min-w-0 overflow-hidden`;
// The elapsed share: the track's full width, scaled from its start to the
// runtime fraction, so the fill moves on the compositor and never lays out.
const FILL = "absolute bottom-0 inset-x-0 motion-safe:animate-pending-fill";
// The track's parts stand over the fill.
const SPINNER_SLOT = "relative flex shrink-0 text-ink-meta";
// The sentence wraps in a narrow column, never clips: the track grows by a
// line. It stands in the control's height with the air a one-line sentence has
// above and below it, so one line is the control's height and a wrapped one
// keeps the same air.
const SENTENCE =
	"relative min-w-0 grow py-[calc((var(--spacing-control)-1lh)/2)]";
const LEFT = "relative shrink-0";

// The elapsed share, moving on its own from where the run stands to full at
// its end (`pending-fill`, `globals.css`); the clock's tick redraws only the
// time left. The Fill mounts per run and takes its start once, so a tick never
// retimes it. Under reduced motion it steps with the clock instead, the share
// set once a tick.
export function Fill(props: { run: PendingRun; now: number }) {
	const { run } = props;
	const [at] = useState(Date.now);
	const reduced = useReducedMotion();
	const fill: VarStyle = {
		"--fill": reduced ? pendingShare(run, props.now) : 1,
		"--from": pendingShare(run, at),
		"--ms": Math.max(0, run.end - at),
	};
	return <span aria-hidden className={cn(PENDING_FILL, FILL)} style={fill} />;
}

/** Work the page waits on, in an ActionBar's place: the `pending` an `ActionBar` takes, at the bar's own height. Outside the package's exports; a place that held no bar draws a `Banner` with `until`. */
export interface PendingBarProps extends Closed {
	/** What is happening, announced as it changes (a short phrase; wraps in a narrow column). */
	sentence: string;
	/** When the work ends: the track fills toward it and shows the time left; unset, a spinner turns. */
	until?: Date;
	/** The one act, a hairline Button beside the track (a `{ label, href }` is a link to a route, an anchor); a blocked act's reason draws under the bar. */
	act?: Act | LinkAct;
}

/** One line on the group ground: the spinner, or a meta-ink line along the track's foot filling toward `until` with the time left beside the sentence, which alone is the live region; the act beside it on the desktop, under it on touch. */
export function PendingBar({ sentence, until, act }: PendingBarProps) {
	const { end, run, now } = usePending(until);
	const { touched } = useTouched();
	const blocked = act && "blocked" in act ? act.blocked : undefined;
	const [pressed, press] = usePressed(blocked);
	const host = useMemo(
		() => (blocked === undefined ? undefined : { press }),
		[blocked, press],
	);
	return (
		<div className={cn(PENDING_BAR, BAR)}>
			<div className={cn(PENDING_ROW, ROW)}>
				<div className={cn(PENDING_TRACK, TRACK)}>
					{end === undefined || run === undefined ? (
						<span className={SPINNER_SLOT}>
							<Spinner />
						</span>
					) : (
						<Fill key={`${run.start}-${run.end}`} run={run} now={now} />
					)}
					<span role="status" className={cn(text({ role: "body" }), SENTENCE)}>
						{sentence}
					</span>
					{end === undefined ? null : (
						<span className={cn(PENDING_LEFT, LEFT)}>{timeLeft(end, now)}</span>
					)}
				</div>
				{act ? (
					<ReasonHostContext value={host}>
						<ActFace act={act} kind="secondary" blocked={blocked} />
					</ReasonHostContext>
				) : null}
			</div>
			{blocked === undefined ? null : (
				<Reason shown={pressed || touched}>{blocked}</Reason>
			)}
		</div>
	);
}
