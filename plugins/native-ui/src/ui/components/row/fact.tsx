import { useWords } from "@fcalell/ui-core/react/words";
import { FIGURES, text } from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { useCopy } from "../../lib/copy";
import { Decoded } from "../../lib/slot";
import { Button } from "../button";

// An identifier is the mono: too long for its room it cuts in its middle, its
// stem truncating to the room and its tail standing whole (`valueCut`).
const ID = "flex-row min-w-0 shrink";
const STEM = "shrink min-w-0";
const TAIL = "shrink-0";
// Standing whole (`wrap`), the value breaks anywhere over as many lines as it
// takes, as a fingerprint must.
const WHOLE = "shrink min-w-0";

/** A copyable id bare in the mono, cut as the row cuts it: its stem is one slot across the waiting shape and the loaded one, so it decodes if it waited. The two parts read as the one value. `whole`, the stem is the whole value and wraps, breaking anywhere. */
export function IdValue(props: {
	painted?: boolean;
	at?: number;
	stem?: string;
	tail?: string;
	value?: string;
	whole?: boolean;
}) {
	const role = cn(text({ role: "code" }), FIGURES);
	if (props.whole)
		return (
			<View
				accessible={props.value !== undefined}
				accessibilityLabel={props.value}
				className={ID}
			>
				<Decoded
					role="id"
					painted={props.painted}
					at={props.at}
					text={props.stem}
					className={cn(role, WHOLE)}
				/>
			</View>
		);
	return (
		<View
			accessible={props.value !== undefined}
			accessibilityLabel={props.value}
			className={ID}
		>
			<Decoded
				role="id"
				painted={props.painted}
				at={props.at}
				text={props.stem}
				numberOfLines={1}
				className={cn(role, STEM)}
			/>
			{props.tail ? (
				<RNText numberOfLines={1} className={cn(role, TAIL)}>
					{props.tail}
				</RNText>
			) : null}
		</View>
	);
}

/** The copy act: a check and the word Copied for two seconds once copied; a refused write raises the failed Toast. */
export function CopyAct({ label, value }: { label: string; value: string }) {
	const words = useWords();
	const [done, copy] = useCopy();
	return (
		<Button
			glyph
			icon={done ? "Check" : "Copy"}
			label={done ? words.copied : `${words.copy} ${label}`}
			onAct={() => copy(value)}
		/>
	);
}
