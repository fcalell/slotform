import { cn } from "@slotform/ui-core/cn";
import { PROSE, PROSE_BLOCKS, text } from "@slotform/ui-core/variants";
import { View } from "react-native";
import { clipWhen, inertProps, Painted, PaintText } from "../../lib/paint";

// The loaded column's box (Prose's own).
const COLUMN = "min-w-0";

/** A markdown text that is not here, in the column's box, inert: `lines` one-line clipped bars (a Prose paints one paragraph of `PAINT_ROWS` lines and a Message's reply one line: the text's length is the data's and unknown, so a bar that wraps would stand taller than the text that lands). Outside the package's exports. */
export function PaintedProse({
	lines,
	at = 0,
}: {
	lines: number;
	at?: number;
}) {
	return (
		<View {...inertProps(true)} className={cn(PROSE, COLUMN)}>
			<View className={PROSE_BLOCKS}>
				<View>
					{Array.from({ length: lines }, (_, line) => (
						<PaintText
							painted
							key={line}
							numberOfLines={1}
							{...clipWhen(true)}
							className={text({ role: "body" })}
						>
							<Painted role="sentence" at={at + line} />
						</PaintText>
					))}
				</View>
			</View>
		</View>
	);
}
