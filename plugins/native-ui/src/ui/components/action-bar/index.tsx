import type { ChosenCount } from "@fcalell/ui-core/descriptors";
import type { ActionBarFit } from "@fcalell/ui-core/variants";
import type { Act } from "../../lib/act";
import type { Closed } from "../../lib/closed";
import type { PendingBarProps } from "../banner/pending";
import { ActionBarBase } from "./base";

export interface ActionBarProps extends Closed {
	acts: Act[];
	// Where the bar stands: at its container's end (the default), or across it
	// (a `Gate`'s form draws its bar so).
	fit?: ActionBarFit;
	// A chosen bar: "N of M chosen" at meta, its numbers formatted (a
	// `Table`'s `choose` set against its rows), with `onAll` a select-all and a
	// deselect-all act beside it (the first that applies stands, the other is in
	// a more menu), then in one row the more menu holding every act but the last
	// and the filled act. It draws nothing while no row is ticked or `of` is 0.
	// Docked as a `Pane's `foot` that the route gives only while a row is ticked
	// (the Pane reserves the foot's room for whatever it is given), its column
	// centred in it.
	chosen?: ChosenCount;
	// The server works on a decision: a pending bar takes the bar's place at
	// the bar's own loaded height, the acts kept under it unseen and out of
	// reach. A pending
	// form taller than the bar (its own `act` on a one-act bar) overlays what
	// stands below it.
	pending?: PendingBarProps;
}

// The acts that close a form, a sheet or a confirm, the filled act on top.
// A Pane's `foot` docks it; a Form or a Sheet keeps it in flow: docs/architecture/ui-core/acts.md, "ActionBar".
export function ActionBar(bar: ActionBarProps) {
	return <ActionBarBase {...bar} />;
}
