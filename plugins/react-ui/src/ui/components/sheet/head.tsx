import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@fcalell/ui-core/cn";
import { BACK_GLYPH } from "@fcalell/ui-core/list-state";
import type { Frame } from "@fcalell/ui-core/react/read";
import { useWords } from "@fcalell/ui-core/react/words";
import { SHEET_HEAD, SHEET_HEAD_ROW, text } from "@fcalell/ui-core/variants";
import { use } from "react";
import { useFollow } from "../../lib/follow.ts";
import { useTouch } from "../../lib/media.ts";
import { BusyMark, FrameLine } from "../../lib/read.tsx";
import { IconButtonBase } from "../../parts/button/glyph.tsx";
import { Button } from "../button/index.tsx";
import { SheetLayerContext } from "./layer.tsx";

// The head is where a bottom sheet is pulled down by a finger, so the browser
// leaves it the vertical axis.
const HEAD = "flex flex-col touch-none";
const HEAD_ROW = "flex items-center";
// The head is one line: the title truncates at its floor and the close act
// stands beside it, before it on touch.
const TITLE_BLOCK = "flex flex-col grow basis-0 min-w-0";
const TITLE_SLOT = "flex items-center gap-gap min-w-0";
const TITLE = "min-w-0 truncate";
// The desktop head is a two-line row tall (the title over its description)
// whether or not the description stands; on touch the row is the acts'.
const HEAD_ROW_TALL = "py-gap touch:min-h-0";

/** A `SheetLayer`'s head: the title that names the layer over its description, the back act and the close act; on touch the close act leads unless back holds its place, the description stands under the row and a finger on the head pulls the sheet down. Outside the package's exports. */
export function SheetHead({
	title,
	description,
	back,
	frame,
	centred,
	close = true,
	holds = false,
	asks = false,
	onClose,
}: {
	title: string;
	description?: string;
	back?: () => void;
	/** The sheet's frame, whose busy mark stands after the title and whose line under the head. */
	frame?: Frame;
	/** A decision's head on the desktop: the row is one line tall, and nothing pulls it. */
	centred?: boolean;
	/** The head draws its close act; a decision's acts dismiss it instead. */
	close?: boolean;
	/** An act runs: the close act is inert and the head does not follow a finger. */
	holds?: boolean;
	/** The sheet asks before it closes, so the head does not follow a finger. */
	asks?: boolean;
	/** Hears the sheet pulled away. */
	onClose: () => void;
}) {
	const touch = useTouch();
	const words = useWords();
	const { popup, titleId } = use(SheetLayerContext);
	// A bottom sheet follows a finger on its head, 1:1, and leaves past the reach
	// or flung; a held dismissal (an act running) and an edit keep it.
	const pull = useFollow({
		target: popup,
		axis: "y",
		away: 1,
		enabled: touch && !centred && !holds && !asks,
		onAway: onClose,
	});
	const closer = close ? (
		<Dialog.Close
			disabled={holds}
			render={<IconButtonBase icon="X" label={words.close} />}
		/>
	) : null;
	const lead = back ? (
		<Button glyph icon={BACK_GLYPH} label={words.back} onAct={back} />
	) : null;
	// On touch the close act leads the head unless back holds its place.
	const start = touch ? (lead ?? closer) : lead;
	const end = touch ? null : closer;
	const titled = (
		<h2 id={titleId} className={TITLE_SLOT}>
			<span className={cn(text({ role: "heading" }), TITLE)}>{title}</span>
			{frame ? <BusyMark frame={frame} /> : null}
		</h2>
	);
	const said = description ? (
		<p className={text({ role: "meta" })}>{description}</p>
	) : null;
	const line = frame ? <FrameLine frame={frame} /> : null;
	const headRow = (
		<div className={cn(SHEET_HEAD_ROW, HEAD_ROW, !centred && HEAD_ROW_TALL)}>
			{start}
			<div className={TITLE_BLOCK}>
				{titled}
				{touch ? null : said}
			</div>
			{end}
		</div>
	);
	if (centred)
		return (
			<>
				{headRow}
				{line}
			</>
		);
	return (
		<div
			onPointerDown={pull.onPointerDown}
			onPointerMove={pull.onPointerMove}
			onPointerUp={pull.onPointerUp}
			onPointerCancel={pull.onPointerCancel}
			className={cn(SHEET_HEAD, HEAD)}
		>
			{headRow}
			{touch ? said : null}
			{line}
		</div>
	);
}
