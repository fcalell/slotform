import { commitMoment } from "@slotform/ui-core/commit";
import { type KeyboardEvent, useState } from "react";

// A typing control's commit moments: docs/architecture/ui-core/acts.md, "Commit".
export function useCommit(
	value: string,
	onChange: (value: string) => void,
	onCommit: ((value: string) => void) | undefined,
	enter: boolean,
) {
	const [moment] = useState(() => commitMoment<string>());
	const commit = (next: string) => onCommit?.(next);
	return {
		onFocus: () => moment.focus(value),
		onBlur: () => moment.leave(value, commit),
		onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
			if (enter && event.key === "Enter") moment.commit(value, commit);
			if (onCommit && event.key === "Escape") {
				moment.cancel(value, onChange);
				event.currentTarget.blur();
			}
		},
	};
}
