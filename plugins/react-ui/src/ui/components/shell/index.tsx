import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@fcalell/ui-core/cn";
import type {
	GroupSpec,
	IconName,
	PlaceSpec,
} from "@fcalell/ui-core/descriptors";
import { BACK_GLYPH } from "@fcalell/ui-core/list-state";
import { PAINT_ROWS } from "@fcalell/ui-core/paint";
import { ShellHome } from "@fcalell/ui-core/react/frame";
import {
	FrameHolds,
	useFrame,
	useSelections,
} from "@fcalell/ui-core/react/read";
import { useWords } from "@fcalell/ui-core/react/words";
import {
	type Datum,
	isEnded,
	isSelection,
	paints,
} from "@fcalell/ui-core/read";
import { flatPlaces, placeAt, placeTrail } from "@fcalell/ui-core/route";
import {
	LAYER_CARD,
	placeRow,
	placeRowGlyph,
	SHELL_BANNER,
	SHELL_COLUMN,
	SHELL_COLUMN_AT,
	SHELL_COLUMN_FLOAT,
	SHELL_COLUMN_MOTION,
	SHELL_CONTAINER,
	SHELL_FOOT,
	SHELL_GROUP_LABEL,
	SHELL_INSET,
	SHELL_LAYER,
	SHELL_LOCKUP,
	SHELL_PAGE_SLIDE,
	SHELL_PLACES,
	SHELL_RAIL,
	SHELL_RAIL_ENTRY,
	SHELL_RAIL_GLYPH,
	SHELL_RAIL_MOTION,
	SHELL_RAIL_PANEL,
	SHELL_RAIL_REGION,
	SHELL_SIDEBAR,
	SHELL_SIDEBAR_REGION,
	SWITCHER_REGION,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { type ReactNode, type Ref, useMemo, useState } from "react";
import { Icon } from "../../atoms/icon/index.tsx";
import type { Closed } from "../../lib/closed.ts";
import { PlaceRoute, ShellMenu } from "../../lib/container.ts";
import { useDocked } from "../../lib/folds.ts";
import { type AppLockup, useLockup } from "../../lib/lockup.tsx";
import { useTouch } from "../../lib/media.ts";
import { isRoute, useRoute } from "../../lib/navigate.ts";
import { PAINT_BOX, Painted } from "../../lib/paint.tsx";
import { FrameBody } from "../../lib/read.tsx";
import { Button } from "../button/index.tsx";
import { ContainerHost, ContainerMain } from "./host.tsx";
import { Panes } from "./panes.tsx";
import { usePreview } from "./preview.ts";
import { GroupRow, RailEntry } from "./rail.tsx";
import { GLYPH, LABEL, ROW_BOX } from "./row.ts";
import { type Switcher, SwitcherPick } from "./switcher.tsx";
import { PlaceTree } from "./tree.tsx";

// A page read from across a room draws its own room `Panes` outside the Shell.
export { Panes };

// The shell fills the viewport; the page inside scrolls its own body.
const BOX = "flex h-dvh overflow-hidden";
const SIDEBAR = "relative flex flex-col shrink-0 min-h-0";
// The switcher region is a bar: its row centred in the strip, the close act
// (on the touch layer) at its end.
const REGION = "flex shrink-0 items-center gap-gap";
const PLACES = "flex flex-col";
const GROUP = "flex flex-col";
// With groups the sidebar is one body over the room the frame keeps for it:
// the rail, its entries scrolling above its footer places, and the column.
const SPLIT = "relative flex shrink-0 min-h-0";
const RAIL_ENTRIES = "flex flex-col gap-gap grow min-h-0 overflow-y-auto";
// The body lets the page take presses where nothing of it stands: the rail
// always takes them, the column only while it is open (`SHELL_COLUMN_MOTION`).
const RAIL_HIT = "pointer-events-auto";
const COLUMN_BODY = "flex flex-col min-h-0";
// The place's part of the page, which slides as the sidebar docks or folds;
// the place grows in it as it does in `main`.
const PAGE = "flex flex-col grow min-h-0 min-w-0";
const FOOT = "shrink-0";
const RAIL_FOOT = "flex flex-col gap-gap shrink-0 pt-gap";
// The touch group view's head: the way back to the groups, then the heading.
const BACK = "flex items-center gap-gap";
// The column clears the top safe inset, so a banner or a page's head never
// stands under a notch.
const COLUMN = "relative flex flex-col min-w-0 grow pt-safe";
const BANNER_REGION = "flex flex-col";
// The app's name beside its mark when the shell has no switcher.
const NAME = "truncate";
// The touch places layer stands over the whole viewport on the sheet's rung;
// its places scroll as the sidebar's do.
const LAYER = "fixed inset-0 z-(--layer-sheet) flex flex-col";
const CLOSE = "ms-auto";

/** A group of places the sidebar names: its label (beside its icon on the docked or open rail, and the heading of its places on the touch layer), its icon (its entry on the rail), its switcher when it is a scope, and its places when a read gives them. */
export interface ShellGroup extends Omit<GroupSpec, "switcher"> {
	/** The scope the group's places follow: it leads the group's column level with the app's switcher, and on the touch layer it stands under the heading. */
	switcher?: Switcher;
	/** The group's places, constants or a selection: the group stands where it stands in `groups`, whose order is the rail's: before the first plain group of places whose group `groups` lists after it, else after the plain ones. While the selection waits the heading draws over `PAINT_ROWS` painted place rows, inert; once it failed or is missing the group is the read's frame and draws the compact failed or missing shape with Retry in the rows' place (so the read counts as held and its failure is drawn once), and when it is loaded and empty the group draws no places, its `switcher` standing alone so its act can make the first. The group's `switcher` selections of the same read need no frame of their own. */
	places?: Datum<readonly PlaceSpec[]>;
}

/** The app's frame. */
export interface ShellProps extends Closed {
	/** The places, in order; the one at the current route is selected. */
	places: readonly PlaceSpec[];
	/** The groups, in the rail's order: every group a place names, which a place naming one `groups` does not list throws for, and the ones that carry a switcher or a read of their own (a group of its own stands before the plain group listed after it). A Shell that names any group draws a rail of them beside the column; one that names none draws the column alone. */
	groups?: readonly ShellGroup[];
	/** A `Banner` over the column, at the page inset. */
	banner?: ReactNode;
	/** What the app is looking at, and what it can switch to. */
	switcher?: Switcher;
	/** A part that stands under the place across the column (a `Dock`), whatever the route; without one the Shell draws nothing there. */
	foot?: ReactNode;
	/** The route's Panes, in order: each deeper one a step into what the one before it lists. */
	children?: ReactNode;
}

/** The frame, with the route's Panes in a row (the place) on its canvas: the place's Pane, and a record's after it, the place's then at the list width giving way to its floor and the record's taking the rest, a hairline between them, and below `tablet` of the column only the last standing. A route renders its `Pane`s and no place of its own. A `foot` stands under the place across the column. On the desktop the sidebar beside the column: the mark and the switcher on one bar, then the places, a group's switcher under its heading. A Shell that names groups draws the sidebar as a rail of icon entries (the ungrouped places first, named by their first place, then each group, a press going to the group's first place; the footer places and the act that folds or docks the column at the rail's foot) beside the column of the current place's group, the app's switcher leading the rail and the group's leading the column level with it (an empty region for a group with none), so the column's first place stands level with the rail's first entry. Docked (the default) the rail stands wide with each entry's label and the column beside it in the frame's flow, and a pointer resting on an entry or a focus on it shows that group in the column; folded to the rail (the viewer's choice, kept from one visit to the next), the rail is its icons, the app's switcher its mark, and the sidebar opens over the page instead, each entry's label uncovered and that column sliding out beside it. The sidebar opens and shuts as one body on `base`, by clip and transform (snapping under reduced motion), and as the viewer docks or folds it the page slides from where it stood, its edge on the sidebar's end. The footer places and the dock act show nothing on hover or focus. A pointer heading for the column keeps the group shown while it crosses other entries; the column goes back once the pointer and the focus have left the rail and the column a moment, on Escape or when the route changes, and a menu or a sheet the column opened holds it while it is open. On touch the column alone, the same places on a layer over the viewport that the menu act leading a Pane's bar opens (the groups first, a tap showing a group's places with a way back) and that closes on its close act, Escape or going to a place. */
export function Shell({
	places,
	groups,
	banner,
	switcher,
	foot,
	children,
}: ShellProps) {
	const touch = useTouch();
	const words = useWords();
	const at = useRoute();
	// The places layer stands at the route it opened on: going to a place
	// closes it.
	const [openAt, setOpenAt] = useState<string>();
	const open = openAt === at;
	// The current place is the one that owns the address among every place the
	// sidebar draws, a group's own included. The lookup is an enrichment, never
	// a draw of the read's state: it reads quietly (`or`), so it paints and holds
	// nothing, and a group whose places wait or failed contributes no candidate.
	const owned = useMemo(
		() =>
			(groups ?? []).map((group) =>
				isSelection(group.places) ? group.places.or([]) : (group.places ?? []),
			),
		[groups],
	);
	const drawn = useSelections(owned);
	const grouped = drawn.flatMap((each) => (each.painted ? [] : each.value));
	const spec = [...places, ...grouped];
	// A place's children are places too: the address is owned by the deepest.
	const flat = flatPlaces(spec);
	const route = placeAt(flat, at);
	const trail = placeTrail(spec, at);
	const lockup = useLockup();
	// A place that is a spot on its page (`#activity`) leads nowhere from an
	// address nothing serves, so home is the first place that is a route.
	const first = places.find((spec) => isRoute(spec.route));
	const home = first && { label: first.label, href: first.route };
	const close = () => setOpenAt(undefined);
	const lead = leadOf(switcher, lockup);
	const rows = groupsOf(places, groups);
	const railed = (groups?.length ?? 0) > 0 || places.some((one) => one.group);
	const entries = railed ? rail(rows, groups) : [];
	const ends = places.filter((one) => one.end);
	// The group the current place stands in: a place of the rows, else a place
	// a group's own read gave. None for a footer place, or none at the address.
	const owner = railed ? ownerOf(places, groups, drawn, route) : undefined;
	const [docked, dock] = useDocked();
	// A group's entry goes to its group's first place that is a route: a place
	// of its groups, else the first its group's read gave, none while it waits.
	const firstOf = (entry: Entry) => {
		const first = entry.groups[0];
		const at = (groups ?? []).findIndex((one) => one.label === first?.group);
		const read = first?.read ? drawn[at] : undefined;
		const specs = read
			? read.painted
				? []
				: read.value
			: (first?.places ?? []);
		return specs.find((one) => isRoute(one.route))?.route;
	};
	// Docked (the default), the body stands open in the room the frame keeps
	// for it; folded, the frame keeps the strip's room and a preview opens the
	// body over the page. The viewer's dock or fold slides the page from where
	// it stood (`slide`) until its slide ends.
	const [slide, setSlide] = useState<"dock" | "fold">();
	const preview = usePreview({
		at,
		docked,
		owner,
		entries: entries.map((one) => one.key),
	});
	const shown = entries.find((one) => one.key === preview.shown);
	const held = entries.find((one) => one.key === preview.held);
	const expanded = docked || shown !== undefined ? "" : undefined;
	// The group the touch layer shows, once one is tapped: none each time it opens.
	const [viewed, setViewed] = useState<string>();
	const viewing = entries.find((one) => one.key === viewed);
	const common = {
		route,
		trail,
		onPlace: touch ? close : undefined,
	};
	const closer = touch ? (
		<span className={CLOSE}>
			<Button glyph icon="X" label={words.close} onAct={close} />
		</span>
	) : undefined;
	const plain = (
		<PlacesBody lead={lead} ends={ends} end={closer} {...common}>
			<Groups rows={rows} {...common} />
		</PlacesBody>
	);
	const listed = (
		<PlacesBody lead={lead} ends={ends} end={closer} {...common}>
			{viewing === undefined ? (
				<div className={cn(SHELL_PLACES, PLACES)}>
					{entries.map((one) => (
						<GroupRow
							key={one.key}
							icon={one.icon}
							label={one.label}
							current={one.key === owner}
							onPress={() => setViewed(one.key)}
						/>
					))}
				</div>
			) : (
				<>
					<div className={BACK}>
						<Button
							glyph
							icon={BACK_GLYPH}
							label={words.back}
							onAct={() => setViewed(undefined)}
						/>
						{viewing.group === undefined ? null : (
							<Heading label={viewing.label} />
						)}
					</div>
					{viewing.switcher ? (
						<SwitcherPick switcher={viewing.switcher} />
					) : null}
					<Groups rows={viewing.groups} {...common} />
				</>
			)}
		</PlacesBody>
	);
	// The rail's entries scroll above its footer places and the dock act; the
	// column stands beside it, docked or over the page. The app's switcher
	// leads the rail, and coming onto it shows the current place's group; the
	// group's switcher leads the column, in a region of its own whether or not
	// the group has one.
	const current = owner ?? entries[0]?.key;
	const railLead = railed
		? leadOf(switcher, lockup, (wait) => {
				if (current !== undefined) preview.point(current, wait);
			})
		: null;
	// Footer entries carry their label as a tooltip while the rail draws none.
	const named = expanded === undefined;
	const railing = (
		<nav
			aria-label={words.places}
			className={cn(SPLIT, docked ? SHELL_SIDEBAR_REGION : SHELL_RAIL_REGION)}
			{...preview.nav}
		>
			<div className={SHELL_RAIL_PANEL}>
				<div
					data-expanded={expanded}
					className={cn(
						SHELL_RAIL,
						SHELL_INSET,
						SIDEBAR,
						SHELL_RAIL_MOTION,
						RAIL_HIT,
					)}
				>
					<div className={cn(SWITCHER_REGION, REGION)}>{railLead}</div>
					<div className={RAIL_ENTRIES}>
						{entries.map((one) => (
							<RailEntry
								key={one.key}
								icon={one.icon}
								label={one.label}
								current={one.key === owner ? "true" : undefined}
								shown={one === shown}
								href={firstOf(one)}
								onExpand={(wait) => preview.point(one.key, wait)}
								onLeave={preview.hold}
							/>
						))}
					</div>
					{/* The footer places and the dock act preview nothing: a pointer
					    reaching for them leaves the column as it stands, a group
					    crossed on the way included. */}
					<div className={RAIL_FOOT}>
						{ends.map((one) => (
							<RailEntry
								key={one.route}
								icon={one.icon}
								label={one.label}
								current={one.route === route ? "page" : undefined}
								href={one.route}
								named={named}
								onExpand={preview.hold}
							/>
						))}
						<RailEntry
							icon={docked ? "PanelLeftClose" : "PanelLeftOpen"}
							label={docked ? words.foldSidebar : words.dockSidebar}
							named={named}
							onExpand={preview.hold}
							// Folding shuts the body on what it shows; docking keeps
							// the preview where the pointer has it.
							onPress={() => {
								if (docked) preview.back();
								setSlide(docked ? "fold" : "dock");
								dock(!docked);
							}}
						/>
					</div>
				</div>
				{held ? (
					<div
						data-expanded={expanded}
						className={cn(
							SHELL_SIDEBAR,
							SHELL_INSET,
							SHELL_COLUMN_AT,
							COLUMN_BODY,
							SHELL_COLUMN_MOTION,
							!docked && SHELL_COLUMN_FLOAT,
						)}
						onPointerEnter={preview.column.onPointerEnter}
					>
						<div className={cn(SWITCHER_REGION, REGION)}>
							{held.switcher ? <SwitcherPick switcher={held.switcher} /> : null}
						</div>
						<Groups
							ref={preview.column.places}
							rows={held.groups}
							{...common}
						/>
					</div>
				) : null}
			</div>
		</nav>
	);
	// The sidebar and the layer differ by density; the column, and the page
	// in it, keep one tree position on both, so crossing the density line
	// keeps the page.
	const body = railed ? listed : plain;
	const sidebar = touch ? null : railed ? (
		railing
	) : (
		<nav
			aria-label={words.places}
			className={cn(SHELL_SIDEBAR, SHELL_INSET, SIDEBAR)}
		>
			{body}
		</nav>
	);
	const layer = touch ? (
		<Dialog.Root
			open={open}
			onOpenChange={(next) => {
				if (!next) close();
			}}
			modal
		>
			<Dialog.Portal>
				<Dialog.Popup
					aria-label={words.places}
					className={cn(SHELL_LAYER, LAYER, LAYER_CARD)}
				>
					<nav
						aria-label={words.places}
						className={cn(SHELL_INSET, SIDEBAR, "grow")}
					>
						{body}
					</nav>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	) : null;
	const menu = touch
		? {
				icon: "Menu" as const,
				label: words.places,
				onAct: () => {
					setOpenAt(at);
					setViewed(undefined);
				},
			}
		: undefined;
	return (
		<ContainerHost>
			<div
				data-slide={slide}
				className={cn(BOX, SHELL_CONTAINER)}
				onAnimationEnd={(event) => {
					if (event.animationName === "page-slide") setSlide(undefined);
				}}
			>
				{sidebar}
				<div className={cn(SHELL_COLUMN, COLUMN)}>
					{banner ? (
						<div className={cn(SHELL_BANNER, BANNER_REGION, SHELL_PAGE_SLIDE)}>
							{banner}
						</div>
					) : null}
					<ContainerMain>
						<ShellHome value={home}>
							<ShellMenu value={menu}>
								<PlaceRoute value={route}>
									<div className={cn(PAGE, SHELL_PAGE_SLIDE)}>
										<Panes
											title={
												flat.find((one) => one.route === route)?.label ??
												lockup?.name
											}
										>
											{children}
										</Panes>
									</div>
								</PlaceRoute>
							</ShellMenu>
						</ShellHome>
					</ContainerMain>
					{foot ? (
						<div className={cn(FOOT, SHELL_PAGE_SLIDE)}>{foot}</div>
					) : null}
					{layer}
				</div>
			</div>
		</ContainerHost>
	);
}

// The switcher region's lead: the app's switcher with the mark in its glyph
// region, else the mark and the app's name. On the rail (`onRail`, which a
// pointer coming onto the switcher or a focus calls) the glyph keeps its control
// square and the rest is uncovered with the rail's labels.
function leadOf(
	switcher: Switcher | undefined,
	lockup: AppLockup | null,
	onRail?: (wait: boolean) => void,
): ReactNode {
	const rail = onRail !== undefined;
	// The sidebar is the dark calibration in both modes: the dark icon stands.
	const glyph = lockup ? (
		<img src={lockup.dark ?? lockup.src} alt="" className={SHELL_LOCKUP} />
	) : undefined;
	if (switcher)
		return <SwitcherPick switcher={switcher} glyph={glyph} onExpand={onRail} />;
	if (!lockup) return null;
	return (
		<span className={cn(placeRow(), ROW_BOX, rail && SHELL_RAIL_ENTRY)}>
			<span className={cn(placeRowGlyph(), GLYPH, rail && SHELL_RAIL_GLYPH)}>
				{glyph}
			</span>
			<span
				className={cn(
					text({ role: "body" }),
					textStrong({ role: "body" }),
					NAME,
				)}
			>
				{lockup.name}
			</span>
		</span>
	);
}

// The sidebar's content, drawn in the sidebar and on the touch layer alike:
// the switcher region (the mark in the row's glyph region, the switcher's trigger
// after it, `end` at the bar's end), what the caller puts under it (the groups
// of places, or a group's heading over its places) and the footer places.
function PlacesBody(props: {
	lead?: ReactNode;
	ends: readonly PlaceSpec[];
	route: string | undefined;
	trail: readonly string[];
	end?: ReactNode;
	onPlace?: () => void;
	children?: ReactNode;
}) {
	const { lead, ends, route, trail, end, onPlace, children } = props;
	const words = useWords();
	return (
		<>
			{lead || end ? (
				<div className={cn(SWITCHER_REGION, REGION)}>
					{lead}
					{end}
				</div>
			) : null}
			{children}
			{ends.length > 0 ? (
				<div className={cn(SHELL_FOOT, GROUP)}>
					<PlaceTree
						specs={ends}
						label={words.places}
						route={route}
						trail={trail}
						onPlace={onPlace}
					/>
				</div>
			) : null}
		</>
	);
}

// The groups of places, scrolling between the switcher bar and the footer.
function Groups(props: {
	// The column's places, which a pointer heading for them aims at.
	ref?: Ref<HTMLDivElement>;
	rows: readonly Group[];
	route: string | undefined;
	trail: readonly string[];
	onPlace?: () => void;
}) {
	const { ref, rows, route, trail, onPlace } = props;
	return (
		<div ref={ref} className={cn(SHELL_PLACES, PLACES)}>
			{rows.map((one) => (
				<GroupPlaces
					key={one.key}
					label={one.group}
					places={one.read ?? one.places}
					route={route}
					trail={trail}
					onPlace={onPlace}
				/>
			))}
		</div>
	);
}

function Heading({ label }: { label: string }) {
	return (
		<span className={cn(text({ role: "caption" }), SHELL_GROUP_LABEL)}>
			{label}
		</span>
	);
}

type Group = {
	key: string;
	group?: string;
	name: string;
	icon: IconName;
	places: PlaceSpec[];
	read?: Datum<readonly PlaceSpec[]>;
};

// The sidebar draws the places of one group as a `Group`: docs/architecture/ui-core/layout.md, "Sidebar and groups".
function groupsOf(
	places: readonly PlaceSpec[],
	groups: readonly ShellGroup[] | undefined,
) {
	const out: Group[] = [];
	const listed = groups ?? [];
	for (const spec of places) {
		if (spec.end) continue;
		const last = out.at(-1);
		if (last && last.group === spec.group) {
			last.places.push(spec);
			continue;
		}
		const group = listed.find((one) => one.label === spec.group);
		if (spec.group !== undefined && !group)
			throw new Error(
				`Shell: the group "${spec.group}" of the place "${spec.label}" is not in \`groups\``,
			);
		out.push({
			key: spec.route,
			group: spec.group,
			name: group?.label ?? spec.label,
			icon: group?.icon ?? spec.icon,
			places: [spec],
		});
	}
	listed.forEach((spec, at) => {
		if (!spec.places) return;
		const after = listed.slice(at + 1).map((one) => one.label);
		const before = out.findIndex(
			(one) => one.group !== undefined && after.includes(one.group),
		);
		out.splice(before < 0 ? out.length : before, 0, {
			key: `group:${spec.label}`,
			group: spec.label,
			name: spec.label,
			icon: spec.icon,
			places: [],
			read: spec.places,
		});
	});
	return out;
}

// A group on the rail: all its groups, named and drawn by its group, or for the
// ungrouped places by their first place, and its group's switcher, which leads
// its places. `key` names it apart from every other entry, the ungrouped
// places' included.
interface Entry {
	key: string;
	group: string | undefined;
	label: string;
	icon: IconName;
	switcher: Switcher | undefined;
	groups: Group[];
}

const UNGROUPED = "";
const entryKey = (group: string | undefined) =>
	group === undefined ? UNGROUPED : `group:${group}`;

// The rail's entries: the ungrouped places first, then each group in the order
// of its first group.
function rail(
	rows: readonly Group[],
	groups: readonly ShellGroup[] | undefined,
): Entry[] {
	const out: Entry[] = [];
	for (const each of rows) {
		let entry = out.find((one) => one.group === each.group);
		if (!entry) {
			entry = {
				key: entryKey(each.group),
				group: each.group,
				label: each.name,
				icon: each.icon,
				switcher: groups?.find((one) => one.label === each.group)?.switcher,
				groups: [],
			};
			out.push(entry);
		}
		entry.groups.push(each);
	}
	return [
		...out.filter((one) => one.group === undefined),
		...out.filter((one) => one.group !== undefined),
	];
}

// The key of the rail entry the place at `route` stands in: a place of
// `places`, else one a group's own read gave. None for a footer place or no
// place.
function ownerOf(
	places: readonly PlaceSpec[],
	groups: readonly ShellGroup[] | undefined,
	drawn: readonly (
		| { painted: true }
		| { painted: false; value: readonly PlaceSpec[] }
	)[],
	route: string | undefined,
): string | undefined {
	const holds = (specs: readonly PlaceSpec[]) =>
		flatPlaces(specs).some((one) => one.route === route);
	const own = places.find((one) => !one.end && holds([one]));
	if (own) return entryKey(own.group);
	const read = drawn.findIndex((each) => !each.painted && holds(each.value));
	const group = groups?.[read]?.label;
	return group === undefined ? undefined : entryKey(group);
}

const PAINTED_PLACES = Array.from({ length: PAINT_ROWS }, (_, at) => at);

// One group's places (`label` their group, which names their list), or
// `PAINT_ROWS` painted rows at the row height while their read waits.
function GroupPlaces(props: {
	label: string | undefined;
	places: Datum<readonly PlaceSpec[]>;
	route: string | undefined;
	trail: readonly string[];
	onPlace?: () => void;
}) {
	const { label, route, trail, onPlace } = props;
	const words = useWords();
	const [drawn] = useSelections([props.places] as const);
	// The group is the frame of its places' read: it holds it, so the read's
	// failure is drawn once, here, in the compact failed and missing shapes.
	const frame = useFrame(isSelection(props.places) ? props.places : undefined);
	const waits = paints(drawn);
	const specs = drawn.painted ? [] : drawn.value;
	const ended = isEnded(frame.shape);
	if (!(waits || ended) && specs.length === 0) return null;
	return (
		<FrameHolds holds={frame.held}>
			<div className={GROUP} aria-busy={(waits && frame.holds) || undefined}>
				{ended ? (
					<FrameBody frame={frame} fit="part" />
				) : waits ? (
					PAINTED_PLACES.map((at) => (
						<PaintedPlace key={`painted:${at}`} at={at} />
					))
				) : (
					<PlaceTree
						specs={specs}
						label={label ?? words.places}
						route={route}
						trail={trail}
						onPlace={onPlace}
					/>
				)}
			</div>
		</FrameHolds>
	);
}

// A place row while its read waits: the row's box, its glyph region and its
// label painted.
function PaintedPlace({ at }: { at: number }) {
	return (
		<span inert aria-hidden className={cn(placeRow(), ROW_BOX)}>
			<span className={cn(placeRowGlyph(), GLYPH)}>
				<span className={cn(PAINT_BOX, "*:invisible")}>
					<Icon name="Square" />
				</span>
			</span>
			<span className={cn(text({ role: "body" }), LABEL)}>
				<Painted role="phrase" at={at} />
			</span>
		</span>
	);
}
