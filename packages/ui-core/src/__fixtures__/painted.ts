// The contrast tests' measure of a resolved color as a browser paints it.
import assert from "node:assert/strict";
import { type Oklch, oklchToRgb } from "../oklch.ts";

// The grounds a mark stands on: docs/architecture/ui-core/tokens.md, "Contrast floors".
export const GROUNDS = ["canvas", "surface", "group"] as const;

export const parse = (value: string): Oklch & { alpha: number } => {
	const match = /oklch\(([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/.exec(
		value,
	);
	assert.ok(match, value);
	return {
		l: Number(match[1]),
		c: Number(match[2]),
		h: Number(match[3]),
		alpha: match[4] === undefined ? 1 : Number(match[4]),
	};
};

// WCAG 2 relative luminance of 8-bit sRGB channels, as a contrast checker
// reads the painted color: an independent oracle, kept apart from `luminance` on purpose.
export const measured = (rgb: readonly number[]): number => {
	const [r, g, b] = rgb.map((x) => {
		const v = x / 255;
		return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
};

export const painted = (color: Oklch) => oklchToRgb(color.l, color.c, color.h);

// A veil over its ground as a browser composites it: the 8-bit colors
// blended, the result painted in 8 bits.
export const veiled = (veil: Oklch & { alpha: number }, on: Oklch) => {
	const ground = painted(on);
	return painted(veil).map((x, i) =>
		Math.round(x * veil.alpha + (ground[i] ?? 0) * (1 - veil.alpha)),
	);
};
