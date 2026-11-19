import type { CanvasNode } from "@fcalell/ui-core/descriptors";
import {
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { spacing } from "../../lib/measure.ts";
import { minZoomFor } from "./floor.ts";
import type { Box, Size } from "./geometry.ts";
import type { GraphRun, Laid } from "./layout.ts";
import { fitView, type Opening, openingView } from "./open.ts";
import { standIn, standsIn } from "./view.ts";
import type { Viewport } from "./viewport.ts";

interface OpeningArgs {
	region: RefObject<HTMLElement | null>;
	nodes: readonly CanvasNode[];
	// `pathOrder` of the nodes and the empty groups.
	order: readonly string[];
	sizes: ReadonlyMap<string, Size>;
	// A glyph's size on screen at the density.
	glyph: number;
	// The widest a node's name stands beside its glyph on screen (`nameCap`).
	names: number;
	// The node the viewer chose: a resized pane keeps it in view.
	selected?: string;
}

interface OpeningView {
	// The lowest scale the pan and zoom allow (`minZoomFor`).
	minZoom: number;
	// The graph is placed and the first view set, so it may show.
	ready: boolean;
	// The Fit act's view: the whole graph in the room the pane leaves, at the
	// scale that holds it down to the lowest the boxes allow. The graph opens
	// (and opens again when its pane resizes) at the same view floored at
	// `FIT_FLOOR`, framed at its first node where it holds only under it.
	fit: () => void;
}

// Sets the view on what the run placed: the first view, the Fit act's, the one
// an Arrange lands at, and the view again when the room, the parts or the node
// set move under it.
export function useOpeningView(
	run: GraphRun,
	viewport: Viewport,
	{ region, nodes, order, sizes, glyph, names, selected }: OpeningArgs,
): OpeningView {
	const {
		boxes,
		standing,
		tierAt,
		routeTier,
		laid,
		set,
		placing,
		measured,
		placed,
		room,
	} = run;
	const { pair } = run.space;
	const [ready, setReady] = useState(false);

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
	// The latest opening, so Arrange fits the bounds the consumer's positions
	// produced and not the ones the run was asked from.
	const latest = useRef(open);
	useLayoutEffect(() => {
		latest.current = open;
	}, [open]);
	// The run reports an arranged layout's positions in an effect before this
	// one; they commit before the frame, and no event marks that commit.
	useEffect(() => {
		if (laid?.arranged) requestAnimationFrame(() => latest.current());
	}, [laid]);

	// The node set the view was last opened on.
	const opened = useRef(set);
	useLayoutEffect(() => {
		const element = region.current;
		if (ready || !element || !placed) return;
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
	}, [ready, placed, region, open, set, selected, standing, viewport]);
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
		else latest.current();
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
	// Arrange's fit. A new set of edges over the layout it was not run on is not
	// a new room, and the view the viewer left stays (a new set opens again once
	// its own layout lands, below).
	const wrappedFor = useRef<{ laid: Laid | null; room: string } | null>(null);
	useLayoutEffect(() => {
		if (!ready || !laid) return;
		const was = wrappedFor.current;
		if (was && was.laid === laid && was.room !== room) refit();
		wrappedFor.current = { laid, room };
	}, [ready, laid, room, refit]);

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
		// An Arrange fits the view itself, once it lands.
		if (laid?.arranged && was.laid !== laid) return;
		if (!measured || viewport.moved()) return;
		refit();
	}, [ready, laid, sizes, measured, viewport, refit]);

	return { minZoom, ready, fit };
}
