import type { RosterEntry } from "../roster.ts";
import { ANSWER, build, GIVE, matrix, PRESS, text } from "./shared.ts";

// The pick outside a form that applies at once: a field box, or (a row's
// trailing, `fit: row`) its value and a chevron in a `WORD_ACT`, a value
// that carries a state being the compact state pill with its chevron
// inside at its end, the pill the trigger, as in a record's head; either
// opens a popover of rows (a sheet of rows on touch), a search field
// above six options; an option may lead with its avatar, and one act
// (the act that makes a new option) ends the list under a hairline. At
// the `bar` fit the field box fills its column. At the `bar` fit, outside
// a table cell and a rule's row (a toolbar's pick), a pick that is set reads its
// label, a colon and its value ("Work type: Change"), so a value other
// filters could share is told apart; unset, or on its `null` option (the
// empty choice, "All kinds"), it reads its label alone, in the
// placeholder's ink; every other fit, and a rule's term, whose row names
// it, reads its value alone. An option's `chip` draws
// after its label in the list and on the trigger. Its `value` an array
// makes it a pick of several: the rows tick and the list stays open, and
// the box holds one removable neutral chip per value. An option's
// `blocked` reason replaces its `line` in the disabled ink and
// the option takes no pick, until it is in the value. `value` and
// `options` are data: a selection paints the trigger, inert and its
// content undrawn, until its read lands. A `value` whose read ended leaves
// the box empty and blocked: opening it says the failed sentence and
// opens nothing. Options that have failed draw the
// failed sentence with Retry (or `missing`) in a line under the trigger,
// which stays painted; the picker holds that read, so it needs no frame
// and draws no busy or stale flag.
// `fit: list` stands the options in the page: check rows under group
// labels on a hairline card, a chosen option checked (the row takes no
// wash); radio rows when `value` is one value or null, a radiogroup whose
// chosen ring holds its dot. The recommended mark on its `line`;
// the `children` under a chosen option at its label's start. A list that is
// the body of a titled Section is `headed`: the Section's title names it
// and it draws no field. Static
// `options` never paint; `items`, constants or a selection, paint
// `PAINT_ROWS` rows while the read waits, in the slots `option` declares
// (a `line` under each label, a label over the group), inert, and a
// `value` selection paints the boxes or rings; the empty form is the
// frame's, the Pane, Section, Sheet or Form that holds the read, and
// `items` that have failed draw the failed sentence with Retry (or
// `missing`) in a line under the rows, the list holding that read where no
// frame does. An option's `blocked` reason replaces its `line` in the
// disabled ink and its box or radio is disabled, until it is in the value.
// `fit: segments` stands a few options as one row of segments, the chosen
// one under the selection wash; a segment given an `href` and no value is
// a link, the one whose href is the location's path or its nearest parent
// the selected one, and a press opens it. A field as every control is
// (`Input`): the field fit, a list and choice segments draw it alone.
export const pickerEntry: RosterEntry = {
	props: [
		"label",
		"description",
		"optional",
		"error",
		"placeholder",
		"options",
		"items",
		"option",
		"value",
		"onChange",
		"fit",
		"headed",
		"act",
		"children",
	],
	draws: [
		"FIELD_ALONE",
		"FIELD_ALONE_LINE",
		"FIELD_ALONE_ROW",
		"FIELD_ALONE_ROW_AREA",
		"FIELD_ALONE_LINE_AREA",
		"FIELD_ALONE_UNDER",
		"DEFINITION_NAME",
		"FIELD_OPTIONAL",
		"FIELD_ERROR_LINE",
		"FIELD_QUIET",
		"PICKER",
		"HAIRLINE",
		"ROW_LEADING",
		"AVATAR",
		"AVATAR_LABEL",
		"WORD_ACT",
		"PICKER_VALUE",
		"ICON.fit.meta",
		"CHIP",
		"CHIP_DOT",
		"CHIP_LABEL",
		"FIELD.trailing.none",
		"FIELD.state.rest",
		"FIELD.state.error",
		"FIELD_VALUE.kind.text",
		"FIELD_VALUE.kind.search",
		"FIELD_PLACEHOLDER",
		"FIELD_GLYPH",
		"CHIPS_RUN",
		"CHIPS_TRIGGER",
		"ICON.fit.control",
		"PICKER_EMPTY",
		"POPOVER",
		"LAYER_POPOVER",
		"PICKER_POPOVER",
		"ROW.state.rest",
		"ROW.state.highlighted",
		"ROW.state.pressed",
		"OPTION_ROW",
		"TEXT.role.body",
		"TEXT.role.meta",
		"ICON.fit.body",
		"BUTTON.act.quiet",
		"BUTTON_LABEL.act.quiet",
		"PAINT.kind.control",
		"CHEVRON",
		"BLOCK_IN",
		"OPTION_LIST",
		"OPTION_GROUP_LABEL",
		"TEXT_STRONG.role.meta",
		"OPTION_LINE",
		"LINE_BOX.role.body",
		"LINE_BOX.role.meta",
		"CHECKBOX",
		"CHECKBOX_MARK",
		"OPTION_RADIO",
		"OPTION_RADIO_DOT",
		"ROW_TITLE_LINE",
		"ROW_META_LINE",
		"CHIP.family.neutral",
		"CHIP_LABEL.family.neutral",
		"OPTION_CHILDREN",
		"OPTION_INDENT",
		"PAINT.kind.glyphs",
		"SCRAMBLE",
		"LINE_IN",
		"SEGMENTED_CONTROL",
		"SEGMENT",
		"SEGMENT_GROUND",
		"SEGMENT_TRACK",
		"SEGMENT_CHOSEN",
		"SEGMENT_IDLE",
		"SEGMENT_LABEL",
	],
	states: [...PRESS, "loading", "selected", "disabled", "error"],
	motion: ["answer", "give", "toggle", "layer", "block", "line", "wait"],
	owns: {
		roles: ["body", "meta", "caption"],
		colors: [
			"skeleton",
			"ink-body",
			"ink-meta",
			"ink-mark",
			"ink-disabled",
			"surface",
			"edge",
			"edge-hover",
			"edge-error",
			"edge-strong",
			"fill-disabled",
			"raised",
			"avatar-",
			"chip-",
			"edge-raised",
			"wash-hover",
			"wash-press",
			"wash-selected",
			"wash-selected-hover",
			"group",
			"toggle-on",
			"on-accent",
			"ring",
		],
		radii: ["full", "control", "popover", "row", "card", "chip"],
		spacing: ["gap", "pad"],
		sizes: [
			"icon-meta",
			"target",
			"row",
			"popover",
			"line-body",
			"hairline",
			"measure-short",
			"icon",
			"icon-control",
			"dot",
		],
		elevation: ["float"],
	},
};

