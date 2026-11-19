// A waveform's arithmetic, free of any framework and of the canvas: docs/architecture/ui-core/sound.md, "Player".
import type { Peaks } from "./descriptors.ts";

// What the arrow keys and the page keys move a playhead by, in seconds: an arrow
// the step, with Shift the fine step, the page keys the page.
export const SEEK = { step: 5, fine: 1, page: 30 } as const;

// The columns a waveform draws, each a stretch of the track: the lowest and
// highest sample in it, both -1..1 (a magnitude peak is drawn symmetric).
export interface Columns {
	low: Float32Array;
	high: Float32Array;
}

// The peaks reduced to `count` columns: each column takes the extremes of the
// values its stretch of the track covers, so a width shows the same shape at any
// resolution of peaks and a column never skips a spike.
export function columns(peaks: Peaks, count: number): Columns {
	const low = new Float32Array(Math.max(0, count));
	const high = new Float32Array(Math.max(0, count));
	const { values, paired } = peaks;
	const width = paired ? 2 : 1;
	const total = Math.floor(values.length / width);
	if (total === 0 || count <= 0) return { low, high };
	for (let at = 0; at < count; at++) {
		const from = Math.floor((at * total) / count);
		const to = Math.max(from + 1, Math.floor(((at + 1) * total) / count));
		let min = Number.POSITIVE_INFINITY;
		let max = Number.NEGATIVE_INFINITY;
		for (let index = from; index < Math.min(to, total); index++) {
			const lo = paired ? (values[index * 2] ?? 0) : -(values[index] ?? 0);
			const hi = paired ? (values[index * 2 + 1] ?? 0) : (values[index] ?? 0);
			if (lo < min) min = lo;
			if (hi > max) max = hi;
		}
		low[at] = clamp(min, -1, 0);
		high[at] = clamp(max, 0, 1);
	}
	return { low, high };
}

// A column's width and the gap after it, and the playhead's width, in CSS
// pixels (points on the phone).
export const COLUMN = { width: 2, gap: 1, head: 2 } as const;

// The columns a width holds, at least one.
export function columnCount(width: number): number {
	return Math.max(
		1,
		Math.floor((width + COLUMN.gap) / (COLUMN.width + COLUMN.gap)),
	);
}

// A column's box in a waveform, from its top left corner.
export interface ColumnBox {
	left: number;
	top: number;
	width: number;
	height: number;
}

// Each column's box across a waveform `width` by `height`, its edges on the
// device's pixels (`ratio` of them to a CSS pixel or a point).
export function columnBoxes(
	reduced: Columns,
	width: number,
	height: number,
	ratio: number,
): ColumnBox[] {
	const count = reduced.high.length;
	const step = width / count;
	const middle = height / 2;
	const pixel = 1 / ratio;
	const boxes: ColumnBox[] = [];
	for (let index = 0; index < count; index++) {
		const left = snap(index * step, ratio);
		const right = snap((index + 1) * step - COLUMN.gap, ratio);
		const top = middle - (reduced.high[index] ?? 0) * middle;
		const bottom = middle - (reduced.low[index] ?? 0) * middle;
		// A silent column keeps one pixel, so the track reads as a line.
		boxes.push({
			left,
			top,
			width: Math.max(pixel, right - left),
			height: Math.max(pixel, bottom - top),
		});
	}
	return boxes;
}

// The playhead's left edge at `share` of a waveform `width` wide, kept on it.
export function headAt(share: number, width: number, ratio: number): number {
	return Math.min(
		width - COLUMN.head,
		Math.max(0, snap(share * width - COLUMN.head / 2, ratio)),
	);
}

function snap(value: number, ratio: number): number {
	return Math.round(value * ratio) / ratio;
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

// The share of the track a moment is at, 0..1; 0 for a track of unknown length.
export function shareOf(at: number, duration: number): number {
	return duration > 0 ? clamp(at / duration, 0, 1) : 0;
}

// The moment a pointer names at `x` across a box `width` wide.
export function momentAt(x: number, width: number, duration: number): number {
	return width > 0 ? clamp(x / width, 0, 1) * duration : 0;
}

// Where a key moves a playhead standing at `at`, or `undefined` for a key that
// is not the waveform's. Arrows step, Shift makes the step fine, the page keys
// jump, Home and End go to the ends; the result stays on the track.
export function seekKey(
	key: string,
	shift: boolean,
	at: number,
	duration: number,
): number | undefined {
	const step = shift ? SEEK.fine : SEEK.step;
	switch (key) {
		case "ArrowLeft":
		case "ArrowDown":
			return clamp(at - step, 0, duration);
		case "ArrowRight":
		case "ArrowUp":
			return clamp(at + step, 0, duration);
		case "PageDown":
			return clamp(at - SEEK.page, 0, duration);
		case "PageUp":
			return clamp(at + SEEK.page, 0, duration);
		case "Home":
			return 0;
		case "End":
			return duration;
		default:
			return undefined;
	}
}

// How tall a waveform stands: in a bar, at the control's height (the player
// dock), or as a record's, two controls tall with cue labels over the flags.
export type WaveformFit = "bar" | "record";
