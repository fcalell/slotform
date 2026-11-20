import { cn } from "@slotform/ui-core/cn";
import { BACK_GLYPH } from "@slotform/ui-core/list-state";
import type { Frame } from "@slotform/ui-core/react/read";
import { useWords } from "@slotform/ui-core/react/words";
import { SHEET_HEAD, SHEET_HEAD_ROW, text } from "@slotform/ui-core/variants";
import type { ReactNode } from "react";
import { Text as RNText, View } from "react-native";
import { IconButtonBase } from "../../atoms/button/glyph";
import { RaisedGround } from "../../lib/raised";
import { BusyMark, FrameLine } from "../../lib/read";
import { Button } from "../button";

const HEAD_ROW = "flex-row items-center";
const TITLE_BLOCK = "grow basis-0 min-w-0";
const TITLE_REGION = "flex-row items-center min-w-0";
const TITLE = "shrink";

/** A sheet's head, the `SheetLayer`'s `head`. Outside the package's exports. */
interface SheetHeadProps {
	title: string;
	description?: string;
	// A second page's way back, in the close act's place.
	back?: () => void;
	// The close act's press; absent, no close act stands (a decision's acts
	// dismiss it).
	onClose?: () => void;
	// An act of the sheet runs: the close act is inert.
	holds?: boolean;
	// The body's frame, whose busy mark and state line the head draws.
	frame?: Frame;
	// Fixed under the head, over the scrolling body: the Picker's search.
	above?: ReactNode;
}

// The close act, or back on a second page, the title, the description under
// it and the body frame's state line, then what stands above the body.
export function SheetHead({
	title,
	description,
	back,
	onClose,
	holds,
	frame,
	above,
}: SheetHeadProps) {
	const words = useWords();
	const heading = (
		<View accessibilityRole="header" className={TITLE_REGION}>
			<RNText
				numberOfLines={1}
				className={cn(text({ role: "heading" }), TITLE)}
			>
				{title}
			</RNText>
			{frame ? <BusyMark frame={frame} /> : null}
		</View>
	);
	const said = description ? (
		<RNText className={text({ role: "meta" })}>{description}</RNText>
	) : null;
	return (
		<RaisedGround>
			<View className={SHEET_HEAD}>
				<View className={cn(SHEET_HEAD_ROW, HEAD_ROW)}>
					{back ? (
						<Button glyph icon={BACK_GLYPH} label={words.back} onAct={back} />
					) : null}
					{back || !onClose ? null : (
						<IconButtonBase
							icon="X"
							label={words.close}
							onAct={onClose}
							disabled={holds}
						/>
					)}
					<View className={TITLE_BLOCK}>{heading}</View>
				</View>
				{said}
				{frame ? <FrameLine frame={frame} /> : null}
			</View>
			{above}
		</RaisedGround>
	);
}