// One segment of a `Picker` in `fit: segments`: a choice (its `value`), or a
// link (an `href` and no value), which the Picker marks selected while the
// location is its href or below it, and opens when it is pressed. A Picker
// holds choices or links, never both. A label is a word, up to the short
// measure.
export interface ChoiceSegment<V extends string = string> {
	value: V;
	label: string;
	href?: never;
}

// A radio's dot grows from nothing on `fast` and shrinks on `instant`.
export const RADIO_DOT =
	"transition-[scale] duration-fast ease-out data-starting-style:scale-0 data-ending-style:scale-0 data-ending-style:duration-instant";

// A single-choice option's radio: a ring at the box's size, the chosen one
// in the checkbox's fill around its dot (`OPTION_RADIO_DOT`).
export const OPTION_RADIO = matrix({
	base: `size-icon-control rounded-full border ${ANSWER}`,
	variants: {
		state: {
			unchecked: "border-edge",
			checked: "border-toggle-on",
		},
	},
	defaultVariants: { state: "unchecked" },
});

// A segment flush in its track at the control height, the chosen one
// in body ink; the selection wash is the track's one ground (`SEGMENT_GROUND`),
// which slides from segment to segment. The box carries its ink for a web
// glyph; the label repeats it, since a native Text inherits none.
export const SEGMENT = matrix({
	base: `rounded-control min-h-control px-pad ${ANSWER} ${GIVE}`,
	variants: {
		state: {
			idle: "text-ink-meta",
			selected: "text-ink-body",
		},
	},
	defaultVariants: { state: "idle" },
});

export const SEGMENT_LABEL = matrix({
	base: `text-body leading-body ${ANSWER}`,
	variants: {
		state: {
			idle: "text-ink-meta font-normal",
			selected: "text-ink-body font-medium",
		},
	},
	defaultVariants: { state: "idle" },
});

// The pick's trigger by where it stands: a field box (`FIELD` at the bar
// fit) in a toolbar, a field box that fills its column in a rule row (`bar`:
// its value, or the chips of a several pick, wrap inside it), or a row's
// trailing value in a `WORD_ACT` box, its ink the meta ink for the chevron beside
// the value, or the context pill of a Pane's bar (`pill`), its chevron in the
// mark ink.
export const PICKER = matrix({
	base: "",
	variants: {
		// A pick in a form keeps the field's ink; one in a bar (no form around
		// it) is the field box in the meta ink, a word act in a row (the meta
		// ink its chevron's, the value it shows in the body ink, `PICKER_VALUE`),
		// a pill.
		fit: {
			field: "",
			bar: "gap-gap text-ink-meta",
			row: "gap-gap text-ink-meta",
			pill: "gap-gap text-ink-mark",
		},
	},
	defaultVariants: { fit: "field" },
});

