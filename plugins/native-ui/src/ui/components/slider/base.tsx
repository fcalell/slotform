import { cn } from "@slotform/ui-core/cn";
import { formatterFor } from "@slotform/ui-core/format";
import type { Draft } from "@slotform/ui-core/react/acts";
import { FieldDisabled } from "@slotform/ui-core/react/field";
import {
	SLIDER,
	SLIDER_FILL,
	SLIDER_HEAD,
	SLIDER_LABEL,
	SLIDER_REST,
	SLIDER_THUMB,
	SLIDER_TRACK,
	SLIDER_VALUE,
} from "@slotform/ui-core/variants";
import { useContext, useRef, useState } from "react";
import { Text as RNText, View } from "react-native";
import { useResolveClassNames } from "uniwind";
import { adjustActions, useTrackDrag } from "../../lib/adjustable";
import { useTokenPx } from "../../lib/container";
import { inertProps, PAINT_CONTROL, PaintView } from "../../lib/paint";
import type { SliderProps } from "./index";

/** The label, value and track every Slider renders, on the `draft` its host holds: a field hosts the draft of its slider and draws a rejection in its own line. Painted, the label stands and the value and the track are filled, at the same height. Outside the package's exports. */
export function SliderBase({
	label,
	draft,
	onChange,
	onCommit,
	min,
	max,
	step,
	unit,
	bare,
	said,
}: Omit<SliderProps, "value"> & {
	draft: Draft<number>;
	/** The track alone, its name only the thumb's: a slider in a bar (the player dock's seek) that draws no head over its track. */
	bare?: boolean;
	/** The thumb's value as words (`3:07`), where the number's own is not what a viewer reads. */
	said?: (value: number) => string;
}) {
	const disabled = useContext(FieldDisabled);
	// A read that ended leaves the track with no value, blocked.
	const ended = draft.ended;
	const painted = draft.painted && !ended;
	// Painted or ended, the thumb rests at the start: the value is the
	// placeholder.
	const at = draft.painted ? min : draft.value;
	const [pressed, setPressed] = useState(false);
	// The track's width, which only a touch reads, so its layout renders nothing.
	const width = useRef(0);
	const thumb = useResolveClassNames(SLIDER_THUMB).width;
	// The track stands on a body line (`SLIDER_TRACK`) and its hit box is the
	// target, centred on it: a slop of half the target's excess over the line
	// above and below, reaching over the gap and the inset and taking no room.
	const slop = Math.max(
		0,
		(useTokenPx("--spacing-target") - useTokenPx("--spacing-line-body")) / 2,
	);
	const quantum = step ?? 1;
	const reached = useRef<number>(undefined);

	// The steps count from `min`; `raw` is never under it.
	function settle(raw: number): number {
		return Math.min(max, min + Math.round((raw - min) / quantum) * quantum);
	}

	function reach(next: number): void {
		reached.current = next;
		draft.change(next);
		if (!ended) onChange(next);
	}

	// The thumb sits in the row between the fill and the rest, so its centre
	// travels the track less its own width; a touch maps through the same span.
	function pick(x: number): void {
		setPressed(true);
		const size = typeof thumb === "number" ? thumb : 0;
		const span = width.current - size;
		if (span <= 0) return;
		const ratio = Math.min(Math.max((x - size / 2) / span, 0), 1);
		reach(settle(min + ratio * (max - min)));
	}

	// The thumb let go: the last value it reached is the one committed.
	function finish(): void {
		setPressed(false);
		const next = reached.current;
		reached.current = undefined;
		if (onCommit && next !== undefined) {
			draft.change(next, () => onCommit(next));
		}
	}

	const drag = useTrackDrag({ disabled, onMove: pick, onEnd: finish });
	// A screen reader's step moves the thumb one step and lets it go there.
	const adjust = adjustActions({
		disabled,
		onStep: (direction) => {
			reach(settle(Math.max(min, at + direction * quantum)));
			finish();
		},
	});

	const formatted = formatterFor(
		"number",
		undefined,
		unit ? { style: "unit", unit } : {},
	).format(at);
	const active = pressed && !disabled;
	return (
		<View className={cn(SLIDER, "justify-center")}>
			{bare ? null : (
				<View
					className={cn(SLIDER_HEAD, "flex-row items-center justify-between")}
				>
					<RNText
						numberOfLines={1}
						className={cn(
							SLIDER_LABEL,
							"shrink",
							disabled && "text-ink-disabled",
						)}
					>
						{label}
					</RNText>
					<RNText
						numberOfLines={1}
						className={cn(
							SLIDER_VALUE,
							"shrink-0",
							disabled && "text-ink-disabled",
							draft.painted && "opacity-0",
						)}
					>
						{formatted}
					</RNText>
				</View>
			)}
			<PaintView
				painted={painted}
				{...inertProps(painted)}
				accessible
				accessibilityRole="adjustable"
				{...adjust}
				accessibilityLabel={label}
				accessibilityState={{ disabled: disabled || ended }}
				accessibilityValue={{
					min,
					max,
					now: at,
					text: said?.(at),
				}}
				pointerEvents="box-only"
				hitSlop={{ top: slop, bottom: slop }}
				onLayout={(event) => {
					width.current = event.nativeEvent.layout.width;
				}}
				className={cn(
					SLIDER_TRACK,
					"flex-row items-center",
					painted && PAINT_CONTROL,
				)}
				{...drag}
			>
				{painted ? null : (
					<>
						<View
							className={cn(
								SLIDER_FILL,
								"grow",
								active && "bg-toggle-on-hover",
								disabled && "bg-ink-disabled",
							)}
							style={{ flexGrow: at - min }}
						/>
						<View
							className={cn(
								SLIDER_THUMB,
								"relative shrink-0 overflow-hidden",
								disabled && "border-edge bg-fill-disabled",
								ended && "opacity-0",
							)}
						>
							{active ? (
								<View className="absolute inset-0 bg-wash-press" />
							) : null}
						</View>
						<View
							className={cn(SLIDER_REST, "grow", disabled && "bg-edge")}
							style={{ flexGrow: max - at }}
						/>
					</>
				)}
			</PaintView>
		</View>
	);
}
