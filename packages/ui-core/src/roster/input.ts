import { ANSWER, build, matrix, type RosterEntry } from "./shared.ts";

// What is typed or picked, by `kind`: docs/architecture/ui-core/acts.md, "Fields".
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
		"FLOW_IN",
		"PAINT.kind.control",
	],
	states: ["rest", "hover", "focus", "disabled", "error", "empty", "pending"],
	motion: ["answer", "flow", "wait"],
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
