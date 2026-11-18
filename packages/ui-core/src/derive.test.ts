import assert from "node:assert/strict";
import { test } from "node:test";
import { measured, painted, parse, veiled } from "./__fixtures__/painted.ts";
import { deriveTheme } from "./derive.ts";
import { contrastRatio } from "./oklch.ts";
import {
	COLOR_NAMES,
	COLORS,
	type ContrastGrounds,
	KNOB_DEFAULTS,
	MODES,
	type Mode,
} from "./tokens.ts";

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
