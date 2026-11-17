import type { CanvasPoint } from "@fcalell/ui-core/descriptors";
import { type Band, bandAt, edgeSpeed } from "@fcalell/ui-core/drag";
import { createStore } from "@fcalell/ui-core/store";
import { select } from "d3-selection";
import { type D3ZoomEvent, zoom, zoomIdentity } from "d3-zoom";
import {
	type RefObject,
	useEffect,
	useState,
	useSyncExternalStore,
} from "react";
import { travel } from "../../lib/follow.ts";
import { spacing } from "../../lib/media.ts";
import type { Box } from "./geometry.ts";
import {
	autoPan,
	type Clearance,
	centreOf,
	clearOfStack,
	EXTENT,
	NO_CLEARANCE,
	PITCH,
	paneOf,
	shiftInto,
	standIn,
	standsIn,
	type Transform,
	wheelPan,
	whole,
	ZOOM_TO_NODE,
	zoomAbout,
} from "./view.ts";

// A drag that pans the view near the pane's edge (`Viewport.edge`): the
// pointer's client position, and what the drag does again at it once the
// view has moved under it.
export interface EdgeDrag {
	point: CanvasPoint;
	follow: (point: CanvasPoint) => void;
}

// What a zoom stands about: a node's box, or the box it takes at a scale. Under
// the text floor the boxes spread as the scale moves (`glyphTier`), so a zoom
// about a node holds it where it stands at the scale it leaves, at the place it
// takes at the scale it reaches.
export type About = (k: number) => Box | undefined;

// The canvas's viewport: pan, wheel, pinch and the zoom stack over one layer.
// The rest of the canvas reaches the pan and zoom only through this object.
export interface Viewport {
	get(): Transform;
	// Every transform change, for a part that reads the zoom.
	subscribe(listener: () => void): () => void;
	// A step of the scale about a node's box, whose centre stays where it stands
	// in the pane until the node would pass the pane's edge, when the view shifts
	// just enough to hold it whole and clear of the zoom stack; the pane's
	// centre without one. It travels.
	zoomIn(about?: About): void;
	zoomOut(about?: About): void;
	// A node's own size (`ZOOM_TO_NODE`) about its box, as a step does.
	zoomTo(about: About): void;
	// Instant, within the scale extent.
	set(transform: Transform): void;
	// The view travels to the transform (within the scale extent) on `base`
	// `in-out`, by the script's frames; a pan, a wheel or a pinch taking over
	// ends it where it got to.
	go(transform: Transform): void;
	// What the canvas's own chrome takes from the pane, which a fit and the opening view stay clear of.
	clearance(): Clearance;
	// Pans only, at the zoom it has, and nothing when the box already stands in
	// view and clear of the zoom stack. The box is centred in the room the chrome
	// leaves (`standIn`). It travels.
	centreOn(box: Box): void;
	// Raises the lowest scale, and a scale already under it to it.
	limit(lowest: number): void;
	// Whether the viewer has panned or zoomed since the canvas last set the view
	// itself (`settle`): a drag, a wheel, a pinch, a zoom step or a glyph's press.
	// The canvas's own moves (the opening view, Fit, a reveal, the lowest-scale
	// clamp) do not count.
	moved(): boolean;
	// The view is the canvas's own again: the viewer has not moved it since.
	settle(): void;
	// The pane's size, read off the region.
	size(): { width: number; height: number };
	// A pointer's client position as a flow point.
	screenToFlow(point: CanvasPoint): CanvasPoint;
	// A drag of a node or a link heard at each pointer move: while the pointer
	// stands near the pane's edge the view pans toward it a step a frame
	// (`autoPan`, `edgeSpeed`), the viewer's move, and the drag follows its
	// pointer again after each step. `null` ends it.
	edge(drag: EdgeDrag | null): void;
}

