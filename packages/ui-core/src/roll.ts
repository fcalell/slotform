// How a figure that changes while shown moves: docs/architecture/ui-core/motion.md, "Value and fills".

// A rise: the figure grew, so the old leaves upward and the new rises from
// below. A fall: the old leaves downward and the new descends from above.
export type Roll = "rise" | "fall";

// The roll from `from` to `to`, by the sign of the change; none when the
// figure is the same or is not a number.
export function rollOf(from: number, to: number): Roll | undefined {
	if (Number.isNaN(from) || Number.isNaN(to) || from === to) return undefined;
	return to > from ? "rise" : "fall";
}

// The share of the figure's own height its new form rises from: below for a
// rise (+1), above for a fall (-1); the old leaves by the opposite. Zero is a
// plain cross-fade.
export function rollShift(roll: Roll | undefined): -1 | 0 | 1 {
	if (roll === undefined) return 0;
	return roll === "rise" ? 1 : -1;
}
