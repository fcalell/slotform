// The public matrix layer: docs/architecture/ui-core/roster.md, "Variants".
import type { ChangeKind } from "./descriptors.ts";
import { BANNER, BANNER_GLYPH, banner, bannerGlyph } from "./roster/banner.ts";
import {
	CHART_BAND,
	CHART_FILL,
	chartBand,
	chartFill,
} from "./roster/bar-chart.ts";
import {
	CANVAS_GROUP,
	CANVAS_NODE,
	CANVAS_NODE_GLYPH,
	CANVAS_NODE_INK,
	CANVAS_NODE_MARK,
	CANVAS_NODE_NAME,
	CANVAS_NODE_TEXT,
	canvasGroup,
	canvasNode,
	canvasNodeGlyph,
	canvasNodeInk,
	canvasNodeMark,
	canvasNodeName,
	canvasNodeText,
} from "./roster/canvas.ts";
import { CODE_TEXT, codeText } from "./roster/code.ts";
import { COLUMNS, columns } from "./roster/columns.ts";
import {
	DIFF_LINE,
	diffLine,
	PROSE_DIFF_RUN,
	proseDiffRun,
} from "./roster/diff.ts";
import { STEP_COUNT_SEGMENT, stepCountSegment } from "./roster/gate.ts";
import {
	OTP_BOX,
	otpBox,
	TEXT_AREA,
	TEXT_AREA_BUDGET,
	textArea,
	textAreaBudget,
} from "./roster/input.ts";
import {
	OPTION_RADIO,
	optionRadio,
	PICKER,
	picker,
	SEGMENT,
	SEGMENT_LABEL,
	segment,
	segmentLabel,
} from "./roster/picker.ts";
import { PROSE_MARKER, proseMarker } from "./roster/prose.ts";
import { RULE_ARROW, ruleArrow } from "./roster/rules.ts";
import {
	FILE_COUNT,
	FILE_PATH_PART,
	fileCount,
	filePathPart,
} from "./roster/section.ts";
import type { ContentTone, Variant } from "./roster/shared.ts";
import {
	ANSWER,
	BUTTON_LABEL,
	build,
	GIVE,
	SUBGRID,
	TEXT,
	text,
	toneOf,
} from "./roster/shared.ts";
import {
	PLACE_ROW,
	PLACE_ROW_GLYPH,
	PLACE_TAB,
	PLACE_TAB_LABEL,
	placeRow,
	placeRowGlyph,
	placeTab,
	placeTabLabel,
} from "./roster/shell.ts";
import {
	STAGE,
	STAGE_MARK,
	STAGE_RAIL,
	stage,
	stageMark,
	stageRail,
} from "./roster/stages.ts";
import {
	SWITCH,
	SWITCH_THUMB,
	switchThumb,
	switchTrack,
} from "./roster/switch.ts";
import {
	TABLE_CHANGE_VALUE,
	TABLE_FROZEN_CELL,
	TABLE_HEAD,
	TABLE_HEAD_LABEL,
	TABLE_ROW,
	tableChangeValue,
	tableFrozenCell,
	tableHead,
	tableHeadLabel,
	tableRow,
} from "./roster/table.ts";
import { MESSAGE, message } from "./roster/thread.ts";
import { TOAST_STATE, toastState } from "./roster/toast.ts";
import type { Tone } from "./tokens.ts";
import {
	AVATAR,
	AVATAR_LABEL,
	type Axes,
	BUTTON,
	CHANGE_MARK,
	CHECK_MARK,
	CHECKBOX,
	CHIP,
	CHIP_DOT,
	FIELD,
	FIELD_VALUE,
	ICON,
	ICON_BUTTON,
	IMAGE,
	IMAGE_PICTURE,
	LINE_BOX,
	LINK,
	type Matrix,
	MENU,
	MENU_GROUP,
	MENU_LABEL,
	METER_FILL,
	PAINT,
	ROW,
	ROW_MARK,
	ROW_STEP,
	ROW_TITLE,
	STATE_CHIP,
	STATUS_DOT,
	TEXT_STRONG,
} from "./variant-tables.ts";

