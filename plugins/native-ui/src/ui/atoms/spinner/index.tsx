import { cn } from "@fcalell/ui-core/cn";
import { tuned } from "@fcalell/ui-core/paint";
import {
	BUSY_GLYPHS,
	SPINNER,
	SPINNER_ARC,
	SPINNER_TRACK,
} from "@fcalell/ui-core/variants";
import { useEffect } from "react";
import { View } from "react-native";
import {
	cancelAnimation,
	Easing,
	FadeIn,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { useInkColor } from "../../lib/ink";
import { FadingView, useTuned } from "../../lib/motion";
import { BusyGlyphs, busyScrambles } from "../../lib/scramble";

const LAYER = "absolute inset-0";

// A turning ring in the ink of its place, the size of the glyph it replaces: docs/architecture/ui-core/motion.md, "Spinner".
export function Spinner() {
	return busyScrambles() ? <Glyphs /> : <Ring />;
}

// The busy glyph where the theme scrambles its text: docs/architecture/ui-core/motion.md, "Spinner".
function Glyphs() {
	const color = useInkColor();
	return (
		<FadingView entering={FadeIn.duration(tuned.fast)} className="shrink-0">
			<BusyGlyphs className={BUSY_GLYPHS} style={{ color }} />
		</FadingView>
	);
}

function Ring() {
	const borderColor = useInkColor();
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
		<FadingView entering={FadeIn.duration(tuned.fast)} className={SPINNER}>
			<View className={cn(SPINNER_TRACK, LAYER)} style={{ borderColor }} />
			<FadingView
				className={cn(SPINNER_ARC, LAYER)}
				style={[{ borderColor }, turning]}
			/>
		</FadingView>
	);
}
