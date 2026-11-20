import { cn } from "@slotform/ui-core/cn";
import { HAIRLINE } from "@slotform/ui-core/variants";

// A child selector is one uniwind drops, so each row of a group after the first
// draws the hairline above it, on its own wrapper.
export function between(index: number): string {
	return cn(index > 0 && "border-t", index > 0 && HAIRLINE);
}
