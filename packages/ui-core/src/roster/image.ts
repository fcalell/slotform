import type { ContentTone, RosterEntry } from "./shared.ts";
import { IMAGE_FAILED_INK, PRESS, toneOf } from "./shared.ts";

// A picture a press opens full size: docs/architecture/ui-core/components.md, "Image".
export const imageEntry: RosterEntry = {
	props: ["src", "alt", "fit", "aspect"],
	draws: [
		"PAINT.kind.box",
		"IMAGE.fit.thumb",
		"IMAGE.fit.content",
		"IMAGE.state.rest",
		"IMAGE.state.loading",
		"IMAGE.state.error",
		"IMAGE_PICTURE.fit.thumb",
		"IMAGE_PICTURE.fit.content",
		"IMAGE_FULL",
		"IMAGE_CLOSE",
		"IMAGE_FAILED_INK",
		"ICON.fit.body",
		"ICON_BUTTON.fit.body",
		"TEXT.role.meta",
		"SCRIM",
		"LAYER_CARD",
		"LAYER_SCRIM",
	],
	states: [...PRESS, "loading", "error"],
	motion: ["answer", "give", "layer", "wait"],
	owns: {
		roles: ["meta"],
		colors: [
			"edge",
			"edge-hover",
			"ink-body",
			"skeleton",
			"group",
			"ink-meta",
			"raised",
			"scrim",
		],
		radii: ["control", "card"],
		spacing: ["page", "gap"],
		sizes: ["line-body", "icon", "control"],
		elevation: ["float"],
	},
};

// The tallest an image grows, and a QR code's widest: `IMAGE_CAP_LINES` body
// lines.
export const IMAGE_CAP_LINES = 20;

export function imageContentTone(): ContentTone {
	return toneOf(IMAGE_FAILED_INK);
}
