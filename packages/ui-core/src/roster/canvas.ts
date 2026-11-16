import type { IconName } from "../icon-name.ts";
import type { Route, StatusMark } from "./descriptors.ts";
import type { RosterEntry } from "./shared.ts";
import { ANSWER, build, matrix } from "./shared.ts";

// A graph of nodes and edges on a pannable ground, the web's alone: the
// phone has no pointer to drag a node or draw an edge with. Selection
// recolours the node's outline; a `path` dims what a run did not take. A
// group holding no present node is a leaf an edge may name. While its
// `nodes`, `edges` or `groups` is a selection still to land it stands its
// waiting ground (the dots, three painted node cards at a step node's
// measure in the middle, and the zoom stack), since a layout has no
// geometry before its data and the placeholders are the nodes' measure
// alone. Its `nodes`, given as a selection, are its
// own frame: its failed, missing and empty forms stand in its ground with
// the generic sentences. A node's status is its dot and its label, which
// truncates before the title.
export const canvasEntry: RosterEntry = {
	props: [
		"label",
		"nodes",
		"edges",
		"groups",
		"selected",
		"onSelect",
		"path",
		"onMove",
		"onConnect",
		"act",
	],
	platforms: ["web"],
	draws: [
		"PAINT.kind.box",
		"PAINT.kind.glyphs",
		"SCRAMBLE",
		"CANVAS_GROUND",
		"CANVAS_NODE",
		"CANVAS_NODE_TEXT",
		"CANVAS_NODE_GLYPH",
		"CANVAS_NODE_MARK",
		"CANVAS_NODE_INK",
		"CANVAS_NODE_NAME",
		"CANVAS_PORT",
		"CANVAS_PORT_HIT",
		"CANVAS_GROUP",
		"CANVAS_GROUP_HEAD",
		"CANVAS_ZOOM",
		"LIFT",
		"PATH_TONE",
		"LINE_IN",
		"BLOCK_IN",
		"ICON.fit.meta",
		"ICON.fit.body",
		"ICON_BUTTON.fit.body",
		"BUTTON.act.quiet",
		"BUTTON.fit.body",
		"BUTTON_LABEL.act.quiet",
		"COUNT",
		"COUNT_LABEL",
		"CHIP.family.neutral",
		"CHIP.trailing.none",
		"CHIP_LABEL.family.neutral",
		"STATUS",
		"STATUS_DOT",
		"STATUS_SPINNER",
		"STATUS_LABEL",
		"SPINNER",
		"SPINNER_TRACK",
		"SPINNER_ARC",
	],
	states: ["rest", "selected", "loading", "empty", "error"],
	motion: ["answer", "give", "block", "line", "wait", "follow"],
	owns: {
		roles: ["body", "meta", "caption"],
		colors: [
			"skeleton",
			"canvas",
			"group",
			"surface",
			"edge",
			"edge-strong",
			"edge-error",
			"selected-outline",
			"edge-hover",
			"grid",
			"ring",
			"ink-body",
			"ink-meta",
			"ink-disabled",
			"fill-neutral",
			"accent-ink",
			"accent-soft",
			"accent-edge",
			"warn-soft",
			"ok",
			"warn",
			"chip-amber",
			"danger",
			"chip-",
		],
		radii: ["card", "control", "full", "chip"],
		spacing: ["gap", "pad", "section", "page"],
		sizes: [
			"icon-meta",
			"node",
			"target",
			"control",
			"dot",
			"icon",
			"measure-short",
			"measure",
		],
		elevation: ["float"],
	},
};

export interface CanvasPoint {
	x: number;
	y: number;
}

// What a node is in its graph, drawn in its shape and tone: `start` a pill in
// the accent, `step` the plain card, `decision` a compact card with a diamond
// (its answers are its out-edges' labels), `wait` a card in the attention
// tone (something waits for a person), `call` a card with a double edge
// (another graph runs here), `end` a quiet pill.
export type CanvasRole =
	| "start"
	| "step"
	| "decision"
	| "wait"
	| "call"
	| "end";

