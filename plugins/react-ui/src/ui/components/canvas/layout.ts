import { backEdges } from "@fcalell/ui-core/canvas";
import type {
	CanvasEdge,
	CanvasGroup,
	CanvasNode,
	CanvasPoint,
} from "@fcalell/ui-core/descriptors";
import type { ElkNode } from "elkjs/lib/elk-api.js";
import {
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { spacing } from "../../lib/media.ts";
import {
	type ElkInput,
	elkGraph,
	fromElk,
	type Gaps,
	graphKey,
	layerGap,
	wrapParts,
} from "./elk.ts";
import { glyphTier, minZoomFor, routeSide } from "./floor.ts";
import {
	type Box,
	hollowRow,
	leftPads,
	type Routes,
	routeEdges,
	type Size,
} from "./geometry.ts";
import { fitView, type Opening, openingView } from "./open.ts";
import { type Places, place, standIn, standsIn } from "./view.ts";
import {
	type About,
	clearanceOf,
	useViewportValue,
	type Viewport,
} from "./viewport.ts";

// The sizes a layout is drawn by, from the spacing roles at the density in
// force: a layer gap holds the router's bend and a label chip with air round
// it.
export interface Space {
	pad: number;
	pair: number;
	// A port ring's drawn size.
	port: number;
	gaps: Gaps;
}

export function spaces(chip: number): Space {
	const pair = spacing("gap");
	return {
		pad: spacing("pad"),
		pair,
		// A port is two badge gaps square (`CANVAS_PORT`).
		port: 2 * spacing("badge"),
		gaps: {
			node: spacing("pad"),
			layer: layerGap(spacing("section"), chip, pair),
			page: spacing("page"),
		},
	};
}

// What the hidden probe measures: the height of a group head, how far each
// group's head text reaches from its frame's left edge, and each chip's size,
// by edge id.
interface Measures {
	head: number;
	reach: ReadonlyMap<string, number>;
	labels: ReadonlyMap<string, Size>;
}

const NONE: Measures = { head: 0, reach: new Map(), labels: new Map() };

const sameMap = <T>(
	a: ReadonlyMap<string, T>,
	b: ReadonlyMap<string, T>,
	same: (one: T, two: T) => boolean,
) =>
	a.size === b.size &&
	[...b].every(([id, value]) => {
		const last = a.get(id);
		return last !== undefined && same(last, value);
	});

const sameMeasures = (a: Measures, b: Measures) =>
	a.head === b.head &&
	sameMap(a.reach, b.reach, (one, two) => one === two) &&
	sameMap(
		a.labels,
		b.labels,
		(one, two) => one.width === two.width && one.height === two.height,
	);

// Reads the probe's parts (one `data-head` per group, one `data-label` per
// edge) and reads them again when any of them resizes. `null` until the first
// read.
function useMeasures(probe: HTMLElement | null): Measures | null {
	const [measures, setMeasures] = useState<Measures | null>(null);
	useLayoutEffect(() => {
		if (!probe) return;
		const read = () => {
			const labels = new Map<string, Size>();
			for (const part of probe.querySelectorAll<HTMLElement>("[data-label]")) {
				const { width, height } = part.getBoundingClientRect();
				labels.set(part.dataset.label ?? "", { width, height });
			}
			// A probe frame holds its head, whose text ends where its span does.
			const reach = new Map<string, number>();
			let head = 0;
			for (const frame of probe.querySelectorAll<HTMLElement>("[data-head]")) {
				const text = frame.querySelector("span")?.getBoundingClientRect();
				const row = frame.firstElementChild?.getBoundingClientRect();
				head = Math.max(head, Math.ceil(row?.height ?? 0));
				reach.set(
					frame.dataset.head ?? "",
					(text?.right ?? 0) - frame.getBoundingClientRect().left,
				);
			}
			const next = { head, reach, labels };
			setMeasures((last) => (last && sameMeasures(last, next) ? last : next));
		};
		read();
		const watch = new ResizeObserver(read);
		for (const part of probe.children) watch.observe(part);
		return () => watch.disconnect();
	}, [probe]);
	return measures;
}

// A node's width in px, read off the root as `spacing` reads a role: the
// `node` width follows the theme's size.
const nodeWidth = (): number =>
	Number.parseFloat(
		getComputedStyle(document.documentElement).getPropertyValue(
			"--container-node",
		),
	);

// A box of the flow for each node whose place and size are known.
function boxesOf(
	nodes: readonly CanvasNode[],
	places: Places,
	sizes: ReadonlyMap<string, Size>,
): Map<string, Box> {
	const boxes = new Map<string, Box>();
	for (const node of nodes) {
		const size = sizes.get(node.id);
		if (size) boxes.set(node.id, { ...place(node, places), ...size });
	}
	return boxes;
}

// One run of the layout. Each is its own object, so a rerun for the same
// structure (Arrange) is reported again.
interface Laid {
	positions: ReadonlyMap<string, CanvasPoint>;
	// ELK's own output, whose top parts wrap in a narrow room (`wrapParts`).
	output: ElkNode;
	// It came from Arrange, which fits the view once it is reported.
	arranged: boolean;
	// The nodes and empty groups it was run for (`setOf`).
	set: string;
}

// The identity of a node set: the ids, in no order. A canvas whose set changes
// lays the graph out afresh and opens its view on the new one.
const setOf = (ids: readonly string[]): string => [...ids].sort().join("\0");

interface LayoutArgs {
	nodes: readonly CanvasNode[];
	edges: readonly CanvasEdge[];
	groups: readonly CanvasGroup[];
	// `pathOrder` of the nodes and the empty groups, which are leaves the layout
	// places and no node: they take no position of the consumer's and no `onMove`.
	order: readonly string[];
	hollow: readonly string[];
	sizes: ReadonlyMap<string, Size>;
	region: RefObject<HTMLElement | null>;
	viewport: Viewport;
	// The hidden probe (a new element when its parts change, so the observer is
	// given them again), and whether anything needs it (a group head or a chip).
	probe: HTMLElement | null;
	probed: boolean;
	// The positions a drag holds and a landing chose, which `place` reads.
	live: ReadonlyMap<string, CanvasPoint>;
	landed: ReadonlyMap<string, CanvasPoint>;
	onMove?: (id: string, position: CanvasPoint) => void;
	// Each node draws an in port.
	ports: boolean;
	// A glyph's size on screen at the density: under the text floor the routes
	// and the frames follow it.
	glyph: number;
	// The widest a node's name stands beside its glyph on screen (`nameCap`).
	names: number;
	// The node the viewer chose: a resized pane keeps it in view.
	selected?: string;
}

export interface Layout {
	// The nodes' boxes, as placed.
	boxes: ReadonlyMap<string, Box>;
	// Where each node draws at the zoom in force: as placed above the text
	// floor, spread under it by the group heads' growth (`glyphTier`).
	drawn: ReadonlyMap<string, Box>;
	// The box a node or a group's frame stands in at the zoom in force, by its id.
	standing: (id: string | undefined) => Box | undefined;
	// Where a node stands at a scale, which a zoom about it holds it by.
	about: (id: string) => About;
	routed: Routes;
	space: Space;
	// The lowest scale the pan and zoom allow (`minZoomFor`).
	minZoom: number;
	// The graph is placed and the first view set, so it may show.
	ready: boolean;
	// The Fit act's view: the whole graph in the room the pane leaves, at the
	// scale that holds it down to the lowest the boxes allow. The graph opens
	// (and opens again when its pane resizes) at the same view floored at
	// `FIT_FLOOR`, framed at its first node where it holds only under it.
	fit: () => void;
	// Runs the layout again, every position ignored, and fits the view to it.
	arrange: () => void;
	// How far the zoom stack's column reaches in from the pane's start, a
	// `pair` past it: a group head's words start past it (`headShift`).
	clearLeft: number;
	// How far the stack reaches up the pane, from its foot.
	clearStack: number;
}

// ELK runs for an input only when its key (`graphKey`) moves from the last run's:
// the key to run for, or `null` while the last run holds this input.
export function runKey(last: string | null, input: ElkInput): string | null {
	const key = graphKey(input);
	return key === last ? null : key;
}

// What a graph draws, routes to and frames at a routing side: the cards' boxes
// above the floor (side 0), the glyphs' squares under it, where a group's head
// draws at its own size on screen, so the band it covers and the padding round
// the glyphs grow by what the zoom takes (the side's step over the glyph) and the
// nodes spread by that growth (`glyphTier`). A glyph draws no port.
export function tiers(
	graph: Omit<Parameters<typeof routeEdges>[0], "boxes"> & {
		boxes: ReadonlyMap<string, Box>;
		holes: ReadonlyMap<string, Box>;
		glyph: number;
	},
): Pick<Opening, "tierAt" | "routeTier"> {
	const { boxes, holes, groups, glyph, head, pad, left, ports } = graph;
	return {
		tierAt: (side) =>
			glyphTier(boxes, holes, groups, { side, glyph, head, pad, left }),
		routeTier: (side, tier) =>
			routeEdges({
				...graph,
				boxes: tier.boxes,
				head: tier.head,
				pad: tier.pad,
				ports: ports && side === 0,
			}),
	};
}

// Measures, decides, runs, reports, routes and opens the first view. ELK
// places nodes when no node has a position, once every node is measured and
// the probe read, and not again for the same input (`graphKey`); Arrange runs it again
// whatever the positions. Its worker is imported when first wanted: a graph
// the consumer placed never loads it.
export function useLayout({
	nodes,
	edges,
	groups,
	order,
	hollow,
	sizes,
	region,
	viewport,
	probe,
	probed,
	live,
	landed,
	onMove,
	ports,
	glyph,
	names,
	selected,
}: LayoutArgs): Layout {
	const placing =
		(nodes.length > 0 || hollow.length > 0) &&
		nodes.every((node) => !node.position);
	const measured = nodes.every((node) => sizes.has(node.id));
	const width = nodeWidth();
	const read = useMeasures(probe);
	const measures = probed ? read : NONE;
	const chip = Math.max(
		0,
		...[...(measures?.labels.values() ?? [])].map((s) => s.height),
	);
	const space = spaces(chip);
	const { pad, pair, port } = space;
	const { node: across, layer: down, page } = space.gaps;
	const reach = measures?.reach;
	const lefts = useMemo(
		() => leftPads(groups, reach ?? NONE.reach, { pad, pair, width }),
		[groups, reach, pad, pair, width],
	);
	// What ELK reads: sizes, never positions, so any run of the same input is the
	// same layout. A node's height is its measured one, so a node that grows
	// after a run (a gate whose answers' words gain a line) runs it again.
	const input = useMemo(
		(): ElkInput | null =>
			measures
				? {
						nodes,
						edges,
						groups,
						order,
						sizes,
						width,
						head: measures.head,
						pad,
						left: lefts,
						gaps: { node: across, layer: down, page },
					}
				: null,
		[
			measures,
			nodes,
			edges,
			groups,
			order,
			sizes,
			width,
			pad,
			lefts,
			across,
			down,
			page,
		],
	);
	const key = useMemo(() => (input ? graphKey(input) : null), [input]);
	const [laid, setLaid] = useState<Laid | null>(null);
	const [ready, setReady] = useState(false);
	// A run that failed (its chunk did not load, or ELK threw) is thrown where the
	// canvas renders, for the error boundary above it.
	const [failure, setFailure] = useState<{ error: unknown } | null>(null);
	const current = useRef(key);
	const ran = useRef<string | null>(null);
	// A run is in flight from its request to its result.
	const flight = useRef(false);
	const reported = useRef<Laid | null>(null);

	useEffect(() => {
		current.current = key;
	}, [key]);

	// A run's result lands only while its input is still the one in force.
	const run = useCallback((given: ElkInput, at: string, arranged: boolean) => {
		flight.current = true;
		const graph = elkGraph(given);
		const set = setOf(given.order);
		import("@fcalell/plugin-react-ui/lib/canvas-layout")
			.then(({ layoutElk }) => layoutElk(graph))
			.then(
				(output) => {
					flight.current = false;
					if (current.current === at)
						setLaid({ positions: fromElk(output), output, arranged, set });
				},
				(error: unknown) => {
					flight.current = false;
					setFailure({ error });
				},
			);
	}, []);

	useEffect(() => {
		if (!placing || !measured || !input) return;
		const due = runKey(ran.current, input);
		if (due === null) return;
		ran.current = due;
		run(input, due, false);
	}, [placing, measured, input, run]);

	const arrange = () => {
		if (flight.current || !measured || !input || !key) return;
		run(input, key, true);
	};

	// The width the opening view has at the text floor: the pane less its inset
	// and the zoom stack's clearance, as `fitTransform`'s room. The parts of a
	// graph no edge links wrap to it (`wrapParts`), so it is read here and again
	// as the pane resizes: CSS cannot place what ELK placed.
	const [wrapSpace, setWrapSpace] = useState(Number.POSITIVE_INFINITY);
	const [clearLeft, setClearLeft] = useState(0);
	const [clearStack, setClearStack] = useState(0);
	useLayoutEffect(() => {
		const element = region.current;
		if (!element) return;
		const read = () => {
			const inset = spacing("page");
			const clear = clearanceOf(element);
			setWrapSpace(viewport.size().width - inset - Math.max(inset, clear.left));
			setClearLeft(clear.left);
			setClearStack(clear.stack);
		};
		read();
		const watch = new ResizeObserver(read);
		watch.observe(element);
		return () => watch.disconnect();
	}, [region, viewport]);
	const computed = useMemo(
		() =>
			laid
				? wrapParts(laid.output, laid.positions, edges, wrapSpace, {
						across,
						down,
					})
				: undefined,
		[laid, edges, wrapSpace, across, down],
	);

	// The latest fit, so Arrange fits the bounds the consumer's positions
	// produced and not the ones the run was asked from.
	const latest = useRef<(() => void) | null>(null);
	useEffect(() => {
		if (!onMove || !laid || !computed || reported.current === laid) return;
		reported.current = laid;
		for (const id of order) {
			const at = computed.get(id);
			if (at && !hollow.includes(id)) onMove(id, at);
		}
		// The consumer's positions commit before the frame; no event marks that
		// commit.
		if (laid.arranged)
			requestAnimationFrame(() => {
				latest.current?.();
			});
	}, [laid, computed, onMove, order, hollow]);

	const boxes = useMemo(
		() => boxesOf(nodes, { live, landed, computed }, sizes),
		[nodes, live, landed, computed, sizes],
	);
	const back = useMemo(() => backEdges(order, edges), [order, edges]);
	const head = measures?.head ?? 0;
	// An empty group stands where the layout put it, at the size of its head and
	// padding. Where no layout ran (every node has a position) the ones left
	// stand in one row below the nodes, in path order. Under the floor it keeps
	// its frame, as every frame does.
	const holes = useMemo(() => {
		const size = { width, height: head + 2 * pad };
		const out = new Map<string, Box>();
		for (const id of hollow) {
			const at = computed?.get(id);
			if (at) out.set(id, { ...at, ...size });
		}
		const unplaced = order.filter((id) => hollow.includes(id) && !out.has(id));
		const row = hollowRow(unplaced, boxes.values(), size, {
			gap: across,
			drop: down,
		});
		for (const [id, box] of row) out.set(id, box);
		return out;
	}, [hollow, order, computed, boxes, head, pad, across, down, width]);
	// Under the floor a node is its glyph, so the routes and the frames follow
	// the glyph's box, centred on the card's, and not the card's. The cards'
	// sizes stay as they are, and their places only spread (`glyphTier`). The
	// side moves in steps of a `pair`, which bounds how often the routes are
	// drawn while the zoom moves.
	const side = useViewportValue(viewport, (view) =>
		routeSide(view.k, glyph, pair),
	);
	const labels = measures?.labels ?? NONE.labels;
	const { tierAt, routeTier } = useMemo(
		() =>
			tiers({
				boxes,
				holes,
				groups,
				edges,
				back,
				labels,
				glyph,
				head,
				pad,
				left: lefts,
				pair,
				ports,
				port,
			}),
		[
			boxes,
			holes,
			groups,
			edges,
			back,
			labels,
			glyph,
			head,
			pad,
			lefts,
			pair,
			ports,
			port,
		],
	);
	const tier = useMemo(() => tierAt(side), [tierAt, side]);
	const drawn = tier.cards;
	const routed = useMemo(() => routeTier(side, tier), [routeTier, side, tier]);
	const about = useCallback(
		(id: string): About =>
			(k: number) =>
				tierAt(routeSide(k, glyph, pair)).cards.get(id),
		[tierAt, glyph, pair],
	);

	// The node the opening view stands on: the first one that is running or has
	// failed (where the run is), else the graph's first.
	const anchor = useMemo(
		() =>
			order.find((id) => {
				const tone = nodes.find((node) => node.id === id)?.status?.tone;
				return tone === "running" || tone === "failed";
			}) ?? order[0],
		[nodes, order],
	);

	// What the views that hold the whole graph (`openingView`, `fitView`) take:
	// the pane, the chrome and the density are read here, off the page.
	const opening = useCallback((): Opening | null => {
		if (!region.current) return null;
		// A node's icon stands past its inline padding, in a box no wider than a
		// control (a decision's diamond).
		const inline = spacing("pad");
		return {
			pane: viewport.size(),
			inset: spacing("page"),
			clear: viewport.clearance(),
			icon: { start: inline, end: inline + spacing("control") },
			glyph,
			pair,
			names,
			boxes,
			anchor,
			tierAt,
			routeTier,
		};
	}, [region, viewport, tierAt, routeTier, glyph, names, pair, boxes, anchor]);
	// The lowest zoom at which no two glyphs stand closer than the gap the edges
	// between them need: the lowest scale the pan and zoom allow, set as the boxes
	// move, and by a fit before its view, which must not meet the last graph's.
	const minZoom = useMemo(
		() => minZoomFor([...boxes.values()], glyph, pair),
		[boxes, glyph, pair],
	);
	useEffect(() => {
		viewport.limit(minZoom);
	}, [viewport, minZoom]);
	const fitTo = useCallback(
		(whole: boolean) => {
			const o = opening();
			if (!o) return;
			const view = whole ? fitView(o, minZoom) : openingView(o);
			viewport.limit(minZoom);
			viewport[whole ? "go" : "set"](view);
			// The view is the canvas's own again, until the viewer moves it.
			viewport.settle();
		},
		[opening, viewport, minZoom],
	);
	// The opening view and the one an Arrange fits to land at once, as the nodes
	// they follow do; the Fit act is the viewer's, fits the whole graph and travels.
	const open = useCallback(() => fitTo(false), [fitTo]);
	const fit = useCallback(() => fitTo(true), [fitTo]);
	useLayoutEffect(() => {
		latest.current = open;
	}, [open]);

	const placed = !placing || laid !== null;
	// The box a node or a group's frame stands in, by its id.
	const standing = useCallback(
		(id: string | undefined) =>
			id === undefined ? undefined : (drawn.get(id) ?? routed.frames.get(id)),
		[drawn, routed],
	);
	// The node set the view was last opened on.
	const set = useMemo(() => setOf(order), [order]);
	const opened = useRef(set);
	useLayoutEffect(() => {
		const element = region.current;
		if (ready || !element || !measured || !placed || !measures) return;
		// The graph opens as Fit shows it: whole in the room the pane leaves.
		open();
		// A node or frame chosen as the canvas mounts is where the view stands:
		// the opening view fits the graph, and the view is then set, at once and at
		// the scale it opened at, to stand the chosen box in the pane.
		const box = standing(selected);
		const view = viewport.get();
		const size = viewport.size();
		const clear = viewport.clearance();
		const inset = spacing("page");
		if (box && !standsIn(box, view, size, inset, clear)) {
			viewport.set(standIn(box, view.k, size, inset, clear));
			viewport.settle();
		}
		opened.current = set;
		setReady(true);
	}, [
		ready,
		measured,
		placed,
		measures,
		region,
		open,
		set,
		selected,
		standing,
		viewport,
	]);
	// The opening view stands for the room it was set in. When the pane's size
	// changes (a Pane beside it opens or closes, the window resizes) the graph
	// opens again in the new room, at once; with a node chosen the view keeps
	// its scale and pans only as far as the chosen node needs to stand in the new
	// room (`centreOn`), so a sheet docked beside it leaves it in sight. The view
	// is a transform the script sets, so CSS cannot follow the room: the
	// region's size is read here.
	const chosen = useRef<Box | undefined>(undefined);
	useLayoutEffect(() => {
		chosen.current = standing(selected);
	}, [selected, standing]);
	// The view opens again in the room it now has, or pans to the chosen box.
	const refit = useCallback(() => {
		const box = chosen.current;
		if (box) viewport.centreOn(box);
		else latest.current?.();
	}, [viewport]);
	useEffect(() => {
		const element = region.current;
		if (!ready || !element) return;
		let last = viewport.size();
		const watch = new ResizeObserver(() => {
			const size = viewport.size();
			if (size.width === last.width && size.height === last.height) return;
			last = size;
			refit();
		});
		watch.observe(element);
		return () => watch.disconnect();
	}, [ready, region, viewport, refit]);
	// Parts wrapped again for a resized room stand elsewhere: the graph opens
	// again on their boxes once they are drawn, or pans to the chosen node's new
	// place. A new layout is not this: its first view is the opening one, or
	// Arrange's fit.
	const wrappedFor = useRef<{ laid: Laid | null; wrapSpace: string } | null>(
		null,
	);
	useLayoutEffect(() => {
		if (!ready || !computed) return;
		// What wraps the parts: the room and the gaps the layout leaves between
		// them. A new set of edges over the layout it was not run on is not a new
		// room, and the view the viewer left stays (a new set opens again once its
		// own layout lands, below).
		const wrap = `${wrapSpace}|${across}|${down}`;
		const was = wrappedFor.current;
		if (was && was.laid === laid && was.wrapSpace !== wrap) {
			refit();
		}
		wrappedFor.current = { laid, wrapSpace: wrap };
	}, [ready, computed, laid, wrapSpace, across, down, refit]);

	// A new set of nodes is a new graph: once the layout has placed it, the view
	// opens on it again (or pans to the chosen node, as a resize does), unless the
	// viewer has panned or zoomed since the view was last the canvas's own. A graph
	// the consumer placed is not laid out, and a node it adds lands where the
	// viewer looks, so it never opens again.
	useLayoutEffect(() => {
		if (!ready || opened.current === set) return;
		if (!placing) {
			opened.current = set;
			return;
		}
		if (!measured || laid?.set !== set) return;
		opened.current = set;
		if (viewport.moved()) return;
		refit();
	}, [ready, set, placing, measured, laid, viewport, refit]);

	// What the view was opened on: the layout and the nodes' sizes. A late font
	// or a node that grows after the first view moves the boxes the view was set
	// for, and a layout that lands again for the same nodes (the probe read a
	// second time) moves them too, so the view opens again on them, or pans to the
	// chosen node, unless the viewer has since moved it. Without this the first view
	// stands whenever the second layout lands, and which it is is a race.
	const basis = useRef<{ laid: Laid | null; sizes: typeof sizes } | null>(null);
	useLayoutEffect(() => {
		if (!ready) return;
		const was = basis.current;
		basis.current = { laid, sizes };
		if (!was || (was.laid === laid && was.sizes === sizes)) return;
		// An Arrange fits the view itself, once it is reported.
		if (laid?.arranged && was.laid !== laid) return;
		if (!measured || viewport.moved()) return;
		refit();
	}, [ready, laid, sizes, measured, viewport, refit]);

	if (failure) throw failure.error;
	return {
		minZoom,
		boxes,
		drawn,
		standing,
		about,
		routed,
		space,
		ready,
		fit,
		arrange,
		clearLeft,
		clearStack,
	};
}
