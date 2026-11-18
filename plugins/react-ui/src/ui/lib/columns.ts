import type { TableColumn } from "@fcalell/ui-core/descriptors";
import {
	type ColumnChoice,
	columnsKey,
	parseColumnChoice,
	visibleColumns,
} from "@fcalell/ui-core/list-state";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { saveChoice, savedChoice, subscribeSaved } from "./saved.ts";

/** The columns a table stands with: what its consumer declared (`hidden`) under what the viewer chose, which `toggle` changes, `reset` clears and the browser keeps (the table's `label` names the choice, else its columns' keys do). Outside the package's exports. */
export function useColumns<C extends TableColumn>(
	columns: readonly C[],
	label: string | undefined,
): {
	shown: readonly C[];
	choice: ColumnChoice;
	toggle: (key: string, on: boolean) => void;
	reset: () => void;
} {
	const key = columnsKey(columns, label);
	const raw = useSyncExternalStore(
		subscribeSaved,
		() => savedChoice(key),
		() => null,
	);
	const choice = useMemo(() => parseColumnChoice(raw), [raw]);
	const shown = useMemo(
		() => visibleColumns(columns, choice),
		[columns, choice],
	);
	const toggle = useCallback(
		(column: string, on: boolean) =>
			saveChoice(key, JSON.stringify({ ...choice, [column]: on })),
		[key, choice],
	);
	const reset = useCallback(() => saveChoice(key, "{}"), [key]);
	return { shown, choice, toggle, reset };
}
