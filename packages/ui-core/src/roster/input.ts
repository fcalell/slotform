import { ANSWER, build, matrix, type RosterEntry } from "./shared.ts";

// What is typed or picked, by `kind`. A line of text (`text`, `search`,
// `secret`, `source`, `number`, `email`, `date`); `prose`, many lines in a box that
// grows from three, its `budget` counted under it; `code`, a one-time
// code, a box per digit over one input, checked when the last lands; `file`,
// the field box that chooses a file: empty, its whole box is the act (a
// leading glyph and the `chooseFile` word); chosen, the name, the size and
// an act that removes it. The web's file box also takes a dropped file,
// ringed while one is over it. A file of another type is refused in a line
// under the box and never reaches `onChange`.
// Every control is a field, named by its `label`, one drawer for them
// all (the `FormField` body): placed alone it draws its field, the name
// over the control a gap apart (`FIELD_ALONE`; a toggle at the end of its
// name's line, `FIELD_ALONE_LINE`; a slider's head is its name; in a run of
// rows, a `Card`, a line's name takes the run's label column,
// `FIELD_ALONE_ROW`) with the
// word `optional` under the name, and the `description` or the `error` (a
// refused save's reason, until the next change) under the control. Where
// an owner names it (a Form's field, a Toolbar) and at a fit that reads
// the label in its box (`search`, a Picker's `bar`, `row` and `pill`), the
// label is its accessible name and nothing is drawn around it. A Picker
// `headed`, a list that is the body of a titled Section, is named by the
// Section's title and draws nothing around it. A place's tabs are
// links, no control, and take none.
export const inputEntry: RosterEntry = {
	props: [
		"label",
		"description",
		"optional",
		"error",
		"kind",
		"value",
		"onChange",
		"onCommit",
		"placeholder",
		"unit",
		"act",
		"autoFocus",
		"source",
		"budget",
		"length",
		"onComplete",
		"accept",
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
		"FIELD",
		"FIELD_VALUE",
		"FIELD_PLACEHOLDER",
		"FIELD_UNIT",
		"FIELD_GLYPH",
		"FIELD_ERROR_LINE",
		"TEXT_AREA",
		"TEXT_AREA_BUDGET",
		"TEXT_AREA_VALUE",
		"OTP",
		"OTP_BOX",
		"OTP_DIGIT",
		"TEXT.role.meta",
		"FIGURES",
		"ICON.fit.control",
		"SPINNER",
		"LINE_IN",
		"PAINT.kind.control",
	],
	states: ["rest", "hover", "focus", "disabled", "error", "empty", "pending"],
	motion: ["answer", "line", "wait"],
	owns: {
		roles: ["body", "code", "meta", "caption", "heading"],
		colors: [
			"skeleton",
			"surface",
			"edge",
			"edge-hover",
			"edge-error",
			"ink-body",
			"ink-meta",
			"ink-error",
			"fill-disabled",
			"ink-disabled",
			"ring",
		],
		radii: ["control"],
		spacing: ["gap", "pad"],
		sizes: ["icon-control", "measure-short", "line-body", "icon"],
	},
};

// Many lines: the box grows with its value and stacks the budget under it.
export const TEXT_AREA = matrix({
	base: `rounded-control border px-pad py-gap bg-surface ${ANSWER}`,
	variants: {
		state: {
			rest: "border-edge",
			error: "border-edge-error",
		},
	},
	defaultVariants: { state: "rest" },
});

// The word budget's counter, in the error ink once over it.
export const TEXT_AREA_BUDGET = matrix({
	base: "text-caption leading-caption tracking-caption font-normal tabular-nums",
	variants: {
		state: {
			rest: "text-ink-meta",
			error: "text-ink-error",
		},
	},
	defaultVariants: { state: "rest" },
});

// One box per digit; the row is one input and one target. A box is its digit's
// line and the control's inset on both sides, square: it stands at that size
// and shrinks, square, when its row is narrower than the boxes.
export const OTP_BOX = matrix({
	base: `w-[calc(var(--spacing-line-body)+2*var(--spacing-pad))] min-w-0 shrink aspect-square rounded-control border bg-surface ${ANSWER}`,
	variants: {
		state: {
			rest: "border-edge",
			error: "border-edge-error",
		},
	},
	defaultVariants: { state: "rest" },
});

export const textArea = build(TEXT_AREA);
export const textAreaBudget = build(TEXT_AREA_BUDGET);
export const otpBox = build(OTP_BOX);

// A field's unit after its value, cut at the short measure.
export const FIELD_UNIT =
	"max-w-measure-short text-body leading-body font-normal text-ink-meta";

// A text area's value: three body lines at least, a line more for each past them.
export const TEXT_AREA_VALUE = "min-h-[calc(3*var(--spacing-line-body))]";
// A one-time code's row of boxes and the digit in each.
export const OTP = "gap-gap";

export const OTP_DIGIT =
	"text-heading leading-heading font-medium text-ink-body font-mono";

export const FIELD_VALUE = matrix({
	base: "",
	variants: {
		kind: {
			text: "text-body leading-body font-normal text-ink-body",
			code: "text-code leading-code font-normal font-mono text-ink-body",
			search: "text-body leading-body font-normal text-ink-body",
		},
	},
	defaultVariants: { kind: "text" },
});

export type FieldKind = keyof (typeof FIELD_VALUE)["variants"]["kind"];