const STEP = 1.2;
// One wheel event moves the scale by at most the zoom stack's step, in d3's
// log2 measure; a trackpad pinch's small deltas stay proportional below it.
const MOST = Math.log2(STEP);
// The DOM's own approximation of a line in a wheel's `deltaMode`: Chrome and
// Firefox report pixels for a trackpad, so a line count comes from a mouse.
const LINE = 16;
// The dot grid's dots, in the pattern page's range: 1 px across, a `PITCH` apart.
export const DOT = 0.5;

// d3-zoom's own scale of a wheel's delta by its mode; a Ctrl or Cmd wheel (a
// trackpad pinch is a Ctrl wheel) zooms ten times faster.
const scaleOf = (event: WheelEvent): number => {
	if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return 0.05;
	return event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? 1 : 0.002;
};

const pixels = (event: WheelEvent, page: number): number => {
	if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return LINE;
	return event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? page : 1;
};

// A pan starts anywhere but on a part that carries its own drag (`data-no-pan`),
// and a wheel zooms with Ctrl or Cmd, which a trackpad pinch sends as Ctrl.
const pans = (event: MouseEvent | TouchEvent | WheelEvent): boolean => {
	if (event instanceof WheelEvent) return event.ctrlKey || event.metaKey;
	if (event.ctrlKey) return false;
	if (event instanceof MouseEvent && event.button) return false;
	return !(
		event.target instanceof Element && event.target.closest("[data-no-pan]")
	);
};

// What the canvas's chrome takes from the pane: docs/architecture/plugins/react-ui.md, "Canvas".
export function clearanceOf(element: HTMLElement | null): Clearance {
	if (!element) return NO_CLEARANCE;
	const pane = element.getBoundingClientRect();
	const pair = spacing("gap");
	const out = { left: 0, bottom: 0, stack: 0 };
	for (const part of element.querySelectorAll<HTMLElement>("[data-clear]")) {
		const box = part.getBoundingClientRect();
		if (part.dataset.clear === "left") {
			out.left = Math.max(out.left, box.right - pane.left + pair);
			out.stack = Math.max(out.stack, pane.bottom - box.top + pair);
		} else out.bottom = Math.max(out.bottom, pane.bottom - box.top + pair);
	}
	return out;
}

