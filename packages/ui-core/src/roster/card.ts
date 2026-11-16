import type { RosterEntry } from "./shared.ts";

// A card for a part of a Section's body that draws none of its own (a
// Prose, a Stats, a Table, a Stages, an Image): the surface inside a
// hairline, its `children` at the card's inset. A Section's sheet, a Form and
// a Table are cards of their own and never stand in one.
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
