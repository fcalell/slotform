import { cn } from "@fcalell/ui-core/cn";
import type { IconName, RowMark } from "@fcalell/ui-core/descriptors";
import {
	ROW_FLAG,
	ROW_MARKS,
	ROW_RING,
	ROW_RING_FILLED,
	ROW_WARNING,
	text,
} from "@fcalell/ui-core/variants";
import { Painted } from "../../lib/paint.tsx";
import { Named } from "../button/glyph.tsx";
import { IconBase } from "../icon/index.tsx";

// A mark's glyph beside its label, the label truncating before the glyph does.
const MARK = "flex items-center min-w-icon-meta";
const GLYPH = "flex shrink-0 items-center";
const LABEL = "truncate";
// The glyph names the sentence on hover where its label is cut to nothing; on touch
// it stays passive and a press reaches the row.
const GLYPH_NAMED = "relative pointer-events-auto touch:pointer-events-none";

// The warn glyph in the warn ink, `named` where it takes the pointer for its
// tooltip; an element, not a component, so a `Named` trigger can wrap it.
export function warnGlyph(props: { painted?: boolean; named?: boolean }) {
	return (
		<span className={cn(ROW_WARNING, GLYPH, props.named && GLYPH_NAMED)}>
			<IconBase
				name="TriangleAlert"
				fit="meta"
				stroke="line"
				painted={props.painted}
			/>
		</span>
	);
}

// A flag mark's icon in the meta ink.
export function flagGlyph(flag: IconName) {
	return (
		<span aria-hidden className={cn(ROW_FLAG, GLYPH)}>
			<IconBase name={flag} fit="meta" stroke="line" />
		</span>
	);
}

/** What is wrong, in a table's cell: a warn glyph and its sentence in the meta ink, the sentence truncating; `painted` while the sentence is not here, the glyph's box and a phrase's filler. A row's and a head's warning is a badge (`WarningBadge`). Outside the package's exports. */
export function WarningMark(props: { label: string; painted?: boolean }) {
	const glyph = warnGlyph({ painted: props.painted, named: !props.painted });
	return (
		<span className={cn(ROW_MARKS, MARK)}>
			{props.painted ? glyph : <Named label={props.label}>{glyph}</Named>}
			<span className={cn(text({ role: "meta" }), LABEL)}>
				{props.painted ? <Painted role="phrase" /> : props.label}
			</span>
		</span>
	);
}

/** A boolean mark whose words are not drawn (`words: false`): its glyph alone, a row's end group's first item, named for assistive tech by its label and, on hover, by a tooltip; on touch it stays passive and a press reaches the row. Outside the package's exports. */
export function EndMark({ mark }: { mark: RowMark }) {
	const glyph =
		"ring" in mark ? (
			<span aria-hidden className={cn(ROW_RING, ROW_RING_FILLED)} />
		) : (
			flagGlyph(mark.flag)
		);
	return (
		<Named label={mark.label}>
			<span
				role="img"
				aria-label={mark.label}
				className={cn("flex items-center shrink-0", GLYPH_NAMED)}
			>
				{glyph}
			</span>
		</Named>
	);
}
