import type {
	Act,
	ChangeKind,
	ChipMark,
	Dragged,
	Drop,
	Fact,
	FieldControl,
	IconAct,
	IconLinkAct,
	MenuEntry,
	OptionPick,
	Route,
	RowLeading,
	RowTitle,
	RowTrailing,
	Run,
	Runs,
	StatusMark,
} from "./descriptors.ts";
import type { RosterEntry } from "./shared.ts";
import { ANSWER, build, CARD, matrix, ROWS } from "./shared.ts";

// The fold toggle is the title line; a blocked act's reason stands on
// its own line under the head row. Its count is the loaded rows' (with
// `items`), never drawn while the body waits; a Section with `children`,
// whose every row has a label (facts), or given one row alone, not in an
// array (a value), draws no count, a count being a list's, whatever its
// `read` holds.
// `description` paints where it will stand while its selection waits; loaded,
// `""` draws no line, as an undefined one, and so does one whose read
// ended, the read's holder saying why once. Titled, the head stands over the
// body; a Section with `items` and no `title` draws the sheet alone.
// With `children` the body is its parts a fields gap apart, each a card of
// its own (a Form, a Table, a Stats, a BarChart, or a `Card` around anything else); the Section
// draws no card and reads nothing of its children. The `empty` of its
// `read` stands in its body's place on a card of its own; a Section with no
// `read` takes no `empty`. The title is the heading size, folded or not,
// and no Section stands in a Section.
// With `items`, constants or a selection, the body is the sheet of its
// rows on the card (`GROUP`), the card's hairline once between them; a row
// is a row item or a file. While the selection's read waits
// it paints as many rows as it last loaded, `PAINT_ROWS` when it has not, a
// title over a facts line: inert, with no
// link, a tree drawn flat. It is a frame of its items: its failed, missing
// and empty forms are its own, in the sheet's place with the generic
// sentences (Retry where it fails), whatever stands above it; it draws the
// stale and paused line above its rows when it holds its read. A frame
// above that holds the same read unmounts it when the read fails and alone
// draws the failure. A row with `children` makes it a tree: the rows
// abut, each level one step in, and the Section owns which branches are
// folded (open by default), handing every row its depth and fold.
// `groups` draws a band (`LIST_BAND`, a `band` tall) over the rows of each
// group, in the groups' order: the label at the body role at 500, the count
// of its rows (none when empty, in the meta ink) and its icon act at the
// end, closed by a rule in the body ink and with none above it. Rows with no
// group stand before the first band; in a tree the group is the root rows'.
// A painted sheet draws none. Over a pages read it ends in its more row
// (`more`): "Show more" while a next page remains, pressed by the viewer;
// `PAINT_ROWS` painted rows while that page loads; "Couldn't load more" with
// Retry when it failed. An empty first page with more is not empty: the next
// page is fetched at once. The frame is not busy for a next page and draws
// no count while more remains. The Table ends the same way.
// A row is one box on the sheet whatever it holds: a leading slot (the
// `change` mark in a lane one icon wide, glyph only, the kind's word its
// name, ahead of the `leading` mark; a set's untouched rows are `unchanged`,
// so the titles line up), a text group (`ROW_TEXT`: the title over its
// facts line, which the row's marks lead: the status's dot and word, a
// warning, a lock, a Chip, the boolean marks (the required ring, a flag),
// each its glyph and its word, then the words, wrapping whole; the status,
// warning, Chip, marks and words are the row's `facts`, in the order given,
// the lock its own prop; a sentence is no fact but the row's `line`, text
// under the title and the badges that wraps whole) and an end group
// (`ROW_END`), in one order: the trailing value (cut to the room the rest
// leave), a `switch`, a `pick`, the `act` (an icon act, its label the
// accessible name and the tooltip; the row's other acts are its `more`),
// the copy act, the `more` act and a tree's fold, centred on the row (on
// touch a two-line row without a label, an entry or `steps` stands it on
// the title's line, the facts line under both at the row's width); an age,
// a count and a control stand whole, a control taking the text group's
// floor. A
// row with nothing at its end draws none. A `label` puts the row in the sheet's two columns
// (`DEFINITION_BOX`): the label at the body role in the meta ink (a
// `{ code }` label in the code role) in a column as wide as the widest label of the Pane, the
// line in the second; on touch the line stands under the label. A row
// without one starts its text group at the row's start. Either way the facts'
// words follow the title on its line, cut at the end of the line, and stand
// under it (with a mark, `entry`, `steps` or `wrap`, on touch, or below the
// row's one-line width, `rowOneLine`, a container query of the row and
// never a measure of its content). The title is words (truncated unless `wrap`), a `{ code }` (cut in its
// middle; with `copy` the mono with a copy act), `{ absent }` (meta ink) or a
// status (`{ tone, label? }`, its mark and word at the title's start, plain). A `selected` row is the
// open record, washed as one at its `href` is; the open row carries the
// current bar (`ROW_CURRENT_BAR`), drawn over its start (a tree's child's
// at its rail, its washes with it) with no room, so
// every row's text and hairline stand at the sheet's inset as a band's
// do. A row that opens (`href` or `onOpen`) draws no
// chevron: the wash and the pointer say it. An `entry` (an Input at the bar
// fit and its labelled Button) stands under the title in the facts line's
// place, its error under it; the Button's label is never cut: where the
// Input at the short measure and the whole Button do not fit one line, the
// Button stands under the Input at the line's end. A `leading` of `check` is the row's tick, a
// checkbox named by the title; its `blocked` reason draws it disabled and
// leads the facts' words. A `leading` of `mark` is a type's mark (`ROW_MARK`,
// in the family's hue); its `label` names it (accessible name and tooltip),
// else it is decorative. A `dim` row stands off a highlighted path; `steps`
// stand in the facts line's place while the row's act pends; `progress` is a
// task's bar (`ROW_PROGRESS`: the meter's track and fill) the
// last line of the text column, a badge gap under the facts; `wrap` is a
// title read whole: words wrap, a `{ code }` run in them wraps inside its
// box, and a `{ code, copy: true }` stands whole on as many lines as it
// needs, breaking anywhere (a fingerprint has no spaces). In a tree a row
// reads its depth and fold from the Section: a rail per level (`TREE_RAIL`,
// one `stack` step), and a branch's fold the bare chevron of the Section's
// own fold toggle, in the meta ink, turning a quarter, never washed open. One lock mark:
// the meta glyph and its reason, a link to what holds the fact with an
// `href`, inert without one; a locked
// row takes no act or open. A one-word `{ code }` of more than eight
// characters too long for its room cuts in its middle (`valueCut`), unless
// the row wraps.
// `title`, `facts`, `line`, a `switch`'s `checked` and a `pick`'s `options` and
// `value` are data: a selection paints in its place, the row inert, while
// its read waits. The row is the frame of the selections it draws: one that
// failed, with no frame above holding it, makes the failed form (the label
// stays; the end shows the alert and the retry icon; the facts line reads
// `readFailed`, and pressing the row retries); a read a frame above holds
// is that frame's to say.
// A file row is one line, the path cut as text by the component to the room
// its chip leaves, each count in its own lane, the change mark in a lane
// before the glyph. At most one Chip, between the path and the counts.
// The marks a row draws from its data are the Section's states: a status
// (its tone's dot beside its word, a spinner in the dot's place while
// `running`, a state chip when it carries its own `label`), a chip, an avatar,
// a glyph, a count and a `more` menu (a popover on the desktop, a sheet on
// touch). Other frames draw the same marks from their own data.
// Every act a Section draws (its head act and more, a band's act, a row's act
// and more, an empty form's act) carries its `confirm`, `done`, `to` and
// `sheet` as a Button's act does; a row's act that opens a `sheet` draws the
// sheet beside the row.
// A row with a `drag` is dragged by a press that moves (a finger after a hold
// of `DRAG_HOLD`) and one with a `drop` takes what is released on it
// (`DROP_ON`). `reorder` makes the sheet's rows movable: a drag lands the row
// at the line (`DROP_LINE`) between two rows and the sheet scrolls near its
// edges; Alt with Up or Down moves the focused row and its more menu holds
// Move up, down, to top and to bottom. A flat sheet reorders; a tree or a
// grouped one does not.
export const sectionEntry: RosterEntry = {
	// `reorder` is the web's alone.
	props: [
		"title",
		"description",
		"folded",
		"onToggle",
		"act",
		"more",
		"items",
		"groups",
		"reorder",
		"read",
		"empty",
		"children",
	],
	draws: [
		"SECTION",
		"DROP_ON",
		"DROP_LINE",
		"SECTION_HEAD",
		"PAGE_TITLE_FLOOR",
		"SECTION_HEAD_ROW",
		"SECTION_ACTS",
		"SECTION_BODY",
		"SECTION_TITLE",
		"SECTION_LABEL",
		"SECTION_TOGGLE",
		"TEXT.role.heading",
		"TEXT.role.meta",
		"TEXT.role.body",
		"TEXT_STRONG.role.body",
		"EMPTY_COLUMN",
		"EMPTY_TEXT",
		"EMPTY_LINE",
		"EMPTY_SENTENCE",
		"CARD_PART",
		"EMPTY_MARK",
		"ICON.fit.control",
		"ICON.fit.body",
		"COUNT",
		"COUNT_LABEL",
		"BUTTON.act.secondary",
		"BUTTON.act.destructive",
		"BUTTON_LABEL.act.secondary",
		"BUTTON_LABEL.act.destructive",
		"PAINT.kind.glyphs",
		"SCRAMBLE",
		"PAINT.kind.control",
		"TEXT.role.caption",
		"LINE_BOX.role.meta",
		"CHEVRON",
		"GROUP",
		"LIST_BAND",
		"BLOCK_IN",
		"CODE_NAME",
		"ROW.state.rest",
		"ROW.state.highlighted",
		"ROW.state.pressed",
		"ROW.state.selected",
		"ROW.state.selected-hover",
		"ROW_TITLE",
		"ROW_INLINE",
		"ROW_MARK",
		"ROW_CURRENT_BAR",
		"ROW_PROGRESS",
		"METER_TRACK",
		"METER_FILL",
		"ROW_STEPS",
		"ROW_STEP",
		"TREE_RAIL",
		"TREE_BLEED",
		"ROW_LEADING",
		"ROW_LEADING_STATUS",
		"ROW_TEXT",
		"ROW_END",
		"ROW_TEXT_FLOOR",
		"ROW_META_LINE",
		"ROW_TRAILING",
		"ROW_MARKS",
		"ROW_WARNING",
		"LOCK_GLYPH",
		"ROW_ACTS",
		"CHANGE_MARK",
		"CHECKBOX",
		"CHECKBOX_MARK",
		"ICON",
		"AVATAR",
		"AVATAR_LABEL",
		"STATUS",
		"STATUS_DOT",
		"STATE_CHIP",
		"STATE_CHIP_LABEL",
		"STATUS_SPINNER",
		"STATUS_LABEL",
		"SPINNER",
		"SPINNER_TRACK",
		"SPINNER_ARC",
		"BUSY_GLYPHS",
		"MENU",
		"MENU_GROUP",
		"MENU_LABEL",
		"CHIP",
		"CHIP_DOT",
		"CHIP_LABEL",
		"FIELD.trailing.none",
		"FIELD.state.rest",
		"FIELD.state.error",
		"FIELD_VALUE.kind.text",
		"FIELD_PLACEHOLDER",
		"ROW_ENTRY",
		"FIELD_ERROR_LINE",
		"LINE_BOX.role.body",
		"PAINT.kind.box",
		"LINE_IN",
		"DEFINITION_BOX",
		"DEFINITION_LINE",
		"DEFINITION_UNDER",
		"DEFINITION_LABEL",
		"DEFINITION_NAME",
		"DEFINITION_VALUE",
		"DEFINITION_ABSENT",
		"ROW_RETRY",
		"TEXT.role.code",
		"LINK.fit.inline",
		"FILE_COUNT",
		"FILE_COUNT_YIELD",
		"FILE_COUNTS",
		"FILE_PATH",
		"FILE_PATH_PART",
		"SWAP_IN",
		"SWAP_OUT",
	],
	states: [
		"rest",
		"hover",
		"focus",
		"active",
		"disabled",
		"loading",
		"empty",
		"error",
		"busy",
		"stale",
		"paused",
		"more",
		"selected",
	],
	motion: ["answer", "give", "toggle", "wait", "block", "line", "value"],
	owns: {
		roles: ["heading", "meta", "body", "caption", "code"],
		colors: [
			"accent",
			"ink-body",
			"ink-meta",
			"edge",
			"skeleton",
			"wash-hover",
			"wash-press",
			"ring",
			"danger",
			"fill-neutral",
			"band",
			"ink-mark",
			"surface",
			"ink-disabled",
			"ink-error",
			"edge-error",
			"wash-selected",
			"wash-selected-hover",
			"accent-ink",
			"ok",
			"warn",
			"chip-amber",
			"avatar-",
			"chip-",
			"fill-disabled",
			"edge-strong",
			"toggle-on",
			"toggle-on-hover",
			"on-accent",
		],
		radii: ["row", "control", "chip", "card", "full"],
		spacing: ["gap", "stack", "pad"],
		sizes: [
			"icon-meta",
			"icon",
			"target",
			"empty",
			"control",
			"icon-control",
			"line-body",
			"dot",
			"measure-short",
			"row",
			"figures",
			"measure",
			"hairline",
		],
	},
};

