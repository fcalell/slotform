import type { RosterEntry } from "../roster.ts";

// A sheet holds a task (a form, a decision, an acknowledgement): a record is
// read in its Pane, never in a sheet.
// The submit stands in the foot after the body, so it follows the fields
// it submits: after Cancel on the desktop, alone on touch, where the close
// act leads the head; a blocked submit's reason or a rejected act's
// sentence under it. A `submit` with no `onAct` acknowledges what the
// sheet shows ("I saved them"): its press closes the sheet and it stands
// alone, with no Cancel.
// `form` is a Form's props, drawn after the children in the sheet's
// column (its `bar` stuck to the edge of the body on the web, in the pinned
// foot on the phone); the sheet's `submit` and the form's `bar` are two
// ways to complete the task, one given. Always the modal sheet: a Pane's or
// a Thread's `sheet` (these props) docks there instead, drawing the
// docked head and foot inside the foot's raised cell with no scrim. The
// docked foot's states are its submit's: pending, blocked
// (`disabled`), and failed (`error`, the act ready again, the rejection's
// sentence under it in the line a blocked reason keeps, in the field
// error's cell and ink). The sheet hosts its acts' run, foot bar and its
// form's bar alike: its dismissal is held while one pends,
// unless it waits for a connection.
export const sheetEntry: RosterEntry = {
	props: [
		"open",
		"onClose",
		"title",
		"description",
		"back",
		"submit",
		"read",
		"empty",
		"form",
		"children",
	],
	draws: [
		"BLOCK_IN",
		"SHEET",
		"SHEET_DESKTOP",
		"SHEET_CENTERED",
		"SHEET_HEAD",
		"SHEET_HEAD_ROW",
		"SHEET_PARTS",
		"SHEET_PARTS_END",
		"SHEET_FOOT",
		"SHEET_DOCKED_HEAD",
		"SHEET_DOCKED_BODY",
		"SHEET_DOCKED_FOOT",
		"SHEET_DOCKED_FLOOR",
		"THREAD_COLUMN",
		"SCRIM",
		"LAYER_CARD",
		"LAYER_SHEET_BOTTOM",
		"LAYER_SCRIM",
		"TEXT.role.heading",
		"TEXT.role.body",
		"TEXT_STRONG.role.body",
		"TEXT.role.meta",
		"FIELD_ERROR_LINE",
		"ICON_BUTTON.fit.body",
		"BUTTON.act.primary",
		"BUTTON_LABEL.act.primary",
		"PAINT.kind.control",
		"LINE_IN",
	],
	states: [
		"rest",
		"disabled",
		"loading",
		"pending",
		"empty",
		"error",
		"busy",
		"stale",
		"paused",
	],
	motion: ["answer", "give", "layer", "block", "line", "wait", "follow"],
	owns: {
		roles: ["heading", "body", "meta"],
		colors: [
			"skeleton",
			"scrim",
			"raised",
			"edge-raised",
			"edge",
			"ink-body",
			"ink-meta",
			"ink-error",
			"act-accent",
			"on-act-accent",
		],
		radii: ["sheet", "control"],
		spacing: ["gap", "pad", "stack", "section", "page"],
		sizes: ["sheet", "dialog", "measure", "control", "row"],
		elevation: ["modal"],
	},
};

// A sheet on touch, raised from the bottom edge; on the desktop a card
// (`SHEET_DESKTOP`, a form at the sheet's width, the sheet pattern's 610 to 730,
// not the dialog's) or a decision centred at the dialog's width, its one region
// at the card inset.
export const SHEET =
	"bg-raised border-t border-edge-raised rounded-t-sheet shadow-modal";
export const SHEET_DESKTOP =
	"w-sheet bg-raised border border-edge-raised rounded-sheet shadow-modal";
export const SHEET_CENTERED =
	"gap-stack w-dialog p-pad bg-raised border border-edge-raised rounded-sheet shadow-modal";

// A sheet's regions in every form but the centred one: the head over a
// hairline (its row, then a blocked submit's reason on touch), the body's
// parts at the card inset, its sections a sections gap apart (`SHEET_PARTS`;
// the body's form stands after them, its rows flush, the body scrolling both),
// the foot under a hairline (its
// line centred beside the acts) on the sheet's own ground, since on touch it
// stands over the end of the scrolling body.
export const SHEET_HEAD = "gap-gap px-pad py-gap border-b border-edge";
// The head's row: the lead act, the title over the description, the end act,
// the title centred on the acts, which set the row's height.
export const SHEET_HEAD_ROW = "gap-gap";

// A sheet with no foot ends on its last part, so the body's end keeps a sections
// gap under it (the docked body's), not the card inset it keeps at the sides: a
// banner or a code that closes the body stands off the sheet's bottom edge.
export const SHEET_PARTS_END = "pb-section";
export const SHEET_FOOT =
	"gap-gap px-pad py-pad border-t border-edge bg-raised";
// A sheet docked in a foot (`FOOT_DOCKED`): the foot is the raised cell, so the
// head, the body and the foot carry no surface, radius, shadow, hairline or
// side inset of their own, so all three share the foot's edge; the head's back
// act stands before one column, so the title and the description share one
// start: the title over the description a pair apart; the body keeps its sections a
// sections gap apart, the card inset above and a sections gap below (the last row clears the submit by the gap the rows keep), the foot's line
// beside or over the acts an acts gap apart.
export const SHEET_DOCKED_HEAD = "gap-gap";
export const SHEET_DOCKED_BODY = "gap-section pt-pad pb-section";
export const SHEET_DOCKED_FOOT = "gap-gap";
// In a foot the body's content keeps its floor whatever the head, the foot line and the log hold; the scroller around it, bounded by `dockedBodyMax`, gives below it where the region is short.
// The floor is `DOCKED_FLOOR_ROWS` rows; under a log, `DOCKED_LOG_FLOOR_ROWS`.
export const DOCKED_FLOOR_ROWS = 3;
export const SHEET_DOCKED_FLOOR = "min-h-[calc(3*var(--spacing-row))]";

// A bottom sheet slides from its edge and back to it.
export const LAYER_SHEET_BOTTOM =
	"transition-transform duration-base ease-out data-starting-style:translate-y-full data-ending-style:translate-y-full data-ending-style:ease-in";
