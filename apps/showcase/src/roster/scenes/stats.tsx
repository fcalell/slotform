import { Stats, type StatsItem } from "@slotform/react-ui/components/stats";
import type { StatSpec } from "@slotform/ui-core/descriptors";
import { isFirstClassSet, type ShowcaseScene } from "../class-sets.ts";
import { readsAt, waiting, waitingText } from "../waiting.ts";
import { Judged } from "./judged.tsx";
import { Wide } from "./layout-context.tsx";
import { isPaint } from "./painted.tsx";

// An organization home's strip: each cell a link to its list, zeros drawn.
const HOME: readonly StatSpec[] = [
	{ label: "Projects", value: 12, href: "/projects" },
	{ label: "Open reviews", value: 0, line: "Last 90 days", href: "/reviews" },
	{
		label: "Tests",
		value: 1284,
		counts: [
			{ label: "failing", value: 3, href: "/tests/failing" },
			{ label: "untested", value: 0, href: "/tests/untested" },
		],
	},
	{ label: "Storage", value: 11.8, unit: "GB", line: "Of 10 GB" },
	// A five digit figure and a word of a unit at 320: the unit stands under
	// the figure, which is never cut.
	{ label: "Playing time", value: 4583, unit: "hours" },
];

// An odd count ends a narrow strip on one cell across its row.
const THREE: readonly StatSpec[] = HOME.slice(0, 3);

const COUNTS = [
	{ label: "failing", value: 3, href: "/tests/failing" as const },
	{ label: "untested", value: 5, href: "/tests/untested" as const },
];

// A plan's usage: each cell a share of its bound, as board 54 draws them, with
// a mark and a line of counts among them.
const USAGE: readonly StatSpec[] = [
	{
		label: "Requests",
		value: 250_000,
		bound: 1_000_000,
		line: "250k of 1M requests",
	},
	{
		label: "Jobs this window",
		value: 62,
		bound: 100,
		mark: { value: 80 },
		line: "Jobs and watches pause at the reserve",
	},
	{ label: "Passing", value: 34, bound: 42, goal: true, counts: COUNTS },
];

// A capacity strip at 320: a meter whose label is several words beside plain
// cells, two of them opening a list. The meter's label wraps whole at its words
// and its share stands on the figure line, as the cells' figures do.
const CAPACITY: readonly StatSpec[] = [
	{
		label: "Open work in progress",
		value: 23,
		bound: 18,
		line: "23 of 18 days",
	},
	{ label: "Months of work", value: 1.3 },
	{
		label: "Not sized",
		value: 3,
		line: "open requests",
		href: "/tests/untested",
	},
	{
		label: "No owner",
		value: 0,
		line: "open requests",
		href: "/tests/failing",
	},
];

// A cell that opens whose label wraps to two lines at 320, beside a plain one:
// its chevron stays at the end of the label's first line.
const LONG_LINK: readonly StatSpec[] = [
	{
		label: "Waiting on review today",
		value: 4,
		line: "open requests",
		href: "/tests/untested",
	},
	{ label: "Months of work", value: 1.3 },
];

// The shares at one level.
const LEVELS: Record<string, readonly StatSpec[]> = {
	"METER_FILL.level.under": [
		{ label: "Seats", value: 1, bound: 12, line: "1 of 12 seats" },
		{
			label: "Preview deploys",
			value: 0,
			bound: 100,
			line: "0 of 100 this month",
		},
		{ label: "Build minutes", value: 4000, bound: 6000 },
	],
	"METER_FILL.level.near": [
		{ label: "Bandwidth", value: 92, bound: 100, line: "92 of 100 GB" },
		{ label: "Projects", value: 3, bound: 3, line: "3 of 3 projects" },
		{
			label: "Jobs this window",
			value: 85,
			bound: 100,
			mark: { value: 80 },
			line: "Past the reserve: jobs and watches pause",
		},
	],
	// A goal reached is the good tone; short of it, the neutral one, whatever
	// the share (tests passing of all of them, 62% with failures beside it).
	"METER_FILL.level.met": [
		{ label: "Passing", value: 42, bound: 42, goal: true, counts: COUNTS },
		{ label: "Recipients reached", value: 120, bound: 120, goal: true },
		{ label: "Passing", value: 26, bound: 42, goal: true, counts: COUNTS },
	],
	"METER_FILL.level.over": [
		{ label: "Storage", value: 11.8, bound: 10, line: "11.8 of 10 GB" },
	],
};

