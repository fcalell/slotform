import type { Route } from "../descriptors.ts";
import type { RosterEntry } from "../roster.ts";
import { ANSWER } from "./shared.ts";

// A strip of counts in one hairline card, its cells split by hairlines:
// each a label over its figure (a unit beside it), then a `line` or
// sub-counts (links composed from `Link`), or the whole cell a link to
// its `href` (a chevron at its label's end), never both. Zeros are drawn. A cell with a `bound` is the meter
// form: the label over the share in percent as its figure, over a bar at the
// `meter` size, its fill by level, amber near full (at its `mark` when it has
// one, a tick across the track) and `danger` over (a `goal`, a target reached, is the meta ink short of it and the good
// tone once reached); under it one line, its `line` or its sub-counts. Its `value` and `bound` are data: a selection paints
// in their place, the cell inert, until the read lands. The meter is the frame
// of the selections it draws: one that failed, with no frame above holding it,
// makes the failed form in the same box (the label stays; the figure's place shows
// the alert and the retry icon; the line under the bar reads `readFailed`;
// pressing the cell retries); a read a frame above holds is that frame's to
// say, and the cell stands empty (no share, no fill). Cells stand in a row, two
// to a row below `tablet` of the page and on the phone.
export const statsEntry: RosterEntry = {
	props: ["items"],
	draws: [
		"LINK_TARGET",
		"COUNT_LINKS",
		"FIGURES",
		"LINK.fit.standalone",
		"PAINT.kind.glyphs",
		"SCRAMBLE",
		"STATS",
		"STATS_CELL",
		"STATS_EDGE",
		"STATS_FIGURE",
		"STATS_OPENS",
		"ICON.fit.meta",
		"TEXT.role.figure",
		"TEXT.role.meta",
		"SWAP_IN",
		"SWAP_OUT",
		"LINE_BOX.role.body",
		"LINE_BOX.role.meta",
		"METER",
		"METER_FILL",
		"METER_MARK",
		"METER_TRACK",
		"ROW_RETRY",
		"ICON.fit.body",
		"SPINNER",
		"SPINNER_TRACK",
		"SPINNER_ARC",
		"PAINT.kind.box",
		"TRAVEL_X",
	],
	states: ["rest", "loading", "error"],
	motion: ["answer", "value", "wait"],
	owns: {
		roles: ["figure", "meta", "body"],
		colors: [
			"edge",
			"surface",
			"ink-body",
			"ink-meta",
			"accent-ink",
			"skeleton",
			"wash-hover",
			"wash-press",
			"fill-neutral",
			"chip-amber",
			"danger",
			"ring",
		],
		radii: ["card", "chip", "full"],
		spacing: ["gap", "pad"],
		sizes: ["target", "hairline", "icon"],
	},
};

// A count that leads to its list: its figure drawn tabular beside its label,
// the whole a link to `href`. Shared by every molecule that carries counts (a
// bound stat's line under its bar, a stat strip's cell): zero is a count, drawn.
export interface CountLink {
	// What is counted (a word; wraps).
	label: string;
	value: number;
	href: Route;
}

// A count in a strip: a label over its figure (zero is a count, drawn), an
// optional unit beside the figure and `line` under it, then either the
// whole cell a link to `href` (a chevron at its label's end) or sub-counts that are links of their own, never
// both, since a cell inside a link cannot hold links. A count with a `bound`
// is a share of a limit, how much of a quota is used (or, with `goal`, how much
// of a target is reached): the cell draws the meter form, the label over the
// share in percent as its figure, over a bar filling by the share, then its `line`
// or its sub-counts. It has no unit, since the
// share stands in the figure's place, and no `href`, since its sub-counts are
// the links.
export type StatSpec = {
	// What the figure counts (a short phrase; wraps).
	label: string;
	value: number;
	// Under the figure (a sentence; wraps).
	line?: string;
} & (
	| ({
			// What the figure counts, beside it (a word; wraps).
			unit?: string;
			bound?: never;
			mark?: never;
	  } & (
			| { counts?: readonly CountLink[]; href?: never }
			| { href: Route; counts?: never }
	  ))
	| {
			// The limit: past it the share is over. With `goal`, the target the value reaches.
			bound: number;
			// The bound is a goal to reach (tests passing of all of them), not a limit to stay under: the fill stays in the meta ink short of it and turns the good tone once the value reaches it, never amber or over.
			goal?: true;
			// A tick across the bar at the mark's value, the point the fill turns amber at.
			mark?: MeterMark;
			counts?: readonly CountLink[];
			unit?: never;
			href?: never;
	  }
);

// The point a meter marks on its track: a tick at `value` of its max. Once the
// meter's value reaches it the fill turns `warn`.
export interface MeterMark {
	value: number;
}

// A mark that rides a share of its track (a meter's tick) travels by
// transform on `slow`; the site sets `--travel` (a share of the track's width).
export const TRAVEL_X =
	"translate-x-(--travel) transition-[translate] duration-slow ease-in-out";

// Stats meter: the label over its share as the figure over the bar over the meta
// line; the bar a track one wash step off the ground, its fill by level (`meterFill`).
export const METER = "gap-gap";

// A meter's mark: a tick across the track centred on the mark's share (so one
// at the max stands on the track's end), standing proud of the track by
// `inside` above and below. It sits outside the track, which clips.
export const METER_MARK =
	"w-[calc(2*var(--spacing-hairline))] bg-ink-body -inset-y-gap -translate-x-1/2";
// A line of counts that lead to their lists: standalone links a gap apart
// with no glyph between (a meter's line under its bar, a stats cell's line
// under its figure). Each link's box is the target height (`LINK_TARGET`),
// and the line waits as one such box with a bar centred in it.
export const COUNT_LINKS = "gap-x-gap";

// Stats: the card on the surface holding the cells. A cell draws its own top
// and start hairlines, so the strip splits wherever its cells wrap; the card's
// outer edge is `STATS_EDGE`, drawn over the cells. The cell is the label over
// the figure (and its unit) over the meta line, or over its counts.
export const STATS = "relative rounded-card bg-surface";
export const STATS_CELL = `gap-gap p-pad border-t border-l border-edge ${ANSWER}`;
// The card's outer edge, drawn over its cells: their own top and start
// hairlines at the card's edge sit under it, so the edge is one hairline at
// every density, with no cell pulled back by a width of its own.
export const STATS_EDGE = "absolute inset-0 rounded-card border border-edge";
export const STATS_FIGURE = "gap-gap";
// A cell that opens: the chevron at the end of its label's first line, in the mark ink, as a record head's fact that opens carries one (voice 12).
export const STATS_OPENS = "shrink-0 text-ink-mark";
