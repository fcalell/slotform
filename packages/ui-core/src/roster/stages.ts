import type { ContentTone, RosterEntry } from "./shared.ts";
import { build, matrix, toneOf } from "./shared.ts";

// A known sequence with a position in it, top to bottom on a hairline
// rail: each `steps` entry a `Stage` (`done`, `current` or `later`), a
// done one a filled disc with its check, its `at` a moment under the
// label, the current one a ring in the accent, its label at 500 and
// `aria-current="step"`, a later one a hollow ring with its label in
// meta, every mark at the meta icon size. `ended` replaces every step
// after the last done one with a terminal row: a cross in `danger`, its
// label and, when it says one, its reason in meta. The rail is solid in
// the strong hairline through the done stages, the plain hairline after,
// running through each mark's line so no break stands around a mark. A row stands at least the
// two-line row's height, so a later row keeps the done rows' pace. The hue is the
// marks'; a label's ink is its own. A `steps` that is a selection paints
// `PAINT_ROWS` later stages, each mark a painted control and each label
// a name, while its read waits, and draws no stage once it ended.
export const stagesEntry: RosterEntry = {
	props: ["steps", "ended"],
	draws: [
		"BLOCK_IN",
		"ICON.fit.meta",
		"LINE_BOX.role.body",
		"LINE_BOX.role.meta",
		"STAGE",
		"STAGE_CHECK",
		"STAGE_CROSS",
		"STAGE_MARK",
		"STAGE_RAIL",
		"STAGE_ROW",
		"STAGE_WORDS",
		"TEXT.role.meta",
		"PAINT.kind.control",
		"PAINT.kind.glyphs",
		"SCRAMBLE",
		"LINE_IN",
		"SWAP_IN",
		"SWAP_OUT",
	],
	states: ["rest", "loading"],
	motion: ["block", "line", "value", "wait"],
	owns: {
		roles: ["body", "meta"],
		colors: [
			"ink-body",
			"ink-meta",
			"edge",
			"edge-strong",
			"accent-ink",
			"canvas",
			"danger",
			"skeleton",
		],
		radii: ["full", "chip"],
		spacing: ["gap"],
		sizes: ["icon-meta"],
	},
};

// Where a flow stands at one of its steps: done, the current one, or still to
// come. A step count's segments and a rail's stages both read it.
export type StepState = "done" | "current" | "later";

// One stage of a rail of fixed states: its label and where the rail stands at
// it. A done or current stage may carry the moment it was reached or began
// (`at`, an ISO moment); a later one has none to give.
// The `label` is a short phrase: it wraps.
export type Stage =
	| { label: string; state: Exclude<StepState, "later">; at?: string }
	| { label: string; state: "later"; at?: never };

// How a rail ended short of its last stage: the terminal row that stands in
// place of every stage after the last done one, its reason under its label.
export interface StageEnd {
	// The terminal row's text (a short phrase; wraps).
	label: string;
	// Why the rail ended (a sentence; wraps), when it says one; empty or absent, the row draws its label alone.
	reason?: string;
}

// A stage's label by where the rail stands at it: done at body, current at
// body 500, later at meta, the terminal row at body 500 as the current one
// is. The ink is the label's own in every state; a stage's hue is its mark's.
export const STAGE = matrix({
	base: "",
	variants: {
		state: {
			done: "text-body leading-body font-normal text-ink-body",
			current: "text-body leading-body font-medium text-ink-body",
			later: "text-meta leading-meta font-normal text-ink-meta",
			ended: "text-body leading-body font-medium text-ink-body",
		},
	},
});

// A stage's mark at the meta icon size, the shape saying where the rail
// stands: done a filled disc (its check drawn on it, `STAGE_CHECK`), current
// a ring in the accent, later a hollow ring in the meta ink. An ended rail's
// mark is a cross (`STAGE_CROSS`) with no shape of its own.
export const STAGE_MARK = matrix({
	base: "size-icon-meta rounded-full",
	variants: {
		state: {
			done: "bg-ink-meta",
			current: "border-2 border-accent-ink",
			later: "border border-ink-meta",
		},
	},
	defaultVariants: { state: "later" },
});

// The rail from a stage's mark to the next: solid in the strong hairline
// through the done stages, the plain hairline after.
export const STAGE_RAIL = matrix({
	base: "border-l",
	variants: {
		state: {
			done: "border-edge-strong",
			ahead: "border-edge",
		},
	},
	defaultVariants: { state: "ahead" },
});

export const stage = build(STAGE);
export const stageMark = build(STAGE_MARK);
export const stageRail = build(STAGE_RAIL);

// Stages: a rail of fixed states. A stage is its mark beside its words, the
// words the label with one meta line under it; a hairline in the edge ink
// runs from each mark to the next (`STAGE_RAIL`), and the room between two
// stages is the words' own bottom inset, so the rail runs unbroken. A row
// stands at least the two-line row's height (`STAGE_ROW`: 48, 64 on touch,
// the state rail's rows), so a later row of one meta line keeps the pace of a
// done one. A done mark's check stands on its disc in the canvas ink
// (`STAGE_CHECK`), an ended rail's cross is the danger ink (`STAGE_CROSS`).
export const STAGE_ROW = "gap-gap py-gap";
export const STAGE_WORDS = "pb-gap";
export const STAGE_CHECK = "text-canvas";
export const STAGE_CROSS = "text-danger";

// A stage mark's glyph ink: the done mark's check, the ended mark's cross.
export function stageContentTone(glyph: "check" | "cross"): ContentTone {
	return toneOf(glyph === "check" ? STAGE_CHECK : STAGE_CROSS);
}
