import type { RosterEntry } from "./shared.ts";
import { build, matrix } from "./shared.ts";

// Markdown at the measure: headings, paragraphs, lists, quotes, rules, inline
// code and links; a fenced block is a `Code`. No syntax colours, tables,
// task lists or images.
// Its markdown is a constant or a selection; while the selection waits it
// paints one paragraph of `PAINT_ROWS` clipped lines, and draws nothing once it
// ended.
export const proseEntry: RosterEntry = {
	props: ["markdown"],
	draws: [
		"LINE_BOX.role.body",
		"LINK.fit.inline",
		"PROSE",
		"PROSE_BLOCKS",
		"PROSE_CODESPAN",
		"PROSE_EMPHASIS",
		"PROSE_ITEM",
		"PROSE_LIST",
		"PROSE_MARKER",
		"PROSE_PART",
		"PROSE_QUOTE",
		"PROSE_RULE",
		"PROSE_STRIKE",
		"TEXT.role.body",
		"PAINT.kind.glyphs",
		"SCRAMBLE",
		"TEXT.role.heading",
		"TEXT_STRONG.role.body",
	],
	states: ["rest", "loading"],
	motion: ["answer", "wait"],
	owns: {
		roles: ["body", "heading", "code"],
		colors: [
			"ink-body",
			"ink-meta",
			"fill-neutral",
			"accent-ink",
			"edge-strong",
			"edge",
			"skeleton",
		],
		radii: ["chip"],
		spacing: ["section", "gap", "stack", "pad"],
		sizes: ["measure", "icon"],
	},
};

// A list item's marker in a region the icon's width, in the meta ink: a
// bullet, or an ordered item's figures at one width.
export const PROSE_MARKER = matrix({
	base: "min-w-icon text-body leading-body font-normal text-ink-meta",
	variants: {
		list: {
			bullet: "",
			ordered: "tabular-nums",
		},
	},
	defaultVariants: { list: "bullet" },
});

export const proseMarker = build(PROSE_MARKER);

// Prose: its column at the measure, its headed parts a sections gap apart,
// a heading a pair over the blocks it heads, the blocks a fields gap apart;
// a list's items a pair apart (an item's line and its nested list too), each
// marker (`proseMarker`) an inside gap from its text; inline code on the
// neutral fill in its sentence's ink; a quote behind a strong hairline; a
// rule a hairline.
export const PROSE = "gap-section max-w-measure text-body leading-body";
export const PROSE_PART = "gap-gap";
export const PROSE_BLOCKS = "gap-stack";
export const PROSE_LIST = "gap-gap";
export const PROSE_ITEM = "gap-gap";

export const PROSE_QUOTE = "gap-stack border-l border-edge-strong pl-pad";
export const PROSE_RULE = "border-t border-edge";
export const PROSE_EMPHASIS = "italic";
export const PROSE_STRIKE = "line-through";
