import type { Run, Runs } from "@fcalell/ui-core/descriptors";
import { createContext } from "react";

// A toggle a row's label targets: docs/architecture/ui-core/acts.md, "Fields".
export interface LabelFit {
	labelledBy?: string;
}

/** What every control takes as a field: its name, and what a field draws around it. */
export interface Fielded {
	/** What it holds, the control's name (a short phrase; wraps). Placed alone the control draws as its field, this over it; where an owner names it (a `Form`'s field, a `Toolbar`), and at a bar fit that reads it in its box, it is the accessible name. */
	label: string;
	/** Under the control placed alone (a sentence; wraps). */
	description?: string;
	/** The value may be left empty: the word `optional` stands under the label. */
	optional?: boolean;
	/** The message that takes the description's place, the control drawn in error (a sentence; wraps): words, or runs of one sentence, so a machine name in it is a `{ code }` run boxed in the mono (`["No project at ", { code: "apps/billing" }, "."]`). A save the server refused stands there on its own until the next change, a span of its message between backticks boxed the same (`markedRuns`). */
	error?: Run | Runs;
}

/** The keys a `FormField` supplies to the control it draws. */
export type FieldedKey = keyof Fielded;

// The label that names a group of controls: docs/architecture/ui-core/acts.md, "Fields".
export const GroupName = createContext<{ labelledBy: string } | undefined>(
	undefined,
);

// A `Table` cell's edit: docs/architecture/ui-core/acts.md, "Fields".
export interface CellFit {
	label: string;
	starts: boolean;
}

// An `Input` a row draws without a `FormField`: docs/architecture/ui-core/acts.md, "Fields".
export interface InlineFit {
	label: string;
	focus?: boolean;
}
