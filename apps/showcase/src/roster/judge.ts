// How a scene that judges its own edge waits for its layout: docs/architecture/ui-core/showcase.md, "Roster scenes".

// Calls `judge` once `settle` scenes have passed.
export function afterFrames(settle: number, judge: () => void): () => void {
	let scene = 0;
	let seen = 0;
	const watch = () => {
		if (++seen < settle) {
			scene = requestAnimationFrame(watch);
			return;
		}
		judge();
	};
	scene = requestAnimationFrame(watch);
	return () => cancelAnimationFrame(scene);
}

// Reads `stands` each scene until it finds what it reads (giving up after
// `wait` scenes without it), then calls `judge` with what it finds once it has
// stood `settle` scenes.
export function onceStanding<T>(
	stands: () => T | undefined,
	wait: number,
	settle: number,
	judge: (found: T) => void,
): () => void {
	let scene = 0;
	let waited = 0;
	let seen = 0;
	const watch = () => {
		const found = stands();
		if (found === undefined) {
			if (++waited < wait) scene = requestAnimationFrame(watch);
			return;
		}
		if (++seen < settle) {
			scene = requestAnimationFrame(watch);
			return;
		}
		judge(found);
	};
	scene = requestAnimationFrame(watch);
	return () => cancelAnimationFrame(scene);
}