export {
	ACTION_BAR_ALL,
	ACTION_BAR_CHOSEN,
	ACTION_BAR_SELECTION,
	type ActionBarFit,
} from "./roster/action-bar.ts";
export {
	BANNER_MAIN,
	BANNER_ROW,
	banner,
	bannerContentTone,
	bannerGlyph,
	PENDING_FILL,
	PENDING_LEFT,
	PENDING_ROW,
	PENDING_TRACK,
} from "./roster/banner.ts";
export {
	CHART,
	CHART_BAR,
	CHART_BODY,
	CHART_CONTROLS,
	CHART_DOT,
	CHART_GRID,
	CHART_HEAD,
	CHART_KEY,
	CHART_KEY_DOT,
	CHART_KEYS,
	CHART_LEVEL,
	CHART_MAIN,
	CHART_PARTIAL,
	CHART_SELECTED,
	CHART_TICK_LANE,
	CHART_TOTAL,
	chartBand,
	chartFill,
	FILL_Y,
	TRAVEL_Y,
} from "./roster/bar-chart.ts";
export {
	type ButtonAct,
	type ButtonFit,
	buttonContentTone,
	type IconButtonFit,
	LAYER_TOOLTIP,
	TOOLTIP,
	TOOLTIP_CUT,
} from "./roster/button.ts";
export {
	CANVAS_GROUND,
	CANVAS_GROUP_HEAD,
	CANVAS_PORT,
	CANVAS_PORT_HIT,
	CANVAS_ZOOM,
	canvasGroup,
	canvasNode,
	canvasNodeGlyph,
	canvasNodeInk,
	canvasNodeMark,
	canvasNodeName,
	canvasNodeText,
	LIFT,
	PATH_TONE,
} from "./roster/canvas.ts";
export { CARD_BODY } from "./roster/card.ts";
export {
	CODE_ACT,
	CODE_FOLD,
	CODE_HEAD,
	CODE_UNDER_HEAD,
	codeText,
} from "./roster/code.ts";
export { type ColumnsFit, columns } from "./roster/columns.ts";
export {
	DIFF_CODE,
	DIFF_GUTTER,
	DIFF_HANG,
	DIFF_HUNK,
	DIFF_MARK,
	diffLine,
	PROSE_DIFF_BODY,
	PROSE_DIFF_TEXT,
	proseDiffRun,
} from "./roster/diff.ts";
export {
	DOCK,
	DOCK_BAR,
	DOCK_PROGRESS,
	DOCK_TEXT,
	DOCK_TIME,
	DOCK_VOLUME,
} from "./roster/dock.ts";
export {
	FORM_FOOT,
	FORM_FOOT_STUCK,
	FORM_GROUP,
	GROUP_ITEM,
} from "./roster/form.ts";
export { GALLERY, GALLERY_TILE } from "./roster/gallery.ts";
export {
	FILL_FADE,
	GATE,
	GATE_COLUMN,
	GATE_LOGO,
	GATE_MARK_ROW,
	STEP_COUNT,
	STEP_COUNT_SEGMENTS,
	stepCountSegment,
} from "./roster/gate.ts";
export { IMAGE_CAP_LINES, imageContentTone } from "./roster/image.ts";
export {
	FIELD_UNIT,
	type FieldKind,
	OTP,
	OTP_DIGIT,
	otpBox,
	TEXT_AREA_VALUE,
	textArea,
	textAreaBudget,
} from "./roster/input.ts";
export {
	ITEM_FACT,
	ITEM_FACTS,
	ITEM_HEADER,
	ITEM_HEADER_PICTURE,
	ITEM_OVERLINE,
	PAGE_BODY,
	PAGE_BODY_OVER_FOOT,
	PAGE_BODY_TOAST_ROOM,
	PAGE_BODY_UNDER_TOAST,
	PAGE_CONTEXT,
	PAGE_HEAD,
	PAGE_HEAD_ROOM,
	PAGE_TOP_BAR,
	PAGE_TOP_BAR_END,
	PAGE_TOP_BAR_START,
	PAGE_WITHIN,
	PAGE_WITHIN_SEP,
	ROWS_MEASURED,
	TITLE_CODE,
} from "./roster/pane.ts";
export {
	CHIPS_RUN,
	CHIPS_TRIGGER,
	FIELD_QUIET,
	ITEM_PILL_HEAD,
	ITEM_PILL_HIT,
	ITEM_PILL_STATE_ACT,
	OPTION_CHILDREN,
	OPTION_GROUP_LABEL,
	OPTION_INDENT,
	OPTION_LINE,
	OPTION_LIST,
	OPTION_RADIO_DOT,
	optionRadio,
	PICKER_EMPTY,
	PICKER_PILL,
	PICKER_POPOVER,
	PICKER_VALUE,
	type PickerFit,
	picker,
	RADIO_DOT,
	SEGMENT_CHOSEN,
	SEGMENT_GROUND,
	SEGMENT_IDLE,
	SEGMENT_TRACK,
	SEGMENTED_CONTROL,
	segment,
	segmentLabel,
} from "./roster/picker.ts";
export {
	PROSE,
	PROSE_BLOCKS,
	PROSE_EMPHASIS,
	PROSE_ITEM,
	PROSE_LIST,
	PROSE_PART,
	PROSE_QUOTE,
	PROSE_RULE,
	PROSE_STRIKE,
	proseMarker,
} from "./roster/prose.ts";
export { QR_CODE, QR_CODE_INK } from "./roster/qr-code.ts";
export {
	RULE_CARD,
	RULE_ROW,
	RULES,
	ruleArrow,
	ruleArrowContentTone,
} from "./roster/rules.ts";
export {
	FILE_COUNT_YIELD,
	FILE_COUNTS,
	FILE_PATH,
	fileCount,
	filePathPart,
	GROUP,
	SECTION,
	SECTION_ACTS,
	SECTION_BODY,
	SECTION_HEAD,
	SECTION_HEAD_ROW,
	SECTION_LABEL,
	SECTION_TITLE,
	SECTION_TOGGLE,
} from "./roster/section.ts";
export type {
	ClassProp,
	ContentTone,
	Variant,
	VariantProps,
} from "./roster/shared.ts";
export {
	ANSWER,
	CARD,
	CARD_PART,
	FIGURES,
	FILL_X,
	GIVE,
	IMAGE_FAILED_INK,
	ROWS,
	ROWS_HOST,
	SUBGRID,
	text,
} from "./roster/shared.ts";
export {
	DOCKED_FLOOR_ROWS,
	LAYER_SHEET_BOTTOM,
	SHEET,
	SHEET_CENTERED,
	SHEET_DESKTOP,
	SHEET_DOCKED_BODY,
	SHEET_DOCKED_FLOOR,
	SHEET_DOCKED_FOOT,
	SHEET_DOCKED_HEAD,
	SHEET_FOOT,
	SHEET_HEAD,
	SHEET_HEAD_ROW,
	SHEET_PARTS_END,
} from "./roster/sheet.ts";
export {
	CURRENT_BAR,
	CURRENT_ROOM,
	DRAG_GHOST,
	PLACE_NEST,
	type PlaceTabState,
	placeRow,
	placeRowGlyph,
	placeTab,
	placeTabContentTone,
	placeTabLabel,
	SHELL_BANNER,
	SHELL_COLUMN,
	SHELL_COLUMN_AT,
	SHELL_COLUMN_FLOAT,
	SHELL_COLUMN_MOTION,
	SHELL_COLUMN_PHONE,
	SHELL_FOOT,
	SHELL_FRAME,
	SHELL_GROUP_LABEL,
	SHELL_INSET,
	SHELL_LAYER,
	SHELL_MARK,
	SHELL_PAGE_SLIDE,
	SHELL_PLACES,
	SHELL_RAIL,
	SHELL_RAIL_ENTRY,
	SHELL_RAIL_GLYPH,
	SHELL_RAIL_MOTION,
	SHELL_RAIL_PANEL,
	SHELL_RAIL_SLOT,
	SHELL_SIDEBAR,
	SHELL_SIDEBAR_SLOT,
	SHELL_TAB_BAR,
	SWITCHER,
	SWITCHER_SLOT,
	TOASTS,
} from "./roster/shell.ts";
export {
	SLIDER,
	SLIDER_HEAD,
	SLIDER_LABEL,
	SLIDER_VALUE,
} from "./roster/slider.ts";
export {
	STAGE_CHECK,
	STAGE_CROSS,
	STAGE_ROW,
	STAGE_WORDS,
	stage,
	stageContentTone,
	stageMark,
	stageRail,
} from "./roster/stages.ts";
export {
	COUNT_LINKS,
	METER,
	METER_MARK,
	STATS,
	STATS_CELL,
	STATS_EDGE,
	STATS_FIGURE,
	STATS_OPENS,
	TRAVEL_X,
} from "./roster/stats.ts";
export { switchThumb, switchTrack, TOGGLE_THUMB } from "./roster/switch.ts";
export {
	TABLE,
	TABLE_CELL,
	TABLE_CHANGE,
	TABLE_FROZEN,
	TABLE_NAME,
	type TableRowState,
	tableChangeValue,
	tableFrozenCell,
	tableHead,
	tableHeadLabel,
	tableRow,
} from "./roster/table.ts";
export type { TextRole } from "./roster/text.ts";
export {
	IMAGE_REMOVE,
	IMAGE_REMOVE_DISC,
	MESSAGE_ATTACH_SLOT,
	MESSAGE_ATTACHMENTS,
	MESSAGE_BUBBLE,
	MESSAGE_CODE,
	MESSAGE_ENTRY,
	MESSAGE_FOLD,
	MESSAGE_HEAD,
	MESSAGE_INPUT,
	MESSAGE_INPUT_BOX,
	MESSAGE_INPUT_CHIPS,
	MESSAGE_INPUT_FIELD_CHIPS,
	MESSAGE_INPUT_FIELD_VALUE,
	MESSAGE_INPUT_FOOT,
	MESSAGE_INPUT_ROW,
	MESSAGE_INPUT_TEXT,
	MESSAGE_INPUT_VALUE,
	MESSAGE_LINE,
	MESSAGE_NOTICE,
	MESSAGE_NOTICE_TEXT,
	MESSAGE_OPEN,
	message,
	STREAM_IN,
	STREAM_LATEST,
	THREAD,
	THREAD_LATEST,
} from "./roster/thread.ts";
export {
	LAYER_TOAST,
	TOAST,
	toastContentTone,
	toastState,
} from "./roster/toast.ts";
export {
	TOOLBAR,
	TOOLBAR_CHIPS,
	TOOLBAR_FILTERS,
	TOOLBAR_FILTERS_POPOVER,
	TOOLBAR_LINE,
	TOOLBAR_ROW,
	TOOLBAR_SEARCH,
	TOOLBAR_TABS,
} from "./roster/toolbar.ts";
export { WAVEFORM_RECORD } from "./roster/waveform.ts";
export { CHECK_MARK, CHEVRON, SWAP_IN, SWAP_OUT } from "./variant-tables.ts";

