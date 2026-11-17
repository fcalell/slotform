import type { Offered } from "@fcalell/ui-core/acts";
import type {
	Band as BandData,
	IconLinkAct,
	LinkAct,
	Row as RowData,
	RowItem as RowItemData,
	Run,
} from "@fcalell/ui-core/descriptors";
import {
	factsOnly,
	listedRows,
	optionReads,
	ownCount,
} from "@fcalell/ui-core/list-state";
import {
	type Frame,
	useCollection,
	useFrame,
	useOptions,
	useSelections,
} from "@fcalell/ui-core/react/read";
import { useWords } from "@fcalell/ui-core/react/words";
import {
	combine,
	type Datum,
	isSelection,
	pagesOf,
	placeholderData,
	type Selection,
	sampleOf,
} from "@fcalell/ui-core/read";
import { SECTION, SECTION_BODY } from "@fcalell/ui-core/variants";
import { type ReactNode, useContext, useMemo, useState } from "react";
import { View } from "react-native";
import { SheetCard } from "../../atoms/section/card";
import type { Act, IconAct, MenuEntry, Sheeted } from "../../lib/act";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { BodyAlone } from "../../lib/container";
import type { Empty } from "../../lib/empty";
import { between } from "../../lib/group";
import { FILL } from "../../lib/hosts";
import { MoreRow } from "../../lib/more";
import { FrameBody, FrameLine, StateLine } from "../../lib/read";
import { SectionHead } from "./head";
import { Rows, type RowsInternal } from "./rows";

const BOX = "min-w-0";
const BODY_FOLDED = "hidden";
// Alone in its Pane, the card is the rows' scroll box: it hugs a short list
// and the body bounds a long one, which scrolls inside its clip.
const CARD_BOUNDED = "shrink min-h-0";

/** A band as the platform draws it: its act may open a sheet. */
export type Band = Omit<BandData, "act"> & { act?: IconAct | IconLinkAct };

/** A descriptor's reads as the platform draws them: a row's `act`, `more`, `title`, `line` and `facts`, a switch's `checked`, a pick's `options` and `value`, the same in a tree's children, may be a `Datum`; the row's `facts` may be a read of the whole list or a list of facts that are each a read of their own. */
export type WithReads<T> = T extends unknown
	? {
			[K in keyof T]: K extends "act" | "more"
				? Datum<Sheeted<T[K]>>
				: K extends "facts"
					? T[K] extends readonly (infer F)[] | undefined
						? Datum<readonly Datum<F>[]>
						: never
					: K extends "title" | "line" | "value" | "options" | "checked"
						? Datum<Exclude<T[K], undefined>>
						: K extends "switch" | "pick"
							? WithReads<T[K]>
							: K extends "children"
								? T[K] extends readonly (infer C)[] | undefined
									? readonly WithReads<C>[] | undefined
									: never
								: T[K];
		}
	: never;

/** A row of a Section's sheet: a row item or a file, its reads widened to a `Datum`. */
export type Row<V extends string | null = string> = WithReads<RowData<V>>;
/** A row item as the platform draws it. */
export type RowItem<V extends string | null = string> = WithReads<
	RowItemData<V>
>;

interface SectionHeadProps extends Closed {
	/** Under the title (a sentence; wraps). It paints where it will stand while its selection waits. `""` and an undefined one draw no line. */
	description?: Datum<string>;
	/** Set, the title folds the body, and this is its initial fold: `true` starts folded, `false` open; later changes are not read. */
	folded?: boolean;
	/** Called as a foldable section opens or closes, with whether it is now open. */
	onToggle?: (open: boolean) => void;
	/** The section's one act, at the head's end: a labelled act, a link to a route (`{ label, href }`, a press that navigates) or an icon act. It is live whatever the `read` does. Given as a selection it paints, inert, while its own read waits or stands still, and stands blocked with the failed sentence once that read failed or is missing. */
	act?: Offered<IconAct | IconLinkAct>;
	/** The section's other acts, in a menu under the more act after its act (destructive ones marked; a `{ label, href }` entry goes to its route); a foldable section's more does not fold it. It paints and stands blocked as the act does. */
	more?: Offered<readonly MenuEntry[]>;
}

