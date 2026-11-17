import type { RosterEntry } from "./shared.ts";
import { SUBGRID } from "./shared.ts";

// A form is its procedure and its field labels: docs/architecture/ui-core/acts.md, "Forms".
export const formEntry: RosterEntry = {
	props: [
		"act",
		"fields",
		"groups",
		"given",
		"values",
		"commit",
		"submit",
		"acts",
		"onDone",
		"after",
		"can",
		"read",
		"empty",
	],
	draws: [
		"BLOCK_IN",
		"FORM_FOOT",
		"FORM_GROUP",
		"FORM_FOOT_STUCK",
		"ROWS",
		"CARD",
		"GROUP_ITEM",
		"LIST_BAND",
		"TEXT.role.heading",
		"TEXT.role.meta",
		"FIELD_ERROR_LINE",
		"FIELD_OPTIONAL",
		"FIELD_SPLIT",
		"FIELD_SPLIT_TEXT",
		"FIELD_SPLIT_VALUE",
		"FIELD_SPLIT_FREE",
		"FORM_FIELD_SUMMARY_GLYPH",
		"ROW.state.rest",
		"DEFINITION_BOX",
		"DEFINITION_LINE",
		"DEFINITION_UNDER",
		"DEFINITION_LABEL",
		"DEFINITION_NAME",
		"DEFINITION_VALUE",
		"ROW_END",
		"CHANGE_MARK",
		"ICON.fit.body",
		"ICON.fit.meta",
		"LINE_BOX.role.body",
		"TEXT.role.body",
		"TEXT_STRONG.role.body",
		"PAINT.kind.control",
		"FLOW_IN",
		"ACTION_BAR",
		"ACTION_BAR_ACTS",
		"BUTTON.act.primary",
		"BUTTON.fit.body",
		"BUTTON.fit.field",
		"BUTTON_LABEL.act.primary",
	],
	states: [
		"rest",
		"loading",
		"empty",
		"error",
		"busy",
		"stale",
		"paused",
		"disabled",
		"pending",
	],
	motion: ["block", "answer", "give", "flow", "wait", "value"],
	owns: {
		roles: ["heading", "body", "meta"],
		colors: [
			"edge",
			"ink-body",
			"ink-meta",
			"raised",
			"skeleton",
			"ink-error",
			"ink-disabled",
			"ok",
			"warn",
			"chip-amber",
			"danger",
			"act-accent",
			"on-act-accent",
			"act-danger",
			"on-act-danger",
			"wash-hover",
			"wash-press",
			"group",
		],
		spacing: ["stack", "section", "gap", "pad"],
		sizes: [
			"measure",
			"icon",
			"icon-meta",
			"control",
			"target",
			"measure-short",
			"hairline",
		],
		radii: ["control", "full"],
	},
};

export const FORM_GROUP = `${SUBGRID} *:col-span-2`;

// The box of a part that is no row (a form group's lead), at the card's inset.
export const GROUP_ITEM = "p-pad";

// A form's foot: its action bar, the last row of the form under a hairline
// across it, at the rows' inset; in a sheet it sticks to the scroller's foot
// on the raised ground, so what scrolls under it shows in no gutter.
export const FORM_FOOT = "border-t border-edge p-pad";
export const FORM_FOOT_STUCK = "sticky bottom-0 bg-raised";
