// Drag arithmetic, tested without a DOM: docs/architecture/ui-core/drag.md, "Web drag".

import type { Moved } from "./descriptors.ts";

// The distance (px) a mouse or pen moves with the button down before the press
// is a drag; below it the press is a click.
const DRAG_SLOP = 4;

// A finger holds this long (ms) on a row, without moving past `DRAG_DELAY_SLOP`
// (px), before the press is a drag: a finger that moves sooner is scrolling
// the page.
export const DRAG_DELAY = 400;
export const DRAG_DELAY_SLOP = 8;

// The band (px) inside a scroller's edge where a drag carries it; the speed
// (px a second) it carries it at, at the edge itself and beyond; and the time
// (ms) the speed ramps up over from the pointer's entry into the band, so a
// row picked up inside the band does not scroll away at once.
export const SCROLL_EDGE = 48;
const SCROLL_SPEED = 1440;
const SCROLL_RAMP = 400;

// The longest frame (ms) a step is measured over: a frame that ran long (a
// stalled tab) carries the scroller no further than one at 60 Hz.
const SCROLL_FRAME = 1000 / 60;

// An accepted drag held this long (ms) over a folded branch opens it.
export const DROP_HOLD = 600;

/** What a press that has moved `distance` px is: still a press (`wait`), a drag, or a scroll the page keeps (`cancel`, a finger that moved before it was held). `held` is whether the finger's hold has run. */
export function pressed(
	pointer: string,
	distance: number,
	held: boolean,
): "wait" | "drag" | "cancel" {
	if (pointer === "touch") {
		if (held) return "drag";
		return distance > DRAG_DELAY_SLOP ? "cancel" : "wait";
	}
	return distance >= DRAG_SLOP ? "drag" : "wait";
}

/** The side of a row (`top`, `height`) a pointer at `y` is on: the drop lands before the row on its upper half and after it on its lower. */
export function sideOf(
	y: number,
	top: number,
	height: number,
): "before" | "after" {
	return y < top + height / 2 ? "before" : "after";
}

/** Where `id` stands once moved to `index` of the order `ids` (the order with `id` taken out and put back at `index`): its place and its neighbours there. A neighbour that is not loaded (a hole in a window) has no id to hand, so the move is `undefined` there. */
export function movedTo(
	ids: readonly (string | undefined)[],
	id: string,
	index: number,
): Moved | undefined {
	const from = ids.indexOf(id);
	if (from < 0 || index < 0 || index >= ids.length) return undefined;
	const rest = ids.filter((_, at) => at !== from);
	const prev = index === 0 ? null : rest[index - 1];
	const next = index >= rest.length ? null : rest[index];
	if (prev === undefined || next === undefined) return undefined;
	return { index, after: prev, before: next };
}

/** The move a drop on `side` of the row `over` makes of `id`; `undefined` where it changes nothing (the row dropped on itself or beside its own place) or a neighbour is not loaded. */
export function moveOf(
	ids: readonly (string | undefined)[],
	id: string,
	over: string,
	side: "before" | "after",
): Moved | undefined {
	const from = ids.indexOf(id);
	const to = ids.indexOf(over);
	if (from < 0 || to < 0) return undefined;
	const slot = side === "before" ? to : to + 1;
	if (slot === from || slot === from + 1) return undefined;
	return movedTo(ids, id, slot > from ? slot - 1 : slot);
}

export type Step = "up" | "down" | "first" | "last";

/** The move a key or a menu entry makes of `id`: one place up or down, or to the first or last place; `undefined` where it is already there. */
export function stepOf(
	ids: readonly (string | undefined)[],
	id: string,
	step: Step,
): Moved | undefined {
	const from = ids.indexOf(id);
	if (from < 0) return undefined;
	const last = ids.length - 1;
	const to =
		step === "up"
			? from - 1
			: step === "down"
				? from + 1
				: step === "first"
					? 0
					: last;
	if (to === from || to < 0 || to > last) return undefined;
	return movedTo(ids, id, to);
}

/** A list with the entry at `from` moved to `to`, the others keeping their order. */
export function moveEntry<T>(
	list: readonly T[],
	from: number,
	to: number,
): T[] {
	const next = [...list];
	const [entry] = next.splice(from, 1);
	// `from` indexes the list, so the splice removed an entry.
	next.splice(to, 0, entry as T);
	return next;
}

/** How deep a drag at `at` stands in the edge band of a scroller whose view runs from `start` to `end`: toward -1 at the start edge, toward 1 at the end edge (each reached at the edge and beyond it), 0 in the middle. A view shorter than two bands splits at its middle. */
export function edgeDepth(at: number, start: number, end: number): number {
	const edge = Math.min(SCROLL_EDGE, (end - start) / 2);
	if (edge <= 0) return 0;
	if (at < start + edge) return -Math.min(1, (start + edge - at) / edge);
	if (at > end - edge) return Math.min(1, (at - (end - edge)) / edge);
	return 0;
}

/** How far (px) a frame of `elapsed` ms carries a scroller a drag stands `depth` deep in (`edgeDepth`), `since` ms after it entered the band: `SCROLL_SPEED` a second at the edge, whatever the frame rate, ramped up over `SCROLL_RAMP`, a frame counted at most as long as one at 60 Hz. */
export function edgeSpeed(
	depth: number,
	elapsed: number,
	since: number,
): number {
	const ramp = Math.min(1, since / SCROLL_RAMP);
	const seconds = Math.min(elapsed, SCROLL_FRAME) / 1000;
	return Math.round(depth * ramp * SCROLL_SPEED * seconds);
}

/** A drag standing in an edge band: what it carries (`on`, a scroller or a pane), toward which side, when it entered the band there (ms) and when its last step ran. */
export interface Band {
	on: object;
	side: number;
	entered: number;
	last: number;
}

/** A step at `now` of a drag in the band of `on` toward `side`: the band as it stands after it (entered afresh where the drag was in no band, or in another one or toward another side) and the `elapsed` and `since` `edgeSpeed` takes. A drag out of every band holds no band. */
export function bandAt(
	band: Band | undefined,
	on: object,
	side: number,
	now: number,
): { band: Band; elapsed: number; since: number } {
	const kept =
		band?.on === on && band.side === side
			? band
			: { on, side, entered: now, last: now };
	return {
		band: { ...kept, last: now },
		elapsed: now - kept.last,
		since: now - kept.entered,
	};
}

/** Whether a drop that `accepts` a kind (one, or several) takes what is dragged: a drag of no kind (a reorder alone) is taken by none. */
export function accepts(
	accepted: string | readonly string[],
	kind: string | undefined,
): boolean {
	if (kind === undefined) return false;
	return typeof accepted === "string"
		? accepted === kind
		: accepted.includes(kind);
}
