import { tuned } from "@slotform/ui-core/paint";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Text as RNText, type TextProps } from "react-native";
import { clipWhen, Painted, PaintText } from "./paint";
import { Decoding, scramblesNow } from "./scramble";
import { Roll } from "./swap";

// A figure or id of a read, in both its forms: docs/architecture/ui-core/reads.md, "Waiting paint".
// `className`, `style` and `numberOfLines` are its text's; `text` undefined draws an empty text once the read is here.
export function Decoded(props: {
	role: "figure" | "id";
	painted?: boolean;
	at?: number;
	text?: string;
	of?: number;
	className?: string;
	style?: TextProps["style"];
	numberOfLines?: number;
}) {
	const { role, painted = false, at = 0, text, of } = props;
	const { className, style, numberOfLines } = props;
	const [decoding, setDecoding] = useState(false);
	const since = useRef<number>(undefined);
	// Before paint, so the loaded text never shows ahead of its decode.
	useLayoutEffect(() => {
		if (painted) {
			since.current = Date.now();
			return;
		}
		const waited =
			since.current !== undefined &&
			Date.now() - since.current >= tuned.waitDelay;
		since.current = undefined;
		if (waited && scramblesNow(role)) setDecoding(true);
	}, [painted, role]);
	const done = useCallback(() => setDecoding(false), []);
	if (painted)
		return (
			<PaintText
				painted
				fills={role}
				numberOfLines={numberOfLines}
				{...clipWhen(true)}
				className={className}
				style={style}
			>
				<Painted role={role} at={at} />
			</PaintText>
		);
	if (text === undefined)
		return (
			<RNText
				className={className}
				style={style}
				numberOfLines={numberOfLines}
			/>
		);
	if (decoding)
		return (
			<Decoding
				text={text}
				onDone={done}
				className={className}
				style={style}
				numberOfLines={numberOfLines}
			/>
		);
	if (of === undefined)
		return (
			<RNText className={className} style={style} numberOfLines={numberOfLines}>
				{text}
			</RNText>
		);
	return <Roll text={text} of={of} className={className} style={style} />;
}
