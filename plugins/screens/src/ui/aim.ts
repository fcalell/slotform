import { ariaName, squash } from "./name.ts";
import type { Rect } from "./walk-checks.ts";

// Where a control is and whether a press of it lands, for `stack screens shoot`
// and `drive` and the test run's presses.

const CONTROLS =
	"button, a[href], summary, input:not([type=hidden]), select, textarea, [role], [tabindex]";

const words = (text: string | null | undefined): string =>
	squash(text).toLowerCase();

function nameOf(element: HTMLElement): string {
	return words(
		ariaName(element) ||
			// biome-ignore lint/performance/useDomNodeTextContent: the text a viewer sees, which CSS and hidden elements change; textContent is not it
			element.innerText ||
			element.getAttribute("title"),
	);
}

export interface ControlPoint {
	x: number;
	y: number;
	label: string;
	// What is drawn at the point instead of the control (`coverAt`).
	cover: string | null;
}

const middle = (rect: Rect) => ({
	x: (rect.left + rect.right) / 2,
	y: (rect.top + rect.bottom) / 2,
});

// Where a press lands on a control: the middle of the part inside the
// viewport of its first client rect (one per line box) that shows a pixel or
// more, so an inline link wrapped over two lines is pressed on a line, never
// between them. With none showing, the middle of its box, where the hit test
// finds nothing of it.
export function pressPoint(
	box: Rect,
	rects: Iterable<Rect>,
	width: number,
	height: number,
): { x: number; y: number } {
	for (const rect of rects) {
		const seen = {
			left: Math.max(rect.left, 0),
			top: Math.max(rect.top, 0),
			right: Math.min(rect.right, width),
			bottom: Math.min(rect.bottom, height),
		};
		const area =
			Math.max(seen.right - seen.left, 0) * Math.max(seen.bottom - seen.top, 0);
		if (area > 0.99) return middle(seen);
	}
	return middle(box);
}

// What is drawn at (x, y) instead of `element`, as `tag.class`; null when it
// is the control, a part of it or a box that holds it.
function coverAt(element: Element, x: number, y: number): string | null {
	const hit = document.elementFromPoint(x, y);
	if (hit && (element.contains(hit) || hit.contains(element))) return null;
	return hit
		? `${hit.tagName.toLowerCase()}.${(hit.getAttribute("class") ?? "").slice(0, 40)}`
		: "nothing";
}

const PRESS_EVENTS = [
	"pointerdown",
	"pointerup",
	"mousedown",
	"mouseup",
	"click",
	"touchstart",
	"touchend",
];

interface Armed {
	listener: (event: Event) => void;
	// What the press's first trusted event hit instead of the control;
	// undefined until that event comes.
	cover: string | null | undefined;
}

// The press `aim` armed and `landed` reads: a press spans the CDP round trips
// of its input and `Runtime.evaluate` answers by value, so the verdict of its
// first event waits here. A new document starts with none.
let armed: Armed | undefined;

// Where to press the control whose visible text or accessible name is `text`:
// the first visible, enabled match, scrolled into view at `align` at once (a
// page's smooth scrolling would move it after the point is taken), with a hit
// test of what is drawn at its press point (`pressPoint`). Null when none
// matches.
export function aim(
	text: string,
	align: ScrollLogicalPosition,
): ControlPoint | null {
	// A press whose `landed` never came (its input failed) leaves its listener
	// armed; a new try drops it, so no verdict outlives its try.
	landed();
	const want = words(text);
	const matches = [...document.querySelectorAll<HTMLElement>(CONTROLS)].filter(
		(element) => {
			const box = element.getBoundingClientRect();
			return (
				box.width > 0 &&
				box.height > 0 &&
				getComputedStyle(element).visibility !== "hidden" &&
				!("disabled" in element && element.disabled) &&
				// biome-ignore lint/performance/useDomNodeTextContent: the text a viewer sees, which CSS and hidden elements change; textContent is not it
				(nameOf(element) === want || words(element.innerText) === want)
			);
		},
	);
	// A wrapper that holds a match is not the control: the innermost one is.
	const element = matches.find(
		(candidate) =>
			!matches.some((m) => m !== candidate && candidate.contains(m)),
	);
	if (!element) return null;
	element.scrollIntoView({ block: align, inline: align, behavior: "instant" });
	const { x, y } = pressPoint(
		element.getBoundingClientRect(),
		element.getClientRects(),
		window.innerWidth,
		window.innerHeight,
	);
	const cover = coverAt(element, x, y);
	// A clear point arms the second hit test: on the press's first trusted
	// event, where it lands, and when that is a cover the listener cancels every
	// event of the press before the page sees it. The window's capture phase
	// runs before any listener of the page. A window's touchstart listener is
	// passive by default and cannot cancel, so it is made active: a cancelled
	// touchstart starts no tap.
	if (cover === null) {
		const press: Armed = {
			cover: undefined,
			listener(event) {
				if (!event.isTrusted) return;
				// Blink dispatches a press's pointerdown before its mousedown or
				// touchstart; a press whose first event has no pointer is not
				// known to land, so it is reported.
				if (press.cover === undefined)
					press.cover =
						event instanceof PointerEvent
							? coverAt(element, event.clientX, event.clientY)
							: `${event.type} with no pointer event before it`;
				if (press.cover === null) return;
				event.preventDefault();
				event.stopImmediatePropagation();
			},
		};
		for (const type of PRESS_EVENTS)
			window.addEventListener(type, press.listener, {
				capture: true,
				passive: false,
			});
		armed = press;
	}
	return { x, y, label: nameOf(element), cover };
}

// What the armed press's first trusted event hit instead of the control, and
// disarms it. Null when it hit the control, when no trusted event came, and in
// the new document of a press that navigated, which has nothing armed.
export function landed(): string | null {
	const press = armed;
	armed = undefined;
	if (!press) return null;
	for (const type of PRESS_EVENTS)
		window.removeEventListener(type, press.listener, true);
	return press.cover ?? null;
}
