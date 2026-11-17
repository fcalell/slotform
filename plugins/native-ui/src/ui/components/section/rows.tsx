import {
	type SheetEntry,
	sheetEntries,
	toggled,
	treeRows,
} from "@fcalell/ui-core/list-state";
import { PAINT_ROWS } from "@fcalell/ui-core/paint";
import { useArrivals } from "@fcalell/ui-core/react/arrive";
import { useReach } from "@fcalell/ui-core/react/read";
import type { Drawn } from "@fcalell/ui-core/read";
import { HAIRLINE } from "@fcalell/ui-core/variants";
import { VIRTUAL_FROM } from "@fcalell/ui-core/window";
import {
	type ReactElement,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { View } from "react-native";
import { cn } from "../../lib/cn";
import { between } from "../../lib/group";
import { List } from "../../lib/hosts";
import { FileRowItem } from "../file-row";
import { RowItem as RowView } from "../row";
import { BandHead } from "./band";
import type { Band, Row, RowItem } from "./index";

/** What the Section hands its rows; no app sets it, so it is outside `SectionProps`. */
export interface RowsInternal {
	/** The items as the Section subscribed to them: real, or the placeholder while the read waits, which paints `PAINT_ROWS` rows. */
	drawn: Drawn<readonly Row[]>;
	/** What ends the rows (a more row), given whether the rows mounted reach the last (`useReach`) and the count of entries above it. */
	foot?: (reached: boolean, entries: number) => ReactElement;
	/** The rows stand alone in their Pane (`BodyAlone`): they window in their own scroll. */
	alone?: boolean;
	/** The Section's `groups`. */
	groups?: readonly Band[];
	/** The Section's head counts the rows, so a lone band holding every row draws no count of its own: one band, one count. */
	counted?: boolean;
	/** The row item the painted rows take their shape from; a title line over a facts line when none is given. */
	paint?: RowItem;
}

// The painted row: every painted row is a title line over a facts line, whatever
// kind the loaded rows are.
const PAINTED: RowItem = { key: "", title: "", facts: [""] };

const isRow = (item: Row): item is RowItem => !("path" in item);
const childrenOf = (item: Row) => (isRow(item) ? item.children : undefined);

// The key of a row: its own, the label's text, the title's.
function keyOf(row: Row): string {
	if (row.key !== undefined) return row.key;
	if ("path" in row) return "";
	if (typeof row.label === "string") return row.label;
	if (row.label) return row.label.code;
	return typeof row.title === "string" ? row.title : "";
}

// The hairline above a tree's child starts at its rail: past the row's inset
// and one indent per level, so the indent before the rail reads as the
// parent's and is never ruled as an empty column. It stands over the entry's
// top, where `between` draws a root's.
const TREE_RULE = "absolute top-0 inset-x-0 flex-row ps-pad";
const TREE_RULE_LINE = "flex-1 border-t";

function RailRule(props: { depth: number }) {
	const levels = Array.from({ length: props.depth }, (_, level) => level);
	return (
		<View pointerEvents="none" className={TREE_RULE}>
			{levels.map((level) => (
				<View key={level} className="w-stack" />
			))}
			<View className={cn(TREE_RULE_LINE, HAIRLINE)} />
		</View>
	);
}

/** The rows of a Section's sheet, of whatever kinds, with its bands and its tree, on the sheet's card. Outside the package's exports: `drawn` is the Section's alone. */
export function Rows(props: RowsInternal) {
	// The keys of the tree's folded branches; every branch starts open.
	const [folded, setFolded] = useState<readonly string[]>([]);
	const fold = useCallback(
		(key: string) => setFolded((keys) => toggled(keys, key)),
		[],
	);
	const { drawn } = props;
	const painted = drawn.painted;
	// Painted, as many row items as the sheet last loaded (`PAINT_ROWS` while it
	// has not, never more than a sheet draws whole), so the rows it waits with
	// are the rows that land; the data's depths are not there, so a painted tree
	// draws flat.
	const last = useRef<number>(undefined);
	useEffect(() => {
		if (!drawn.painted && drawn.value.length > 0)
			last.current = drawn.value.length;
	}, [drawn]);
	const loaded: readonly Row[] = painted
		? Array.from(
				{ length: Math.min(last.current ?? PAINT_ROWS, VIRTUAL_FROM - 1) },
				() => props.paint ?? PAINTED,
			)
		: drawn.value;
	// The groups' bands stand over a loaded sheet. Rows of no group stand before
	// the first band, the rest in their group's order, each group's rows in the
	// items' order.
	const groups = painted ? undefined : props.groups;
	const rank = (item: Row) =>
		groups?.findIndex(
			(each) => each.key === (isRow(item) ? item.group : undefined),
		) ?? -1;
	const items: readonly Row[] = groups
		? [...loaded].sort((a, b) => rank(a) - rank(b))
		: loaded;
	// A sheet is a tree once any of its row items declares `children`.
	const tree = !painted && items.some((item) => childrenOf(item) !== undefined);
	// The rows that came on their own once the sheet was drawn fade in as they
	// mount; what it held when first drawn is not new.
	const arrived = useArrivals(painted ? [] : items.map(keyOf), !painted);
	// A painted row's key is its place, the painted rows sharing one item. Only
	// a painted row takes its place as a prop (it varies the filler): a loaded
	// row's place moves when a row lands above it, which would render every row
	// below.
	const visible = tree
		? treeRows(items, { key: keyOf, children: childrenOf }, folded)
		: items.map((item, index) => ({
				item,
				key: painted ? `waiting-${index}` : keyOf(item),
				depth: undefined,
				branch: false,
				open: false,
			}));
	// The sheet's entries: its rows, and with groups a band before the first
	// row of each group (and every empty group's, after the last); a tree's
	// child stands with its parent.
	const entries = sheetEntries(
		visible.map((each) => ({
			key: each.key,
			depth: each.depth ?? 0,
			group: each.depth ? -1 : rank(each.item),
		})),
		groups,
		props.counted === true,
	);
	// The next page loads as the rows the list mounts reach its last entry.
	const reach = useReach(entries.length);
	const nodeOf = (entry: SheetEntry) => {
		if (entry.kind === "band") {
			// A band's index runs below `groups.length`.
			const band = groups?.[entry.index] as Band;
			return <BandHead label={band.label} count={entry.count} act={band.act} />;
		}
		// A row's index runs below `visible.length`.
		const each = visible[entry.index] as (typeof visible)[number];
		if ("path" in each.item)
			return <FileRowItem item={each.item} painted={painted} />;
		return (
			<RowView
				item={each.item}
				id={each.key}
				index={painted ? entry.index : undefined}
				painted={painted}
				fold={fold}
				depth={each.depth}
				open={each.branch ? each.open : undefined}
				arrived={arrived.has(each.key)}
			/>
		);
	};
	// The card is the rows' box: each ruled entry draws the card's hairline
	// above it; a tree's child draws it from its rail.
	const line = (entry: SheetEntry, index: number) => {
		const child = entry.ruled && entry.kind === "row" && entry.depth > 0;
		return (
			<View
				key={entry.key}
				className={between(entry.ruled && !child ? index : 0)}
			>
				{nodeOf(entry)}
				{child ? <RailRule depth={entry.depth} /> : null}
			</View>
		);
	};
	// The foot (a more row) ends the rows, behind the hairline a further entry
	// would have.
	const foot = props.foot?.(reach.reached, entries.length);
	if (!props.alone)
		return (
			<>
				{entries.map(line)}
				{foot}
			</>
		);
	// Alone in its Pane, the rows window in their own scroll and report the
	// last entry they mount, which loads the next page once it is the end.
	return (
		<List
			data={entries}
			keyExtractor={(entry) => entry.key}
			getItemType={(entry) => entry.kind}
			renderItem={({ item, index }) => line(item, index)}
			onViewableItemsChanged={({ endBuffered }) => reach.onLast(endBuffered)}
			ListFooterComponent={foot}
		/>
	);
}
