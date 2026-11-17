import assert from "node:assert/strict";
import { test } from "node:test";
import { deriveTheme } from "./derive.ts";
import { contrastRatio, type Oklch, oklchToRgb } from "./oklch.ts";
import {
	COLOR_NAMES,
	COLORS,
	type ContrastGrounds,
	KNOB_DEFAULTS,
	MODES,
	type Mode,
} from "./tokens.ts";

const parse = (value: string): Oklch & { alpha: number } => {
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
const measured = (rgb: readonly number[]): number => {
	const [r, g, b] = rgb.map((x) => {
		const v = x / 255;
		return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
};

const painted = (color: Oklch) => oklchToRgb(color.l, color.c, color.h);

// A veil over its ground as a browser composites it: the 8-bit colors
// blended, the result painted in 8 bits.
const veiled = (veil: Oklch & { alpha: number }, on: Oklch) => {
	const ground = painted(on);
	return painted(veil).map((x, i) =>
		Math.round(x * veil.alpha + (ground[i] ?? 0) * (1 - veil.alpha)),
	);
};

const contractsOf = (
	mode: Mode,
	declaration: (typeof COLORS)[keyof typeof COLORS],
): readonly ContrastGrounds[] => {
	if ("mix" in declaration) return declaration.grounds?.[mode] ?? [];
	if ("light" in declaration) return declaration[mode].grounds ?? [];
	return [];
};

// The contrast contracts: docs/architecture/ui-core/tokens.md, "Derivation".
test("every contrast contract holds on the painted 8-bit color at every hue of either knob", () => {
	const fallback = KNOB_DEFAULTS.hue.accent;
	const short: string[] = [];
	for (let h = 0; h < 360; h++) {
		for (const hue of [
			{ accent: h, cast: h },
			{ accent: h, cast: fallback },
			{ accent: fallback, cast: h },
		]) {
			const theme = deriveTheme({ hue });
			for (const mode of MODES) {
				const colors = theme.colors[mode];
				for (const name of COLOR_NAMES) {
					const ink = parse(colors[name]);
					for (const contract of contractsOf(mode, COLORS[name])) {
						const on = parse(colors[contract.on]);
						const under =
							contract.under === undefined
								? undefined
								: parse(colors[contract.under]);
						const ground = measured(under ? veiled(under, on) : painted(on));
						const ratio = contrastRatio(measured(painted(ink)), ground);
						if (ratio < contract.ratio)
							short.push(
								`${mode} ${name} on ${contract.under ?? contract.on} at ${JSON.stringify(hue)}: ${ratio.toFixed(4)}`,
							);
					}
				}
			}
		}
	}
	assert.deepEqual(short, []);
});
