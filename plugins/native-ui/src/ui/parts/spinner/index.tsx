import { tuned } from "@fcalell/ui-core/paint";
import {
	BUSY_GLYPHS,
	SPINNER,
	SPINNER_ARC,
	SPINNER_TRACK,
} from "@fcalell/ui-core/variants";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	FadeIn,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { withUniwind } from "uniwind";
import { cn } from "../../lib/cn";
import { useInk } from "../../lib/ink";
import { useTuned } from "../../lib/motion";
import { BusyGlyphs, busyScrambles } from "../../lib/scramble";
import { useTokenColor } from "../../lib/theme";

const LAYER = "absolute inset-0";

// `Animated` passes through uniwind unwrapped: its view takes a className
// only once wrapped.
const Turning = withUniwind(Animated.View);

// A turning ring in the ink of its place, the size of the glyph it replaces: docs/architecture/ui-core/motion.md, "Spinner".
export function Spinner() {
	return busyScrambles() ? <Glyphs /> : <Ring />;
}

// The busy glyph where the theme scrambles its text: docs/architecture/ui-core/motion.md, "Spinner".
function Glyphs() {
	const color = useTokenColor(`--color-${useInk() ?? "ink-meta"}`);
	return (
		<Turning entering={FadeIn.duration(tuned.fast)} className="shrink-0">
			<BusyGlyphs className={BUSY_GLYPHS} style={{ color }} />
		</Turning>
	);
}

function Ring() {
	const borderColor = useTokenColor(`--color-${useInk() ?? "ink-meta"}`);
	const loop = useTuned("loop");
	const turn = useSharedValue(0);
	useEffect(() => {
		turn.value = 0;
		turn.value = withRepeat(
			withTiming(360, {
				duration: loop,
				easing: Easing.linear,
				reduceMotion: ReduceMotion.Never,
			}),
			-1,
			false,
			undefined,
			ReduceMotion.Never,
		);
		return () => cancelAnimation(turn);
	}, [turn, loop]);
	const turning = useAnimatedStyle(() => ({
		transform: [{ rotate: `${turn.value}deg` }],
	}));
	return (
		<Turning entering={FadeIn.duration(tuned.fast)} className={SPINNER}>
			<View className={cn(SPINNER_TRACK, LAYER)} style={{ borderColor }} />
			<Turning
				className={cn(SPINNER_ARC, LAYER)}
				style={[{ borderColor }, turning]}
			/>
		</Turning>
	);
}
