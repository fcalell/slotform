import { cn } from "@slotform/ui-core/cn";
import {
	folding,
	type SheetEntry,
	sheetEntries,
	toggled,
	treeMove,
	treeRows,
	treeStop,
} from "@slotform/ui-core/list-state";
import { PAINT_ROWS } from "@slotform/ui-core/paint";
import { useArrivals } from "@slotform/ui-core/react/arrive";
import { useReach } from "@slotform/ui-core/react/read";
import { type Drawn, placeholderData, type Read } from "@slotform/ui-core/read";
import { isRun, partText } from "@slotform/ui-core/runs";
import { VIRTUAL_FROM } from "@slotform/ui-core/window";
import {
	type ComponentProps,
	type FocusEvent,
	type KeyboardEvent,
	type ReactElement,
	type ReactNode,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { TREE_DIVIDER } from "../../atoms/section/card.tsx";
import { MoreRow } from "../../lib/more.tsx";
import { ListedRoute, useRoute } from "../../lib/navigate.ts";
import { edgeOf, type Movable } from "../../lib/reorder.ts";
import { Window } from "../../lib/window.tsx";
import { FileRowItem } from "../file-row/index.tsx";
import { RowItem } from "../row/index.tsx";
import { BandHead } from "./band.tsx";
import type { Band, Row, RowItem as RowItemData } from "./index.tsx";

/** What the Section hands its rows; no app sets it, so it is outside `SectionProps`. */
interface RowsInternal {
	/** The items as the Section subscribed to them: real, or the placeholder while the read waits, which paints `PAINT_ROWS` rows. */
	drawn: Drawn<readonly Row[]>;
	/** The pages read the items come from, when it has pages: the sheet ends in its more row. */
	more?: Read<unknown>;
	/** The sheet the rows stand in, which the rows window against; a painted next page stands in its Section's. */
	box?: RefObject<HTMLElement | null>;
	/** The rows are the painted next page of another sheet: its rows alone, standing in that sheet's box. */
	tail?: boolean;
	/** The Section's `groups`. */
	groups?: readonly Band[];
	/** The Section's head counts the rows, so a lone band holding every row draws no count of its own: one band, one count. */
	counted?: boolean;
	/** The row the painted rows take their shape from, a list row or a file row; a title line over a facts line when none is given. */
	paint?: Row;
	/** The sheet reorders (the caller has put `drawn` in the order the viewer moved it to): its rows read the order and move by this. A flat, ungrouped sheet only. */
	movable?: Movable;
}

// The painted row: a title line over a facts line, whatever kind the loaded rows
// are.
const PAINTED: RowItemData = { key: "", title: "", facts: [""] };

const isList = (item: Row): item is RowItemData => !("path" in item);
/** A row's key in its sheet: its `key`, else its label's text, else its title's words. */
export const keyOf = (item: Row) => {
	if (item.key !== undefined) return item.key;
	if (isList(item)) {
		if (typeof item.label === "string") return item.label;
		if (item.label) return item.label.code;
		const { title } = item;
		if (Array.isArray(title) || isRun(title)) return partText(title);
	}
	return "";
};
const childrenOf = (item: Row) => (isList(item) ? item.children : undefined);

// A tree has no box of its own but the card: its rows stand in the tree's
// element on it, a hairline falling once between them.
const GROUP_TREE = "flex flex-col";

// A tree's keyboard: the container's role and the keys and focus its rows'
// `treeitem` stops send up.
interface TreeNav {
	onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
	onFocus: (event: FocusEvent<HTMLElement>) => void;
}

/** The rows of a Section's sheet, of whatever kinds, with its bands and its tree. Outside the package's exports: `drawn` is the Section's alone. */
export function Rows(props: RowsInternal) {
	const at = useRoute();
	// The keys of the tree's folded branches; every branch starts open.
	const [folded, setFolded] = useState<readonly string[]>([]);
	// The key of the tree's row that holds its one tab stop.
	const [active, setActive] = useState<string>();
	const fold = useCallback(
		(key: string) => setFolded((keys) => toggled(keys, key)),
		[],
	);
	const own = useRef<HTMLDivElement>(null);
	const box = props.box ?? own;
	const treeBox = useRef<HTMLDivElement>(null);
	// The visible row a key is moving the focus to, by its key; it stands
	// mounted by then, the window keeping the tab stop's row, and takes the focus.
	const [wanted, setWanted] = useState<{ key: string }>();
	useLayoutEffect(() => {
		if (!wanted) return;
		treeBox.current
			?.querySelectorAll<HTMLElement>('[role="treeitem"]')
			.forEach((each) => {
				if (each.dataset.key === wanted.key) each.focus();
			});
	}, [wanted]);
	const { drawn } = props;
	const painted = drawn.painted;
	// Painted, as many list items as the sheet last loaded (`PAINT_ROWS` while it
	// has not, never more than a sheet draws whole), so the rows it waits with
	// are the rows that land; the data's depths are not there, so a painted tree
	// draws flat.
	const last = useRef<number>(undefined);
	useEffect(() => {
		if (!drawn.painted && drawn.value.length > 0)
			last.current = drawn.value.length;
	}, [drawn]);
	const loaded: readonly Row[] = drawn.painted
		? Array.from(
				{ length: Math.min(last.current ?? PAINT_ROWS, VIRTUAL_FROM - 1) },
				() => props.paint ?? PAINTED,
			)
		: drawn.value;
	// The groups' bands stand over a loaded standalone list of rows. Rows of no
	// group stand before the first band, the rest in their group's order, each
	// group's rows in the items' order.
	const groups = painted ? undefined : props.groups;
	const rank = (item: Row) =>
		groups?.findIndex(
			(each) => each.key === (isList(item) ? item.group : undefined),
		) ?? -1;
	const items: readonly Row[] = groups
		? [...loaded].sort((a, b) => rank(a) - rank(b))
		: loaded;
	// Every index below is one a loop, the window or `treeMove` hands out over
	// the list it reads, so it is in range: the index casts are what
	// `noUncheckedIndexedAccess` cannot see.
	// A sheet is a tree once any of its list items declares `children`.
	const tree = !painted && items.some((item) => childrenOf(item) !== undefined);
	// The rows that came on their own once the list was drawn fade in as they
	// mount; what it held when first drawn is not new.
	const arrived = useArrivals(painted ? [] : items.map(keyOf), !painted);
	// A painted row's key is its place, the painted rows sharing one item.
	// Only a painted row takes its place as a prop (it varies the filler): a
	// loaded row's place moves when a row lands above it, which would render
	// every row below.
	const paintedAt = (index: number) => (painted ? index : undefined);
	const keyAt = (index: number) =>
		painted ? `waiting-${index}` : keyOf(items[index] as Row);
	// A tree's rows are the visible ones: each item, then its open children.
	const visible = tree
		? treeRows(items, { key: keyOf, children: childrenOf }, folded)
		: undefined;
	// The sheet's entries: its rows, and with groups a band before the first
	// row of each group (and every empty group's, after the last); a tree's
	// child stands with its parent.
	const entries = sheetEntries(
		visible
			? visible.map((each) => ({
					key: each.key,
					depth: each.depth,
					group: each.depth === 0 ? rank(each.item) : -1,
				}))
			: items.map((item, index) => ({
					key: keyAt(index),
					depth: 0,
					group: rank(item),
				})),
		groups,
		props.counted === true,
	);
	// The next page loads as the window reaches the sheet's last entry.
	const reach = useReach(entries.length);
	// One row by its kind: a file row alone has a shape of its own; a tree's rows take their place in it.
	const rowOf = (
		item: Row,
		key: string,
		index: number | undefined,
		place?: Omit<
			ComponentProps<typeof RowItem>,
			"item" | "id" | "painted" | "arrived"
		>,
	) => {
		if ("path" in item)
			return (
				<FileRowItem key={key} item={item} index={index} painted={painted} />
			);
		return (
			<RowItem
				key={key}
				id={key}
				{...place}
				item={item}
				index={index}
				painted={painted}
				arrived={arrived.has(key)}
			/>
		);
	};
	// The sheet is the rows' box: they stand in it directly, so its hairline
	// falls once between them, a tree's too (its rails run unbroken); facts draw
	// none. The rows read the route the Section read once, through `ListedRoute`.
	// The entries are built by their index, so a long Window builds only the
	// ones it mounts; the others draw all of them.
	const frame = (
		rowAt: (index: number) => ReactElement,
		nav?: TreeNav,
		keep?: number,
	) => {
		const entryAt = (at: number) => {
			const entry = entries[at] as SheetEntry;
			if (entry.kind === "row") return rowAt(entry.index);
			const group = groups?.[entry.index] as Band;
			return (
				<BandHead
					key={entry.key}
					label={group.label}
					count={entry.count}
					act={group.act}
				/>
			);
		};
		const rows = () =>
			Array.from({ length: entries.length }, (_, at) => entryAt(at));
		if (props.tail) return <ListedRoute value={at}>{rows()}</ListedRoute>;
		// The more row ends the box, so the rows it paints stand at the box's
		// rhythm; a tree's box holds treeitems alone, so its row follows it.
		const more =
			props.more && !painted ? (
				<MoreRow
					read={props.more}
					empty={items.length === 0}
					inset
					scrolled={reach.reached}
					paint={() => (
						<Rows
							{...props}
							more={undefined}
							tail={!nav}
							// The next page paints in the shape of the rows that stand.
							paint={props.paint ?? items[0]}
							drawn={{
								painted: true,
								phase: "waiting",
								value: placeholderData(),
							}}
						/>
					)}
				/>
			) : null;
		// A tree's rows window too, the one holding the tab stop kept mounted.
		const shown = (
			<Window
				count={entries.length}
				keyOf={(at) => (entries[at] as SheetEntry).key}
				row={entryAt}
				box={nav ? treeBox : box}
				keep={
					keep === undefined
						? undefined
						: entries.findIndex(
								(entry) => entry.kind === "row" && entry.index === keep,
							)
				}
				onRange={(indices) => reach.onLast(indices.at(-1) ?? -1)}
			/>
		);
		const stand: ReactNode = nav ? (
			<div
				ref={treeBox}
				role="tree"
				onKeyDown={nav.onKeyDown}
				onFocus={nav.onFocus}
				className={cn(GROUP_TREE, TREE_DIVIDER)}
			>
				{shown}
			</div>
		) : (
			shown
		);
		return (
			<ListedRoute value={at}>
				{stand}
				{more}
			</ListedRoute>
		);
	};
	if (!visible) {
		return frame((index) =>
			rowOf(
				items[index] as Row,
				keyAt(index),
				paintedAt(index),
				props.movable && {
					movable: props.movable,
					edge: edgeOf(index, items.length),
				},
			),
		);
	}
	// Each row of the tree reads its depth, fold and tab stop from its own
	// provider; the keys and focus its `treeitem` stops send up move the stop and
	// fold the branches (the WAI-ARIA tree pattern, `treeMove`).
	const stop = treeStop(visible, active);
	// A row carries its key (`data-key`), so a key finds the row's place over
	// `visible` when it is pressed, whichever rows the window mounts.
	const indexOf = (target: HTMLElement) => {
		const key = target.closest<HTMLElement>('[role="treeitem"]')?.dataset.key;
		return visible.findIndex((each) => each.key === key);
	};
	const nav: TreeNav = {
		onKeyDown: (event) => {
			// A key's target is the focused element, always an HTML one here.
			const target = event.target as HTMLElement;
			if (target.getAttribute("role") !== "treeitem") return;
			const move = treeMove(visible, indexOf(target), event.key);
			if (!move) return;
			event.preventDefault();
			if ("focus" in move) {
				// The tab stop moves first: the window keeps its row, mounted by
				// this render if it was not, and the focus follows it there.
				setActive(visible[move.focus]?.key);
				setWanted({ key: visible[move.focus]?.key as string });
			} else setFolded((keys) => folding(keys, move.fold, move.open));
		},
		onFocus: (event) => {
			// A focus event's target is the element that took focus, an HTML one here.
			const target = event.target as HTMLElement;
			if (!target.closest('[role="treeitem"]')) return;
			setActive(visible[indexOf(target)]?.key);
		},
	};
	return frame(
		(index) => {
			const each = visible[index] as (typeof visible)[number];
			return rowOf(each.item, each.key, undefined, {
				fold,
				depth: each.depth,
				under: visible[index + 1]?.depth ?? 0,
				size: each.size,
				place: each.place,
				open: each.branch ? each.open : undefined,
				tabbable: index === stop,
			});
		},
		nav,
		stop,
	);
}
