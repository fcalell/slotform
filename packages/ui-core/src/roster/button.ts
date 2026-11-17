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

// One act in three forms and its press order: docs/architecture/ui-core/acts.md, "Act press".
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
		"FLOW_IN",
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

// A button's kinds and fit: docs/architecture/ui-core/roster.md, "Controls".
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
