import { cn } from "@slotform/ui-core/cn";
import { stepStateOf } from "@slotform/ui-core/list-state";
import { useWords } from "@slotform/ui-core/react/words";
import { filled } from "@slotform/ui-core/tokens";
import {
	STEP_COUNT,
	STEP_COUNT_SEGMENTS,
	stepCountSegment,
	text,
} from "@slotform/ui-core/variants";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";

const STACK = "min-w-0";
const SEGMENTS = "flex-row";
const SEGMENT = "flex-1";

interface StepCountProps extends Closed {
	// The current step, counted from one.
	at: number;
	// How many steps the flow has, two to four.
	of: number;
}

// An accessible view is one element, so its label is the sentence its words
// draw.
export function StepCount({ at, of }: StepCountProps) {
	const words = useWords();
	const sentence = filled(words.stepOf, { at: String(at), of: String(of) });
	return (
		<View
			accessible
			accessibilityRole="image"
			accessibilityLabel={sentence}
			className={cn(STEP_COUNT, STACK)}
		>
			<View className={cn(STEP_COUNT_SEGMENTS, SEGMENTS)}>
				{Array.from({ length: of }, (_, index) => index + 1).map((step) => (
					<View
						key={step}
						className={cn(
							stepCountSegment({ state: stepStateOf(step, at) }),
							SEGMENT,
						)}
					/>
				))}
			</View>
			<RNText className={text({ role: "meta" })}>{sentence}</RNText>
		</View>
	);
}
