import type { Tone } from "../tokens.ts";
import type { ContentTone, RosterEntry } from "./shared.ts";
import { build, FILL_X, matrix, toneOf } from "./shared.ts";

// A sentence about the state of the page in the flow: a tinted strip, the
// tone's glyph beside the sentence and the one act at the line's end. A run in
// progress with a deadline is a Banner with `until` (`tone="running"`): it
// draws the time left after the sentence and a line along its foot filling
// toward the deadline at a constant pace (pending), the act its cancel; the
// clock stops at 0:00. The act is the outlined one, never words tinted in the
// tone's colour; beside the sentence, its height holds the line, so the
// glyph, the sentence's first line and the act share one centre.
export const bannerEntry: RosterEntry = {
	props: ["tone", "sentence", "act", "until"],
	draws: [
		"BLOCK_IN",
		"BANNER",
		"BANNER_ROW",
		"BANNER_MAIN",
		"BANNER_GLYPH",
		"PENDING_FILL",
		"PENDING_LEFT",
		"ICON.fit.body",
		"TEXT.role.body",
		"TEXT.role.meta",
		"BUTTON.act.secondary",
		"BUTTON_LABEL.act.secondary",
		"PAINT.kind.box",
		"PAINT.kind.glyphs",
		"SCRAMBLE",
		"PAINT.kind.control",
	],
	states: ["rest", "disabled", "pending"],
	motion: ["answer", "give", "block", "wait"],
	owns: {
		roles: ["body", "meta"],
		colors: [
			"ink-body",
			"ink-meta",
			"accent-soft",
			"accent-ink",
			"warn-soft",
			"warn",
			"danger-soft",
			"danger",
			"skeleton",
		],
		radii: ["control", "chip"],
		spacing: ["pad", "gap"],
		sizes: ["icon"],
	},
};

// A page's notice on its tone's soft ground, a pair inset around its content
// (the act's height on a line with an act); the tone's colour is its glyph's
// alone. `running` wears `active`'s, `idle` wears `waiting`'s.
export const BANNER = matrix({
	base: "rounded-control px-pad py-gap gap-gap text-body leading-body text-ink-body",
	variants: {
		tone: {
			active: "bg-accent-soft",
			running: "bg-accent-soft",
			waiting: "bg-chip-neutral-soft",
			idle: "bg-chip-neutral-soft",
			done: "bg-ok-soft",
			attention: "bg-warn-soft",
			failed: "bg-danger-soft",
		},
	},
	defaultVariants: { tone: "active" },
});

export const BANNER_GLYPH = matrix({
	base: "",
	variants: {
		tone: {
			active: "text-accent-ink",
			running: "text-accent-ink",
			waiting: "text-ink-meta",
			idle: "text-ink-meta",
			done: "text-ok",
			attention: "text-warn",
			failed: "text-danger",
		},
	},
	defaultVariants: { tone: "active" },
});

export const banner = build(BANNER);
export const bannerGlyph = build(BANNER_GLYPH);

// A banner's line (its glyph beside the rest) and the rest (the sentence
// beside its act, the act under it only where the sentence's floor leaves it
// no room; the phone always draws the act under).
export const BANNER_ROW = "gap-gap";
export const BANNER_MAIN = "gap-gap";

// The pending work's row (the track beside the act) and the track; and, shared
// with a Banner that has a deadline, the elapsed share as a line along the foot
// and the time left.
export const PENDING_ROW = "gap-gap";
export const PENDING_TRACK =
	"rounded-control bg-group min-h-control px-pad gap-gap";
export const PENDING_FILL = `h-[calc(2*var(--spacing-hairline))] bg-ink-meta ${FILL_X}`;
export const PENDING_LEFT =
	"tabular-nums text-meta leading-meta font-normal text-ink-meta";

export function bannerContentTone(tone: Tone): ContentTone {
	return toneOf(BANNER_GLYPH.variants.tone[tone]);
}
