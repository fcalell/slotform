// How a scene that judges its own edge waits for its layout: docs/architecture/ui-core/showcase.md, "Roster scenes".

// Calls `judge` once `settle` frames have passed.
export function afterFrames(settle: number, judge: () => void): () => void {
	let frame = 0;
	let seen = 0;
	const watch = () => {
		if (++seen < settle) {
			frame = requestAnimationFrame(watch);
			return;
		}
		judge();
	};
	frame = requestAnimationFrame(watch);
	return () => cancelAnimationFrame(frame);
}

// Reads `stands` each frame until it finds what it reads (giving up after
// `wait` frames without it), then calls `judge` with what it finds once it has
// stood `settle` frames.
export function onceStanding<T>(
	stands: () => T | undefined,
	wait: number,
	settle: number,
	judge: (found: T) => void,
): () => void {
	let frame = 0;
	let waited = 0;
	let seen = 0;
	const watch = () => {
		const found = stands();
		if (found === undefined) {
			if (++waited < wait) frame = requestAnimationFrame(watch);
			return;
		}
		if (++seen < settle) {
			frame = requestAnimationFrame(watch);
			return;
		}
		judge(found);
	};
	frame = requestAnimationFrame(watch);
	return () => cancelAnimationFrame(frame);
}

// Whether two boxes overlap by more than `slack` on each axis.
export const meets = (a: DOMRect, b: DOMRect, slack = 0) =>
	a.left < b.right - slack &&
	b.left < a.right - slack &&
	a.top < b.bottom - slack &&
	b.top < a.bottom - slack;
