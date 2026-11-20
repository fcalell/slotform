import { useSelections } from "@slotform/ui-core/react/read";
import { type Datum, paints } from "@slotform/ui-core/read";
import { CountBase } from "../../atoms/count/base.tsx";
import type { Closed } from "../../lib/closed.ts";

interface CountProps extends Closed {
	/** The number, or its drawn form where it is capped (`tabCount`). A selection paints the figure, and the Count is inert, until its read lands. */
	value: Datum<number | string>;
}

/** A number in the meta ink at the caption size, its figures at one width. */
export function Count({ value }: CountProps) {
	const [figure] = useSelections([value]);
	if (paints(figure)) return <CountBase value="" painted />;
	// An ended read draws no figure; the frame that holds it says why.
	return figure.painted ? null : <CountBase value={figure.value} />;
}
