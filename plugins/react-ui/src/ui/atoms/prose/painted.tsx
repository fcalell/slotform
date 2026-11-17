import { cn } from "@fcalell/ui-core/cn";
import { PROSE, PROSE_BLOCKS, text } from "@fcalell/ui-core/variants";
import { Painted } from "../../lib/paint.tsx";

// The loaded column's boxes (Prose's own).
const COLUMN = "flex flex-col min-w-0";
const STACK = "flex flex-col";
// One painted line is a line box of the paragraph, clipped where it ends: the
// text's length is the data's and unknown, so a bar that wraps would stand
// taller than the text that lands.
const PAINTED_LINE = "block overflow-hidden whitespace-nowrap";

/** A markdown text that is not here, in the column's box, inert: one paragraph of `lines` clipped lines (a Prose paints `PAINT_ROWS` lines: a text block of unknown length paints that many lines). Outside the package's exports: a Message's reply paints one line of filler. */
export function PaintedProse({
	lines,
	at = 0,
}: {
	lines: number;
	/** The filler's place among the painted ones around it (`Painted`'s `at`), so a list's painted messages differ in length. */
	at?: number;
}) {
	return (
		<div inert className={cn(PROSE, COLUMN)}>
			<div className={cn(PROSE_BLOCKS, STACK)}>
				<p className={text({ role: "body" })}>
					{Array.from({ length: lines }, (_, line) => (
						<span key={line} className={PAINTED_LINE}>
							<Painted role="sentence" at={at + line} />
						</span>
					))}
				</p>
			</div>
		</div>
	);
}