function make(region: RefObject<HTMLElement | null>) {
	const held = createStore<Transform>({ x: 0, y: 0, k: 1 });
	let layer: HTMLElement | null = null;
	let pattern: SVGPatternElement | null = null;
	// Whether the viewer moved the view since the canvas last set it.
	let moved = false;

	// The layer and the grid move by script, so a pan renders no React tree.
	const apply = (to: Transform) => {
		const next = { x: to.x, y: to.y, k: to.k };
		const { x, y, k } = next;
		if (layer) layer.style.transform = `translate(${x}px, ${y}px) scale(${k})`;
		if (pattern) {
			const pitch = PITCH * k;
			pattern.setAttribute("x", String(x));
			pattern.setAttribute("y", String(y));
			pattern.setAttribute("width", String(pitch));
			pattern.setAttribute("height", String(pitch));
			// A dot's centre stands on a pixel's centre where the layer sits at whole
			// pixels (scale 1), or it smears over four.
			const dot = pattern.firstElementChild;
			dot?.setAttribute("cx", String(Math.floor(x + pitch / 2) + 0.5 - x));
			dot?.setAttribute("cy", String(Math.floor(y + pitch / 2) + 0.5 - y));
			dot?.setAttribute("r", String(DOT * k));
		}
		held.set(next);
	};

	const behaviour = zoom<HTMLElement, unknown>()
		.scaleExtent([...EXTENT])
		.filter(pans)
		.wheelDelta((event: WheelEvent) => {
			const raw =
				-event.deltaY *
				scaleOf(event) *
				(event.ctrlKey || event.metaKey ? 10 : 1);
			return Math.max(-MOST, Math.min(MOST, raw));
		})
		.on("zoom", (event: D3ZoomEvent<HTMLElement, unknown>) => {
			// A drag, a pinch and a Ctrl wheel carry their event; the canvas's own
			// transforms (`land`) and the plain wheel's pan (below) do not.
			if (event.sourceEvent) moved = true;
			apply(event.transform);
		});

	const on = () => {
		const element = region.current;
		return element ? select(element) : null;
	};
	const pane = () => ({
		width: region.current?.clientWidth ?? 0,
		height: region.current?.clientHeight ?? 0,
	});

	// The view that travels, if one does, and where it is headed; whatever sets
	// the view or takes the pointer ends it. A step asked for while one travels
	// is a step from where it is headed, so quick presses add up.
	let travelling = () => {};
	let heading: Transform | null = null;
	const stop = () => {
		travelling();
		travelling = () => {};
		heading = null;
	};
	const base = (): Transform => heading ?? held.get();

	// The scale moves to `target` about the centre of the box `about`, else the
	// pane's centre, and that point stays where it stands; a box is then kept
	// whole in the pane and clear of the zoom stack (`clearOfStack`). A step or a
	// glyph's press is the viewer's move.
	const zoomTo = (target: number, about?: About) => {
		const [low, high] = behaviour.scaleExtent();
		const size = pane();
		const k = Math.min(high, Math.max(low, target));
		moved = true;
		const from = about?.(base().k);
		const to = about?.(k);
		if (!from || !to) {
			viewport.go(
				zoomAbout(base(), { x: size.width / 2, y: size.height / 2 }, k),
			);
			return;
		}
		// The box's centre stays where it stands in the pane, at its place at `k`.
		const at = paneOf(centreOf(from), base());
		const centre = centreOf(to);
		const zoomed = { k, x: at.x - centre.x * k, y: at.y - centre.y * k };
		const inset = spacing("page");
		const into = shiftInto(to, zoomed, size, inset);
		viewport.go(
			clearOfStack(to, into, size, inset, clearanceOf(region.current)),
		);
	};

	// The transform on the layer: d3's own state moves with it, so the next
	// pan or wheel starts from where the view stands.
	const land = (transform: Transform) => {
		const [low, high] = behaviour.scaleExtent();
		const { x, y, k } = whole(transform);
		const selection = on();
		if (selection)
			behaviour.transform(
				selection,
				zoomIdentity.translate(x, y).scale(Math.min(high, Math.max(low, k))),
			);
	};

	// The drag near the edge; the frame its next step waits on (0 when none
	// does); and the edge band the pointer stands in, which the speed ramps and
	// steps over (`bandAt`, `edgeSpeed`). A step at zero depth ends the frames
	// until the pointer moves.
	let dragged: EdgeDrag | null = null;
	let frame = 0;
	let band: Band | undefined;
	const step = (now: number) => {
		frame = 0;
		const element = region.current;
		const rect = element?.getBoundingClientRect();
		const depth =
			dragged &&
			rect &&
			autoPan(
				{ x: dragged.point.x - rect.left, y: dragged.point.y - rect.top },
				rect,
			);
		if (!dragged || !element || !depth || (depth.x === 0 && depth.y === 0)) {
			band = undefined;
			return;
		}
		// One number per edge and corner the pane pans toward.
		const side = Math.sign(depth.x) * 3 + Math.sign(depth.y);
		const { band: next, elapsed, since } = bandAt(band, element, side, now);
		band = next;
		stop();
		moved = true;
		const { k } = held.get();
		behaviour.translateBy(
			select(element),
			edgeSpeed(depth.x, elapsed, since) / k,
			edgeSpeed(depth.y, elapsed, since) / k,
		);
		frame = requestAnimationFrame(step);
		dragged.follow(dragged.point);
	};

	const viewport: Viewport = {
		get: held.get,
		subscribe: held.subscribe,
		zoomIn: (about) => zoomTo(base().k * STEP, about),
		zoomOut: (about) => zoomTo(base().k / STEP, about),
		zoomTo: (about) => zoomTo(ZOOM_TO_NODE, about),
		// Every transform the canvas sets itself comes through here, at whole
		// pixels; a wheel or a pinch stays as d3 gives it.
		set(transform) {
			stop();
			land(transform);
		},
		go(transform) {
			stop();
			const [low, high] = behaviour.scaleExtent();
			const { x, y, k } = whole(transform);
			const to = { x, y, k: Math.min(high, Math.max(low, k)) };
			heading = to;
			travelling = travel(held.get(), to, (view) => {
				land(view);
				if (view === to) heading = null;
			});
		},
		clearance: () => clearanceOf(region.current),
		moved: () => moved,
		settle() {
			moved = false;
		},
		size: pane,
		centreOn(box) {
			const size = pane();
			const inset = spacing("page");
			const clear = clearanceOf(region.current);
			if (standsIn(box, base(), size, inset, clear)) return;
			viewport.go(standIn(box, base().k, size, inset, clear));
		},
		limit(lowest) {
			behaviour.scaleExtent([lowest, EXTENT[1]]);
			const { k } = held.get();
			// A clamp of the scale is no move: it lands at once, about the pane's
			// centre.
			if (k < lowest) {
				const size = pane();
				viewport.set(
					zoomAbout(
						base(),
						{ x: size.width / 2, y: size.height / 2 },
						Math.min(EXTENT[1], lowest),
					),
				);
			}
		},
		screenToFlow(point) {
			const rect = region.current?.getBoundingClientRect();
			const { x, y, k } = held.get();
			return {
				x: (point.x - (rect?.left ?? 0) - x) / k,
				y: (point.y - (rect?.top ?? 0) - y) / k,
			};
		},
		edge(drag) {
			// A drag ended or begun enters the band afresh, whether or not a frame
			// ran between.
			if (!drag || !dragged) band = undefined;
			dragged = drag;
			if (!frame) frame = requestAnimationFrame(step);
		},
	};

	// A plain wheel pans through `translateBy`, which takes world units; the
	// handler is not passive so the page never scrolls under the canvas.
	const mount = () => {
		const element = region.current;
		if (!element) return;
		layer = element.querySelector<HTMLElement>("[data-layer]");
		pattern = element.querySelector<SVGPatternElement>("[data-grid]");
		if (layer) layer.style.transformOrigin = "0 0";
		const selection = select(element);
		selection.call(behaviour).on("dblclick.zoom", null);
		const wheel = (event: WheelEvent) => {
			if (event.ctrlKey || event.metaKey) return;
			event.preventDefault();
			moved = true;
			const unit = pixels(event, element.clientHeight);
			const by = wheelPan(event);
			behaviour.translateBy(
				selection,
				(-by.x * unit) / held.get().k,
				(-by.y * unit) / held.get().k,
			);
		};
		element.addEventListener("wheel", wheel, { passive: false });
		// A pointer, a finger or a wheel taking the view over ends a travel where
		// it got to, before d3-zoom reads the view it starts from. A part with its
		// own drag (the zoom stack, a node being moved) leaves the view alone.
		const take = (event: Event) => {
			if (
				event.type !== "wheel" &&
				event.target instanceof Element &&
				event.target.closest("[data-no-pan]")
			)
				return;
			stop();
		};
		const TAKEN = ["pointerdown", "touchstart", "wheel"] as const;
		for (const type of TAKEN)
			element.addEventListener(type, take, { capture: true, passive: true });
		apply(held.get());
		return () => {
			stop();
			selection.on(".zoom", null);
			element.removeEventListener("wheel", wheel);
			for (const type of TAKEN)
				element.removeEventListener(type, take, { capture: true });
		};
	};

	return { viewport, mount };
}

// The viewport: d3-zoom on the region: docs/architecture/plugins/react-ui.md, "Canvas".
export function useViewport(region: RefObject<HTMLElement | null>): Viewport {
	const [{ viewport, mount }] = useState(() => make(region));
	useEffect(mount, [mount]);
	return viewport;
}

// A value read off the transform, rendered again only when it changes: a pan
// or a zoom within one value of `select` renders nothing.
export function useViewportValue<T>(
	viewport: Viewport,
	select: (transform: Transform) => T,
): T {
	return useSyncExternalStore(viewport.subscribe, () => select(viewport.get()));
}
