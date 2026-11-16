import {
	ANSWER,
	BUTTON_LABEL,
	type ContentTone,
	GIVE,
	matrix,
	NAME_GROUND,
	PRESS,
	type RosterEntry,
	toneOf,
} from "./shared.ts";

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

// `act` is the button's kind: `primary` the accent fill (one per screen),
// `danger` the danger fill (a confirm's one filled act), `secondary` a
// hairline with no fill, `destructive` the hairline with its label in
// `danger`, `quiet` words in the meta ink with no fill and no hairline (a
// resend, a skip). `fit` is its container's: a control on its own, or full
// width at a field's height under the field it submits. min-h,
// never h: the label must be able to grow the control under OS font scaling.
// The fill carries the act's ink for the web's glyph and spinner
// (currentColor); the label repeats it, since a native Text inherits none.
export const BUTTON = matrix({
	base: `gap-gap rounded-control px-pad ${ANSWER}`,
	variants: {
		act: {
			primary: "bg-act-accent text-on-act-accent",
			danger: "bg-act-danger text-on-act-danger",
			secondary: "border border-edge text-ink-body",
			destructive: "border border-edge text-danger",
			quiet: "text-ink-meta",
		},
		fit: {
			body: `min-h-control ${GIVE}`,
			// Across its container: a wide surface scaling reads as a wobble.
			field: "min-h-control w-full",
		},
	},
	defaultVariants: { act: "primary", fit: "body" },
});

// An icon-only act: square, no boundary at rest, in the meta ink. `field`
// sits inside a field's end, at the control square, reaching across the box's
// border so a bar-fit box (the control height, border included)
// holds it at its own height.
export const ICON_BUTTON = matrix({
	base: `rounded-control text-ink-meta ${ANSWER} ${GIVE}`,
	variants: {
		fit: {
			body: "size-control",
			field: "size-control -my-hairline",
		},
	},
	defaultVariants: { fit: "body" },
});

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
