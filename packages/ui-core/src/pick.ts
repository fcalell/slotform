// What a picker derives from its options and its value, in any of its fits: the search's threshold, the one-or-several split of a value, the option groups, the rows painted while they wait, whether segments are links and the link segment a location selects, the ends a segmented track holds more at than it shows. Both platforms' `Picker` draws from it.
import type {
	ChoiceSegment,
	LinkSegment,
	Option,
	OptionGroup,
} from "./descriptors.ts";
import { PAINT_ROWS } from "./paint.ts";

/** The option count past which a picker's search leads the list. */
export const SEARCH_PAST = 6;

/** A pick of several: the selected values and the handler of the next set. */
export interface Several<V extends string | null> {
	value: readonly V[];
	onChange: (value: V[]) => void;
}

/** One run of options under an optional label. */
export interface Grouped<V extends string | null> {
	label?: string;
	options: readonly Option<V>[];
}

/** A picker's options, flat or in groups. */
export type PickOptions<V extends string | null> =
	| readonly Option<V>[]
	| readonly OptionGroup<V>[];

/** The options as runs under their group labels; a flat list is one unlabelled run. */
export function groupsOf<V extends string | null>(
	options: PickOptions<V>,
): readonly Grouped<V>[] {
	return isGrouped(options) ? options : [{ options }];
}

function isGrouped<V extends string | null>(
	options: PickOptions<V>,
): options is readonly OptionGroup<V>[] {
	const first = options[0];
	return first !== undefined && "options" in first;
}

/** The option a pick holds: the one equal to `value`; a pick of one holding nothing (`undefined`, as a form's untouched optional pick) holds the empty choice (the `null` option) when the list offers one, so it reads as that choice and never as a blank box. A pick of several holding nothing holds none. */
export function pickCurrent<V extends string | null>(
	options: readonly Option<V>[],
	value: V | undefined,
	several: boolean,
): Option<V> | undefined {
	return options.find(
		(option) =>
			option.value === value ||
			(!several && value === undefined && option.value === null),
	);
}

/** The rows a waiting `items` paints: `PAINT_ROWS` options, in one group when the map declares `group`. */
export function paintedGroups<V extends string | null>(
	regions: { description?: unknown; group?: unknown } = {},
): PickOptions<V> {
	const options = Array.from({ length: PAINT_ROWS }, (_, at) => ({
		// A painted option's value is filler nobody reads, whatever `V` is.
		value: `painted-${at}` as V,
		label: "",
		description: regions.description === undefined ? undefined : "",
	}));
	return regions.group === undefined ? options : [{ label: "", options }];
}

const pathOf = (route: string) => route.replace(/[?#].*$/, "");

/** Whether the segments are links: the tabs of a place. */
export const linked = (
	options: readonly (ChoiceSegment<string> | LinkSegment)[],
): options is readonly LinkSegment[] =>
	options.some((segment) => segment.href !== undefined);

/** The link segment a location selects: the one whose href is the location's path or its nearest parent, the longest such href, so a section's own tab is selected below it and no tab is while the location is elsewhere. */
export function linkAt(
	links: readonly LinkSegment[],
	location: string,
): LinkSegment | undefined {
	const here = pathOf(location);
	let found: LinkSegment | undefined;
	let length = -1;
	for (const link of links) {
		const path = pathOf(link.href).replace(/\/$/, "");
		const held = here === path || here.startsWith(`${path}/`);
		if (held && path.length > length) {
			found = link;
			length = path.length;
		}
	}
	return found;
}

/** Which ends of a track that scrolls sideways hold more than the view shows, from its scroll offset, its room and its content's width: the start once it has scrolled, the end until it has scrolled to the end. A track that fits holds more at neither. The phone draws a cue at each (the web fades them from the scroll position alone). */
export function scrollEdges(
	offset: number,
	space: number,
	content: number,
): { start: boolean; end: boolean } {
	if (space <= 0 || content <= space + 1) return { start: false, end: false };
	return { start: offset > 1, end: offset + space < content - 1 };
}

/** One row of a picker's long list: a group's label, or an option at its place among the options (`index`, from 0). */
export type OptionRow<V extends string | null> =
	| { label: string }
	| { option: Option<V>; index: number };

/** The rows of a picker's long list, in order: each group's options, its label ahead of the first; a group with no options draws nothing, its label included. */
export function optionRows<V extends string | null>(
	groups: readonly Grouped<V>[],
): OptionRow<V>[] {
	const rows: OptionRow<V>[] = [];
	let index = 0;
	for (const group of groups) {
		if (group.options.length === 0) continue;
		if (group.label) rows.push({ label: group.label });
		for (const option of group.options) rows.push({ option, index: index++ });
	}
	return rows;
}
