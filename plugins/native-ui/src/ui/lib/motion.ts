import { subscribeMotion, tuned } from "@fcalell/ui-core/paint";
import { createStore } from "@fcalell/ui-core/store";
import {
	type Easing as Curve,
	type Duration,
	EASING,
	type MotionKnobName,
	PULSE_LOW,
	SPACE_BASE,
	SPACING_RATIO,
} from "@fcalell/ui-core/tokens";
import { useEffect, useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	FadeIn,
	Keyframe,
	makeMutable,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	type WithTimingConfig,
	withDelay,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { withUniwind } from "uniwind";

// The contract's motion in Reanimated: docs/architecture/ui-core/motion.md, "Phone motion".
export function curve(name: Curve) {
	return Easing.bezier(...EASING[name]);
}

export function timing(rung: Duration, name: Curve): WithTimingConfig {
	return {
		duration: tuned[rung],
		easing: curve(name),
		reduceMotion: ReduceMotion.System,
	};
}

// A knob followed live: a component whose look depends on a number the page
// can tune (the pulse, the tick) re-renders when it moves.
export function useTuned(name: MotionKnobName): number {
	return useSyncExternalStore(subscribeMotion, () => tuned[name]);
}

// The system's reduced motion, held for what is not in a render (the pulse's
// clock, the move coordinator) and followed live.
const reduced = createStore(false);
AccessibilityInfo.isReduceMotionEnabled().then(reduced.set);
AccessibilityInfo.addEventListener("reduceMotionChanged", reduced.set);

export function reducedNow(): boolean {
	return reduced.get();
}

// The page's one breath: docs/architecture/ui-core/reads.md, "One breath".
const breath = makeMutable(1);
let breathing = false;

function breathe(): void {
	cancelAnimation(breath);
	breath.value = 1;
	if (reduced.get()) return;
	breath.value = withRepeat(
		withTiming(0, {
			duration: tuned.pulse / 2,
			easing: curve("in-out"),
			reduceMotion: ReduceMotion.Never,
		}),
		-1,
		true,
		undefined,
		ReduceMotion.Never,
	);
}

function startBreath(): void {
	if (breathing) return;
	breathing = true;
	subscribeMotion(breathe);
	reduced.subscribe(breathe);
	breathe();
}

/**
 * The style of a painted part: docs/architecture/ui-core/reads.md, "Timing".
 * A part that does not `breathes` (a scrambled text, whose glyphs would dim) only fades in.
 */
export function usePaintStyle(breathes = true) {
	const appear = useSharedValue(0);
	useEffect(() => {
		startBreath();
		appear.value = withDelay(
			tuned.waitDelay,
			withTiming(1, timing("base", "out")),
			ReduceMotion.Never,
		);
		return () => cancelAnimation(appear);
	}, [appear]);
	return useAnimatedStyle(() => ({
		opacity:
			appear.value *
			(breathes ? PULSE_LOW + (1 - PULSE_LOW) * breath.value : 1),
	}));
}
// Answering a press: docs/architecture/ui-core/motion.md, "Press".
// `wash` is the opacity of an overlay in the wash's colour, `give` the scale of the control,
// `onPressIn` and `onPressOut` the Pressable's.
export function usePress() {
	const down = useSharedValue(0);
	const to = useSharedValue(1);
	const wash = useAnimatedStyle(() => ({ opacity: down.value }));
	const give = useAnimatedStyle(() => ({
		transform: [{ scale: 1 + (to.value - 1) * down.value }],
	}));
	return {
		wash,
		give,
		onPressIn: () => {
			to.value = tuned.press;
			down.value = withTiming(1, timing("instant", "out"));
		},
		onPressOut: () => {
			down.value = withTiming(0, timing("fast", "out"));
		},
	};
}

// A control's own value moving, 0 to 1 as `on` turns: docs/architecture/ui-core/motion.md, "Press".
export function useToggle(on: boolean) {
	const value = useSharedValue(on ? 1 : 0);
	useEffect(() => {
		value.value = withTiming(on ? 1 : 0, timing("fast", "in-out"));
	}, [on, value]);
	return value;
}

// A flow line, one that appears in flow, and a block that arrives on its own: docs/architecture/ui-core/motion.md, "Flow lines and blocks".
// The entering prop of an Animated view.
export const flowIn = () =>
	FadeIn.duration(tuned.fast)
		.easing(curve("out"))
		.reduceMotion(ReduceMotion.System);
export const blockIn = () =>
	FadeIn.duration(tuned.base)
		.easing(curve("out"))
		.reduceMotion(ReduceMotion.System);
// The views that take `flowIn` and `blockIn` as their `entering`, with a
// `className` as any view has.
export const FadingText = withUniwind(Animated.Text);
export const FadingView = withUniwind(Animated.View);

// A measured value moving: docs/architecture/ui-core/motion.md, "Value and fills".
export function useValue(to: number, from = to) {
	const value = useSharedValue(from);
	useEffect(() => {
		value.value = withTiming(to, timing("slow", "in-out"));
	}, [to, value]);
	return value;
}

// A checkbox's mark and a radio's dot growing in: docs/architecture/ui-core/motion.md, "Press".
export const markIn = () =>
	new Keyframe({
		0: { opacity: 0, transform: [{ scale: 0.6 }] },
		100: {
			opacity: 1,
			transform: [{ scale: 1 }],
			easing: curve("out"),
		},
	})
		.duration(tuned.fast)
		.reduceMotion(ReduceMotion.System);
export const markOut = () =>
	new Keyframe({
		0: { opacity: 1, transform: [{ scale: 1 }] },
		100: {
			opacity: 0,
			transform: [{ scale: 0.6 }],
			easing: curve("out"),
		},
	})
		.duration(tuned.instant)
		.reduceMotion(ReduceMotion.System);
export const dotIn = () =>
	new Keyframe({
		0: { transform: [{ scale: 0 }] },
		100: { transform: [{ scale: 1 }], easing: curve("out") },
	})
		.duration(tuned.fast)
		.reduceMotion(ReduceMotion.System);
export const dotOut = () =>
	new Keyframe({
		0: { transform: [{ scale: 1 }] },
		100: { transform: [{ scale: 0 }], easing: curve("out") },
	})
		.duration(tuned.instant)
		.reduceMotion(ReduceMotion.System);

// A change of place fades the place's root in: docs/architecture/ui-core/motion.md, "Navigate and stream".
export const placeIn = () =>
	FadeIn.duration(tuned.fast)
		.easing(curve("out"))
		.reduceMotion(ReduceMotion.System);

// A message that arrives at the end of a log rises as it fades in: docs/architecture/ui-core/motion.md, "Navigate and stream".
// The log and each message are drawn upside down, so the offset is negative.
const PAIR = SPACE_BASE * SPACING_RATIO.touch.gap;
export const streamIn = () =>
	new Keyframe({
		0: { opacity: 0, transform: [{ translateY: -PAIR }] },
		100: { opacity: 1, transform: [{ translateY: 0 }], easing: curve("out") },
	})
		.duration(tuned.base)
		.reduceMotion(ReduceMotion.System);

// The act back to the newest message rises in on `fast` `out` and leaves
// falling back on `fast` `in`.
export const latestIn = () =>
	new Keyframe({
		0: { opacity: 0, transform: [{ translateY: PAIR }] },
		100: { opacity: 1, transform: [{ translateY: 0 }], easing: curve("out") },
	})
		.duration(tuned.fast)
		.reduceMotion(ReduceMotion.System);
export const latestOut = () =>
	new Keyframe({
		0: { opacity: 1, transform: [{ translateY: 0 }] },
		100: { opacity: 0, transform: [{ translateY: PAIR }], easing: curve("in") },
	})
		.duration(tuned.fast)
		.reduceMotion(ReduceMotion.System);