type Parts = SectionHeadProps & {
	/** The heading (a short phrase; wraps). A section titled by its record takes a `Datum`: a selection of the read the section holds (its `read`), never a second read of its own; it paints a title-length filler, its heading inert and hidden from assistive tech, until it lands.  A title whose read ended (failed or missing) draws no head at all (no heading, count or acts): the failed or missing shape of the Section stands alone in its place. */
	title: Datum<Run>;
	/** The body's parts: a Form, a Table, a Stats, a BarChart, or a `Card` around anything else; none stand while the `read` is empty. */
	children?: ReactNode;
	items?: never;
	groups?: never;
} & (
		| {
				read?: undefined;
				empty?: never;
		  }
		| {
				/** What the section's body holds, read once for the frame: while it waits the body's leaves paint, its failure and a missing record stand in the body's place, and an empty selection draws `empty`. It holds the reads of `read` that no enclosing frame holds: those draw their failure and say they are busy; the rest only wait and empty. */
				read: Selection<unknown>;
				description?: undefined;
				/** What the body says when the `read` is empty: this stands in the body's place in a hairline frame, the `sentence` and the act after it. */
				empty?: Empty;
		  }
		| {
				read: Selection<unknown>;
				description: Datum<string>;
				/** The act the body offers when the `read` is empty, alone in a hairline frame: the description says what the section holds, so the frame draws no sentence of its own, only the word for none when no act is given. */
				empty?: { act: Act | LinkAct };
		  }
	);

type Sheet<V extends string | null> = SectionHeadProps & {
	/** The heading (a short phrase; truncates); the head over the sheet is drawn with it, and a Section with no title is the sheet alone. */
	title?: Datum<Run>;
	/** The sheet's rows: constants (none draw the empty shape, as an empty read does), or a selection, which paints as many rows as it last loaded (`PAINT_ROWS` the first time) until its read lands, each in the regions its selector gives one record where it maps the records (`list.map(toRow)`), else a title over a facts line. A selection is the section's own frame: it holds its read and draws the failed, missing and empty shapes in the sheet's place, and the head's count is the loaded rows'. One row given alone, not in an array, is a value (a field that holds one thing), no list: it stands on the sheet as a row of a list does, and the head draws no count. */
	items: Datum<readonly Row<V>[]> | Row<V>;
	/** The sheet's bands, in order: a band over the rows of each (their `group` is its `key`), with its label, the count of its rows (none for a lone band holding every row under a counted head, whose count is the same) and its act. Rows whose `group` names no key, or with none, stand before the first band; the painted (waiting) rows stand with no bands. A selection is the section's own read as `items` is: the rows paint with no bands until it lands, and its failed, missing and empty shapes stand in the sheet's place. */
	groups?: Datum<readonly Band[]>;
	children?: never;
	/** What the sheet says when its `items` are empty (a read that answered none, or no constants): the sentence and the act that makes the first one, in place of the generic sentence; under a `description`, with no sentence given, its act alone or the word for none. */
	empty?: Empty;
};

/** A titled stretch of a page over its rows, or its parts. With `items` it draws the row list (a row item or a file row each); with `children` it frames parts, and `empty` belongs to the `read` it answers for, so one given without the other does not type-check; a parts Section with a `description` takes an `empty` of its `act` alone, since its frame never draws a sentence, and a described sheet draws the sentence it is given, never the generic one. */
export type SectionProps<V extends string | null = string> = Parts | Sheet<V>;

// A heading with its count, description and act over its body: docs/architecture/ui-core/layout.md, "Section".
// Its frame shapes and waiting paint: docs/architecture/ui-core/reads.md, "What a frame draws".
export function Section<V extends string | null = string>(
	props: SectionProps<V>,
) {
	return props.items === undefined ? (
		<PartsSection {...props} />
	) : (
		<SheetSection {...props} />
	);
}

