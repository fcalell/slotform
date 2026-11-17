// Whether a form or a sheet has taken input, and the leave its edit asks from
// (the leave's model is `../leave.ts`).
import { createContext, use, useEffect, useMemo, useState } from "react";
import { createLeave, type Leave } from "../leave.ts";

// A form or a sheet is touched once a field inside it takes input: docs/architecture/ui-core/acts.md, "Touched".
export interface Touched {
	touched: boolean;
	touch: () => void;
	leave: Leave;
}

export const TouchedContext = createContext<Touched>({
	touched: false,
	touch: () => {},
	leave: createLeave(),
});

export function useTouched(): Touched {
	return use(TouchedContext);
}

// A Form's or a Sheet's own touched state: the value its `TouchedContext`
// hands down, which changes only when it is touched or reset, and the setter
// that resets it. Its `leave` is one object for the life of the form, read
// when a leave is tried and so never state.
export function useTouchState() {
	const [touched, setTouched] = useState(false);
	const [leave] = useState(createLeave);
	const value = useMemo<Touched>(
		() => ({
			touched,
			touch: () => setTouched(true),
			leave,
		}),
		[touched, leave],
	);
	return [value, setTouched] as const;
}

// The one writer of a leave's edit: the form derived from its procedure, which
// knows its edit by value (a field put back to its first value un-edits it,
// which a change event cannot tell). A sheet's leave is its form's, since a
// bare control in its body holds the app's value. It writes the leave as that
// edit turns, so a press's hold on the edit stands while the values do not
// move.
export function useEditedByValue(touch: Touched, edited: boolean) {
	useEffect(() => touch.leave.edit(edited), [touch.leave, edited]);
}

// A sheet as it opens, and a new page (a wizard's, or the next queued
// decision's), has taken no input: `reset` runs during render, so the sheet
// never draws the last page's reason, while a closing sheet keeps its own
// until it is gone. Returns the page's key.
export function usePageTurn(
	open: boolean,
	title: string,
	description: string | undefined,
	reset: () => void,
) {
	const page = `${title}\n${description ?? ""}`;
	const [shown, setShown] = useState({ open, page });
	if (shown.open !== open || shown.page !== page) {
		setShown({ open, page });
		if (open) reset();
	}
	return page;
}