export const optionRadio = build(OPTION_RADIO);
export const segment = build(SEGMENT);
export const segmentLabel = build(SEGMENT_LABEL);
export const picker = build(PICKER);

// A bar pick that holds no value is quiet: no edge, the wash under the pointer;
// set, it takes the field box and its value in the body ink.
export const FIELD_QUIET =
	"border-transparent bg-transparent hover:bg-wash-hover";

// A pick of several's chips wrap in a run inside its field box, a badge's
// room above and below them: one line of chips centres in the control, and a
// wrapped run keeps that room at the box's edges. The trigger beside the run
// reaches across the box's border, so its hit is the box's height.
export const CHIPS_RUN = "py-badge";
export const CHIPS_TRIGGER = "-my-hairline py-hairline";

// An option group's label over its rows, inset to the rows' text.
export const OPTION_GROUP_LABEL = "px-pad pt-gap";

// A picker's empty choice and its control with no value: a placeholder's
// look.
export const PICKER_EMPTY = "text-ink-meta";
// The value a row's pick shows in its box (`PICKER {fit: row}`), bounded as a
// status' label is so a long one truncates before the title beside it does,
// in the body ink: it is the value the row's label names (voice 7, 11), as a
// plain value beside it is, its chevron alone in the trigger's meta ink. The
// field fit's value is `FIELD_VALUE`'s.
export const PICKER_VALUE =
	"max-w-measure-short tabular-nums text-meta leading-meta font-normal text-ink-body";
// The pick's popover at the popover's width (its ground and inset are
// `POPOVER`'s).
export const PICKER_POPOVER = "w-popover";
// The pick of a Pane's bar (`PICKER {fit: pill}`): the field box at the bar
// fit (the control height, the control radius, a hairline border on
// the surface) under the hover wash in place of the hover edge, held to the
// popover's width so a long label truncates.
export const PICKER_PILL = "max-w-popover hover:bg-wash-hover";

// A row's pick that is a pill keeps the target's hit box around the pill, the
// caption line between its hairlines, pulled back by what the target has over
// it, so its row keeps its height.
export const ITEM_PILL_HIT = `group min-h-target min-w-target -my-[calc((var(--spacing-target)-1lh)/2-var(--spacing-hairline))] focus-visible:outline-none ${text({ role: "caption" })}`;

// A head's pick fact whose chosen option carries a state is the state pill
// itself (`STATE_CHIP`) with its chevron, one box: under the pointer and
// pressed its hairline darkens to the state's ink, as an outlined control's
// darkens to the strong edge (voice 5), so its soft fill keeps its hue.
export const ITEM_PILL_STATE_ACT = `gap-gap group-hover:border-current group-active:border-current in-data-[modality=keyboard]:group-focus-visible:outline-2 group-focus-visible:outline-ring ${ANSWER}`;
// In a head a pill, outlined or a state's, stands at the badge's height, the
// meta line, its hairlines inside it; in a row it is a chip's, the caption
// line between its hairlines.
export const ITEM_PILL_HEAD = "h-lh";

// A list of options, several or one chosen: its option groups on a hairline
// card at the float inset; an option's box or radio beside its label, and
// the children under a chosen option inset past the box.
export const OPTION_LIST =
	"gap-gap p-gap rounded-card border border-edge bg-surface";
export const OPTION_LINE = "gap-gap";
export const OPTION_CHILDREN = "ms-icon-control px-pad pb-gap";
// The children stand in past the box by the box's width (the group's margin)
// and the gap after it (the body's): room is a margin on a box that draws,
// never an empty element.
export const OPTION_INDENT = "ms-gap";
// The chosen radio's dot, centred in its ring.
export const OPTION_RADIO_DOT = `size-dot rounded-full bg-toggle-on ${RADIO_DOT}`;
// The segments' track: flush, so the control stands at a segment's height.
export const SEGMENTED_CONTROL = "rounded-control bg-group";
// The web's track has no ground and no border: its segments stand an inside
// gap apart, the chosen one under a 2 px ink underline on its own box (a web
// overlay: the phone keeps its ground).
export const SEGMENT_TRACK = "gap-gap";
export const SEGMENT_CHOSEN =
	"rounded-b-none border-b-2 border-ink-body hover:bg-wash-hover active:bg-wash-press";
// A segment that is not chosen holds the underline's room, clear.
export const SEGMENT_IDLE =
	"rounded-b-none border-b-2 border-transparent hover:bg-wash-hover active:bg-wash-press";
// The selection wash of a segmented control: one ground under the chosen
// segment, which moves from the old segment to the new (a view transition on
// the web, a layout transition on the phone) instead of one segment's fill
// switching off as another's switches on. Under the pointer it is a step
// darker (a platform overlay on the web; the phone has no hover).
export const SEGMENT_GROUND = "rounded-control bg-wash-selected min-h-control";

export type PickerFit = keyof (typeof PICKER)["variants"]["fit"];
