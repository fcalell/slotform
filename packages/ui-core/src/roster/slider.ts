import type { RosterEntry } from "./shared.ts";
import { PRESS } from "./shared.ts";

// A number along a range, its name and value over the track: a field as
// every control is (`Input`), its head the name.
export const sliderEntry: RosterEntry = {
	props: [
		"label",
		"description",
		"optional",
		"error",
		"value",
		"onChange",
		"onCommit",
		"min",
		"max",
		"step",
		"unit",
	],
	draws: [
		"FIELD_ALONE",
		"FIELD_ERROR_LINE",
		"SLIDER",
		"SLIDER_HEAD",
		"SLIDER_LABEL",
		"SLIDER_VALUE",
		"SLIDER_TRACK",
		"SLIDER_FILL",
		"SLIDER_REST",
		"SLIDER_THUMB",
		"PAINT.kind.control",
	],
	states: [...PRESS, "disabled"],
	motion: ["answer", "wait"],
	owns: {
		roles: ["body", "meta"],
		colors: [
			"skeleton",
			"ink-body",
			"ink-meta",
			"toggle-",
			"edge",
			"edge-strong",
			"surface",
			"wash-hover",
			"wash-press",
			"fill-disabled",
			"ink-disabled",
			"ring",
		],
		radii: ["full", "chip"],
		spacing: ["gap", "stack", "pad"],
		sizes: ["target", "hairline", "icon-meta", "measure-short"],
	},
};

// A slider: its label line (the label, its value trailing, cut at the short
// measure) over the track, the fill up to the thumb and the rest after it.
// The label is a field's label, the body role in the meta ink, and the value
// it names stands in the body ink at the body role, as a fact's value does
// (`guide/voice.md`, "Type").
export const SLIDER = "gap-gap";
export const SLIDER_HEAD = "gap-stack";
export const SLIDER_LABEL = "text-body leading-body font-normal text-ink-meta";
export const SLIDER_VALUE =
	"max-w-measure-short tabular-nums text-body leading-body font-normal text-ink-body";
