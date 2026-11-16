import type { RosterEntry } from "./shared.ts";
import { ANSWER, build, matrix, PRESS } from "./shared.ts";

// The frame Code, Diff share; the head a strip-high bar, the
// copy and download acts its icon Buttons at the body fit; `tail` folds the earlier lines
// behind a one-way act, the focus landing on the code. A line wraps,
// never after a hyphen that leads a word, so a flag (`--bg`) stays whole.
export const codeEntry: RosterEntry = {
	props: ["text", "title", "tail", "copy", "download"],
	draws: [
		"CODE_ACT",
		"CODE_FOLD",
		"CODE_HEAD",
		"CODE_TEXT",
		"CODE_UNDER_HEAD",
		"CARD",
		"ICON.fit.control",
		"ICON.fit.meta",
		"ICON_BUTTON.fit.body",
		"PAINT.kind.control",
		"PAINT.kind.glyphs",
		"SCRAMBLE",
		"TEXT.role.code",
		"TEXT.role.meta",
	],
	states: [...PRESS, "loading"],
	motion: ["answer", "give", "wait"],
	owns: {
		roles: ["code", "meta"],
		colors: [
			"edge",
			"surface",
			"ink-body",
			"ring",
			"ink-meta",
			"wash-hover",
			"skeleton",
			"wash-press",
		],
		radii: ["card", "control", "chip"],
		spacing: ["pad", "gap"],
		sizes: ["control", "icon-control", "target", "icon-meta"],
	},
};

// The code's text at the box inset or, beside the copy act's own
// column (no title), without the end inset that column carries.
export const CODE_TEXT = matrix({
	base: "",
	variants: {
		act: {
			none: "p-pad",
			beside: "py-pad pl-pad",
		},
	},
	defaultVariants: { act: "none" },
});

export const codeText = build(CODE_TEXT);

// Code: the head a bar at the strip's height (its title, its copy act a
// float inset from the end), the hairline on the part under it; the copy
// act's own column beside the first line when there is no title; the fold, a
// band at the target height over the shown lines.
export const CODE_HEAD = "gap-gap py-gap pl-pad pr-gap";
export const CODE_UNDER_HEAD = "border-t border-edge";
export const CODE_ACT = "pt-pad pl-gap pr-gap";
export const CODE_FOLD = `gap-gap min-h-target px-pad border-b border-edge text-ink-meta ${ANSWER}`;
