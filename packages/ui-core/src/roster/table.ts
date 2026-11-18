import type { ChipFamily } from "../tokens.ts";
import type {
	ChangeKind,
	ChipMark,
	Drop,
	IconAct,
	IconLinkAct,
	MenuEntry,
	Picked,
	Route,
	StatusMark,
} from "./descriptors.ts";
import type { RosterEntry } from "./shared.ts";
import { ANSWER, build, matrix, PRESS, ROW_WASH } from "./shared.ts";

// The table: docs/architecture/ui-core/components.md, "Table".
export const tableEntry: RosterEntry = {
	// Web-only props and regions: docs/architecture/ui-core.md, "Limits".
	props: [
		"columns",
		"items",
		"row",
		"label",
		"selected",
		"current",
		"choose",
		"drag",
		"reorder",
		"onOpen",
		"onEdit",
	],
	draws: [
		"CHECKBOX",
		"CHECKBOX_MARK",
		"CHANGE_MARK",
		"CHIP.family.teal",
		"CHIP.trailing.none",
		"ROW_CURRENT_BAR",
		"CHIP_LABEL.family.teal",
		"FIELD.state.rest",
		"FIGURES",
		"ICON.fit.meta",
		"LOCK_GLYPH",
		"SPINNER",
		"SPINNER_ARC",
		"SPINNER_TRACK",
		"STATUS",
		"STATUS_DOT",
		"STATUS_LABEL",
		"STATUS_SPINNER",
		"ROW_WARNING",
		"TABLE",
		"TABLE_CELL",
		"TABLE_CHANGE",
		"TABLE_NAME",
		"TABLE_CHANGE_VALUE.kind.added",
		"TABLE_CHANGE_VALUE.kind.after",
		"TABLE_CHANGE_VALUE.kind.before",
		"TABLE_CHANGE_VALUE.kind.removed",
		"CARD",
		"TABLE_FROZEN",
		"TABLE_FROZEN_CELL",
		"TABLE_HEAD",
		"TABLE_HEAD_LABEL",
		"TABLE_ROW",
		"ROW_ACTS",
		"DROP_LINE",
		"TEXT.role.body",
		"TEXT.role.code",
		"TEXT.role.meta",
		"TEXT_STRONG.role.body",
		"PAINT.kind.box",
		"PAINT.kind.glyphs",
		"SCRAMBLE",
		"PAINT.kind.control",
		"CHEVRON",
		"ICON_BUTTON.fit.body",
		"MENU.lines.popover",
		"MENU_GROUP.place.first",
		"MENU_LABEL.kind.act",
		"POPOVER",
		"LAYER_POPOVER",
		"OPTION_ROW",
	],
	states: [...PRESS, "loading", "empty", "error", "selected", "more"],
	motion: ["answer", "toggle", "wait"],
	owns: {
		roles: ["body", "meta", "code", "caption"],
		colors: [
			"edge",
			"ink-meta",
			"ink-body",
			"ring",
			"chip-teal-soft",
			"chip-teal-ink",
			"toggle-on",
			"on-accent",
			"ok",
			"wash-hover",
			"accent-ink",
			"edge-strong",
			"surface",
			"danger",
			"warn",
			"chip-amber",
			"wash-press",
			"wash-selected",
			"wash-selected-hover",
			"edge-hover",
			"toggle-on-hover",
			"skeleton",
			"ok-soft",
			"danger-soft",
			"fill-disabled",
			"ink-disabled",
			"accent",
			"raised",
			"edge-raised",
		],
		radii: ["full", "chip", "control", "popover", "row"],
		spacing: ["pad", "gap", "page"],
		// A column stands at the measure its descriptor names.
		sizes: [
			"measure",
			"target",
			"icon-meta",
			"row",
			"icon-control",
			"dot",
			"icon",
			"line-body",
			"hairline",
			"popover",
		],
		elevation: ["float"],
	},
};

// A column's width: the short measure of a label or a quarter of the table's
// width. A column with none shares what the others leave, except a column of
// figures (`number`, `age`), which stands at half the short measure.
export type ColumnWidth = "measure-short" | "1/4";

