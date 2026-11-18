import assert from "node:assert/strict";
import { test } from "node:test";
import { measured, painted, parse, veiled } from "./__fixtures__/painted.ts";
import { deriveTheme } from "./derive.ts";
import { contrastRatio } from "./oklch.ts";
import { CONTRAST_GROUNDS, MODES } from "./tokens.ts";

// A badge's words and ground: docs/architecture/ui-core/tokens.md, "Contrast floors".
test("a badge's words hold 4.5:1 on its painted fill, a step off the ground, at every cast", () => {
	const short: string[] = [];
	for (let cast = 0; cast < 360; cast += 15) {
		const theme = deriveTheme({ hue: { cast } });
		for (const mode of MODES) {
			const colors = theme.colors[mode];
			const ink = measured(painted(parse(colors["ink-meta"])));
			const fill = parse(colors["fill-badge"]);
			for (const ground of CONTRAST_GROUNDS) {
				const under = parse(colors[ground]);
				const filled = measured(veiled(fill, under));
				if (contrastRatio(ink, filled) < 4.5)
					short.push(`${mode} ${ground} at cast ${cast}: words`);
				// The fill is seen against the ground, however faintly.
				if (contrastRatio(measured(painted(under)), filled) <= 1.05)
					short.push(`${mode} ${ground} at cast ${cast}: fill`);
			}
		}
	}
	assert.deepEqual(short, []);
});
