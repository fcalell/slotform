import { createContext } from "react";

// Set by an `ActionBar` whose form it is, around its filled act: the `Button`
// it draws is the form's submit button, so Enter in a field presses it.
export const SubmitContext = createContext(false);

// An act that cannot run where it stands: docs/architecture/ui-core/acts.md, "Act model".
export const ActInert = createContext(false);

// A submit button's press runs the act itself, so the press ends the native
// submit it would start: a step the act swaps in leaves the form detached,
// and a submit still pending then logs "the form is not connected". Enter in a
// field presses the same button, so click and Enter share this one path.
export function endSubmit(
	submits: boolean,
	event: { preventDefault: () => void },
): void {
	if (submits) event.preventDefault();
}
