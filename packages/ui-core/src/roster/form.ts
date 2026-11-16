import type { RosterEntry } from "./shared.ts";
import { SUBGRID } from "./shared.ts";

// A form is its procedure and its field labels. `act` is the procedure it
// submits and `fields` the input's keys it shows (in order, or `groups`, each
// a run of the form's rows under a band, the title at the heading role over
// the description); `given` is what the screen supplies and `values` the
// fields' first values (a selection paints them until its read lands). Each
// field is drawn from the procedure's input schema: a string a line of text
// (or prose, source, one-time code boxes, a date by its hint), an enum a pick, a boolean a switch, a
// number a numeric line, a list of an enum a pick of several, a date a date
// line (`Input kind=date`), a string with the `source` hint the mono text area (`Input kind=prose source`) and with the `code` hint the one-time code boxes (`Input kind=code`, `length` the schema's fixed length, the submit blocked until every box is filled), a string with the `file` hint a file pick
// (`Input kind=file`, its `accept`) whose picked file is read into the
// string, text or base64; a field the schema makes optional offers the empty
// choice and, in a submit form, says `optional` under its label in the meta ink
// (a form that commits by field marks no field), and one it requires blocks
// the submit while it is empty; a value of the wrong type blocks it naming
// the field (`checkField`), and a saved secret left untouched is not sent. The field is a definition row
// (its label in the label column, as wide as the form's widest, its control
// filling the value line, a switch at its end, the description or the issue
// the server's schema refused under the control, in error); in a form that
// commits by field it is a row of two groups, the label over its description
// and the control at its own measure beside them; a refusal of a
// field stands until it is changed. `submit` words the form's last row under
// a hairline across it, the bar whose filled act submits the form and whose
// other acts stand inert beside it while it runs: pending after the act
// delay, a rejection in the bar's kept line under the acts (`error`), the act
// ready again. `acts` stand in that bar before the filled act (a Cancel, a
// destructive Decline with `confirm`), run as any bar's acts; with
// `commit: "field"` they stand in a bar of their own under the fields.
// `onDone` hears the output and the input the form sent. A field with `locked` stands inert with the reason in the
// description's place. A field's `control` hint draws what the schema cannot say; `lines` draws a list as a line per item (blank lines dropped, each line read as the item type, a line that fits none the field's issue) and `json` an object as mono JSON source (parsed at commit, a parse error the field's issue). `commit: "field"` draws no bar: each field sends `given`
// and its own key when its control commits (a text on blur or Enter, a
// switch or a pick on its change, a file as picked), draws its own refusal,
// and `submit`'s `done` is toasted per commit; a settings page is such a form.
// `can` is the ability the caller needs, `[action, subject]` in the
// route's organization: a caller who may not has the fields and the act
// disabled under the word `denied`, the form painted until the ability lands. A Form placed alone is a card of rows over its bar, a
// Gate's `form` a card of rows with its bar after the card (web); a Sheet's `form` is rows flush on
// the sheet after the body's parts, its bar stuck to the body's foot (web),
// in the sheet's pinned foot (phone). The bar paints its filled act, inert,
// while the form's own read waits (a sheet's too), and stands blocked with
// the failed sentence once that read failed or is missing; a group's read is
// the group's and never reaches the bar. The form draws no busy mark of its
// own for an act that runs. The drawers a form is made of, which no app
// places: the field it draws for each key and the bar of acts that
// submits.
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
		"LINE_IN",
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
	motion: ["block", "answer", "give", "line", "wait", "value"],
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