export const textStrong = build(TEXT_STRONG);
export const icon = build(ICON);
export const button = build(BUTTON);
export const buttonLabel = build(BUTTON_LABEL);
export const iconButton = build(ICON_BUTTON);
export const link = build(LINK);
export const avatar = build(AVATAR);
export const avatarLabel = build(AVATAR_LABEL);
export const statusDot = build(STATUS_DOT);
export const stateChip = build(STATE_CHIP);
export const changeMark = build(CHANGE_MARK);
export const chip = build(CHIP);
export const chipDot = build(CHIP_DOT);
export const field = build(FIELD);
export const fieldValue = build(FIELD_VALUE);
export const checkbox = build(CHECKBOX);
export const row = build(ROW);
export const rowTitle = build(ROW_TITLE);
export const rowStep = build(ROW_STEP);
export const rowMark = build(ROW_MARK);
export const lineBox = build(LINE_BOX);
export const menu = build(MENU);
export const menuGroup = build(MENU_GROUP);
export const menuLabel = build(MENU_LABEL);
export const meterFill = build(METER_FILL);
export const image = build(IMAGE);
export const imagePicture = build(IMAGE_PICTURE);
export const paint = build(PAINT);

// ── The family registry and its cells ──────────────────────────────

export type AnyCva = (props: Record<string, string>) => string;

export interface Family {
	name: string;
	cva: AnyCva;
	axes: Record<string, readonly string[]>;
}

// A registered matrix: its table's name, its cva, and each axis with the keys
// its table declares, read off the table so the two cannot drift.
function family<T extends Axes>(
	name: string,
	table: Matrix<T>,
	variant: Variant<T>,
): Family {
	return {
		name,
		// A cva takes any subset of its axes; the registry calls it one axis at
		// a time with a key the table declares.
		cva: variant as unknown as AnyCva,
		axes: Object.fromEntries(
			Object.entries(table.variants).map(([axis, cells]) => [
				axis,
				Object.keys(cells),
			]),
		),
	};
}

