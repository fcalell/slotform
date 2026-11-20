import { useCallback, useSyncExternalStore } from "react";
import { saveChoice, savedChoice, subscribeSaved } from "./saved.ts";

// The viewer's open and folded branches of the sidebar are a saved choice
// (`./saved.ts`), one for every tree of the page. A choice is by the
// branch's route; a branch never chosen is left to the Shell (open on the
// current place's path, else folded). The sidebar's column folds away the same
// way, under a key no route can be.
const KEY = "slotform:places:open";

// The parse of the last raw choice read, so the snapshot stays the same object
// until the choice changes.
let last: { raw: string | null; open: Readonly<Record<string, boolean>> } = {
	raw: null,
	open: {},
};

function read(): Readonly<Record<string, boolean>> {
	const raw = savedChoice(KEY);
	if (raw !== last.raw) last = { raw, open: parse(raw) };
	return last.open;
}

function parse(raw: string | null): Readonly<Record<string, boolean>> {
	try {
		const parsed: unknown = JSON.parse(raw ?? "{}");
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			return Object.fromEntries(
				Object.entries(parsed).filter(
					(entry): entry is [string, boolean] => typeof entry[1] === "boolean",
				),
			);
		}
	} catch {}
	return {};
}

function write(route: string, open: boolean): void {
	saveChoice(KEY, JSON.stringify({ ...read(), [route]: open }));
}

const NONE: Readonly<Record<string, boolean>> = {};

/** The branches the viewer opened or folded (by route) and the act that records a choice. Outside the package's exports. */
export function useFolds(): {
	chosen: Readonly<Record<string, boolean>>;
	choose: (route: string, open: boolean) => void;
} {
	const chosen = useSyncExternalStore(subscribeSaved, read, () => NONE);
	const choose = useCallback(
		(route: string, open: boolean) => write(route, open),
		[],
	);
	return { chosen, choose };
}

// A route starts with a slash, so this key is never a route's.
const COLUMN = "column";

/** Whether the sidebar's column stands docked beside the rail (docked until the viewer folds it to the rail) and the act that records the choice. Outside the package's exports. */
export function useDocked(): [
	docked: boolean,
	dock: (docked: boolean) => void,
] {
	const { chosen, choose } = useFolds();
	return [chosen[COLUMN] ?? true, (docked) => choose(COLUMN, docked)];
}
