import type { RosterEntry } from "../roster.ts";
import type { BUTTON, ICON_BUTTON } from "../variant-tables.ts";
import type { ContentTone } from "../variants.ts";
import { BUTTON_LABEL, NAME_GROUND, PRESS, toneOf } from "./shared.ts";

// One act in three forms. Labelled it runs: its label, a glyph before it
// and a count after it, pending after the press, blocked with a reason.
// With an `href` it is the link form: an anchor to a route or an external
// URL that runs nothing, in an act's look or, with no `act`, in accent
// ink in the line it sits in (`inline`) or on the target height. With
// `glyph` the icon alone, the label its accessible name and its
// tooltip: square, no boundary at rest, a field's end at the `field`
// fit.
// A press runs the act's wiring in one order: its `confirm` asked as a
// decision over the page (declined, nothing runs), its `onAct`, its `done`
// toasted, then its `to` followed; a `sheet` is opened in place of `onAct`
// and closed on dismiss or once its submit resolves. The labelled and icon
// forms take all four, and every host that draws an act hands them on.
export const buttonEntry: RosterEntry = {
	props: [
		"act",
		"fit",
		"icon",
		"label",
		"count",
		"wait",
		"onAct",
		"confirm",
		"done",
		"to",
		"sheet",
		"blocked",
		"href",
		"glyph",
	],
	draws: [
		"BUTTON",
		"BUTTON_LABEL",
		"ICON.fit.control",
		"COUNT_LABEL",
		"ICON_BUTTON",
		"LINK",
		"LINK_TARGET",
		"TOOLTIP",
		"LAYER_TOOLTIP",
		"PAINT.kind.control",
		"LINE_IN",
		"SWAP_IN",
		"SWAP_OUT",
	],
	states: [...PRESS, "disabled", "pending"],
	motion: ["answer", "give", "layer", "line", "value", "wait"],
	owns: {
		roles: ["body", "meta", "caption"],
		colors: [
			"skeleton",
			"act-",
			"on-act-",
			"accent-ink",
			"edge",
			"ink-body",
			"ink-meta",
			"danger",
			"wash-hover",
			"wash-press",
			"fill-disabled",
			"ink-disabled",
			"ring",
			"raised",
			"edge-raised",
		],
		radii: ["control"],
		spacing: ["gap", "pad"],
		elevation: ["float"],
		sizes: ["control", "icon-control", "target", "hairline", "measure-short"],
	},
};

// An icon act's name, shown on a rest or the keyboard: the popover's ground and
// hairline round one line of meta ink, the width of its words up to a short
// measure.
export const TOOLTIP = `${NAME_GROUND} max-w-measure-short`;
// Cut text's whole text, in the same ground: a sentence, not a name, so it may
// grow to the full measure.
export const TOOLTIP_CUT = `${NAME_GROUND} max-w-measure`;

export type ButtonAct = keyof (typeof BUTTON)["variants"]["act"];
// What a button, an icon button or a link sits in, which picks its height
// (and a link's underline): the composing molecule sets it.
export type ButtonFit = keyof (typeof BUTTON)["variants"]["fit"];
export type IconButtonFit = keyof (typeof ICON_BUTTON)["variants"]["fit"];

export function buttonContentTone(act: ButtonAct): ContentTone {
	return toneOf(BUTTON_LABEL.variants.act[act]);
}

// A tooltip fades on `fast` once its rest has run and leaves at once (no
// ending style, so nothing holds it); one that opens with no rest (a second
// within the last's 300 ms, the keyboard's focus) shows with no fade either.
export const LAYER_TOOLTIP =
	"transition-opacity duration-fast ease-out data-starting-style:opacity-0 data-instant:transition-none";