// Every matrix this module exports, under its table's name.
export const FAMILIES: readonly Family[] = [
	family("TEXT", TEXT, text),
	family("TEXT_STRONG", TEXT_STRONG, textStrong),
	family("ICON", ICON, icon),
	family("BUTTON", BUTTON, button),
	family("BUTTON_LABEL", BUTTON_LABEL, buttonLabel),
	family("ICON_BUTTON", ICON_BUTTON, iconButton),
	family("LINK", LINK, link),
	family("AVATAR", AVATAR, avatar),
	family("AVATAR_LABEL", AVATAR_LABEL, avatarLabel),
	family("STATUS_DOT", STATUS_DOT, statusDot),
	family("STATE_CHIP", STATE_CHIP, stateChip),
	family("CHANGE_MARK", CHANGE_MARK, changeMark),
	family("CHIP", CHIP, chip),
	family("CHIP_DOT", CHIP_DOT, chipDot),
	family("FIELD", FIELD, field),
	family("FIELD_VALUE", FIELD_VALUE, fieldValue),
	family("TEXT_AREA", TEXT_AREA, textArea),
	family("TEXT_AREA_BUDGET", TEXT_AREA_BUDGET, textAreaBudget),
	family("OTP_BOX", OTP_BOX, otpBox),
	family("SWITCH", SWITCH, switchTrack),
	family("SWITCH_THUMB", SWITCH_THUMB, switchThumb),
	family("CHECKBOX", CHECKBOX, checkbox),
	family("OPTION_RADIO", OPTION_RADIO, optionRadio),
	family("ROW", ROW, row),
	family("ROW_TITLE", ROW_TITLE, rowTitle),
	family("ROW_STEP", ROW_STEP, rowStep),
	family("ROW_MARK", ROW_MARK, rowMark),
	family("LINE_BOX", LINE_BOX, lineBox),
	family("TABLE_ROW", TABLE_ROW, tableRow),
	family("TABLE_HEAD", TABLE_HEAD, tableHead),
	family("TABLE_HEAD_LABEL", TABLE_HEAD_LABEL, tableHeadLabel),
	family("TABLE_FROZEN_CELL", TABLE_FROZEN_CELL, tableFrozenCell),
	family("TABLE_CHANGE_VALUE", TABLE_CHANGE_VALUE, tableChangeValue),
	family("SEGMENT", SEGMENT, segment),
	family("SEGMENT_LABEL", SEGMENT_LABEL, segmentLabel),
	family("PICKER", PICKER, picker),
	family("RULE_ARROW", RULE_ARROW, ruleArrow),
	family("BANNER", BANNER, banner),
	family("BANNER_GLYPH", BANNER_GLYPH, bannerGlyph),
	family("TOAST_STATE", TOAST_STATE, toastState),
	family("MENU", MENU, menu),
	family("MENU_GROUP", MENU_GROUP, menuGroup),
	family("MENU_LABEL", MENU_LABEL, menuLabel),
	family("PROSE_MARKER", PROSE_MARKER, proseMarker),
	family("PROSE_DIFF_RUN", PROSE_DIFF_RUN, proseDiffRun),
	family("CODE_TEXT", CODE_TEXT, codeText),
	family("DIFF_LINE", DIFF_LINE, diffLine),
	family("FILE_PATH_PART", FILE_PATH_PART, filePathPart),
	family("FILE_COUNT", FILE_COUNT, fileCount),
	family("MESSAGE", MESSAGE, message),
	family("METER_FILL", METER_FILL, meterFill),
	family("CHART_BAND", CHART_BAND, chartBand),
	family("CHART_FILL", CHART_FILL, chartFill),
	family("IMAGE", IMAGE, image),
	family("IMAGE_PICTURE", IMAGE_PICTURE, imagePicture),
	family("CANVAS_GROUP", CANVAS_GROUP, canvasGroup),
	family("CANVAS_NODE", CANVAS_NODE, canvasNode),
	family("CANVAS_NODE_TEXT", CANVAS_NODE_TEXT, canvasNodeText),
	family("CANVAS_NODE_GLYPH", CANVAS_NODE_GLYPH, canvasNodeGlyph),
	family("CANVAS_NODE_MARK", CANVAS_NODE_MARK, canvasNodeMark),
	family("CANVAS_NODE_INK", CANVAS_NODE_INK, canvasNodeInk),
	family("CANVAS_NODE_NAME", CANVAS_NODE_NAME, canvasNodeName),
	family("STAGE", STAGE, stage),
	family("STAGE_MARK", STAGE_MARK, stageMark),
	family("STAGE_RAIL", STAGE_RAIL, stageRail),
	family("PLACE_ROW", PLACE_ROW, placeRow),
	family("PLACE_ROW_GLYPH", PLACE_ROW_GLYPH, placeRowGlyph),
	family("PLACE_TAB", PLACE_TAB, placeTab),
	family("PLACE_TAB_LABEL", PLACE_TAB_LABEL, placeTabLabel),
	family("STEP_COUNT_SEGMENT", STEP_COUNT_SEGMENT, stepCountSegment),
	family("COLUMNS", COLUMNS, columns),
	family("PAINT", PAINT, paint),
];

export function classes(value: string): string[] {
	return value.split(/\s+/).filter(Boolean);
}

// One axis value's cell is what its rendering adds over the rendering every
// other value of that axis shares. A compound row folds into the axis it
// keys off, which is what makes `bg-accent` reachable as BUTTON's primary cell.
export function matrixCells(): Map<string, Set<string>> {
	const out = new Map<string, Set<string>>();
	for (const family of FAMILIES) {
		for (const [axis, values] of Object.entries(family.axes)) {
			const sets = values.map(
				(value) => new Set(classes(family.cva({ [axis]: value }))),
			);
			const first = sets[0];
			if (!first) continue;
			const shared = new Set(
				[...first].filter((name) => sets.every((set) => set.has(name))),
			);
			values.forEach((value, index) => {
				const set = sets[index];
				if (!set) return;
				const cell = new Set([...set].filter((name) => !shared.has(name)));
				if (cell.size > 0) out.set(`${family.name}.${axis}.${value}`, cell);
			});
		}
	}
	return out;
}

// Single cells: one class string each, shared verbatim by both plugins.

// A number in the meta ink at the caption size (the role, not a third grey,
// keeps it quieter than a title), its figures at one width. A count inside a
// filled act draws `COUNT_LABEL` alone, in the act's label ink.
export const COUNT = "text-ink-meta";
export const COUNT_LABEL =
	"text-caption leading-caption tracking-caption font-normal tabular-nums";
// A ring the size of the glyph it replaces, the icon beside body text: a track
// at 30 % under a turning arc, both in the ink of its place (a plugin overlay:
// native colours a prop).
export const SPINNER = "size-icon";
export const SPINNER_TRACK = "rounded-full border-2 opacity-30";
export const SPINNER_ARC = "rounded-full border-2 border-t-transparent";
// The busy glyph when the theme scrambles its text (`theme.loading`): three
// mono glyphs cycling at `tick` in a box three glyphs wide (the component sets
// the width, `3ch`), the spinner's height, in the ink of its place.
export const BUSY_GLYPHS =
	"h-icon font-mono text-code leading-code font-normal";
// A status: its dot (`statusDot`) beside its word, the word truncating only
// when the line it stands on is out of room.
export const STATUS = "gap-gap";
// A running status's mark: the spinner in the dot's place, its slot carrying
// the accent ink the spinner draws in (a native place sets the same tone as
// the spinner's ink, read through `statusContentTone`).
export const STATUS_SPINNER = "text-accent-ink";
export const STATUS_LABEL = "text-meta leading-meta font-normal text-ink-meta";
// Words that act in a control-radius box with no boundary at rest: a row's
// pick and a status that moves (Picker), a header fact that opens a sheet
// or goes to a route (Pane's record head). It pulls back by its own padding on the
// side that meets plain text (an overlay), so its words sit where static
// words do. Shared by both drawers.
export const WORD_ACT = `rounded-control px-gap min-h-target ${ANSWER}`;
// A remove act's round disc, which carries the washes: a chip's is the chip's
// caption line, a thumbnail's its glyph and the gap around it
// (`IMAGE_REMOVE_DISC`). Unheld, drawn by each that has one.
export const REMOVE_HIT = `inline-flex items-center justify-center rounded-full ${ANSWER} ${GIVE}`;
// An error line under its control, in the error ink: a field's (`FormField`)
// and a list row's entry. Unheld, drawn by each that has one.
export const FIELD_ERROR_LINE =
	"text-meta leading-meta font-normal text-ink-error";
