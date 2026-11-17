import type { RosterEntry } from "./shared.ts";
import { build, CARD_PART, matrix } from "./shared.ts";

// A collection on a card of its own: columns over time in the chip marks, stacked by one
// dimension, its bars from `items` through the `bar` map;
// `label` names the plot on the web; `keys` names the stack's parts in
// order, so the legend and each part's mark stand before the data does;
// `level` says the bars are a level, so its head draws their span, the
// lowest bar to the highest, not the sum (a unit that never sums, `%` or
// `°C`, is a level unless `level` is `false`), and none where that span is
// one reading, and its plot draws each reading as a dot (`CHART_LEVEL`,
// `CHART_DOT`) against an axis around the readings (`levelScale`), never a
// bar from zero. Each bar stands in its region of the plot, at least seven
// (`CHART_REGIONS`), so a short series stands in the first of them; the
// first and last bars' times stand under their bars, and the times
// between at evenly spaced strides as the plot's width holds them
// (`timeSpace`). While its read waits the total and the legend's figures are
// painted, the plot one painted box at its loaded height. It is a frame of
// its items: its failed, missing and empty shapes stand in its box with the
// generic sentences, whatever stands above it. A bar `partial` (its period
// not over) is hatched; a bar `selected` (its record open beside the
// chart) stands in the selection wash.
export const barChartEntry: RosterEntry = {
	props: ["label", "keys", "unit", "level", "bar", "items"],
	draws: [
		"CHART",
		"CHART_BAND",
		"CHART_BODY",
		"CHART_FILL",
		"CHART_GRID",
		"CHART_HEAD",
		"CHART_KEY",
		"CHART_KEYS",
		"CHART_KEY_DOT",
		"CHART_MAIN",
		"CHART_BAR",
		"CHART_LEVEL",
		"CHART_DOT",
		"CHART_PARTIAL",
		"CHART_SELECTED",
		"CHART_TICK_LANE",
		"CHART_TOTAL",
		"FIGURES",
		"LINE_BOX.role.meta",
		"TEXT.role.body",
		"TEXT.role.meta",
		"TEXT_STRONG.role.body",
		"PAINT.kind.box",
		"PAINT.kind.glyphs",
		"SCRAMBLE",

		"SWAP_IN",
		"SWAP_OUT",
	],
	states: ["rest", "loading", "empty", "error"],
	motion: ["value", "wait"],
	owns: {
		roles: ["body", "meta"],
		colors: ["ink-body", "ink-meta", "edge", "skeleton", "chart-"],
		radii: ["full", "chip"],
		spacing: ["stack", "gap"],
		sizes: ["control", "dot", "figures", "measure-short", "target"],
	},
};

// A bar's fill (`FILL_X` up its column) stands on the baseline, and `--stack`
// lifts a stacked part over the ones under it.
export const FILL_Y =
	"origin-bottom scale-y-(--fill) -translate-y-(--stack) starting:scale-y-0 transition-[scale,translate,background-color] [transition-duration:var(--transition-duration-slow),var(--transition-duration-slow),var(--transition-duration-base)] ease-in-out";

// A mark that rides a share of its column (a level's reading in a bar
// chart) travels the same way down it; the site sets `--travel` (a share of
// the mark's own box, the column's height).
export const TRAVEL_Y =
	"translate-y-(--travel) transition-[translate] duration-slow ease-in-out";

// One of the four bands the plot's height splits into, its top a gridline
// (the last band's bottom the baseline too); the axis beside the plot
// stands the same bands with clear lines, so each tick centres on its line.
export const CHART_BAND = matrix({
	base: "",
	variants: {
		kind: {
			grid: "border-edge",
			axis: "border-transparent",
		},
		rule: {
			top: "border-t",
			both: "border-y",
		},
	},
	defaultVariants: { kind: "grid", rule: "top" },
});

// A series' mark (a column, a stacked part, a key's dot) in the chart fills,
// in `CHART_SERIES` order: one series takes the first.
export const CHART_FILL = matrix({
	base: "",
	variants: {
		series: {
			teal: "bg-chart-teal",
			violet: "bg-chart-violet",
			amber: "bg-chart-amber",
			pink: "bg-chart-pink",
			green: "bg-chart-green",
			red: "bg-chart-red",
			neutral: "bg-chart-neutral",
		},
	},
	defaultVariants: { series: "teal" },
});

export const chartBand = build(CHART_BAND);
export const chartFill = build(CHART_FILL);

// BarChart: the card on the surface holding the head (the total and its unit,
// then the series' keys) over the body (the axis beside the plot over its
// times). The plot is the chart's
// height in four bands (`chartBand`); a stacked part over another is split
// from it by a clear line. The axis is a lane four figures wide, the widest
// tick, loaded or loading, so the plot never moves when the data lands.
export const CHART = `gap-stack ${CARD_PART}`;
export const CHART_HEAD = "gap-gap";
export const CHART_TOTAL = "gap-gap";
export const CHART_KEYS = "gap-x-stack gap-y-gap";
export const CHART_KEY = "gap-gap";
export const CHART_KEY_DOT = "size-dot rounded-full";
export const CHART_BODY = "gap-gap";
// The plot is `CHART_CONTROLS` controls tall.
export const CHART_CONTROLS = 4;
export const CHART_GRID = "h-[calc(4*var(--spacing-control))]";
export const CHART_MAIN = "gap-gap";
export const CHART_TICK_LANE = "w-figures";

// A bar chart's bar (or one part of a stacked bar): the plot's full height,
// scaled from the baseline to its share (`--fill`) and lifted over the parts
// under it (`--stack`). Each part after the first is lifted one more hairline,
// the clear line between parts, which a scaled border could not hold.
export const CHART_BAR = `absolute inset-0 ${FILL_Y}`;
// A level's reading (a temperature, a share), which the chart draws as a dot
// against the axis's floor-to-top run instead of a bar from zero: the
// plot's full height travelled down from its top by the share it stands under
// the top (`--travel`), its dot (`CHART_DOT`, the key's dot) centred on its
// top edge, so a reading moves by transform.
export const CHART_LEVEL = `absolute inset-0 ${TRAVEL_Y}`;
export const CHART_DOT =
	"absolute inset-x-0 top-0 mx-auto size-dot rounded-full -translate-y-1/2";
// A bar whose period is not over (this month so far): its column hatched at
// 45°, stripes two hairlines wide and two apart, by a mask on the unscaled
// column, so the hatch keeps its angle at any share and the ground (a selected
// region's wash too) shows between the stripes; each stripe is the series fill,
// which holds the 3:1 mark floor.
export const CHART_PARTIAL =
	"[mask-image:repeating-linear-gradient(45deg,black_0,black_calc(2*var(--spacing-hairline)),transparent_calc(2*var(--spacing-hairline)),transparent_calc(4*var(--spacing-hairline)))]";
// The region of the bar whose record is open beside the chart: the selection
// wash over the plot's height, as a selected row or table row carries it (no
// radius: it is a band of the plot, as a table row is).
export const CHART_SELECTED = "bg-wash-selected";
