import { cn } from "@slotform/ui-core/cn";
import { qrModules, qrTooLong } from "@slotform/ui-core/qr";
import { useSelections } from "@slotform/ui-core/react/read";
import { type Datum, dev, paints } from "@slotform/ui-core/read";
import {
	QR_CODE,
	QR_CODE_FAILED,
	QR_CODE_FAILED_GLYPH,
	QR_CODE_INK,
} from "@slotform/ui-core/variants";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useResolveClassNames } from "uniwind";
import { Icon } from "../../atoms/icon";
import { Ink } from "../../lib/ink";
import { inertProps, PAINT_BOX, PaintView } from "../../lib/paint";

/** A code a camera reads. */
export interface QrCodeProps {
	/** The text the code carries (an address). A selection paints the tile, which takes no touch, until its read lands. Never drawn as words nor read aloud: the label names the code, and the link beside it carries the text. */
	value: Datum<string>;
	/** What the code is for, its accessible name ("Code that adds a device"): a phrase. */
	label: string;
}

// The code's modules, crisp-edged in the dark ink on a light tile in both
// modes, inside a four-module quiet zone. The tile is a square at its
// container's width down to the image's height cap, centred where the cap
// narrows it, so the code is never cropped. While its text is a selection
// still to land the tile is painted at that square. It takes no touch: an act
// beside it (a copy of the link) carries the text.
export function QrCode({ value: given, label }: QrCodeProps) {
	const [named] = useSelections([given]);
	const text = named.painted ? undefined : named.value;
	const code = useMemo(
		() => (text === undefined ? undefined : qrModules(text)),
		[text],
	);
	const failed = text !== undefined && code === undefined;
	useEffect(() => {
		if (text !== undefined && code === undefined && dev())
			console.error(qrTooLong(text));
	}, [text, code]);
	// react-native-svg takes values, so the modules' ink is resolved. It has
	// no crisp-edge hint; the modules are one path, so two that touch draw no
	// seam between them.
	const { color } = useResolveClassNames(QR_CODE_INK);
	// An ended read draws no code; the region that holds it says why.
	if (named.painted && !paints(named)) return null;
	if (failed)
		return (
			<View
				accessible
				accessibilityRole="image"
				accessibilityLabel={label}
				className={cn(QR_CODE, QR_CODE_FAILED)}
			>
				<Ink.Provider value="ink-meta">
					<Icon name={QR_CODE_FAILED_GLYPH} />
				</Ink.Provider>
			</View>
		);
	if (code === undefined)
		return (
			<PaintView
				painted
				{...inertProps(true)}
				className={cn(QR_CODE, PAINT_BOX)}
			/>
		);
	return (
		<View
			accessible
			accessibilityRole="image"
			accessibilityLabel={label}
			className={QR_CODE}
		>
			<Svg
				width="100%"
				height="100%"
				viewBox={`0 0 ${code.side} ${code.side}`}
				color={color}
				aria-hidden
			>
				<Path d={code.path} fill="currentColor" />
			</Svg>
		</View>
	);
}
