import type { Leave } from "@slotform/ui-core/leave";
import { askDiscard } from "@slotform/ui-core/react/confirm";
import { useWords } from "@slotform/ui-core/react/words";
import { usePreventRemove } from "expo-router";
import { useSyncExternalStore } from "react";

// The leave guard of a `Form`: docs/architecture/ui-core/acts.md, "Leave".
// expo-router holds the screen's removals only while the leave would ask, so an
// unedited form holds nothing and the native swipe back stays on.
export function useLeaveGuard(leave: Leave, guarded: boolean): void {
	const words = useWords();
	const asks = useSyncExternalStore(leave.subscribe, leave.asks);
	usePreventRemove(guarded && asks, ({ repeat }) => {
		void leave
			.attempt(() => askDiscard(words))
			.then((go) => {
				if (go) repeat();
			});
	});
}
