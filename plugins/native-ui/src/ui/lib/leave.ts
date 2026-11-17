import type { Leave } from "@fcalell/ui-core/leave";
import { askDiscard } from "@fcalell/ui-core/react/confirm";
import { useWords } from "@fcalell/ui-core/react/words";
import { useNavigation } from "expo-router";
import { useEffect } from "react";

// The leave guard of a `Form`: docs/architecture/ui-core/acts.md, "Leave".
export function useLeaveGuard(leave: Leave, guarded: boolean): void {
	const words = useWords();
	const navigation = useNavigation();
	useEffect(() => {
		if (!guarded) return;
		return navigation.addListener("beforeRemove", (event) => {
			if (!leave.asks()) return;
			event.preventDefault();
			const { action } = event.data;
			void leave
				.attempt(() => askDiscard(words))
				.then((go) => {
					if (go) navigation.dispatch(action);
				});
		});
	}, [leave, guarded, words, navigation]);
}
