// Whether a blocked act's press still stands: docs/architecture/ui-core/acts.md, "Blocked reasons".
export function pressStands(
	blocked: string | undefined,
	pressedUnder: string | undefined,
): boolean {
	return blocked !== undefined && pressedUnder === blocked;
}

// The text props of an act a selection may stand in for: docs/architecture/ui-core/acts.md, "Blocked reasons".
export const ACT_TEXT = ["label", "blocked"] as const;
export type ActText = (typeof ACT_TEXT)[number];

// The same for an option of a pick: its label, the line under it and its
// blocked reason.
export const OPTION_TEXT = ["label", "line", "blocked"] as const;
export type OptionText = (typeof OPTION_TEXT)[number];