export const FIELD_PLACEHOLDER = "text-ink-meta";
// The word `optional` under the name of a field that may be left empty, on a
// second line of the label column.
export const FIELD_OPTIONAL = "block text-ink-meta";
// An optional field on one line: its name starts the gap down (a body line in
// a control has the gap above and below, so the line centres on the control's),
// the word under it, and the row's cells start at its top so the control
// stays where a required field's stands; the row grows by the word. A text
// area's name hangs from its top, and on touch the label stands over the
// control with no inset.
export const FIELD_OPTIONAL_BOX = "items-start touch:items-stretch";
export const FIELD_OPTIONAL_LINE = "min-h-control";
export const FIELD_OPTIONAL_NAME = "items-start pt-gap touch:pt-0";
// With a line under the control (a description, an error), the name and its
// word span the control's line and that one, so the line stands right under
// the control rather than under the word.
export const FIELD_OPTIONAL_LABEL = "row-span-2";

// A field's glyph (search, chevron).
export const FIELD_GLYPH = "text-ink-meta";

// The label of a chip: bounded, so a long chip truncates before the row's title
// does, in the body ink.
export const CHIP_LABEL =
	"max-w-measure-short text-caption leading-caption tracking-caption font-normal text-ink-body";
// The word of a state chip: the chip's caption look in the state's ink.
export const STATE_CHIP_LABEL =
	"max-w-measure-short text-caption leading-caption tracking-caption font-normal";

// An option's row in a popover or a list of choices (Menu, Picker,
// list Picker): its wash at the control's inset, in place of the row's own card
// inset, and the row's floor, so on touch it stands at the target as a list's
// row does. Unheld, drawn by each that has one.
export const OPTION_ROW = "px-pad min-h-row";

// The track stands on a body line, as the label over it does, so the room
// under the rail is the room over the label's line and a card holding the
// slider reads even at its inset. Its hit box is still the target: each
// drawer reaches it past the line by half the target's excess over the line,
// above and below (the web a pseudo element, native a hit slop), so the
// excess runs into the gap over it and the inset under it, taking no room.
export const SLIDER_TRACK = "w-full min-h-line-body";
export const SLIDER_FILL = `h-[calc(2*var(--spacing-hairline))] rounded-full bg-toggle-on ${ANSWER}`;
// The unfilled rail is the control's part, in the thumb's boundary ink, so it
// reads as a track beside the hairline of the group it stands in.
export const SLIDER_REST =
	"h-[calc(2*var(--spacing-hairline))] rounded-full bg-edge-strong";
// The thumb is the meta icon's square, as a switch's knob is.
export const SLIDER_THUMB = `size-icon-meta rounded-full border border-edge-strong bg-surface ${ANSWER}`;
// A waveform: the peaks drawn on a canvas in a box of the control's height in a
// bar (the player dock). Its columns, played and unplayed ink and the playhead
// are drawn from the colour tokens, not cells.
export const WAVEFORM_BAR = "h-control rounded-control";

// A popover: raised on the float shadow inside its hairline, its rows inset
// by the float inset so a row's wash sits just inside the edge.
export const POPOVER =
	"gap-gap p-gap bg-raised border border-edge-raised rounded-popover shadow-float";

// Drag and drop. The line where a dragged row lands: the accent, two
// hairlines tall (a slider's track), between two rows. A drop the drag is over takes the selected wash under
// the ring's outline, drawn inset; a table row takes the wash alone.
export const DROP_LINE =
	"h-[calc(2*var(--spacing-hairline))] rounded-full bg-accent";
export const DROP_ON =
	"bg-wash-selected outline-2 -outline-offset-2 outline-ring";
export const HAIRLINE = "border-edge";
export const CHECKBOX_MARK = `size-icon-meta text-on-accent ${CHECK_MARK}`;
// A row's leading (an avatar, a glyph, a tick's box, a status mark) sizes to
// what it holds and stands in the row's gap rhythm: no slot reserves room for
// a part a row does not have. A list leads every row with one kind of mark,
// so its titles share one x. It stands a `pad` from the text after it (the
// row's gap and the rest of a `pad`), so a name reads apart from its mark.
export const ROW_LEADING =
	"shrink-0 me-[calc(var(--spacing-pad)-var(--spacing-gap))]";
export const ROW_LEADING_STATUS = "shrink-0";
export const ROW_TITLE_LINE = "gap-gap";
// A one-line row's text: the title, then its facts' words an inside gap after it
// on the same line.
export const ROW_INLINE = "gap-gap";
// A list row's trailing value (a time, a date), its figures at one width.
export const ROW_TRAILING =
	"tabular-nums text-meta leading-meta font-normal text-ink-meta";
// The items of a row's second line (an entry's input and act, a step, an
// option's description) an inside gap apart.
export const ROW_META_LINE = "gap-x-gap";
// A sheet's open row carries the current bar drawn over its start (`current`
// wide, an inset shadow), taking no room: every row's text and hairline then
// stand at the sheet's inset, as a band's do, and nothing moves as the bar
// arrives. A tree's child starts at its rail (`TREE_RAIL`), its bar and its
// washes with it.
export const ROW_CURRENT_BAR =
	"shadow-[inset_calc(3*var(--spacing-hairline))_0_0_var(--color-accent)] rounded-s-none";