// A list row's entry: an input and the act that sends it, standing under the
// title in the facts' place (a URL and its Import), the act's label whole
// (on a line too narrow for both it stands under the input). `label` names the
// input and `error` is the line under it; once the act settles the row is
// given its result as `facts` in place of the entry.
export interface RowEntry {
	// The input's accessible name (a short phrase; read aloud, never drawn).
	label: string;
	field: FieldControl<string>;
	// The hint drawn while the input is empty (a short phrase; truncates).
	placeholder?: string;
	act: Act;
	// The line under the input (a sentence; wraps).
	error?: string;
}

// A row's lock: why the row cannot change here, a request that holds it ("Held
// by CR-12, Ana") or a role that cannot. The lock is a glyph named by the
// reason; with `href` it is a link to what holds the fact, without one inert.
export interface Lock {
	reason: string;
	href?: Route;
}

/** A row of a Section's sheet: a row item or a file; `"path" in row` tells the last. */
export type Row<V extends string | null = string, Q = unknown> =
	| RowItem<V, Q>
	| FileItem;

/** One row of a Section's sheet, a fact or a thing alike: it draws whichever slots it fills, on one box. A row with a `label` stands in the sheet's two columns (the label in the first, as wide as the widest of the Pane); a row without one starts its text group at the row's start. */
export interface RowItem<V extends string | null = string, Q = unknown> {
	/** The row's React key, unique across the whole sheet, a tree's children included; the label's text, then the title's, when none is given. */
	key?: string;
	/** Where the row stands in a change set: its mark at the row's start, ahead of the leading mark (a set's untouched rows are `unchanged`, so the titles line up). */
	change?: ChangeKind;
	/** What the row is, in the aligned column ahead of its text (a short phrase; wraps to the room its title leaves), at the body role in the meta ink; `{ code }` is a machine name (a key, a path) in the code role, in the meta ink too. The column is as wide as the widest label of every list in the Pane. On touch a value stands under its label, and a label with no title, facts or entry (a switch's, an act's) stands on one line with the end group. */
	label?: string | { code: string };
	/** The row's leading mark: a glyph, a status, an avatar, a type's mark (its `label` names it) or a tick that chooses the row. */
	leading?: RowLeading;
	/** What the row names (a short phrase; truncates at its end, wraps whole while `wrap`, whether the row has a `label` or not); runs of words and `{ code }` draw the code bare in the mono, as a machine name in a row stands (voice 7); the platform widens it to a `Datum`. */
	title?: RowTitle;
	/** What the row says of itself, in the order given: its facts (`Fact`), each one fact and each drawn as one badge, a box that never breaks inside, whole badges wrapping to the next line with no separator between them (voice 19). A fact is short: a badge longer than its line is cut with an ellipsis inside its box, which touch cannot read, so a sentence is the row's `line`, never a fact. The badges follow the title on its line while the row is one line, and stand under it where the row is two (on touch, below the row's one-line width, or beside a mark). The words are a string (a middle dot inside it is text, not a separator) or a `{ code }` run in the mono; a `{ code }` fact alone is no badge but the row's value, the mono cut in its middle (`valueCut`) in a one-line row and whole in two. A status (`StatusMark`: its tone's mark and word; the first leads the line and the row's lock follows it, a further one is a badge of its own, as a table's several status columns on touch), what is wrong (`{ warning }`: the warning mark and its short phrase), a chip (`ChipMark`, a data value: its family's dot, none for neutral, and its word) and a boolean mark (`RowMark`: the required ring, a flag glyph, each its glyph and its `label`; with `words: false` the glyph stands alone in the end group, before the trailing value, its `label` the accessible name and the tooltip) are the marks, each its own badge with the mark inside, in the order given; the row's `lock` is a badge right after the status; a row with a mark stands its facts under its title at every width. A ring that does not hold draws nothing. The platform widens each fact, and the list, to a `Datum`. */
	facts?: readonly Fact[];
	/** The one sentence under the title: a remedy, a schedule, an error, what a setting does. It is text, never a badge: the meta ink at the meta role, runs (`Runs`, so it holds a `{ code }` or a `{ strong }` run) wrapping whole at every width, a code run moving whole to the next line. It stands after the facts' badges, and under the title where the row has no facts or they follow the title on its line, so a row with a line is at least two lines. Empty draws nothing. A fact is a short thing a row says (a word, a count, an age); a sentence goes here, never in `facts`, where it is one badge cut with an ellipsis at a narrow width, which touch cannot read. The platform widens it to a `Datum`; the painted form is a sentence's filler. */
	line?: Run | Runs;
	/** A value in the row's end group (an age, a count, a word), cut with an ellipsis to the room the end's controls and acts leave. */
	trailing?: RowTrailing;
	/** What the row holds or why it cannot change here, a lock mark among the marks after the status and the warning (a short phrase); with an `href` the lock links to what holds the fact. A locked row takes no act or open, and its switch stands disabled (greyed, and read as disabled by assistive tech). It stays a prop, not a fact: it changes what the row does. */
	lock?: string | Lock;
	/** An input and its act under the title, in the facts' place; give `facts` back once the act settles. */
	entry?: RowEntry;
	/** The steps of the work the row's act pends on, one line each in the facts' place. */
	steps?: readonly StatusMark[];
	/** How far a running task has got, as a bar along the row's foot, in the padding under its text, so the row's height is the same with it and without: `value` of `max` (a `max` of 0 or under draws none; a `value` past it is full). The bar fills in the meta ink and turns the good tone when it reaches `max`; it is named by the title. */
	progress?: { value: number; max: number };
	/** The row stands off a highlighted path: its title in the meta ink, still a hit and focusable. */
	dim?: boolean;
	/** The title is a passage read whole: it wraps to every line instead of truncating. */
	wrap?: boolean;
	/** A setting that changes the row's fact in place, named by the label; the platform widens `checked` to a `Datum`. */
	switch?: { checked: boolean; onChange: (checked: boolean) => unknown };
	/** A pick that chooses in place and applies at once, in the end group; the platform widens `options` and `value` to a `Datum`. */
	pick?: Omit<OptionPick<V>, "act" | "several">;
	/** The row's one act at its end, ahead of the more act, or a link to a route: an icon act, its label the accessible name and the tooltip; the row's other acts are its `more`. The platform widens it to a `Datum`. */
	act?: IconAct | IconLinkAct;
	/** The row's acts, in a menu under the more act at its end; the platform widens it to a `Datum`. */
	more?: readonly MenuEntry[];
	/** Where the row goes when opened; the row is current at it and at every address below it (`isCurrent`). */
	href?: string;
	/** Whether the row is current, whatever its `href`: `true` for the open record, or a place whose page has opened a record at an address outside its own; `false` for a second row of the open record's address (one listed twice, as a kind's page and again among the stale ones), so the record is current once. Absent, the row is current at its `href`. */
	selected?: boolean;
	/** Opens what the row names. */
	onOpen?: () => void;
	/** What a drag of the row carries to a drop: the kind the drops accept by and the rows (this row's id, or the pick it stands in). A row with one is dragged by a press that moves (a finger after a hold). */
	drag?: Dragged;
	/** The drop this row is: what a drag it accepts does when released on the row. */
	drop?: Drop<Q>;
	/** The row's children, which make the sheet a tree: they draw one level in under it, and its fold act folds them. */
	children?: readonly RowItem<V, Q>[];
	/** Whether the Section's head counts the row, Absent, a top-level row counts and a nested row (a part of its parent) does not. `false`: a top-level row that is no item of the list (an add row, a row that only points elsewhere). `true`: a nested row that is an item in its own right. */
	counted?: boolean;
	/** The key of the Section's `groups` entry the row stands in; a tree's group is its root rows', children following their parent. */
	group?: string;
}

