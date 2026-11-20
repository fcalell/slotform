import { trackTime } from "@slotform/ui-core/clock";
import { cn } from "@slotform/ui-core/cn";
import type { Peaks } from "@slotform/ui-core/descriptors";
import { WAVEFORM_BAR, WAVEFORM_RECORD } from "@slotform/ui-core/variants";
import {
	COLUMN,
	type ColumnBox,
	clamp,
	columnBoxes,
	columnCount,
	columns,
	headAt,
	momentAt,
	SEEK,
	shareOf,
	type WaveformFit,
} from "@slotform/ui-core/waveform";
import { memo, useMemo, useState } from "react";
import { PixelRatio, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { useHeldDraft } from "../../lib/act";
import { adjustActions, useTrackDrag } from "../../lib/adjustable";
import type { Closed } from "../../lib/closed";
import { useTokenColor } from "../../lib/theme";

/** A track's peaks drawn as a slider along its length. */
export interface WaveformProps extends Closed {
	/** What the waveform seeks: the slider's accessible name (a short phrase). */
	label: string;
	/** The track's amplitude, from its start to its end; any resolution, reduced to the width. */
	peaks: Peaks;
	/** The track's length in seconds. */
	duration: number;
	/** The playhead's place in seconds: the played part up to it stands in the accent, the rest in the edge. */
	at: number;
	/** Hears the second the viewer lets the playhead go at. A drag holds the finger as the playhead and seeks once, on release (a plain press is a drag that does not move); a screen reader's increment and decrement move it five seconds forward and back, each a seek at once. Return the seek's promise and the playhead holds while it pends; a refusal puts it back, with its reason. The playhead only moves when `at` does. */
	onSeek: (seconds: number) => unknown;
	/** `bar` stands at the control's height (a bar, the player dock); `record`, the default, at the waveform size. */
	fit?: WaveformFit;
}

const ROOT = "relative w-full overflow-hidden";
const LAYER = "absolute inset-y-0 left-0";
const PLAYED = "overflow-hidden";
const HEAD = "bg-ink-body";

/** The peaks of a track drawn as columns, the played part in the accent and the rest in the edge, with a playhead; a slider the finger and the screen reader seek along. Standing in a bar it is the player dock's seek; at record height it stands alone in a `Pane` or a `Card`. */
export function Waveform(props: WaveformProps) {
	const { label, peaks, duration, onSeek, fit = "record" } = props;
	// The finger holds the playhead while it drags; the seek lands on release.
	const [finger, hold] = useState<number>();
	const draft = useHeldDraft(props.at);
	const at = finger ?? draft.value;
	const [size, setSize] = useState({ width: 0, height: 0 });
	const ratio = PixelRatio.get();
	const count = columnCount(size.width);
	const reduced = useMemo(() => columns(peaks, count), [peaks, count]);
	const boxes = useMemo(
		() => columnBoxes(reduced, size.width, size.height, ratio),
		[reduced, size, ratio],
	);
	const played = useTokenColor("--color-toggle-on");
	const rest = useTokenColor("--color-edge-strong");
	const share = shareOf(at, duration);

	const seek = (to: number) => draft.change(to, () => onSeek(to));
	const drag = useTrackDrag({
		onMove: (x) => hold(momentAt(x, size.width, duration)),
		onEnd: (x) => {
			hold(undefined);
			seek(momentAt(x, size.width, duration));
		},
	});
	const adjust = adjustActions({
		onStep: (direction) => seek(clamp(at + direction * SEEK.step, 0, duration)),
	});

	return (
		<View
			accessible
			accessibilityRole="adjustable"
			accessibilityLabel={label}
			accessibilityValue={{
				min: 0,
				max: Math.round(duration),
				now: Math.round(at),
				text: trackTime(at),
			}}
			{...adjust}
			pointerEvents="box-only"
			onLayout={(event) => {
				const { width, height } = event.nativeEvent.layout;
				setSize({ width, height });
			}}
			className={cn(fit === "bar" ? WAVEFORM_BAR : WAVEFORM_RECORD, ROOT)}
			{...drag}
		>
			<Bars boxes={boxes} fill={rest} {...size} />
			<View className={cn(LAYER, PLAYED)} style={{ width: share * size.width }}>
				<Bars boxes={boxes} fill={played} {...size} />
			</View>
			<View
				className={cn(LAYER, HEAD)}
				style={{
					left: headAt(share, size.width, ratio),
					width: COLUMN.head,
				}}
			/>
		</View>
	);
}

// The columns in one ink, unchanged while only the playhead moves.
const Bars = memo(function Bars(props: {
	boxes: ColumnBox[];
	fill: string | undefined;
	width: number;
	height: number;
}) {
	return (
		<Svg width={props.width} height={props.height}>
			{props.boxes.map((box) => (
				<Rect
					key={box.left}
					x={box.left}
					y={box.top}
					width={box.width}
					height={box.height}
					fill={props.fill}
				/>
			))}
		</Svg>
	);
});
