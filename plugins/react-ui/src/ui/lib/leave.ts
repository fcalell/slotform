import type { Leave } from "@fcalell/ui-core/leave";
import { askDiscard } from "@fcalell/ui-core/react/confirm";
import { useWords } from "@fcalell/ui-core/react/words";
import { useEffect } from "react";
import { blockLeave } from "./navigate.ts";

// While a `Form` stands edited, leaving its page (a router navigation, the
// back button, a reload or a closed tab) asks once: discard the edit, or keep
// editing.
export function useLeaveGuard(leave: Leave, guarded: boolean): void {
	const words = useWords();
	useEffect(() => {
		if (!guarded) return;
		return blockLeave(leave, () => askDiscard(words));
	}, [leave, guarded, words]);
}