// A row's progress: the meter's track (`METER_TRACK`, filled by `meterFill` at a
// goal's levels) as the last line of the row's text column, so it starts at the
// text and never runs under the leading mark, a badge gap under the facts and the
// row's own inset above the hairline; no press (each platform sets that on its
// own box).
export const ROW_PROGRESS = "w-full pt-badge";
// A row's text group and end group: docs/architecture/ui-core/layout.md, "Text group and end group".
export const ROW_TEXT = "min-w-0 shrink";
// Who gives way first: docs/architecture/ui-core/layout.md, "Who gives way first".
export const YIELDS_FIRST = "shrink-10000000";
export const YIELDS_LAST = "shrink-[0.0001]";
// `YIELDS_LAST` on each child, spelled whole: Tailwind reads a class as written,
// so a variant cannot be composed around it at run time.
export const YIELDS_LAST_EACH = "*:shrink-[0.0001]";
export const ROW_END = "gap-gap";
// The text group's floor: docs/architecture/ui-core/layout.md, "Text group and end group".
export const ROW_TEXT_FLOOR = "basis-2/5 shrink-0";
// A glyph and its words a gap apart: a table cell's warning (a warn glyph and
// its phrase) and a row's boolean marks in the end group. A row's facts are
// badges (`BADGE`), not marks: its status, warning, lock, chip, ring, flag and
// words stand in one line under the title, each its own badge, and a row with
// a mark is two lines. A boolean mark whose words are not drawn stands in the
// end group instead, a glyph named by its label, and is no badge. The
// warning's glyph is in `warn`, its label in the meta ink.
export const ROW_MARKS = "gap-gap";
export const ROW_WARNING = "text-warn";
// A row's boolean marks (`RowMark`) after its chip: the required ring, a filled
// circle at the dot's size in the meta ink while it holds (one that does not
// draws nothing), and a flag glyph in the meta ink, each beside its label.
export const ROW_RING = "size-dot shrink-0 rounded-full border border-ink-meta";
export const ROW_RING_FILLED = "bg-ink-meta";
export const ROW_FLAG = "text-ink-meta";
export const ROW_ACTS = "gap-gap";
// A badge: one fact of a facts line (a row's, a record head's, a message's
// detail row's) in a box of its own that never breaks inside. Its soft ground
// is the meta ink at a tenth (`fill-badge`), its words stay in the meta ink at
// the meta role (the component adds the role and the line it draws on, so a
// badge's height is the meta text's line), its corners the badge radius and
// its inline inset the `gap`. Only a glyph inside it carries colour: a
// status's tone mark, the warning glyph, a chip's family dot. A badge longer
// than its line is cut inside the badge (`BADGE_WORDS`); the full text lives
// on the record and is the badge's accessible name.
export const BADGE =
	"min-w-0 max-w-full gap-gap rounded-badge bg-fill-badge px-gap";
// A badge's words, cut with an ellipsis inside the box when the line is out of
// room: one line, so a fact never reads as two.
export const BADGE_WORDS = "min-w-0 truncate text-ink-meta";
// A line of badges: whole badges wrap to the next line, `badge` apart across
// and down, with no separator between them.
export const BADGE_LINE = "min-w-0 flex-wrap gap-badge";
// The required ring inside a badge, outlined: a circle two badge gaps wide in
// a hairline of the meta ink with a centre filled in it, one badge gap wide,
// so it is never mistaken for a chip's solid dot (`size-dot`).
export const BADGE_RING =
	"size-[calc(2*var(--spacing-badge))] shrink-0 items-center justify-center rounded-full border border-ink-meta";
export const BADGE_RING_CENTRE = "size-badge rounded-full bg-ink-meta";
// A list row's step list, in the facts' place while its act pends: one
// line per step (`rowStep`), a pair gap apart.
export const ROW_STEPS = "gap-gap";
// A list row's entry: the title, the input with its act and the error line a
// pair apart, the error (`FIELD_ERROR_LINE`) under the input.
export const ROW_ENTRY = "gap-gap";

// A definition row subgrids the two columns of the rows grid it stands in
// (`ROWS`): its label in the first, as wide as the widest label of the run,
// and its value line (the change mark, the value, the end group) in the
// second, the row's gap between them; a description stands under the value.
// On touch the row is a column: the label, then the value line at the row's
// whole width (a label column leaves an email or a domain no room).
export const DEFINITION_BOX = `min-h-control ${SUBGRID} gap-x-stack items-center touch:flex touch:flex-col touch:items-stretch`;
export const DEFINITION_LINE = "gap-gap";
export const DEFINITION_LABEL = "flex";
export const DEFINITION_UNDER = "col-start-2";
// The name stands centred on the body's first-line box, so the label and
// the body value share one line whatever their line heights. It is the body
// role in the meta ink, so the label names and the value, in the body ink,
// reads as what is named. Its figures stand at one width, as every value's do.
export const DEFINITION_NAME =
	"text-ink-meta flex items-center min-h-line-body tabular-nums";
// A row whose control is a text area starts at its top, the label pulled down
// by the area's inset (its hairline and gap), so the label stands centred on
// the area's first line; on touch the value stands under its label, so the label
// row is the whole row and takes no offset.
export const DEFINITION_BOX_AREA = "items-start";
export const DEFINITION_NAME_AREA =
	"mt-[calc(var(--spacing-gap)+var(--spacing-hairline))] touch:mt-0";
export const DEFINITION_VALUE = "min-w-0 grow";
// A field that commits itself is a row of two groups, as a row of a list is: its
// label over its description (the text group, taking the room the control
// leaves) and its control at its own measure at the end, so the row is as tall
// as the two lines and a short value stops filling it. A toggle is its own
// width. The control fills its measure, its box neither wider nor narrower
// than the group. On touch the control stands under its text, as a definition row's.
export const FIELD_SPLIT =
	"flex items-center justify-between gap-x-stack min-h-control touch:flex-col touch:items-stretch";
export const FIELD_SPLIT_TEXT = "flex flex-col min-w-0 grow";
export const FIELD_SPLIT_VALUE =
	"flex min-w-0 shrink-0 items-center w-measure-short touch:w-auto *:min-w-0 *:grow";
// A control that is no line (a saved secret's sentence and acts, a file pick)
// stands at its content's width, at most half the row.
export const FIELD_SPLIT_FREE =
	"flex min-w-0 max-w-1/2 shrink-0 items-center justify-end touch:max-w-full";
export const DEFINITION_ABSENT = "text-ink-meta";
// A control placed alone is its field: no form's label column to share, so
// its name stands over it, a gap apart, as a definition row stands on touch,
// and the description or the error under it. A switch or a checkbox stands on
// its name's line, at its end.
export const FIELD_ALONE = "flex flex-col gap-gap min-w-0";
export const FIELD_ALONE_LINE = "flex items-center gap-gap min-w-0";
// Placed alone in a run of rows (a `Card`, which is a `ROWS` run of its own), a
// field that fills a line takes the run's label column as a definition row
// does: the name in the first column, the control in the second, the
// description or the error under it (`FIELD_ALONE_UNDER`), on touch over it as
// every definition row stands. A text area's name hangs from its top, as a
// definition row's does (`FIELD_ALONE_LINE_AREA`). Outside a run of rows the
// field stands as it did, the name over the control.
export const FIELD_ALONE_ROW =
	"[.rows-host>&]:grid [.rows-host>&]:grid-cols-subgrid [.rows-host>&]:gap-x-stack [.rows-host>&]:items-center [.rows-host>&]:touch:flex [.rows-host>&]:touch:flex-col [.rows-host>&]:touch:items-stretch";
