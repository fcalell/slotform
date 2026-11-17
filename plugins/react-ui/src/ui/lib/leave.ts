import type { Leave } from "@fcalell/ui-core/leave";
import { askDiscard } from "@fcalell/ui-core/react/confirm";
import { useWords } from "@fcalell/ui-core/react/words";
import { useEffect } from "react";
import { blockLeave } from "./navigate.ts";

// A `Form` that stands edited asks before it is left: docs/architecture/ui-core/acts.md, "Leave".
export function useLeaveGuard(leave: Leave, guarded: boolean): void {
	const words = useWords();
	useEffect(() => {
		if (!guarded) return;
		return blockLeave(leave, () => askDiscard(words));
	}, [leave, guarded, words]);
}