// The shape the waiting rows paint in: one record as the items' selector maps
// it, where that is a list row; else the roster's title over a facts line.
function paintOf<V extends string | null>(
	items: Datum<readonly Row<V>[]>,
): RowItem | undefined {
	if (!isSelection(items)) return undefined;
	const one = sampleOf(items);
	if (one === undefined || "path" in one) return undefined;
	// The painted rows draw this shape inert, so its pick's `V` never meets a
	// value: it stands as the default row item.
	const row = one as RowItem;
	// Facts the selector passes through whole (`facts: record.facts`) sample
	// as the placeholder itself, a word where the facts stand: they paint one
	// part, as facts built in parts do, so the row keeps its facts line.
	return typeof row.facts === "string" ? { ...row, facts: [""] } : row;
}

// A described Section's empty shape says no generic sentence, its description
// saying what it holds: a sheet's own sentence stands, else the act alone, or
// the word for none.
function emptyOf(
	description: Datum<string> | undefined,
	empty: Empty | { act: Act | LinkAct } | undefined,
	none: string,
): { sentence?: Datum<string>; act?: Act | LinkAct } | undefined {
	if (
		description === undefined ||
		(empty && "sentence" in empty && empty.sentence)
	)
		return empty;
	return empty?.act ? { act: empty.act } : { sentence: none };
}

function PartsSection(props: Parts) {
	const { read, empty, description, children } = props;
	const words = useWords();
	const frame = useFrame(read);
	const body =
		read === undefined ? (
			children
		) : (
			<FrameBody
				frame={frame}
				fit="frame"
				empty={emptyOf(description, empty, words.none)}
			>
				{children}
			</FrameBody>
		);
	return <Titled {...props} list={false} frame={frame} body={body} />;
}

// One row given alone is a value, not a list.
function lone<V extends string | null>(
	items: Sheet<V>["items"],
): items is Row<V> {
	return !Array.isArray(items) && !isSelection(items);
}

function SheetSection<V extends string | null>(props: Sheet<V>) {
	const { title, groups, description, empty, items: given } = props;
	// One row given alone stands as a list of one, and its head counts nothing
	// (a count is a list's).
	const one = lone(given);
	const items: Datum<readonly Row<V>[]> = one ? [given] : given;
	const words = useWords();
	// The sheet's data is its rows together with the reads they stand on: when
	// `groups` is a selection, the rows paint until it lands and its
	// failure ends the sheet, as the rows' own read does.
	const together = [items, groups].filter((read) => isSelection(read));
	const whole =
		isSelection(items) && together.length === 1
			? items
			: together.length > 0
				? combine(together, (...values) =>
						isSelection(items) ? values[0] : items,
					)
				: items;
	// The combined read answers the rows: its first selection is `items`
	// whenever `items` is one.
	const collection = useCollection(whole as Datum<readonly RowData[]>);
	const { drawn } = collection;
	const [bands] = useSelections([groups] as const);
	const loaded = drawn.painted ? [] : drawn.value;
	// A constant with no rows is empty as a read that answered none is: its
	// empty shape stands (`empty`, else the generic sentence), never a sheet
	// with nothing on it.
	const frame: Frame =
		!isSelection(items) && items.length === 0
			? { ...collection.frame, shape: "empty" }
			: collection.frame;
	// While the rows wait they paint in the shape the items' selector gives one
	// record (its leading mark, its facts, its trailing value), so the text and
	// the end group stand where the loaded rows' will.
	const paint = useMemo(() => paintOf(items), [items]);
	// It stands alone in its Pane: it fills the body and its rows window.
	const alone = useContext(BodyAlone);
	const more = pagesOf(items);
	const rows: Omit<RowsInternal, "drawn" | "foot" | "alone"> = {
		paint,
		groups: bands.painted ? undefined : bands.value,
		counted:
			!one && title !== undefined && (drawn.painted || !factsOnly(drawn.value)),
	};
	// The more row ends the card, behind the hairline a further row would have;
	// the next page paints in the shape of the rows that stand, at the card's
	// rhythm.
	const foot =
		more && !drawn.painted
			? (reached: boolean, entries: number) => (
					<View className={between(entries)}>
						<MoreRow
							read={more}
							empty={loaded.length === 0}
							inset
							scrolled={reached}
							paint={() => (
								<Rows
									{...rows}
									paint={paint ?? loaded.find((row) => !("path" in row))}
									drawn={{
										painted: true,
										phase: "waiting",
										value: placeholderData(),
									}}
								/>
							)}
						/>
					</View>
				)
			: undefined;
	const body = (
		<FrameBody
			frame={frame}
			fit="part"
			empty={emptyOf(description, empty, words.none)}
		>
			{title === undefined ? <FrameLine frame={frame} /> : null}
			<PicksLine rows={loaded} />
			<SheetCard className={alone ? CARD_BOUNDED : undefined}>
				<Rows {...rows} drawn={drawn} foot={foot} alone={alone} />
			</SheetCard>
		</FrameBody>
	);
	if (title === undefined)
		return alone ? <View className={FILL}>{body}</View> : body;
	return (
		<Titled
			{...props}
			fill={alone}
			title={title}
			list={!one && (drawn.painted || !factsOnly(drawn.value))}
			frame={frame}
			// The count is the items the Section lists: its top-level rows less
			// those marked `counted: false`, and the nested rows marked `counted:
			// true`; a nested row is otherwise a part of its row. A read's own count is the top level, and stands
			// unless a row says otherwise.
			count={
				drawn.painted || (isSelection(items) && ownCount(drawn.value))
					? undefined
					: listedRows(drawn.value).length
			}
			body={body}
		/>
	);
}

