import { ariaName, squash } from "./name.ts";
import { findings } from "./walk.ts";
import { format, type Rect, scrolls } from "./walk-checks.ts";

// What the test run's checks and `stack screens shoot` and `drive` share about
// a drawn page: what a read holds busy, how far its scrollers hide content,
// the judgement at a width, and where a control is and whether a press of it
// lands.

function overflowError(
	width: number,
	scrollWidth: number,
	innerWidth: number,
): string | null {
	return scrollWidth > innerWidth
		? `horizontal overflow at ${width}px: scrollWidth ${scrollWidth}`
		: null;
}

// What a read holds busy: not a button, whose busy is its own action in
// flight (a demo of one stays so), only a region or a list waiting for data.
export const READ_BUSY = '[aria-busy="true"]:not(button, [role="button"])';

// How far the page's scrollers run past what they show: the document, and any
// element that scrolls on its own (a shell's pane holds the page in a fixed
// height, so the document alone never overflows).
export function hiddenHeight(): number {
	const root = document.documentElement;
	let hidden = root.scrollHeight - root.clientHeight;
	for (const element of document.body.getElementsByTagName("*")) {
		const { overflowY } = getComputedStyle(element);
		if (!scrolls(overflowY)) continue;
		hidden = Math.max(hidden, element.scrollHeight - element.clientHeight);
	}
	return Math.max(hidden, 0);
}

// Waits for the finite animations and transitions on the page to end, so a
// popup still opening or a sheet sliding in is judged where it settles (an
// endless one, a spinner or a shimmer, is left running). Gives up after
// 2000 ms.
export async function settled(): Promise<void> {
	const end = performance.now() + 2000;
	while (performance.now() < end) {
		const running = document
			.getAnimations()
			.filter(
				(animation) =>
					animation.playState === "running" &&
					Number.isFinite(animation.effect?.getComputedTiming().endTime ?? 0),
			);
		if (running.length === 0) return;
		await Promise.race([
			Promise.allSettled(running.map((animation) => animation.finished)),
			// An animation paused meanwhile never finishes: look again.
			new Promise((resolve) => setTimeout(resolve, 100)),
		]);
	}
}

// The screen at one width: the horizontal overflow and the walk's findings.
export function checksAt(width: number, fonts: boolean): string[] {
	const failures: string[] = [];
	const scrollWidth = Math.max(
		document.documentElement.scrollWidth,
		document.body.scrollWidth,
	);
	const failure = overflowError(width, scrollWidth, window.innerWidth);
	if (failure) failures.push(failure);
	failures.push(
		...format(findings({ fonts })).map((line) => `at ${width}px, ${line}`),
	);
	return failures;
}

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