/** A band over a Section's rows: the rows whose `group` is its `key`, under its label, the count of those rows (none where it is the Section's one band and holds every row, the heading's count being the same) and its act. */
export interface Band {
	/** The key the rows' `group` names. */
	key: string;
	/** The band's label (a short phrase; truncates). */
	label: string;
	/** The band's one icon act at its end, or a link to a route. */
	act?: IconAct | IconLinkAct;
}

/** A changed file in a review's sheet. */
export interface FileItem {
	/** The row's React key, unique across the sheet. */
	key: string;
	/** The file's path (the directory gives way first when it is too long, then the name's middle). */
	path: string;
	/** Lines added; zero draws nothing. */
	added: number;
	/** Lines removed; zero draws nothing. */
	removed: number;
	/** Whether the reviewer has seen the file: a tick when seen, a ring when not; absent, the file glyph leads. */
	seen?: boolean;
	/** Where the file stands in a change set: the change mark at the row's start. */
	change?: ChangeKind;
	/** Why the file is listed, a data value's chip between the path and the counts. */
	chip?: ChipMark;
	/** Where the row goes when opened; the row is selected at it. */
	href?: string;
	/** Opens the file. */
	onOpen?: () => void;
}

// A file's path split before its last slash: the directory in the meta
// ink, the name (its slash first) at 500.
export const FILE_PATH_PART = matrix({
	base: "",
	variants: {
		part: {
			directory: "text-ink-meta",
			name: "font-medium text-ink-body",
		},
	},
});

