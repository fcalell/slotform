import {
	type FocusEvent,
	type KeyboardEvent,
	type PointerEvent,
	type RefObject,
	useEffect,
	useRef,
	useState,
} from "react";

// A pointer resting this long on an entry while no column stands opens that
// entry's column, so a sweep across the folded rail on the way to the page
// changes nothing; once a column stands, another entry's shows at once. One
// gone from the sidebar this long sends the preview back, so a slip past its
// edge changes nothing.
const DWELL = 120;
const LINGER = 150;
// A pointer that has not moved for this long rests. The aim reads the
// pointer's move over this last stretch, so a path from before a rest never
// says where it heads now, and reads it again this long later while it heads
// for the column, so a pointer that stops on an entry shows it a stretch on.
const STILL = 60;

// A spot in the viewport, and the pointer at one at a moment (`t`, the
// event's time).
interface Spot {
	x: number;
	y: number;
}
interface Point extends Spot {
	t: number;
}

/** What the rail's column shows, by entry key, and the handlers that move it. Outside the package's exports. */
export interface Preview {
	/** The entry the column shows now, inked on the rail; none while the folded rail stands at rest. */
	shown: string | undefined;
	/** The entry the column holds: `shown`, else (folded, the column gone) the one it showed last, so a column on its way out keeps its places. */
	held: string | undefined;
	/** A pointer came onto an entry (`wait`) or a focus landed on it (at once). */
	point: (entry: string, wait: boolean) => void;
	/** Drops an entry's pending preview: the pointer left it before the preview followed, or reached a part of the rail that previews nothing. */
	hold: () => void;
	/** Sends the preview back and drops anything pending, the column keeping what it shows now as the entry it showed last, so a column on its way out keeps its places. */
	back: () => void;
	/** The sidebar's handlers: where the pointer goes, where the focus stands, Escape. */
	nav: {
		onPointerEnter: () => void;
		onPointerOut: (event: PointerEvent<HTMLElement>) => void;
		onPointerMove: (event: PointerEvent<HTMLElement>) => void;
		onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
		onFocus: (event: FocusEvent<HTMLElement>) => void;
		onBlur: (event: FocusEvent<HTMLElement>) => void;
		onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
	};
	/** The column's places (their ref, the runs a pointer aims for) and the column's handler: a pointer reaching it keeps what it shows. */
	column: {
		places: RefObject<HTMLDivElement | null>;
		onPointerEnter: () => void;
	};
}

/**
 * The rail's column. A pointer resting on an entry or a focus on it previews
 * that entry; a pointer heading for the column keeps what it shows while it
 * crosses other entries. The preview goes back once the pointer and the focus
 * have left the sidebar a moment, on Escape or when the route (`at`) changes;
 * a menu open in the sidebar holds it, and so does a sheet one of its acts
 * opened, whose pointer and focus stand inside it as React tells them, and a
 * keyboard's focus inside it. At rest, docked, the column shows the entry of
 * the current place (`owner`), else the one it showed last, else the first
 * of `entries` (the rail's order); folded, nothing stands. A preview of an
 * entry the rail no longer has shows nothing.
 */