interface ColumnBase {
	key: string;
	// The column's head (a short phrase; truncates).
	label: string;
	width?: ColumnWidth;
	sortable?: boolean;
	// The column's cells wrap onto further lines and hyphenate, as a long
	// value reads whole, instead of truncating. The row grows to its tallest
	// cell. Below `tablet` a wrapping column's cell is the row's `line`, never
	// a fact (a cut badge would hide the sentence), several such cells joined
	// by "; " as the changes' are, and a painted row paints one filler line. A
	// column that does not wrap gives the row a fact until a value is too long
	// for one (`TOUCH_FACT_FITS`): that value is the row's line too.
	wrap?: boolean;
	// The column is read only in this table: its cells never edit (its `edit` is
	// ignored) and its head draws a lock glyph.
	locked?: boolean;
	// The column starts out of the grid: the viewer shows it from the table's
	// columns menu, and what the viewer chose is kept for the next visit. The
	// leading column, the row's name, is never hidden.
	hidden?: boolean;
}

// A column by the kind of value its cells hold, each kind with the edits
// that fit it: `text`, `source` (mono) and `number` are typed; `chip` (a value
// drawn on the column's family), `status`, `age` (an ISO moment) and `change` (a
// value before and after, sorted by its after) are read only. Its
// `cell` reads its value from an item. Bare (`T` never), it is a column over
// any item, its cell taking none.
export type TableColumn<T = never> = (
	| (ColumnBase & { kind?: "text" | "source" | "number"; edit?: "input" })
	| (ColumnBase & { kind: "chip"; family: ChipFamily; edit?: never })
	| (ColumnBase & { kind: "status" | "age" | "change"; edit?: never })
) & { cell: (item: T) => TableCell };

// A `change` cell's value: what it was and what it is. A null `before` is a
// value added, a null `after` a value removed.
export interface ChangeCell {
	// Each value is a short phrase; it truncates.
	before: string | null;
	after: string | null;
}

// A cell's value, by its column's kind: a string (`text`, `source`, `chip`,
// `age`), a number, a status mark, a change or, in a `chip` column, a chip
// mark naming its own family; null is an empty cell.
// A string cell is a short phrase: it truncates (a `chip` cell a word,
// truncating past the short measure, 20 characters). A `chip` cell given as a
// string draws on the column's `family`; one given as `{ label, family }`
// draws on its own, as a column of kinds takes each kind's hue.
export type TableCell =
	| string
	| number
	| StatusMark
	| ChipMark
	| ChangeCell
	| null;

// What a table says of a row beside its tick: `blocked` the reason a row
// cannot be ticked and `moved` the reason a rule moved its tick; each reason is
// a short phrase under the row's leading cell, truncating. What the rows are
// called in the count is the chosen bar's (`ChosenCount`'s `noun`).
export interface ChoiceRegions<T> {
	blocked?: (item: T) => string | undefined;
	moved?: (item: T) => string | undefined;
}

// The rows a table chooses, controlled: `chosen` the ids ticked and
// `onChange` hearing the set the viewer's tick or the head tick makes, which
// the consumer applies its rule to and hands back through `chosen`.
export interface TableChoice<T> extends ChoiceRegions<T> {
	chosen: readonly string[];
	onChange: (ids: string[]) => void;
}

// The rows a table chooses over a paginated read, controlled: `picked` is what
// a mutation takes whole, and `onPick` hears the pick the viewer's tick makes.
// A tick on a row changes the ids (or, once the head tick chose the query, the
// ids unticked); the head tick over a read that pages chooses the query, every
// row it matches, loaded or not. A changed query ends a pick of the old one.
export interface TablePick<T, Q = unknown> extends ChoiceRegions<T> {
	picked: Picked<Q>;
	onPick: (picked: Picked<Q>) => void;
}

// What one committed edit hands back: the column's new value, null for a
// number cleared.
export type CellValue = string | number | null;

// A table row's own regions, each read from the item: its id, unique in the
// table; `href`, its leading cell's link, so it opens in a new tab; `editable`,
// whether its cells edit in place (false: they draw the plain value, no mark
// and no act, a row that is simply not editable); `locked`, the columns whose
// cells it draws read only with a lock, the hold of an open change set;
// `warning`, what is wrong with
// the row, drawn after its leading cell's name (a warn glyph and the
// sentence; the phone's row carries it as a `ListRow` warning); and `change`,
// where the row stands in a change set, its mark ahead of the leading cell's
// name (the phone's row carries it as a `ListRow` change).
export interface TableRowRegions<T, Q = unknown> {
	id: (item: T) => string;
	href?: (item: T) => Route | undefined;
	editable?: (item: T) => boolean;
	locked?: (item: T) => readonly string[] | undefined;
	// The warning's label (a short phrase; truncates).
	warning?: (item: T) => string | undefined;
	change?: (item: T) => ChangeKind | undefined;
	// The row's one act, at its end: an icon act (its label the accessible name
	// and the tooltip) or a link to a route, carrying its own wiring (`confirm`,
	// `done`, `to`). Shift+Enter on the active row runs it, and Enter does where
	// the row opens nothing.
	act?: (item: T) => IconAct | IconLinkAct | undefined;
	// The row's other acts, in a menu after its act (the Context Menu key opens
	// it). A table that reorders or drags adds its keyboard alternatives to it.
	more?: (item: T) => readonly MenuEntry[] | undefined;
	// The drop this row is, as a `RowItem`'s `drop`.
	drop?: (item: T) => Drop<Q> | undefined;
}