// The strips whose figures and lines never arrive: each cell paints its figure,
// or its share, and the line under it.
const waitingFigure = waiting.at(() => 0);
const painted = (items: readonly StatSpec[]): readonly StatsItem[] =>
	items.map((item) => ({
		...item,
		value: waitingFigure,
		line: item.line === undefined ? undefined : waitingText,
	}));

// The shares over a read that failed, no frame above holding it: each is the
// failed shape itself, one with a line under its bar and one with counts.
function Failed(props: { id: string }) {
	const used = readsAt(props.id).failing.at((rows) => rows.length);
	const cells: readonly StatsItem[] = [
		{
			label: "Requests",
			value: used,
			bound: 1_000_000,
			line: "250k of 1M",
		},
		{ label: "Passing", value: used, bound: 42, goal: true, counts: COUNTS },
	];
	return <Stats items={cells} />;
}

// The loaded scenes judge their own edges: a cell's label wraps at its words
// and is never cut (no child of a cell is wider than its box), and a cell that
// opens draws its chevron, at the end of the label's first line.
function judgeCells(host: HTMLElement) {
	for (const cell of host.querySelectorAll("li")) {
		for (const part of cell.querySelectorAll("*")) {
			if (part.scrollWidth > part.clientWidth + 1 && part.clientWidth > 0)
				console.error(`Stats: the label "${part.textContent}" is cut`);
		}
		// The cell's own hit is its direct child; a count link inside is no cell link.
		if (cell.querySelector(":scope > a[href]") && !cell.querySelector("svg"))
			console.error("Stats: a cell that opens draws no chevron");
		// The chevron stands on the label's first line: it ends above the label's
		// second line, which starts one line under the label's top.
		const glyph = cell.querySelector("svg")?.getBoundingClientRect();
		const labelPart = cell.querySelector("span > span");
		if (glyph && labelPart) {
			const label = labelPart.getBoundingClientRect();
			const line = Number.parseFloat(getComputedStyle(labelPart).lineHeight);
			if (glyph.top < label.top - 1 || glyph.bottom > label.top + line + 1)
				console.error("Stats: the chevron is off the label's first line");
		}
	}
}

// A `METER_FILL.level` cell draws the shares at that level, every other cell
// the usage; a `PAINT` cell draws each strip loaded with the same strip
// painted beside it.
export function drawStats(scene: ShowcaseScene) {
	const usage = LEVELS[scene.classSet.name] ?? USAGE;
	if (isPaint(scene))
		return scene.state === "rest" ? (
			<Wide>
				<Stats items={HOME} />
				<Stats items={painted(HOME)} />
				<Stats items={USAGE} />
				<Stats items={painted(USAGE)} />
			</Wide>
		) : undefined;
	// The error state, on the first cell, draws the shares over a read that failed.
	if (scene.state === "error")
		return isFirstClassSet(scene) ? (
			<Wide>
				<Failed id={scene.id} />
			</Wide>
		) : undefined;
	if (scene.state === "loading")
		return (
			<Wide>
				<Stats items={painted(HOME)} />
				<Stats items={painted(usage)} />
				<Stats items={painted(CAPACITY)} />
			</Wide>
		);
	return (
		<Wide>
			<Judged settle={2} judge={judgeCells} className="contents">
				<Stats items={HOME} />
				<Stats items={THREE} />
				<Stats items={usage} />
				<Stats items={CAPACITY} />
				<Stats items={LONG_LINK} />
			</Judged>
		</Wide>
	);
}
