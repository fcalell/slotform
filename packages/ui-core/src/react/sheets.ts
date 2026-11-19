import { useState, useSyncExternalStore } from "react";
import { openSheets, type SheetEntry } from "../sheets.ts";

// The sheets an outlet draws: docs/architecture/ui-core/acts.md, "Sheets an act opens".

/** A sheet the outlet draws: an open one, or the last one closed while it leaves (`open: false`). */
export interface DrawnSheet extends SheetEntry {
	open: boolean;
}

/** The sheets to draw, in the order they opened: the open ones, then the last one closed, drawn closed so it leaves on its own motion, until a later one opens. */
export function useDrawnSheets(): DrawnSheet[] {
	const open = useSyncExternalStore(openSheets.subscribe, openSheets.get);
	const [seen, setSeen] = useState<{
		open: SheetEntry[];
		leaving?: SheetEntry;
	}>({ open });
	if (seen.open !== open)
		setSeen({
			open,
			leaving:
				seen.open.findLast((entry) => !open.includes(entry)) ?? seen.leaving,
		});
	const top = open.at(-1)?.id ?? 0;
	const drawn = open.map((entry) => ({ ...entry, open: true }));
	// The leaving sheet stands only over every open one: a later sheet never
	// stands inside a closed one, so one closed under an open sheet unmounts.
	return seen.leaving && seen.leaving.id > top
		? [...drawn, { ...seen.leaving, open: false }]
		: drawn;
}
