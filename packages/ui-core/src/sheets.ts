import { isThenable } from "./acts.ts";
import { createIdQueue, type QueueEntry } from "./queue.ts";
import type { Store } from "./store.ts";

// The sheets acts open: docs/architecture/ui-core/acts.md, "Sheets an act opens".

/** An open sheet: its id and the props it was opened with, the platform's sheet props (ui-core draws no sheet, so it holds them as `unknown`). */
export type SheetEntry = QueueEntry<{ sheet: unknown }>;

const queue = createIdQueue<{ sheet: unknown }>();

/** The open sheets in the order they opened, read-only: `openSheet` and `closeSheet` are its writers. */
export const openSheets: Pick<
	Store<SheetEntry[]>,
	"get" | "subscribe"
> = queue.entries;

/** Opens a sheet over the ones open, with the props it is given; returns its id. */
export function openSheet(sheet: unknown): number {
	return queue.add({ sheet });
}

/** Closes the sheet `id`; an id no open sheet has is ignored. */
export function closeSheet(id: number): void {
	queue.remove(id);
}

/** Closes the sheet `id` once its run `ran` resolves (at once when it returns no promise) and hands the run's result on; a rejection leaves it open, standing in the sheet's bar. */
export function closeOnResolve(id: number, ran: unknown): unknown {
	if (!isThenable(ran)) {
		closeSheet(id);
		return ran;
	}
	return Promise.resolve(ran).then((value) => {
		closeSheet(id);
		return value;
	});
}
