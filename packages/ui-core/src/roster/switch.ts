import type { RosterEntry } from "../roster.ts";
import { ANSWER, build, matrix, PRESS } from "./shared.ts";

// The one boolean control: a track and its thumb, drawn inside a
// target-sized hit box, a field as every control is (`Input`). The tick a row, a table's cell or an option draws
// for a choice among others is that owner's part, with its `mixed` state.
export const switchEntry: RosterEntry = {
	props: ["label", "description", "optional", "error", "checked", "onChange"],
	draws: [
		"FIELD_ALONE",
		"FIELD_ALONE_LINE",
		"DEFINITION_NAME",
		"FIELD_OPTIONAL",
		"FIELD_ERROR_LINE",
		"SWITCH",
		"SWITCH_THUMB",
		"PAINT.kind.control",
	],
	states: [...PRESS, "disabled", "selected"],
	motion: ["answer", "toggle", "wait"],
	owns: {
		colors: [
			"skeleton",
			"switch-",
			"toggle-",
			"fill-disabled",
			"ink-disabled",
			"ring",
		],
		radii: ["full"],
		sizes: ["icon-control", "icon-meta", "target"],
	},
};

// A toggle's thumb travels by transform on `fast`, in and out.
export const TOGGLE_THUMB = "transition-transform duration-fast ease-in-out";

// `on` draws `toggle-on`, the fill the checkbox and the slider share. The
// track is the control's icon tall and two knobs wide, its knob the meta icon,
// inset by half of what the one has over the other.
export const SWITCH = matrix({
	base: `p-[calc((var(--spacing-icon-control)-var(--spacing-icon-meta))/2)] w-[calc(var(--spacing-icon-meta)+var(--spacing-icon-control))] h-icon-control rounded-full ${ANSWER}`,
	variants: { state: { off: "bg-switch-off", on: "bg-toggle-on" } },
	defaultVariants: { state: "off" },
});

// The on thumb sits at the far end by transform, its own width along, the one
// thing a toggle animates.
export const SWITCH_THUMB = matrix({
	base: `size-icon-meta rounded-full bg-switch-thumb ${TOGGLE_THUMB}`,
	variants: { state: { off: "", on: "translate-x-full" } },
	defaultVariants: { state: "off" },
});

export const switchTrack = build(SWITCH);
export const switchThumb = build(SWITCH_THUMB);
