import type { RosterEntry } from "./shared.ts";
import { build, matrix } from "./shared.ts";

// By line (the default), unified, long lines wrapped between tokens (after a
// dot, a paren, a slash, a comma, never inside a name) and hung at the line's
// own indent (one inset past it on the web), at every width; on touch one
// number column stands, the new side or the only one. `before` and `after`
// are diffed by `lineHunks`: a block that could stand at several places at
// one cost stands where git's indent heuristic puts it, and a member added
// after a list's last one draws the close it gives a comma changed, so the
// block reads whole and balanced. No hunk header's
// ranges are drawn: the lines' numbers place a hunk, and an elided band (its
// mark `┆` on the group ground, the words "12 lines not shown" where the
// numbers count them, else "Lines not shown", then the enclosing function git
// names) stands where lines go unshown, before a hunk that starts past the
// first line and between two hunks. By word (`by: "word"`, two texts only), body text at the measure
// with its edit marked in place, a removed run struck through and an added run
// underlined dotted in the `ok` ink, no link's line. Its `hunks`, given as
// a selection, are its own frame: its failed, missing and empty forms stand in
// its box with the generic sentences, and its stale and paused line over it.
export const diffEntry: RosterEntry = {
	props: ["label", "hunks", "before", "after", "by"],
	draws: [
		"CARD",
		"DIFF_CODE",
		"DIFF_GUTTER",
		"DIFF_HANG",
		"DIFF_HUNK",
		"DIFF_LINE",
		"DIFF_MARK",
		"PAINT.kind.glyphs",
		"SCRAMBLE",
		"PROSE_DIFF_BODY",
		"PROSE_DIFF_RUN",
		"PROSE_DIFF_TEXT",
		"TEXT.role.body",
	],
	states: ["rest", "loading", "empty", "error"],
	motion: ["wait"],
	owns: {
		roles: ["code", "body"],
		colors: [
			"edge",
			"surface",
			"group",
			"ink-meta",
			"ink-body",
			"danger-soft",
			"ok-soft",
			"ok",
			"skeleton",
		],
		radii: ["card", "chip"],
		spacing: ["gap", "pad"],
		sizes: ["figures", "measure"],
	},
};

// One line of a diff hunk; `before` and `after` are line numbers.
export interface DiffLine {
	kind: "context" | "added" | "removed";
	// The line's code (text; wraps under itself).
	text: string;
	before?: number;
	after?: number;
}

export interface Hunk {
	// The hunk's header in git's form (`@@ -12,7 +12,9 @@ export function total`),
	// optional. Its ranges are never drawn: the lines' numbers say where a hunk
	// stands and an elided mark parts it from the hunk before. What git writes
	// after the ranges (the enclosing function, a short phrase; truncates) stands
	// in that mark; a header in no git form stands there whole.
	header?: string;
	lines: DiffLine[];
}

// A Diff by word's runs on the diff's own grounds: the added run underlined, the
// removed run struck through, each a cue besides its ground's hue. The added
// run's underline is dotted in the `ok` ink, so it never reads as a link's.
export const PROSE_DIFF_RUN = matrix({
	base: "",
	variants: {
		kind: {
			added: "bg-ok-soft underline decoration-dotted decoration-ok",
			removed: "bg-danger-soft line-through",
		},
	},
});

// A unified diff's line at the code role, Code's line: its kind is its
// ground; the mark of the lines a diff does not show (`elided`), where two
// hunks part, on the group ground in the meta ink.
export const DIFF_LINE = matrix({
	base: "text-code leading-code font-normal font-mono",
	variants: {
		kind: {
			context: "text-ink-body",
			added: "text-ink-body bg-ok-soft",
			removed: "text-ink-body bg-danger-soft",
			elided: "bg-group text-ink-meta",
		},
	},
	defaultVariants: { kind: "context" },
});

export const proseDiffRun = build(PROSE_DIFF_RUN);
export const diffLine = build(DIFF_LINE);

// Diff: the elided mark's cells, a gap over and under its line; the hang a
// wrapped line's continuation starts in by (its first line pulled back by a
// web overlay); the number columns, four code figures each; the marker; the
// code's end inset.
export const DIFF_HUNK = "py-gap";
export const DIFF_HANG = "pl-pad";
export const DIFF_GUTTER = "min-w-figures pl-gap tabular-nums text-ink-meta";
export const DIFF_MARK = "px-gap text-ink-meta";
export const DIFF_CODE = "pr-gap";
// Diff by word: the text at the card inset, at the measure.
export const PROSE_DIFF_BODY = "p-pad";
export const PROSE_DIFF_TEXT = "max-w-measure";
