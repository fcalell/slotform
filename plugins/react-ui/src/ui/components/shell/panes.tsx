import { cn } from "@fcalell/ui-core/cn";
import { type ReactNode, use, useMemo, useState } from "react";
import {
	type PaneKind,
	PanesContainer,
	ShellMenu,
} from "../../lib/container.ts";
import { DistanceContext } from "../../lib/media.ts";

// The Panes holds at most two Panes: docs/architecture/ui-core/layout.md, "Panes".
const PLACE = "@container/place flex grow min-h-0 min-w-0";
const SHARE =
	"[&>[data-page]:not(:last-of-type)]:w-list [&>[data-page]:not(:last-of-type)]:min-w-region-min [&>[data-page]:not(:last-of-type)]:shrink [&>[data-page]:not(:last-of-type)]:grow-0 [&>[data-page]:not(:last-of-type)]:basis-auto [&>[data-page]:not(:last-of-type)]:border-e [&>[data-page]:not(:last-of-type)]:border-edge place-tablet:[&>[data-page]:last-of-type:not(:first-of-type)]:min-w-[min(var(--container-list),calc(100%-var(--container-region-min)))]";
const CANVAS =
	"[&>[data-page][data-fill]:not(:last-of-type):has([data-wide])]:grow [&>[data-page][data-fill]:not(:last-of-type):has([data-wide])]:basis-0 place-tablet:[&>[data-fill]:has([data-wide])+[data-page]:last-of-type:not([data-expanded])]:grow-0 place-tablet:[&>[data-fill]:has([data-wide])+[data-page]:last-of-type:not([data-expanded])]:basis-auto place-tablet:[&>[data-fill]:has([data-wide])+[data-page]:last-of-type:not([data-expanded])]:w-list";
const FOLD =
	"place-max-tablet:[&>[data-page]:not(:last-of-type)]:hidden [&>[data-page]:has(~[data-expanded])]:hidden";
// Only a record's head draws these acts: docs/architecture/ui-core/layout.md, "Panes".
const ACTS =
	"[&>[data-page]]:[--pane-back:none] [&>[data-page]]:[--pane-close:flex] [&>[data-page]]:[--pane-expand:none] [&>[data-page]:not(:first-of-type)]:[--pane-expand:flex] place-max-tablet:[&>[data-page]]:[--pane-back:flex] place-max-tablet:[&>[data-page]]:[--pane-close:none] place-max-tablet:[&>[data-page]:not(:first-of-type)]:[--pane-expand:none]";
// A place read from across a room is one column that never splits: only its
// last Pane stands, alone, and its head draws the room's acts itself.
const ROOM = "[&>[data-page]:not(:last-of-type)]:hidden";

// The page's one `h1` is the Panes's: docs/architecture/ui-core/layout.md, "Headings".
const NAME = "sr-only";

// A room Panes states its distance: docs/architecture/ui-core/layout.md, "Panes".
export function Panes(props: {
	distance?: "room";
	/** The page's `h1`, the name of where you are, drawn apart from sight; the place's Pane takes it as its title and a record's Pane draws it before the record's name. The Shell gives it the current place's name, so a route inside a Shell writes none; a room page standing without a Shell writes it once. */
	title?: string;
	children?: ReactNode;
}) {
	const far = props.distance === "room";
	const menu = use(ShellMenu);
	const [stand] = useState(standing);
	const frame = useMemo(
		() => ({ name: props.title, stand }),
		[props.title, stand],
	);
	return (
		<DistanceContext value={far}>
			<ShellMenu value={far ? undefined : menu}>
				<PanesContainer value={frame}>
					<div
						data-density={far ? "room" : undefined}
						className={cn(PLACE, SHARE, CANVAS, FOLD, ACTS, far && ROOM)}
					>
						{props.title ? <h1 className={NAME}>{props.title}</h1> : null}
						{props.children}
					</div>
				</PanesContainer>
			</ShellMenu>
		</DistanceContext>
	);
}

// What a second Pane of a kind in one Panes breaks.
const SECOND: Record<PaneKind, string> = {
	record:
		"Panes: a second record's Pane; a record linked from a record opens in its own place",
	place: "Panes: a second place's Pane; a place's tabs stand in its one Pane",
};

// A Panes holds one Pane of each kind: docs/architecture/ui-core/layout.md, "Panes".
function standing(): (kind: PaneKind) => () => void {
	const count: Record<PaneKind, number> = { place: 0, record: 0 };
	return (kind) => {
		if (count[kind] === 1) throw new Error(SECOND[kind]);
		count[kind] += 1;
		return () => {
			count[kind] -= 1;
		};
	};
}