// A collection's rows as a drag's source: the kind of what a row carries. A
// row of a table that is ticked drags the whole pick, an unticked one itself.
export interface DragSource {
	kind: string;
}

// A data table's row: a hairline under it, washed under the pointer and
// pressed, and the open record selected (a step darker under the pointer).
// The header row is the rest row.
export const TABLE_ROW = matrix({
	base: `border-b border-edge ${ANSWER}`,
	variants: {
		state: ROW_WASH,
	},
	defaultVariants: { state: "rest" },
});

// A sortable column's header: a cell-wide act at the row's height behind a
// transparent side border, so its label stands on the values' x.
export const TABLE_HEAD = matrix({
	base: `gap-gap py-gap border-x border-transparent px-pad ${ANSWER}`,
	variants: {
		state: {
			rest: ROW_WASH.rest,
			highlighted: ROW_WASH.highlighted,
			pressed: ROW_WASH.pressed,
		},
	},
	defaultVariants: { state: "rest" },
});

// A header's label at meta 500, never bold, in the meta ink, the body ink on
// the column the table sorts by. Its sort glyph takes the label's ink.
export const TABLE_HEAD_LABEL = matrix({
	base: "text-meta leading-meta font-medium",
	variants: {
		sort: {
			none: "text-ink-meta",
			sorted: "text-ink-body",
		},
	},
	defaultVariants: { sort: "none" },
});

// The frozen cells' content: the row's wash repeated over the frozen cell's
// own surface (`TABLE_FROZEN`). The frozen cell that borders the cells which
// scroll under it draws a hairline on that side: the end of the leading cell
// (its transparent border takes the edge ink) and the start of the acts cell.
export const TABLE_FROZEN_CELL = matrix({
	base: ANSWER,
	variants: {
		state: ROW_WASH,
		edge: {
			none: "",
			end: "border-e-edge",
			start: "border-s border-edge",
		},
	},
	defaultVariants: { state: "rest", edge: "none" },
});

// A change cell's value at the body role: the old value in the meta ink and
// the new in the body ink, neither tinted; an added value on `ok-soft` and a
// removed one on `danger-soft`, struck, each a soft pill.
export const TABLE_CHANGE_VALUE = matrix({
	base: "text-body leading-body font-normal",
	variants: {
		kind: {
			before: "text-ink-meta",
			after: "text-ink-body",
			added: "rounded-chip bg-ok-soft px-gap text-ink-body",
			removed: "rounded-chip bg-danger-soft px-gap text-ink-body line-through",
		},
	},
	defaultVariants: { kind: "after" },
});

export const tableRow = build(TABLE_ROW);
export const tableHead = build(TABLE_HEAD);
export const tableHeadLabel = build(TABLE_HEAD_LABEL);
export const tableFrozenCell = build(TABLE_FROZEN_CELL);
export const tableChangeValue = build(TABLE_CHANGE_VALUE);

// Table: the grid on a card (`CARD`), its rows on hairlines, the last on the
// card's edge; its columns read at body. A cell is
// the row's height behind a transparent side border, so the `Input` that
// edits it in place (the field's bar fit) puts its text where the cell's
// stands. The frozen leading column's cell stands on the surface.
// A change cell's values and the arrow between them stand an inside gap
// apart, the arrow in the meta ink (the values' inks are `TABLE_CHANGE_VALUE`).
export const TABLE = "text-body";
export const TABLE_CELL = "py-gap border-x border-transparent px-pad";
export const TABLE_FROZEN = "bg-surface";
export const TABLE_CHANGE = "gap-gap text-ink-meta";
// A leading cell's name and its warning a gap apart.
export const TABLE_NAME = "gap-gap";

export type TableRowState = keyof (typeof TABLE_ROW)["variants"]["state"];
