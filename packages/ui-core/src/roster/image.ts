import type { ContentTone, RosterEntry } from "./shared.ts";
import { IMAGE_FAILED_INK, PRESS, toneOf } from "./shared.ts";

// A picture a press opens full size: a square tile (`thumb`) or its
// container's width at its own aspect down to a height cap (`content`,
// centred where the cap narrows it).
// A content picture's `aspect` (width over height) is required: it fixes
// its box in every state, so nothing moves when the bytes land; a
// thumbnail is square and takes none. An address that is a selection
// paints its box until the read lands, and while the bytes are on their way
// it is a skeleton at that box; failed, an `ImageOff` glyph in the meta ink with the alt text in
// meta under it (a thumbnail draws the glyph alone, the alt its name) and
// nothing to open. The full view
// stands over the sheet base's scrim and focus trap, contain-fit inside
// the page inset, with a lifted Close act.
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
