import {
	type PendingRun,
	pendingShare,
	timeLeft,
} from "@fcalell/ui-core/clock";
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
} from "@fcalell/ui-core/variants";
import { useEffect, useMemo } from "react";
import { Text as RNText, View } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useReducedMotion,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { withUniwind } from "uniwind";
import type { Act } from "../../lib/act";
import { asAct, wiringOf } from "../../lib/act";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";

import { Spinner } from "../../parts/spinner";
import { ButtonBase } from "../button/base";

const TRACK = "relative flex-row items-center min-w-0 overflow-hidden";
// The elapsed share: the track's full width, scaled from its start to the
// runtime fraction, so the fill moves on the UI thread and never lays out.
const FILL = "absolute bottom-0 left-0 right-0";
const SENTENCE = "relative min-w-0 flex-1";
const LEFT = "relative shrink-0";

const Filled = withUniwind(Animated.View);

// The elapsed share, moving on its own from where the run stands to full at
// its end; the clock's tick redraws only the time left. With the system's
// reduced motion on (as Reanimated read it at launch) it steps with the
// clock instead, the share set once a tick.
export function Fill(props: { run: PendingRun; now: number }) {
	const { run, now } = props;
	const reduced = useReducedMotion();
	const share = useSharedValue(pendingShare(run, Date.now()));
	useEffect(() => {
		if (reduced) return;
		const at = Date.now();
		share.value = pendingShare(run, at);
		if (at < run.end)
			share.value = withTiming(1, {
				duration: run.end - at,
				easing: Easing.linear,
				reduceMotion: ReduceMotion.Never,
			});
		return () => cancelAnimation(share);
	}, [run, share, reduced]);
	useEffect(() => {
		if (reduced) share.value = pendingShare(run, now);
	}, [reduced, run, now, share]);
	const scaled = useAnimatedStyle(() => ({
		transform: [{ scaleX: share.value }],
	}));
	return (
		<Filled
			className={cn(PENDING_FILL, FILL)}
			style={[{ transformOrigin: "left" }, scaled]}
		/>
	);
}

export interface PendingBarProps extends Closed {
	/** What is happening, announced as it changes (a short phrase; truncates). */
	sentence: string;
	// When the work ends: the track fills toward it and shows the time left;
	// unset, a spinner turns.
	until?: Date;
	// The one act, a hairline Button under the track (a `{ label, href }` is a
	// press that navigates to its route); a blocked act's reason under the bar.
	act?: Act | LinkAct;
}

// One line on the group ground: the spinner, or a meta-ink line along the
// track's foot filling toward `until` with the time left beside the
// sentence; the act under it. It is the `pending` an `ActionBar` takes, at the
// bar's own height, and outside the package's exports; a place that held no bar
// draws a `Banner` with `until`.
export function PendingBar({ sentence, until, act: given }: PendingBarProps) {
	const act = given && asAct(given);
	const { end, run, now } = usePending(until);
	const { touched } = useTouched();

	const blocked = act?.blocked;
	const [pressed, press] = usePressed(blocked);
	const host = useMemo(
		() => (blocked === undefined ? undefined : { press }),
		[blocked, press],
	);
	return (
		<View className={PENDING_BAR}>
			<View className={PENDING_ROW}>
				<View className={cn(PENDING_TRACK, TRACK)}>
					{end === undefined || run === undefined ? (
						<Ink.Provider value="ink-meta">
							<Spinner />
						</Ink.Provider>
					) : (
						<Fill run={run} now={now} />
					)}
					<RNText
						numberOfLines={1}
						className={cn(text({ role: "body" }), SENTENCE)}
					>
						{sentence}
					</RNText>
					{end === undefined ? null : (
						<RNText className={cn(PENDING_LEFT, LEFT)}>
							{timeLeft(end, now)}
						</RNText>
					)}
				</View>
				{act ? (
					<ReasonHostContext.Provider value={host}>
						<ButtonBase
							act="secondary"
							label={act.label}
							onAct={act.onAct}
							{...wiringOf(act)}
							blocked={blocked}
						/>
					</ReasonHostContext.Provider>
				) : null}
			</View>
			{blocked !== undefined && (pressed || touched) ? (
				<RNText className={text({ role: "meta" })}>{blocked}</RNText>
			) : null}
		</View>
	);
}
