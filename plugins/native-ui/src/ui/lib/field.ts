import type { Run, Runs } from "@slotform/ui-core/descriptors";
import { createContext, type RefObject, useContext, useEffect } from "react";
import type { TextInputInstance } from "react-native";

// What every control takes as a field: its name, and what a field draws
// around it.
export interface Fielded {
	/** What it holds, the control's name (a short phrase; wraps). Placed alone the control draws as its field, this over it; where an owner names it (a `Form`'s field, a `Toolbar`), and at a bar fit that reads it in its box, it is the accessible name. */
	label: string;
	/** Under the control placed alone (a sentence; wraps). */
	description?: string;
	/** The value may be left empty: the word `optional` stands under the label. */
	optional?: boolean;
	/** The message that takes the description's place, the control drawn in error (a sentence; wraps): words, or runs of one sentence, so a machine name in it is a `{ code }` run in the mono (`["No project at ", { code: "apps/billing" }, "."]`). A save the server refused stands there on its own until the next change, a span of its message between backticks set the same (`markedRuns`). */
	error?: Run | Runs;
}

// The keys a `FormField` supplies to the control it draws.
export type FieldedKey = keyof Fielded;

// What names a typing control, the nearest wins: docs/architecture/ui-core/acts.md, "Fields".
export const FieldNameContext = createContext<string | undefined>(undefined);

export function useFieldName(): string | undefined {
	return useContext(FieldNameContext);
}

// Whether the `FormField` around a typing control is in error, so the
// control's box draws `edge-error`.
export const FieldError = createContext(false);

// Set around the field a sheet opens on (a confirm's typed name, a code): the
// control takes focus as it mounts.
export const FieldFocus = createContext(false);

// Set by a `FormField` around a group of controls, which names the group: docs/architecture/ui-core/acts.md, "Fields".
export const GroupName = createContext<{ label: string } | undefined>(
	undefined,
);

// A `Table` cell's edit, handed to the control the cell draws: docs/architecture/ui-core/acts.md, "Fields".
export interface CellFit {
	label: string;
	done: () => void;
}

// An `Input` a row draws with no `FormField` around it: docs/architecture/ui-core/acts.md, "Fields".
export interface InlineFit {
	label: string;
	focus?: boolean;
}

// Set by a `Gate` or a docked `Sheet` around its body: docs/architecture/plugins/native-ui.md, "Focus claims".
export const FieldClaim =
	createContext<RefObject<TextInputInstance | null> | null>(null);

// A typing control's claim on its region's focus: docs/architecture/plugins/native-ui.md, "Focus claims".
export function useFieldClaim(input: RefObject<TextInputInstance | null>) {
	const column = useContext(FieldClaim);
	useEffect(() => {
		const control = input.current;
		if (!column || !control) return;
		if (!column.current) {
			column.current = control;
			control.focus();
		}
		return () => {
			if (column.current === control) column.current = null;
		};
	}, [column, input]);
	return {
		onFocus: () => {
			if (column) column.current = input.current;
		},
		onBlur: () => {
			if (column && column.current === input.current) column.current = null;
		},
	};
}

// A derived form's field around its typing control: the refusal that names
// the field first (`seek`, set afresh per refusal) focuses the control, and
// the control's blur is the field left (`leave`).
export const FieldTurn = createContext<
	{ seek: object | undefined; leave: () => void } | undefined
>(undefined);

// A typing control's part in its form's field: takes focus on a refusal that
// names the field first, and returns what its blur calls.
export function useFieldTurn(
	input: RefObject<TextInputInstance | null>,
): (() => void) | undefined {
	const turn = useContext(FieldTurn);
	const seek = turn?.seek;
	useEffect(() => {
		if (seek) input.current?.focus();
	}, [seek, input]);
	return turn?.leave;
}