// A count in its lane, four figures wide so the lanes line up down a list:
// the diff's own marks, added in `ok`, removed in `danger`.
export const FILE_COUNT = matrix({
	base: "min-w-figures",
	variants: {
		kind: {
			added: "text-ok",
			removed: "text-danger",
		},
	},
});

export const filePathPart = build(FILE_PATH_PART);
export const fileCount = build(FILE_COUNT);

// A file row: the path at the code role (its parts in `filePathPart`), the
// counts at meta in their lanes (`fileCount`).
export const FILE_PATH = "text-code leading-code font-mono";
export const FILE_COUNTS =
	"gap-gap tabular-nums text-meta leading-meta font-normal";
// The web's counts give way once the path stands at its floor, before the
// chip's label truncates: each lane, a flex item of the row (its block stands
// as `display: contents`), shrinks at a weight (10^5) between the path's (10^7)
// and the chip's (1), from its four figures down to its own text. A lane keeps
// four figures while the row has the room, so the lanes line up down a list.
// (A phone's flex items do not shrink: its lanes keep their width.)
export const FILE_COUNT_YIELD = "basis-figures shrink-100000 min-w-min";

// A section: its head paired to its body; the body's parts, each a card of
// its own, stand a fields gap apart (`SECTION_BODY`).
export const SECTION = "gap-gap";
// A section's head: the head row over a blocked
// act's reason, the title centred on the act, which sets the row's height.
// The fold toggle's wash overhangs its start only, where its chevron stands
// (a web overlay pulls it back).
export const SECTION_HEAD = "gap-gap";
// A section's title: the caption size at 500, uppercase and tracked, in the
// meta ink. The count after it keeps its own caption look.
export const SECTION_LABEL =
	"text-caption leading-caption tracking-label font-medium uppercase text-ink-meta";
export const SECTION_HEAD_ROW = "gap-stack";
// The head's act and its more stand the gap a list row's do (`ROW_ACTS`), so the
// more's wash does not meet the act's border.
export const SECTION_ACTS = "gap-gap";

export const SECTION_BODY = "gap-stack";
export const SECTION_TITLE = "gap-gap";
export const SECTION_TOGGLE = `gap-gap min-h-target px-gap rounded-row ${ANSWER}`;

// A sheet: its rows on a card.
export const GROUP = `${CARD} ${ROWS}`;
