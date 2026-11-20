import { findings } from "./walk.ts";
import { format, scrolls } from "./walk-checks.ts";

// What the test run's checks and `slotform screens shoot` and `drive` share about
// a drawn page: what a read holds busy, how far its scrollers hide content and
// the judgement at a width.

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