// One node: its glyph, its words and the one figure in its trailing slot,
// `number` (a place in a sequence) over `count`. A `warning` is drawn in
// place of `line`; an `off` node is drawn quiet over its role. Without a
// `position` the canvas places it.
export interface CanvasNode {
	id: string;
	icon: IconName;
	// What the node is, in its shape and tone (`step`, the plain card, without one).
	role?: CanvasRole;
	// A `call` node's graph: it draws an open act that goes there without choosing the node.
	href?: Route;
	// Over the title (a short phrase; truncates).
	overline?: string;
	// The node's name (a short phrase; truncates).
	title: string;
	// Under the title (a phrase; wraps to a second line, then truncates).
	line?: string;
	number?: number;
	count?: number;
	// The node's status: its dot and its `label`, leading the line under the title (a word or two; whole up to the short measure, then truncates).
	status?: StatusMark;
	// What is wrong with the node, in `line`'s place (a short phrase; truncates).
	warning?: string;
	off?: boolean;
	position?: CanvasPoint;
}

// An edge from one node's id to another's, its `label` drawn on it; a
// `handoff` edge carries its glyph beside the label. An end may name a group
// that holds nothing present, which stands in the path as a node does.
export interface CanvasEdge {
	id: string;
	from: string;
	to: string;
	// Drawn on the edge in a chip (a word; truncates past the short measure, 20 characters).
	label?: string;
	handoff?: boolean;
}

// A frame round the nodes and groups it `holds`, by id; a group may hold a
// group. A group holding nothing present is a frame of its head alone.
export interface CanvasGroup {
	id: string;
	// The frame's heading (a short phrase; truncates).
	head: string;
	holds: readonly string[];
}

// A run or scenario's taken path, by id; everything else dims. `at` is the
// node the run stands at.
export interface CanvasPath {
	nodes: readonly string[];
	edges: readonly string[];
	at?: string;
}

// A canvas node lifted by a long press scales to `lift` (a `scale` the answer
// already eases) while its float shadow fades in on `fast`: the shadow is the
// node's own `::after`, a box of its size that draws nothing but the shadow
// outside it, so a node that is not lifted carries none. The site marks the
// lift with `data-lifted`.
export const LIFT =
	"data-lifted:scale-(--scale-lift) after:absolute after:inset-0 after:rounded-card after:shadow-float after:opacity-0 after:pointer-events-none after:transition-opacity after:duration-fast after:ease-out data-lifted:after:opacity-100";
// A path's tone (a taken edge against the rest dimmed, a node's words and its
// chip) cross-fades its ink on `base`, slower than a state's answer: the whole
// run changes at once.
export const PATH_TONE = "transition-colors duration-base ease-out";

// A node's role is its shape (`role`: its radius, and a decision's compact
// height) and its tone (`tone`: its ground and, at rest, its edge): `plain` the
// plain card, `strong` a decision's stronger edge, `accent` a start's pill,
// `attention` the wait on a person, `muted` an end's pill; `off` and
// `dimmed` are the quiet a node draws over any role: an off node a filled card
// in the meta ink, a node off the path a hairline on the canvas's ground. A glyph's shape (`CANVAS_NODE_GLYPH`) and a card hold the same tones.
const NODE_GROUND = {
	plain: "bg-group",
	strong: "bg-group",
	accent: "bg-accent-soft",
	attention: "bg-warn-soft",
	muted: "bg-canvas",
	off: "bg-group",
	dimmed: "bg-canvas",
};

// The edge a tone draws at rest; a selection and a warning take it over.
const NODE_EDGES = [
	{ state: "rest", tone: "plain", class: "border-edge" },
	{ state: "rest", tone: "strong", class: "border-edge-strong" },
	{ state: "rest", tone: "accent", class: "border-accent-edge" },
	{ state: "rest", tone: "attention", class: "border-warn" },
	{ state: "rest", tone: "muted", class: "border-edge" },
	{ state: "rest", tone: "off", class: "border-edge" },
	{ state: "rest", tone: "dimmed", class: "border-edge" },
] as const;

// The colour of a node's outline: the tone's, the selection's, or the
// warning's. The path's `at` node draws `selected`.
const NODE_STATE = {
	rest: "",
	selected: "border-selected-outline",
	warning: "border-edge-error",
};

