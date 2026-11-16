import type { RosterEntry } from "./shared.ts";
import { PRESS } from "./shared.ts";

// Pictures side by side, each a tile that opens full size: `items`, each
// a `key`, its `src`, its `alt`, its `aspect` (width over height) and an
// optional `caption` drawn under it. The tiles wrap a gap apart, each a
// fixed height at its picture's aspect (held no narrower than three to
// four, cropped from the top), no wider than the container, its caption
// cut to the tile's width. A tile's `src` paints, waits and fails as an
// Image's does. Pressed, the full view opens on that picture with Previous
// and Next acts beside it (and the arrow keys on the web) that step
// through the others, a lifted Close act, Escape and a press outside.
export const galleryEntry: RosterEntry = {
	props: ["items"],
	draws: [
		"PAINT.kind.box",
		"GALLERY",
		"GALLERY_TILE",
		"IMAGE.fit.tile",
		"IMAGE_PICTURE.fit.tile",
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
		spacing: ["page", "gap", "badge"],
		sizes: ["line-body", "icon", "control"],
		elevation: ["float"],
	},
};

// Gallery: its tiles wrap a gap apart, each a picture over its caption, a
// badge's gap between them, at the tile's width. A tile's box is held no narrower
// than `IMAGE_TILE_NARROWEST`, so a phone's page stands at three to four,
// cropped to its top; a caption is cut to the tile's width.
export const GALLERY = "flex flex-row flex-wrap items-start gap-gap";
export const GALLERY_TILE = "flex min-w-0 max-w-full flex-col gap-badge";