// What the sheet says once of the options its rows' picks read: a row's pick
// draws its box blocked (inert) when its options ended, the sentence and the
// retry stand here, a line over the sheet, never repeated in every row.
function PicksLine({ rows }: { rows: readonly RowData[] }) {
	const words = useWords();
	const options = optionReads(rows);
	const picks = options.length === 0 ? undefined : combine(options, () => null);
	const { drawn, retry } = useOptions(picks);
	if (!drawn.painted) return null;
	if (drawn.phase === "failed")
		return (
			<StateLine
				sentence={words.readFailed}
				act={{ label: words.retry, onAct: retry }}
			/>
		);
	return drawn.phase === "missing" ? (
		<StateLine sentence={words.missing} />
	) : null;
}

// The head over a body, the body folding under the title when the Section is
// foldable. The frame is the Section's read: its busy mark, its state line and
// its count stand in the head.
function Titled(
	props: SectionHeadProps & {
		title: Datum<Run>;
		frame: Frame;
		list: boolean;
		count?: number;
		body: ReactNode;
		// The Section stands alone in its Pane: it and its body fill the free height.
		fill?: boolean;
	},
) {
	const {
		fill,
		title,
		list,
		count,
		description,
		folded,
		onToggle,
		act,
		more,
		frame,
		body,
	} = props;
	// `folded` is the initial fold: the section holds its fold from there.
	const [open, setOpen] = useState(folded !== true);
	return (
		<View
			accessibilityState={{ busy: frame.holds && frame.shape === "waiting" }}
			className={cn(SECTION, BOX, fill && FILL)}
		>
			<SectionHead
				title={title}
				list={list}
				count={count}
				description={description}
				act={act}
				more={more}
				foldable={folded !== undefined}
				open={open}
				fold={() => {
					setOpen(!open);
					onToggle?.(!open);
				}}
				frame={frame}
			/>
			{/* A section without children draws no body. */}
			{body == null || body === false ? null : (
				<View className={cn(SECTION_BODY, fill && FILL, !open && BODY_FOLDED)}>
					{body}
				</View>
			)}
		</View>
	);
}