// A call node's second hairline, a step outside its edge: another graph runs
// here.
const CALL_EDGE = "outline-1 outline-offset-2 outline-edge";

// A node's box on the canvas's ground: a card, a decision's compact card, or a
// pill.
export const CANVAS_NODE = matrix({
	base: `w-node min-h-control gap-gap px-pad py-gap border ${ANSWER} ${LIFT}`,
	variants: {
		state: NODE_STATE,
		role: {
			step: "py-gap rounded-card",
			start: "py-gap rounded-full",
			decision: "py-gap rounded-card",
			wait: "py-gap rounded-card",
			call: `py-gap rounded-card ${CALL_EDGE}`,
			end: "py-gap rounded-full",
		},
		tone: NODE_GROUND,
	},
	compoundVariants: [...NODE_EDGES],
	defaultVariants: { state: "rest", role: "step", tone: "plain" },
});

// The ink of a node's icon by its tone, on the node's card and on its glyph
// alone; its words take their own (`CANVAS_NODE_TEXT`). A node off the path
// draws its icon in the mark ink (the non-text floor, 3:1), quieter than an
// off node's. A card eases it with its
// own answer; a glyph adds the path's tone, which never moves its scale.
export const CANVAS_NODE_INK = matrix({
	base: "",
	variants: {
		tone: {
			plain: "text-ink-body",
			strong: "text-ink-body",
			accent: "text-accent-ink",
			attention: "text-warn",
			muted: "text-ink-meta",
			off: "text-ink-meta",
			dimmed: "text-ink-mark",
		},
	},
	defaultVariants: { tone: "plain" },
});

// A node's text: the type role rides on the part, the ink on the tone. A rest
// overline and line are meta, a rest title is body; off and dimmed recolour
// every part they reach to meta, the quietest ink a word has: a node off the
// path is a button that can be chosen, so its words stay above the text floor
// and it reads as off by its title's step down, its missing marks and its
// dimmed edges. A warning's words keep the rest ink.
export const CANVAS_NODE_TEXT = matrix({
	base: PATH_TONE,
	variants: {
		part: {
			overline: "text-caption leading-caption tracking-caption font-normal",
			title: "text-body leading-body font-medium",
			line: "text-meta leading-meta font-normal",
		},
		tone: {
			rest: "",
			off: "text-ink-meta",
			dimmed: "text-ink-meta",
		},
	},
	compoundVariants: [
		{ part: "overline", tone: "rest", class: "text-ink-meta" },
		{ part: "line", tone: "rest", class: "text-ink-meta" },
		{ part: "title", tone: "rest", class: "text-ink-body" },
		// A node off the path is a hairline on the canvas's ground (`NODE_GROUND`)
		// and its title stands at regular weight: it reads apart from an on-path
		// node (a filled card, a title at 500 in the body ink) and from an off node
		// (a filled card, a title at 500 in the meta ink, the word "Off").
		{ part: "title", tone: "dimmed", class: "font-normal" },
	],
	defaultVariants: { part: "line", tone: "rest" },
});

// A node under the text floor: the shape behind its glyph alone, in the
// control-sized box of its button, which holds the icon, the marks and the
// name. It is the node's box (`CANVAS_NODE`) in the role's form: a card, a
// circle for a pill, a square turned a quarter for a decision (a diamond, the
// box's inset less its corners), at the node's tone and outline. The glyph holds
// its size on screen by a scale the script sets with each zoom frame, so it
// eases its colours alone (`PATH_TONE`), never `ANSWER`, whose property list
// holds `scale`. A decision's mark on its card is the same shape.
export const CANVAS_NODE_GLYPH = matrix({
	base: `absolute -z-10 border ${PATH_TONE}`,
	variants: {
		state: NODE_STATE,
		role: {
			step: "inset-0 rounded-card",
			start: "inset-0 rounded-full",
			decision: "inset-gap rotate-45 rounded-chip",
			wait: "inset-0 rounded-card",
			call: `inset-0 rounded-card ${CALL_EDGE}`,
			end: "inset-0 rounded-full",
		},
		tone: NODE_GROUND,
	},
	compoundVariants: [...NODE_EDGES],
	defaultVariants: { state: "rest", role: "step", tone: "plain" },
});

