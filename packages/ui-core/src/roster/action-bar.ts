import type { RosterEntry } from "./shared.ts";
import { ANSWER } from "./shared.ts";

// The acts that close a form, a sheet or a decision, or that apply to the
// rows chosen in a list: a record's decision bar (Approve, Decline), a
// Gate's acts, a pane's own close. `acts` in reading order, the one filled
// act last (`danger` when it is destructive, a hairline `destructive`
// otherwise), a `LinkAct` an anchor, quiet unless it is the filled act. On the web the width of
// the block it closes lays it out (the `acts` container): up to the auth
// width its acts stack one per row across it, the filled act on top; wider
// they stand at their own width at its end, wrapping to a further row with
// the filled act last. On the phone `fit` (the phone's alone) is `end`, the
// default, or `full`, one act per row at the field's height. An act's `onAct` promise is the bar's run: while one
// pends the others are inert, a rejection stands in the bar's line under the
// acts, and a blocked act is silent until it is pressed or its form or
// sheet has taken input, then its reason (the pressed act's, else the last
// blocked act's) stands in the line under the acts, at the filled act's
// edge (web), the line leaving with it. `chosen` makes it a selection
// bar of one row: the count at its start, then the select-all act and the clear
// icon, and at its end the more menu holding every act but the last, then the
// filled act; it draws nothing while no row is ticked. `pending` stands a
// pending bar in its place at its own height. A `Form`'s bar and a `Sheet`'s foot are this bar, and
// so is the selection bar the route gives a Pane's `foot` for a `Table`'s
// ticked rows.
export const actionBarEntry: RosterEntry = {
	props: ["acts", "fit", "chosen", "pending"],
	draws: [
		"ACTION_BAR",
		"ACTION_BAR_ACTS",
		"ACTION_BAR_CHOSEN",
		"ACTION_BAR_SELECTION",
		"ACTION_BAR_ALL",
		"BUTTON",
		"BUTTON_LABEL",
		"TEXT.role.meta",
		"FIELD_ERROR_LINE",
		"PENDING_BAR",
		"LINE_IN",
	],
	states: ["rest", "disabled", "pending", "error"],
	motion: ["answer", "give", "line", "wait"],
	owns: {
		roles: ["body", "meta"],
		colors: [
			"act-",
			"on-act-",
			"edge",
			"ink-body",
			"ink-meta",
			"ink-error",
			"danger",
			"wash-hover",
			"wash-press",
			"fill-disabled",
		],
		radii: ["control"],
		spacing: ["gap", "pad"],
		sizes: ["control", "target"],
	},
};

// A selection bar's count of the rows a list chooses: `count` of `of` (the rows
// that can be chosen), its numbers formatted. `onAll` adds the acts beside the
// count: one that clears the rows while any are chosen (it hears `false`) and one
// that chooses every row while some stand unchosen (`true`).
export interface ChosenCount {
	count: number;
	of: number;
	// What the rows are called in the sentence (a plural word, "items"): "2 of 4 items chosen"; without it "2 of 4 chosen".
	noun?: string;
	onAll?: (all: boolean) => void;
}

// A selection bar's gaps, a pair apart: the row holding the count and its
// acts (the count at the start and the acts at the end, or stacked on touch)
// and the count's own row with its choose-all act.
export const ACTION_BAR_CHOSEN = "gap-gap";
// A selection bar's column: the body's column, at its start, where it docks in
// a Pane's foot (the reading width; the body's width where the body holds wide
// content, which sets `--foot-column` to it), so it stands on the page's grid with the rows it counts.
export const ACTION_BAR_SELECTION =
	"w-full self-start max-w-[var(--foot-column,var(--container-reading))]";
// The act beside a selection bar's count that chooses or clears every row:
// words at the control radius, as the filled act beside it, washed at the
// pointer.
export const ACTION_BAR_ALL = `rounded-control px-gap min-h-target ${ANSWER}`;

// Where an action bar stands: at the end of its container at the acts' width,
// or across it, each act at the field's height (structure, no cell).
export type ActionBarFit = "end" | "full";
