import type { RosterEntry } from "../roster.ts";
import type { Tone } from "../tokens.ts";
import type { ContentTone } from "../variants.ts";
import { build, matrix, toneOf } from "./shared.ts";

export const toastEntry: RosterEntry = {
	props: ["sentence", "tone", "act"],
	draws: [
		"TOAST",
		"LAYER_TOAST",
		"TOAST_STATE",
		"ICON.fit.body",
		"TEXT.role.body",
		"BUTTON.act.secondary",
		"BUTTON_LABEL.act.secondary",
	],
	states: ["rest"],
	motion: ["answer", "give", "layer", "follow"],
	owns: {
		roles: ["body"],
		colors: [
			"raised",
			"edge-raised",
			"edge",
			"ink-body",
			"ink-meta",
			"ok",
			"warn",
			"chip-amber",
			"danger",
		],
		radii: ["card", "control"],
		spacing: ["pad", "gap"],
		sizes: ["toast", "icon"],
		elevation: ["float"],
	},
};

// The tone is the glyph's ink alone; the toast's ground is every tone's.
export const TOAST_STATE = matrix({
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
});

export const toastState = build(TOAST_STATE);

// A toast at its width, raised and floating, its end inset tighter for the
// dismiss act's own box; its state is its glyph's ink (`toastState`).
export const TOAST =
	"w-toast pl-pad pr-gap py-gap gap-gap rounded-card bg-raised border border-edge-raised shadow-float";

// A toast's glyph ink, its tone's.
export function toastContentTone(tone: Tone): ContentTone {
	return toneOf(TOAST_STATE.variants.tone[tone]);
}

// A toast rises a pair as it fades in (`transform`, opacity: ease-out) and
// sinks it fading out (ease-in); the stack closes up on `translate`
// (ease-in-out), so the two motions keep their own curves.
export const LAYER_TOAST =
	"transition-[translate,transform,opacity] duration-base [transition-timing-function:var(--ease-in-out),var(--ease-out),var(--ease-out)] data-starting-style:[transform:translateY(var(--spacing-gap))] data-starting-style:opacity-0 data-ending-style:[transform:translateY(var(--spacing-gap))] data-ending-style:opacity-0 data-ending-style:[transition-timing-function:var(--ease-in-out),var(--ease-in),var(--ease-in)]";