// Where a node's mark seats on its glyph (a status above, a warning below), at
// the glyph's right edge, keyed by the role's shape: a card's is flush in the
// corner (the room clear of the icon), a circle's a gap in from the corner (a
// circle's corner is outside its arc, a gap in is on it) and a diamond's flush
// too: its corners are outside its edges, so the status above and the warning
// below stand apart, never over its icon or on one another.
const MARK_SEAT = {
	step: "flush",
	start: "inset",
	decision: "flush",
	wait: "flush",
	call: "flush",
	end: "inset",
} as const;
// `Object.keys` types its keys as `string`.
const MARK_ROLES = Object.keys(MARK_SEAT) as Array<keyof typeof MARK_SEAT>;
export const CANVAS_NODE_MARK = matrix({
	base: "absolute flex",
	variants: {
		role: {
			step: "end-0",
			start: "end-gap",
			decision: "end-0",
			wait: "end-0",
			call: "end-0",
			end: "end-gap",
		},
		place: { status: "", warning: "" },
	},
	compoundVariants: MARK_ROLES.flatMap((role) => [
		{
			role,
			place: "status" as const,
			class: MARK_SEAT[role] === "flush" ? "top-0" : "top-gap",
		},
		{
			role,
			place: "warning" as const,
			class: MARK_SEAT[role] === "flush" ? "bottom-0" : "bottom-gap",
		},
	]),
	defaultVariants: { role: "step", place: "status" },
});

// A node's name in the overview, between the full node and the glyph alone: the
// meta role (the caption role is the same size; they differ by ink, weight and
// place) in body ink at 500, on the canvas's own ground so an edge never strikes through
// it, one line cut at the short measure. The tone recolours it as
// it does the node's words (off and dimmed meta).
export const CANVAS_NODE_NAME = matrix({
	base: `max-w-measure-short truncate whitespace-nowrap px-gap bg-canvas text-meta leading-meta font-medium ${PATH_TONE}`,
	variants: {
		tone: {
			rest: "text-ink-body",
			off: "text-ink-meta",
			dimmed: "text-ink-meta",
		},
	},
	defaultVariants: { tone: "rest" },
});

// A group's dashed frame: the dash says a group, the outline's colour and a
// second pixel of line say it is selected (one dashed hairline in the accent
// reads faint on the dark ground). The second pixel is an inset outline over
// the same 1 px border box, so selecting moves nothing inside the frame.
export const CANVAS_GROUP = matrix({
	base: "rounded-card border border-dashed",
	variants: {
		state: {
			rest: "border-edge-strong",
			selected:
				"border-transparent outline-2 -outline-offset-2 outline-dashed outline-selected-outline",
		},
	},
	defaultVariants: { state: "rest" },
});

export const canvasGroup = build(CANVAS_GROUP);
export const canvasNode = build(CANVAS_NODE);
export const canvasNodeText = build(CANVAS_NODE_TEXT);
export const canvasNodeGlyph = build(CANVAS_NODE_GLYPH);
export const canvasNodeMark = build(CANVAS_NODE_MARK);
export const canvasNodeInk = build(CANVAS_NODE_INK);
export const canvasNodeName = build(CANVAS_NODE_NAME);

// Canvas: the ground the nodes stand on, one step off the page; a port, a
// hollow ring on the node's edge inside a hit box the target's size (24, 44 on
// touch); a group's dashed frame and its head on the group ground; the zoom
// stack's box. The dot grid, the edge strokes and the zoom's buttons (icon `Button`)
// are not cells.
export const CANVAS_GROUND = "bg-canvas";
export const CANVAS_PORT = `size-[calc(2*var(--spacing-badge))] rounded-full border border-edge-strong bg-surface ${ANSWER}`;
export const CANVAS_PORT_HIT = "size-target";
export const CANVAS_GROUP_HEAD =
	"gap-gap px-pad py-gap min-h-target rounded-t-card border border-transparent bg-group text-meta leading-meta font-normal text-ink-meta";
export const CANVAS_ZOOM = "rounded-control border border-edge bg-surface";
