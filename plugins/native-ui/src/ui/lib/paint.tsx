import {
	PAINT_ROWS,
	type PaintRole,
	paintText,
	tuned,
} from "@fcalell/ui-core/paint";
import { paint } from "@fcalell/ui-core/variants";
import { type ComponentProps, Fragment, useEffect, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import Animated from "react-native-reanimated";
import { withUniwind } from "uniwind";
import { FadingText, FadingView, usePaintStyle } from "./motion";
import { ScrambledText, scramblesNow } from "./scramble";

/**
 * Whether a paint shows yet, for what is not painted but follows the same delay (a busy mark):
 * docs/architecture/ui-core/reads.md, "Timing".
 */
export function useShown(on = true, delay = tuned.waitDelay): boolean {
	const [shown, setShown] = useState(false);
	useEffect(() => {
		if (!on) {
			setShown(false);
			return undefined;
		}
		const timer = setTimeout(() => setShown(true), delay);
		return () => clearTimeout(timer);
	}, [on, delay]);
	return on && shown;
}

// A painted part is its host with the fill and the breath on its opacity: docs/architecture/ui-core/reads.md, "One breath".
const BreathingPressable = withUniwind(
	Animated.createAnimatedComponent(Pressable),
);

type Painting = { painted?: boolean };

/** A `View` that, while `painted`, fades in after the read's delay and breathes. */
export function PaintView({
	painted,
	style,
	...props
}: ComponentProps<typeof View> & Painting) {
	return painted ? (
		<Breathing {...props} style={style} />
	) : (
		<View {...props} style={style} />
	);
}

function Breathing({ style, ...props }: ComponentProps<typeof View>) {
	const breath = usePaintStyle();
	return <FadingView {...props} style={[style, breath]} />;
}

/** A `Pressable` that, while `painted`, fades in after the read's delay and breathes. */
export function PaintPressable({
	painted,
	style,
	...props
}: ComponentProps<typeof Pressable> & Painting) {
	return painted ? (
		<PressableBreathing {...props} style={style} />
	) : (
		<Pressable {...props} style={style} />
	);
}

function PressableBreathing({
	style,
	...props
}: ComponentProps<typeof Pressable>) {
	const breath = usePaintStyle();
	return <BreathingPressable {...props} style={[style, breath]} />;
}

/**
 * The root `Text` of a region that holds `Painted` fillers: docs/architecture/ui-core/reads.md, "One breath".
 */
export function PaintText({
	painted,
	fills,
	...props
}: ComponentProps<typeof RNText> & Painting & { fills?: PaintRole }) {
	return painted ? (
		<TextBreathing breathes={!(fills && scramblesNow(fills))} {...props} />
	) : (
		<RNText {...props} />
	);
}

function TextBreathing({
	style,
	breathes,
	...props
}: ComponentProps<typeof RNText> & { breathes: boolean }) {
	const breath = usePaintStyle(breathes);
	return <FadingText {...props} style={[style, breath]} />;
}

/** A text region's paint, set inside the region's own `PaintText`: each line a bar, or, where the theme scrambles the region's kind (`theme.loading`) and the region is one line, the scramble in the text's own ink. */
export function Painted({ role, at = 0 }: { role: PaintRole; at?: number }) {
	if (scramblesNow(role)) return <ScrambledText role={role} at={at} />;
	return (
		<RNText className={paint({ kind: "glyphs" })}>{paintText(role, at)}</RNText>
	);
}

/** A text's paint of `PAINT_ROWS` lines of sentence filler, set inside the text's own `PaintText`. */
export function PaintedLines() {
	return Array.from({ length: PAINT_ROWS }, (_, at) => (
		<Fragment key={at}>
			{at > 0 ? "\n" : null}
			<Painted role="sentence" at={at} />
		</Fragment>
	));
}

/**
 * The props of a text that may hold `Painted` inside a `numberOfLines` limit:
 * the filler is longer than the box it stands in, so a painted text clips
 * rather than ending in an ellipsis.
 */
export const clipWhen = (painted: boolean | undefined) =>
	painted ? ({ ellipsizeMode: "clip" } as const) : {};

/** The paint of a part's own box (a mark, a block): its fill, on a `PaintView` or `PaintPressable`. */
export const PAINT_BOX = paint({ kind: "box" });

/** The paint of a control's own box: its fill, its border not drawn, on a `PaintView` or `PaintPressable`. */
export const PAINT_CONTROL = paint({ kind: "control" });

/** The props of a painted part that takes no touch and hides its filler from a screen reader. */
export const inertProps = (on: boolean) =>
	on
		? ({
				pointerEvents: "none",
				importantForAccessibility: "no-hide-descendants",
				accessibilityElementsHidden: true,
			} as const)
		: {};