export const FIELD_ALONE_ROW_AREA =
	"[.rows-host>&]:items-start [.rows-host>&]:touch:items-stretch";
export const FIELD_ALONE_LINE_AREA =
	"[.rows-host>*>&]:mt-[calc(var(--spacing-gap)+var(--spacing-hairline))] [.rows-host>*>&]:touch:mt-0";
export const FIELD_ALONE_UNDER =
	"[.rows-host>*>&]:col-start-2 [.rows-host>*>&]:touch:col-start-1";
// A failed row's retry mark (a definition row's, a meter's): the retry glyph,
// and the spinner that takes its place once the retry runs, centred in one
// square, so the swap moves nothing.
export const ROW_RETRY = "size-control";
// A lock glyph (`Lock` at the meta icon size) after a value, in a column's
// head or on a row's meta line: the meta ink; what it follows stands an inside
// gap from it.
export const LOCK_GLYPH = "shrink-0 text-ink-meta";

// On the web a fact that acts (one that opens, a pick) is an outlined control
// pill at the badge's own height, the meta line (`1lh` of the caption role,
// which is the meta role's size and leading): on the surface under a hairline,
// its words in the body ink (the caption role; the component composes it) and
// its chevron in the meta ink, so beside a plain fact (a badge) it never reads
// as one. A plain fact does nothing and moves no state: it is a badge. The pill
// keeps the target's hit box (`ITEM_FACT_HIT`) around it, which stands at the
// caption's line and pulls back by what the target has over that line
// (`(target - 1lh) / 2`, `factReach` on the phone), so the line holds the
// meta line's height whichever kinds of fact it holds and a head waiting with
// badges draws the height of the one that lands with a pick; the pill takes the
// washes and the ring.
export const ITEM_PILLS = "gap-gap";
export const ITEM_PILL =
	"rounded-chip border border-edge bg-surface px-gap gap-gap text-ink-body";
export const ITEM_PILL_GLYPH = "shrink-0 text-ink-meta";
export const ITEM_FACT_HIT = `group min-h-target min-w-target -my-[calc((var(--spacing-target)-1lh)/2)] focus-visible:outline-none ${text({ role: "caption" })}`;

export const ITEM_PILL_ACT = `group-hover:bg-wash-hover group-active:bg-wash-press in-data-[modality=keyboard]:group-focus-visible:outline-2 group-focus-visible:outline-ring ${ANSWER}`;

// A folded question is one row (`ROW`), its glyph in the `ok` ink, its label,
// its answer and its edit act an inside apart.
export const FORM_FIELD_SUMMARY_GLYPH = "text-ok";

export const SCRIM = "bg-scrim";

export const SHEET_PARTS = "gap-section p-pad";

export const DOCKED_LOG_FLOOR_ROWS = 2;

// An empty state: its column at the empty width (the mark, the text, the
// act a fields gap apart), the title over the sentence a pair apart.
export const EMPTY_COLUMN = "gap-stack w-full max-w-empty";
export const EMPTY_TEXT = "gap-gap";
// An empty state's mark: its glyph in a control-sized disc on the neutral
// ground, in the ink of its place (meta, or danger for a failed query).
export const EMPTY_MARK = "size-control rounded-full bg-fill-neutral";
// The web's empty state is one line in flow: the alert glyph of a failed read,
// the sentence in the meta ink and the act as an accent link, wrapping at the
// line's start, with no box, fill or centring (a web overlay: the phone keeps
// its column).
// One form everywhere: the sentence over its act, both centred, at the card's
// inset: inside the card whose rows it stands for (`EMPTY_PART`: a Section's sheet, a
// Form's, a Sheet's), on a card of its own elsewhere (`CARD_PART`).
export const EMPTY_LINE = "flex flex-col items-center text-center gap-gap";
export const EMPTY_PART = "p-pad";
export const EMPTY_SENTENCE = "text-ink-meta max-w-measure";
// The pending work in an action bar's place: the bar over a blocked act's
// reason.
export const PENDING_BAR = "gap-gap";

// ── Content ─────────────────────────────────────────────────────────

export const PROSE_CODESPAN =
	"rounded-chip bg-fill-neutral px-gap text-code leading-code font-normal font-mono";
// A name that is code (a field, an event, a key) standing as a row's title or a
// record's name: the mono at the code role, bare, so a list of names is not a
// column of boxes.
export const CODE_NAME = "text-code leading-code font-normal font-mono";

export const METER_TRACK = "h-gap rounded-chip bg-fill-neutral";

// A standalone link's box at the target height: the web's anchor carries it,
// the phone's pressable (a text's own box takes no touch past its words'
// centre). Unheld, drawn by each that has one: the Link and a count line's
// waiting shape.
export const LINK_TARGET = "min-h-target";

export const THREAD_COLUMN = "w-full max-w-measure";

// Image: its full view stands on the scrim with no frame, the picture inside
// the page inset; the close act is a lifted ground at the control radius over
// the picture, as the Latest act floats over a log.
export const IMAGE_FULL = "p-page";
export const IMAGE_CLOSE = "rounded-control bg-raised shadow-float";

export const IMAGE_TILE_NARROWEST = 3 / 4;

// ── Layout ──────────────────────────────────────────────────────────

export const GATE_STEP = "gap-stack";
export const GATE_MARK =
	"size-[calc(var(--spacing-line-body)+var(--spacing-badge))]";

// A Pane's head is one line at every width. The title truncates and holds at
// least two fifths of the row (a structural fraction, never a width); the first
// act stands and the rest stand in the more menu (`actsSplit`), whatever the
// room. On touch the head takes a step of block padding over the row.
export const PAGE_TITLE_FLOOR = "min-w-2/5 basis-0";

// A docked foot (a Pane's `foot`) is one cell: a
// region of its own under what scrolls past it, a raised surface (the raised
// step under a hairline), at the page inset at the
// sides and an acts gap above and below what it holds (a selection bar stands
// in its height range, a field at its own), fitting what it holds up to the
// region it shares with what stands over it (the log and the foot, never the
// head), so the log gives way to it: a docked `Sheet` fills it and bounds its
// own body (two fifths of the region, three rows at least, and the log its
// two-row floor while the body can give), so the foot is never capped below the
// sheet's pinned parts.
export const FOOT_DOCKED =
	"border-t border-edge-raised bg-raised px-page py-gap max-h-full min-h-0";

