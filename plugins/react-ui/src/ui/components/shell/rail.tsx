import { cn } from "@fcalell/ui-core/cn";
import type { IconName } from "@fcalell/ui-core/descriptors";
import {
	PRESS_WASH,
	placeRow,
	placeRowGlyph,
	SHELL_RAIL_ENTRY,
	SHELL_RAIL_GLYPH,
	text,
} from "@fcalell/ui-core/variants";
import type { PointerEvent } from "react";
import { Named } from "../../atoms/button/glyph.tsx";
import { Icon } from "../../atoms/icon/index.tsx";
import { follow } from "../../lib/navigate.ts";
import { GLYPH, LABEL, ROW_BOX, ROW_SELECTED_PRESS } from "./row.ts";

// The group's entry is a place row cut to an icon: the current bar and wash
// when the current place is in the group, the selected ink alone when its
// column is the one standing, as a branch on the path to the current place.
function look(current: boolean) {
	return cn(
		placeRow({ state: current ? "selected" : "rest" }),
		ROW_BOX,
		current ? ROW_SELECTED_PRESS : PRESS_WASH,
	);
}

function glyph(icon: IconName, inked: boolean) {
	return (
		<span
			className={cn(
				placeRowGlyph({ state: inked ? "selected" : "rest" }),
				GLYPH,
			)}
		>
			<Icon name={icon} />
		</span>
	);
}

// The rail entry's glyph keeps its control square at its start, so it stands
// still while the rail's clip uncovers the label after it.
function railFace(icon: IconName, label: string, inked: boolean) {
	return (
		<>
			<span className={SHELL_RAIL_GLYPH}>{glyph(icon, inked)}</span>
			<span
				className={cn(
					text({ role: "body" }),
					placeRowGlyph({ state: inked ? "selected" : "rest" }),
					LABEL,
				)}
			>
				{label}
			</span>
		</>
	);
}

// An entry of the rail: a group's, whose press goes to its group's first place
// and which shows its group's column while a pointer rests on it or a focus
// stands on it, its label beside its glyph while the rail is open; a footer
// place's, which goes there; or the act that docks the column and folds it.
// The label is its accessible name; an entry given `named` wears it as its
// tooltip while it is true (the rail shut to its strip, which draws no label).
// Outside the package's exports.
export function RailEntry(props: {
	icon: IconName;
	label: string;
	// The current place is the entry's own (`page`) or stands in its group.
	current?: "page" | "true";
	// Its group's column is the one standing.
	shown?: boolean;
	// Where a press goes: a footer place's route, a group's first place. None
	// while the group's places wait, when a press shows its column.
	href?: string;
	// What a press runs where it goes nowhere (the dock act).
	onPress?: () => void;
	// A pointer came onto the entry (`wait`: its column follows a dwell later),
	// or a focus or a press landed on it (at once).
	onExpand?: (wait: boolean) => void;
	// The pointer left the entry before its column followed.
	onLeave?: () => void;
	named?: boolean;
}) {
	const {
		icon,
		label,
		current,
		shown,
		href,
		onPress,
		onExpand,
		onLeave,
		named,
	} = props;
	const near = {
		"aria-label": label,
		"aria-current": current,
		onPointerEnter: (event: PointerEvent<HTMLElement>) => {
			if (event.pointerType !== "touch") onExpand?.(true);
		},
		onPointerLeave: () => onLeave?.(),
		onFocus: () => onExpand?.(false),
		className: cn(look(current !== undefined), SHELL_RAIL_ENTRY),
	};
	const face = railFace(icon, label, current !== undefined || shown === true);
	const entry =
		href === undefined ? (
			<button
				type="button"
				{...near}
				onClick={onPress ?? (() => onExpand?.(false))}
			>
				{face}
			</button>
		) : (
			<a href={href} {...near} onClick={follow}>
				{face}
			</a>
		);
	// An entry that wears a tooltip some of the time keeps its place in the
	// tree, so a strip opening and shutting never mounts it again.
	return named === undefined ? (
		entry
	) : (
		<Named label={label} off={!named}>
			{entry}
		</Named>
	);
}

// A group on the touch layer's list: the rail's entry as a full row, with its
// label and a chevron on the way in. Outside the package's exports.
export function GroupRow(props: {
	icon: IconName;
	label: string;
	current: boolean;
	onPress: () => void;
}) {
	return (
		<button
			type="button"
			aria-current={props.current ? "true" : undefined}
			onClick={props.onPress}
			className={cn(look(props.current), "w-full text-start")}
		>
			{glyph(props.icon, props.current)}
			<span
				className={cn(
					text({ role: "body" }),
					placeRowGlyph({ state: props.current ? "selected" : "rest" }),
					LABEL,
				)}
			>
				{props.label}
			</span>
			<span className={cn(placeRowGlyph(), GLYPH)}>
				<Icon name="ChevronRight" />
			</span>
		</button>
	);
}
