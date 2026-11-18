import assert from "node:assert/strict";
import { test } from "node:test";
import {
	GROUNDS,
	measured,
	painted,
	parse,
	veiled,
} from "./__fixtures__/painted.ts";
import { deriveTheme } from "./derive.ts";
import { contrastRatio } from "./oklch.ts";
import { MODES, SOFT_GROUNDS } from "./tokens.ts";

// The strong edge on every soft ground: docs/architecture/ui-core/tokens.md, "Edges".
test("the strong edge holds 3:1 on every painted soft ground, a veiled one over each ground, at every hue", () => {
	const short: string[] = [];
	for (let hue = 0; hue < 360; hue += 15) {
		const theme = deriveTheme({ hue: { accent: hue, cast: hue } });
		for (const mode of MODES) {
			const colors = theme.colors[mode];
			const edge = measured(painted(parse(colors["edge-strong"])));
			for (const ground of SOFT_GROUNDS) {
				const soft = parse(colors[ground]);
				const paints =
					soft.alpha < 1
						? GROUNDS.map((under) => veiled(soft, parse(colors[under])))
						: [painted(soft)];
				for (const paint of paints)
					if (contrastRatio(edge, measured(paint)) < 3)
						short.push(`${mode} ${ground} at hue ${hue}`);
			}
		}
	}
	assert.deepEqual(short, []);
});