// A section's labelled act is words in the accent ink, as an empty state's act
// is: the one filled act of a page is its bar's. One that removes or ends
// something is in the danger ink.
export const ICON_BUTTON_DESTRUCTIVE = "text-danger";
// An icon act that is the one its bar is for (play): the accent fill, with its
// own hover, press and blocked looks in place of the wash.
export const ICON_BUTTON_PRIMARY = "bg-act-accent text-on-act-accent";

// A group's band in a list with `groups`: the band ground at the band height,
// across the list's width (which bleeds the card), its text at the rows' inline
// inset, the label, its count and its act a gap apart; no radius; closed by a
// rule in the body ink (the list's one rule not in the edge colour), no rule
// above it.
export const LIST_BAND = "py-gap px-pad gap-gap bg-band border-b border-edge";
// A tree row's level: one `stack` step in (no wider than the row's inset on
// touch), its hairline rail on the end. A row draws one per level of its
// depth, and the hairline above a child starts at its rail, so the indent
// before the rail reads as the parent's and is never ruled as an empty column;
// a child's wash and current bar start at the rail too, so neither marks the
// parent's column.
export const TREE_RAIL = "w-stack border-r border-edge";
// A tree row's levels and fold lane run the row's full height, over the row's
// padding (`ROW`, one `gap` above and below in every form, a one-line row's
// too), so a level's rail is unbroken from row to row, through the hairline
// between two rows: the bleed is that padding's negative.
export const TREE_BLEED = "-my-gap";

// An action bar: the acts row over a blocked act's reason, the acts an acts
// gap apart. Where the bar stands (`fit`: at the end of its container at the
// acts' natural width, or across it with each act at the field's height) is
// structure and the `Button` fit the bar passes, so it carries no cell.
export const ACTION_BAR = "gap-gap";
export const ACTION_BAR_ACTS = "gap-gap";

// What an icon sits beside, which picks its size: meta or caption text, body
// text, or the inside of a control.
export type IconFit = keyof (typeof ICON)["variants"]["fit"];

export type LinkFit = keyof (typeof LINK)["variants"]["fit"];
export type ImageFit = keyof (typeof IMAGE)["variants"]["fit"];
export type ImageState = keyof (typeof IMAGE)["variants"]["state"];
export type AvatarStep = keyof (typeof AVATAR)["variants"]["step"];

export function rowTitleLines(
	dim: boolean,
): keyof (typeof ROW_TITLE)["variants"]["lines"] {
	return dim ? "dim" : "name";
}

export function statusContentTone(tone: Tone): ContentTone {
	if (tone === "running") return toneOf(STATUS_SPINNER);
	return toneOf(STATUS_DOT.variants.tone[tone]);
}

export function changeContentTone(kind: ChangeKind): ContentTone {
	return toneOf(CHANGE_MARK.variants.kind[kind]);
}

// The aspect an image's box stands at in every state: a content image's is
// its consumer's, a thumbnail's and a mini's is its square, which its size fixes, and a
// tile's its consumer's held no narrower than `IMAGE_TILE_NARROWEST`.
export function imageAspect(
	fit: ImageFit,
	aspect: number | undefined,
): number | undefined {
	if (fit === "thumb" || fit === "mini") return undefined;
	if (fit === "tile") return Math.max(aspect ?? 1, IMAGE_TILE_NARROWEST);
	return aspect;
}

export function summaryContentTone(): ContentTone {
	return toneOf(FORM_FIELD_SUMMARY_GLYPH);
}

export function rowWarningContentTone(): ContentTone {
	return toneOf(ROW_WARNING);
}

// A stable step for a name, so one name keeps one fill everywhere.
export function avatarStep(name: string): AvatarStep {
	let hash = 0;
	for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
	// `1` to `8` are the keys of the `AVATAR` matrix's `step`.
	return String((hash % 8) + 1) as AvatarStep;
}

// A painted fill's animation: docs/architecture/ui-core/motion.md, "Wait and settle".
export const PULSE =
	"animate-[paint-in_var(--transition-duration-base)_var(--ease-out)_var(--wait-delay)_both,var(--pulse-name,pulse-fill)_var(--pulse)_var(--ease-in-out)_infinite]";

// A glyph slot the theme paints by the scramble (`theme.loading`): the slot's
// own ink over no fill, appearing after the delay by the fade alone, over a
// box the filler sizes. Under reduced motion the fill stands in its place (the
// glyphs are hidden) and the fade snaps with the delay held. Composed with
// `PAINT.kind.box`, whose fill it removes.
export const SCRAMBLE =
	"relative rounded-chip motion-safe:bg-transparent animate-[paint-in_var(--transition-duration-base)_var(--ease-out)_var(--wait-delay)_both]";

// The layer cells: docs/architecture/ui-core/motion.md, "Layers".
export const LAYER_POPOVER =
	"transition-[opacity,translate] duration-base ease-out data-starting-style:-translate-y-gap data-[side=top]:data-starting-style:translate-y-gap data-starting-style:opacity-0 data-ending-style:-translate-y-gap data-[side=top]:data-ending-style:translate-y-gap data-ending-style:opacity-0 data-ending-style:ease-in";

// A centred sheet, a desktop card and a full view rise a pair as they fade in
// and sink it as they fade out.
export const LAYER_CARD =
	"transition-[opacity,translate] duration-base ease-out data-starting-style:translate-y-gap data-starting-style:opacity-0 data-ending-style:translate-y-gap data-ending-style:opacity-0 data-ending-style:ease-in";

// The scrim fades on its sheet's rung and curves, in and out.
export const LAYER_SCRIM =
	"transition-opacity duration-base ease-out data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:ease-in";

// A line that appears in flow: docs/architecture/ui-core/motion.md, "Lines and blocks".
export const LINE_IN =
	"animate-[paint-in_var(--transition-duration-fast)_var(--ease-out)_both]";
// A block that arrives on its own: docs/architecture/ui-core/motion.md, "Lines and blocks".
export const BLOCK_IN =
	"animate-[paint-in_var(--transition-duration-base)_var(--ease-out)_both]";