export function usePreview(props: {
	at: string;
	docked: boolean;
	owner: string | undefined;
	entries: readonly string[];
}): Preview {
	const { at, docked, owner, entries } = props;
	const known = (entry: string | undefined) =>
		entry !== undefined && entries.includes(entry) ? entry : undefined;
	const top = entries[0];
	const [shown, setShown] = useState<{
		entry: string;
		at: string;
		open: boolean;
	}>();
	// The entry waiting to be shown, and the preview waiting to go back.
	const opening = useRef<ReturnType<typeof setTimeout>>(undefined);
	const closing = useRef<ReturnType<typeof setTimeout>>(undefined);
	const inside = useRef(false);
	const focused = useRef(false);
	// The pointer's last positions over the sidebar.
	const path = useRef<readonly Point[]>([]);
	const places = useRef<HTMLDivElement>(null);
	useEffect(
		() => () => {
			clearTimeout(opening.current);
			clearTimeout(closing.current);
		},
		[],
	);
	const live = shown?.open && shown.at === at ? known(shown.entry) : undefined;
	const last = known(shown?.entry);
	const standing = docked ? (live ?? owner ?? last ?? top) : live;
	const show = (entry: string) => setShown({ entry, at, open: true });
	const back = () => {
		clearTimeout(opening.current);
		clearTimeout(closing.current);
		setShown((was) => {
			const entry = standing ?? was?.entry;
			return entry === undefined ? undefined : { entry, at, open: false };
		});
	};
	const point = (entry: string, wait: boolean) => {
		clearTimeout(opening.current);
		if (!wait) return show(entry);
		// A pointer heading for the column's places keeps what it shows while it
		// crosses other entries on the way: the switch waits until it rests,
		// turns away, or reaches the column.
		if (
			standing !== undefined &&
			standing !== entry &&
			places.current &&
			aiming(moving(path.current, performance.now()), places.current)
		) {
			opening.current = setTimeout(() => point(entry, true), STILL);
			return;
		}
		if (standing !== undefined) return show(entry);
		opening.current = setTimeout(() => show(entry), DWELL);
	};
	const hold = () => clearTimeout(opening.current);
	const leave = (nav: HTMLElement) => {
		clearTimeout(closing.current);
		closing.current = setTimeout(() => {
			const menu = nav.querySelector('[aria-haspopup][aria-expanded="true"]');
			const keyed =
				document.documentElement.dataset.modality === "keyboard" &&
				focused.current;
			if (!(menu || keyed || inside.current)) back();
		}, LINGER);
	};
	return {
		shown: standing,
		held: standing ?? last ?? owner ?? top,
		point,
		hold,
		back,
		nav: {
			onPointerEnter: () => {
				inside.current = true;
			},
			// React tells an entry the pointer entered while it handles the
			// `pointerout` of what the pointer left, ahead of any move to the new
			// spot; that event carries the new spot, so the aim reads it first.
			onPointerOut: (event) => {
				path.current = tracked(path.current, event);
			},
			onPointerMove: (event) => {
				path.current = tracked(path.current, event);
			},
			onPointerLeave: (event) => {
				inside.current = false;
				hold();
				leave(event.currentTarget);
			},
			// A menu the column opened hands focus back as it closes: with the
			// pointer gone, the preview goes back then.
			onFocus: (event) => {
				focused.current = true;
				leave(event.currentTarget);
			},
			onBlur: (event) => {
				focused.current = false;
				if (!event.currentTarget.contains(event.relatedTarget))
					leave(event.currentTarget);
			},
			onKeyDown: (event) => {
				if (event.key === "Escape") back();
			},
		},
		column: { places, onPointerEnter: hold },
	};
}

// The pointer's path with this position at its end (a repeated position kept
// once), cut to its move up to that moment.
function tracked(
	path: readonly Point[],
	event: { clientX: number; clientY: number; timeStamp: number },
): readonly Point[] {
	const last = path.at(-1);
	if (last && last.x === event.clientX && last.y === event.clientY) return path;
	const point = { x: event.clientX, y: event.clientY, t: event.timeStamp };
	return moving([...path, point], point.t);
}

// The pointer's move up to `at`: its positions over the last `STILL`, after
// the spot the move left from. None once it rests. An event's `timeStamp` and
// `performance.now()` share one clock.
function moving(path: readonly Point[], at: number): readonly Point[] {
	const start = path.findIndex((one) => at - one.t <= STILL);
	return start < 0 ? [] : path.slice(Math.max(0, start - 1));
}

// Whether a pointer heads for the column's places, after Kamens's menu aim:
// its latest position stands inside the triangle from its oldest recent one
// to the near edge of the places it can reach, so its path points between
// that edge's two ends. The places' box runs the column's height while their
// rows end higher, so the edge ends at the last run's foot; a pointer drifting
// on its way down the rail aims at nothing below it. A pointer at or past the
// edge has reached the column. The places' `direction` puts the near edge on
// their left (`ltr`) or their right.
function aiming(path: readonly Point[], places: HTMLElement) {
	const then = path[0];
	const now = path.at(-1);
	if (!then || !now || then === now) return false;
	const box = places.getBoundingClientRect();
	const foot = places.lastElementChild?.getBoundingClientRect().bottom;
	const rtl = getComputedStyle(places).direction === "rtl";
	const edge = rtl ? box.right : box.left;
	if (rtl ? now.x <= edge : now.x >= edge) return false;
	const top = { x: edge, y: box.top };
	const bottom = { x: edge, y: Math.min(box.bottom, foot ?? box.top) };
	const side = (a: Spot, b: Spot) =>
		Math.sign((b.x - a.x) * (now.y - a.y) - (b.y - a.y) * (now.x - a.x));
	const sides = [side(then, top), side(top, bottom), side(bottom, then)];
	return !(sides.includes(1) && sides.includes(-1));
}
