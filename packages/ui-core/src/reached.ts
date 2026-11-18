import type { WindowState } from "./read.ts";

// The pages of a window read loaded from the start without a gap.
export function reached(state: WindowState): number {
	let page = 0;
	while (state.pages[page] !== undefined) page++;
	return page;
}
