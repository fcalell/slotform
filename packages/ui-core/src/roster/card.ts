import type { RosterEntry } from "./shared.ts";

// A card for a part of a Section's body: docs/architecture/ui-core/layout.md, "Cards".
export const cardEntry: RosterEntry = {
	props: ["children"],
	draws: ["CARD_PART", "CARD_BODY"],
	states: ["rest"],
	motion: [],
	owns: {
		colors: ["edge", "surface"],
		radii: ["card"],
		spacing: ["pad", "stack"],
	},
};

// A `Card`'s parts (a sentence over its act, a field over a field) stand a
// fields gap apart, as a Section's do.
export const CARD_BODY = "gap-stack";
