import type { Drop, OptionPick, Route } from "../descriptors.ts";
import type { IconName } from "../icon-name.ts";
import type { RosterEntry } from "../roster.ts";
import type { ContentTone } from "../variants.ts";
import {
	ANSWER,
	build,
	GIVE,
	matrix,
	NAME_GROUND,
	PRESS,
	toneOf,
} from "./shared.ts";

// The sidebar on the desktop, the tab bar on touch. A Shell whose places name
// groups (each listed in `groups`, which carry the icon) draws the sidebar as
// a rail of icon entries (the ungrouped places first, named by their first
// place, a press going to the group's first place; the footer places and the
// dock act at its foot) beside the docked column of the current place's
// group (the group's switcher, its places; the app's switcher leads the
// rail). A pointer resting on an entry or a focus on it shows its group in
// the column; folded to the rail, the sidebar opens over the page to its
// labels with that column beside it instead. It goes back once the pointer
// and the focus leave, on Escape or when the route changes; a menu or sheet
// the column opened holds it, and a pointer heading for the column keeps
// the group shown. One
// with no groups keeps the one sidebar. On touch the places layer lists the
// groups first.
// The column holds the place: the route's Panes in a row, each but the last
// at the list width giving way to its floor, the last taking the rest, and
// below `tablet` of the column only the last standing; a route draws no
// place of its own.
// A `foot` stands under the place across the column (on the phone, above the
// tab bar), whatever the route: the app's, a `Dock` for a player; the Shell
// draws nothing there without one and owns no sound.
// A place with a `drop` takes what is dragged from a row (`DROP_ON` under the
// drag); the frame draws the label that follows the pointer (`DRAG_GHOST`)
// and the line a reordered row lands at (`DROP_LINE`).
export const shellEntry: RosterEntry = {
	props: ["places", "groups", "banner", "switcher", "foot", "children"],
	draws: [
		"SHELL_SIDEBAR",
		"SHELL_RAIL",
		"SHELL_FRAME",
		"SHELL_RAIL_SLOT",
		"SHELL_SIDEBAR_SLOT",
		"SHELL_RAIL_PANEL",
		"SHELL_COLUMN_AT",
		"SHELL_RAIL_ENTRY",
		"SHELL_RAIL_GLYPH",
		"SHELL_RAIL_MOTION",
		"SHELL_COLUMN_MOTION",
		"SHELL_PAGE_SLIDE",
		"SHELL_COLUMN_FLOAT",
		"SHELL_INSET",
		"SHELL_LAYER",
		"SHELL_MARK",
		"SHELL_COLUMN",
		"SHELL_BANNER",
		"SWITCHER_SLOT",
		"SWITCHER",
		"SHELL_PLACES",
		"PLACE_ROW",
		"PLACE_ROW_GLYPH",
		"PLACE_NEST",
		"DROP_ON",
		"DROP_LINE",
		"DRAG_GHOST",
		"SHELL_TAB_BAR",
		"PLACE_TAB",
		"PLACE_TAB_LABEL",
		"TOASTS",
		"TEXT.role.body",
		"TEXT_STRONG.role.body",
		"TEXT.role.meta",
		"ICON_BUTTON.fit.body",
		"CHEVRON",
		"ICON.fit.body",
		"ICON.fit.control",
		"COUNT",
		"COUNT_LABEL",
	],
	states: [...PRESS, "selected"],
	motion: ["answer", "give"],
	owns: {
		roles: ["body", "meta", "caption", "code"],
		colors: [
			"canvas",
			"surface",
			"edge",
			"ink-body",
			"ink-meta",
			"wash-hover",
			"wash-press",
			"wash-selected",
			"wash-selected-hover",
			"accent",
			"ink-mark",
			"ring",
			"raised",
			"edge-raised",
			"edge-strong",
			"toggle-",
		],
		radii: ["row", "control", "chip", "full"],
		spacing: ["gap", "badge", "pad", "stack", "page"],
		sizes: [
			"sidebar",
			"target",
			"line-body",
			"hairline",
			"icon",
			"icon-meta",
			"icon-control",
			"control",
			"figures",
			"popover",
			"measure-short",
		],
		elevation: ["float"],
	},
};

// A place in the shell: a route, a label, an icon, an optional count, and where it stands in the sidebar.
export interface PlaceSpec<Q = unknown> {
	route: Route;
	// The place's name (a word; truncates).
	label: string;
	icon: IconName;
	count?: number;
	// The name of the group the place stands in (a word; truncates), which the
	// Shell's `groups` lists. A group is an entry on the sidebar's rail and the
	// column that entry shows; a place with none stands in the ungrouped run, the
	// rail's first entry. The tab bar and the More page ignore it.
	group?: string;
	// The place stands in the footer group at the sidebar's bottom (settings, an
	// exit), after the others and under no label. The tab bar and the More page
	// ignore it.
	end?: boolean;
	// The drop this place is (a board): a drag of a kind it accepts released
	// on it runs its `onDrop`. The tab bar ignores it.
	drop?: Drop<Q>;
	// The places standing under this one (a folder's boards), each with
	// children of its own to any depth: the place is a branch, its sidebar row
	// opens and folds them one level in. A branch is a place like any other
	// (its route, its count, its `drop`); its row also carries the viewer's
	// choice of open or folded, which the browser keeps. Unchosen, a branch is
	// open when the current place is under it, else folded. A branch is the
	// current place's ancestor, drawn as on its path. A place named by `group`
	// carries its children into that group's run; `end` places have none. The
	// phone's tab bar and More page are flat: they draw the top level only and
	// ignore `children`, except that a route under a branch selects its tab.
	children?: readonly PlaceSpec<Q>[];
}

// A group of places in the sidebar, named by `PlaceSpec.group`; a Shell lists
// every group its places name. Its entry on the rail carries the `icon` and,
// while the rail is docked or expanded, the `label` beside it; the touch layer heads the group's places with the `label`. One with a `switcher` is a scope (a
// project) whose places follow its pick: the pick stands as a row before the
// places.
export interface GroupSpec {
	// The group's name (a word; truncates), as the places' `group` names it.
	label: string;
	// The group's entry on the rail, its label the entry's name.
	icon: IconName;
	switcher?: OptionPick;
}

// The current place carries the current bar: a 3 px accent bar at its start,
// no rounded corner on that side. Every place holds the bar's width, clear, so
// a label does not move as the bar arrives. Selection is never a fill of the
// accent: the sidebar's place also takes the 6 percent wash.
export const CURRENT_BAR = "border-s-3 border-accent rounded-s-none";
// The bar's room at rest, drawn in nothing.
export const CURRENT_ROOM = "border-s-3 border-transparent";

// A place in the sidebar: a control-tall row under its state's wash; the label is
// `TEXT.body` with the ink of `PLACE_ROW_GLYPH`.
export const PLACE_ROW = matrix({
	base: `gap-gap min-h-control px-pad rounded-row ${CURRENT_ROOM} ${ANSWER}`,
	variants: {
		state: {
			rest: "",
			hover: "bg-wash-hover",
			active: "bg-wash-press",
			selected: `bg-ink-body/6 ${CURRENT_BAR}`,
			"selected-hover": `bg-ink-body/10 ${CURRENT_BAR}`,
		},
	},
	defaultVariants: { state: "rest" },
});

// The sidebar place's glyph and label: the meta ink until the place is selected.
export const PLACE_ROW_GLYPH = matrix({
	base: ANSWER,
	variants: {
		state: { rest: "text-ink-meta", selected: "text-ink-body" },
	},
	defaultVariants: { state: "rest" },
});

// A place in the tab bar: glyph over label, the box carrying the tab's ink
// for the glyph inside it (currentColor on the web) and the label caption
// repeating it, since a native Text inherits none. The box keeps no side
// inset, so its label takes the tab's whole share of the bar.
export const PLACE_TAB = matrix({
	base: `py-gap rounded-none border-t-3 ${ANSWER} ${GIVE}`,
	variants: {
		state: {
			idle: "border-transparent text-ink-meta",
			selected: "border-accent text-ink-body",
		},
	},
	defaultVariants: { state: "idle" },
});

// The selected tab's label steps to 500: ink alone is the only other cue.
export const PLACE_TAB_LABEL = matrix({
	base: `text-caption leading-caption tracking-caption ${ANSWER}`,
	variants: {
		state: {
			idle: "font-normal text-ink-meta",
			selected: "font-medium text-ink-body",
		},
	},
	defaultVariants: { state: "idle" },
});

export const placeRow = build(PLACE_ROW);
export const placeRowGlyph = build(PLACE_ROW_GLYPH);
export const placeTab = build(PLACE_TAB);
export const placeTabLabel = build(PLACE_TAB_LABEL);

// The label that follows a dragged row's pointer is the tooltip's ground round
// the row's name or the count dragged, up to a short measure.
export const DRAG_GHOST = `${NAME_GROUND} max-w-measure-short truncate`;

// The shell on the desktop: the sidebar a slate column (the dark calibration of
// the tokens, pinned in both modes by the `dark` scope, on the surface ground
// of that scope) beside the column on the canvas. The sidebar insets its rows
// by an acts gap at the sides and the foot; its first row is the switcher slot,
// a bar as the page's (the strip height, its row centred), so the switcher and
// the page title share one line with no number set for it.
export const SHELL_SIDEBAR = "dark w-sidebar bg-surface";
// The rows' inset in the sidebar and on the places layer alike: an acts gap at
// the sides and the foot.
export const SHELL_INSET = "px-gap pb-gap";
export const SHELL_COLUMN = "bg-canvas";
// The phone's column is the canvas too: the sheets stand on it at the page inset.
export const SHELL_COLUMN_PHONE = "bg-canvas";
// The column's banner slot: a `Banner` at the page inset all round, so its
// edge meets the Pane title's and the page gap stands under it, above the
// header.
export const SHELL_BANNER = "p-page";
// The switcher slot: the strip height as a Pane's bar (a control's row, an
// acts gap over and under it), empty or not, the places starting at its foot.
// It holds the app's mark in the row's glyph slot and the switcher's trigger
// after it; the rail and its column each lead with one, so the column's
// switcher stands level with the app's and its first place with the rail's
// first entry.
export const SWITCHER_SLOT = "box-content min-h-control py-gap";
// The app's mark in a place row's glyph slot: the icon size, its image fit
// inside.
export const SHELL_MARK = "size-icon object-contain";
// The places scroll between the switcher bar and the footer group, which stay
// fixed, so no place is ever clipped; each run of consecutive places under one
// group stands a fields gap from the next.
export const SHELL_PLACES = "grow min-h-0 overflow-y-auto gap-stack";
// The footer group (settings and exits) stands fixed at the sidebar's bottom,
// a fields gap under the places.
export const SHELL_FOOT = "shrink-0 pt-stack";
// A Shell that names groups draws its sidebar as one body on the sidebar's
// rung (`SHELL_RAIL_PANEL`): a rail of entries on the same slate at the
// sidebar's inset (`SHELL_INSET`), a hairline at its end, and a group's column (`SHELL_SIDEBAR`) at the open rail's end
// (`SHELL_COLUMN_AT`). Open (`data-expanded`) the rail is as wide as its
// labels, a short label's measure (`--rail-open`), with the column beside it;
// shut, it is its icon strip, an entry's control square wide (`--rail-slot`),
// and the column is gone. Docked, the body stands open in the room the frame
// keeps for all of it (`SHELL_SIDEBAR_SLOT`); folded, the frame keeps the
// strip's room (`SHELL_RAIL_SLOT`) and the body opens over the page. The frame
// names the widths, the body's travel (how far its end moves between shut and
// open) and the inline direction's sign (`SHELL_FRAME`).
// An entry is a place row whose glyph keeps the control square at its start, its
// label after it.
export const SHELL_FRAME =
	"[--dir:1] rtl:[--dir:-1] [--rail-slot:calc(var(--spacing-control)+2*var(--spacing-gap)+var(--spacing-hairline))] [--rail-open:calc(var(--container-measure-short)+2*var(--spacing-gap))] [--sidebar-travel:calc(var(--rail-open)+var(--container-sidebar)-var(--rail-slot))]";
export const SHELL_RAIL_SLOT = "w-(--rail-slot)";
export const SHELL_SIDEBAR_SLOT =
	"w-[calc(var(--rail-open)+var(--container-sidebar))]";
export const SHELL_RAIL =
	"dark bg-surface border-e border-edge w-(--rail-slot) data-expanded:w-(--rail-open)";
export const SHELL_RAIL_PANEL =
	"absolute inset-y-0 start-0 z-(--layer-sidebar) flex pointer-events-none";
export const SHELL_COLUMN_AT = "absolute inset-y-0 start-(--rail-open)";
export const SHELL_RAIL_ENTRY =
	"h-control w-full justify-start gap-0 px-0 text-start overflow-hidden";
export const SHELL_RAIL_GLYPH =
	"flex size-control shrink-0 items-center justify-center";
// The body opens and shuts as one, on `base` `out` both ways, and no size
// moves through layout. The rail's clip uncovers its labels from the strip's
// end; it takes its open width at once on the way open and the strip's once
// shut (a snap, never an interpolation), so a shut strip's entries are its
// boxes and a tooltip stands on them. The column slides out from behind the
// rail, its start clipped on the same curve a hairline under the rail's moving
// end, so no seam opens between them, and its end is the body's end. The
// hairline that parts the two is the column's, at its clipped start; the
// rail's own stands at its end only while it is shut, against the page, and
// snaps in once shut. Where the column stands over the page it draws a
// hairline at its end (`SHELL_COLUMN_FLOAT`). Reduced motion snaps them.
export const SHELL_RAIL_MOTION =
	"[clip-path:inset(0_calc(max(0,var(--dir))*(100%-var(--rail-slot)))_0_calc(max(0,-1*var(--dir))*(100%-var(--rail-slot))))] data-expanded:[clip-path:inset(0)] data-expanded:border-e-transparent [transition:clip-path_var(--transition-duration-base)_var(--ease-out),width_0s_var(--transition-duration-base),border-color_0s_var(--transition-duration-base)] data-expanded:[transition:clip-path_var(--transition-duration-base)_var(--ease-out),width_0s,border-color_0s] motion-reduce:transition-none";
export const SHELL_COLUMN_MOTION =
	"invisible translate-x-[calc(var(--dir)*-1*var(--sidebar-travel))] [clip-path:inset(0_calc(max(0,-1*var(--dir))*(100%-var(--spacing-hairline)))_0_calc(max(0,var(--dir))*(100%-var(--spacing-hairline))))] transition-[translate,clip-path,visibility] duration-base ease-out data-expanded:visible data-expanded:translate-x-0 data-expanded:[clip-path:inset(0_calc(max(0,-1*var(--dir))*-1*var(--spacing-hairline))_0_calc(max(0,var(--dir))*-1*var(--spacing-hairline)))] data-expanded:pointer-events-auto before:absolute before:inset-y-0 before:start-0 before:w-hairline before:bg-edge before:translate-x-[calc(var(--dir)*var(--container-sidebar))] data-expanded:before:translate-x-0 before:transition-[translate] before:duration-base before:ease-out motion-reduce:transition-none motion-reduce:before:transition-none";
export const SHELL_COLUMN_FLOAT = "border-e border-edge";
// As the viewer docks or folds the sidebar, the page takes its new room at
// once and slides from where it stood (`data-slide` on the frame: `dock` from
// the strip's end, `fold` from the body's), its end moving with the body's
// end, on the body's `base` `out`; the `page-slide` keyframes are in the web's
// `globals.css`. Each part of the page carries it (the banner, the place, the
// foot), since the frame, the column and `main` hold no transform.
export const SHELL_PAGE_SLIDE =
	"in-data-[slide=dock]:[--page-from:calc(var(--dir)*-1*var(--sidebar-travel))] in-data-[slide=fold]:[--page-from:calc(var(--dir)*var(--sidebar-travel))] in-data-slide:animate-[page-slide_var(--transition-duration-base)_var(--ease-out)]";
// A group's label, at the rows' inline inset, a pair over its rows.
export const SHELL_GROUP_LABEL =
	"px-pad pb-gap text-caption leading-caption tracking-label font-medium uppercase text-ink-meta";
// A nested place's run of rails: the first part of a row that is `--level`
// deep, one `stack` step per level (a tree row's, `TREE_RAIL`) less the row's
// gap after it (so the row's own padding stays an inset role and its label
// stands one step in per level), a hairline rail per level in the edge colour
// under the middle of the parent's glyph. It is painted on its own box and runs
// unbroken down a branch's rows whatever they hold.
export const PLACE_NEST =
	"shrink-0 self-stretch w-[calc(var(--level)*var(--spacing-stack)-var(--spacing-gap))] bg-[image:repeating-linear-gradient(to_right,transparent_0,transparent_calc(var(--spacing-icon)/2-var(--spacing-hairline)),var(--color-edge)_calc(var(--spacing-icon)/2-var(--spacing-hairline)),var(--color-edge)_calc(var(--spacing-icon)/2),transparent_calc(var(--spacing-icon)/2),transparent_var(--spacing-stack))]";
// The shell on touch: the tab bar, the sidebar turned on its side (the dark
// scope on its surface), under a hairline; each tab is the dock's height and
// carries the current bar on its top. The bar clips its tabs' count badges:
// nothing paints above its hairline.
export const SHELL_TAB_BAR =
	"dark px-gap bg-surface border-t border-edge overflow-hidden";
// The shell on the web's touch density: no tab bar; the places stand on a
// layer over the whole viewport (the sidebar's slate, clear of the safe
// insets, its rows at the sidebar's inset), opened by the menu act that leads a Pane's bar and closed
// by its close act, Escape or going to a place.
export const SHELL_LAYER = "dark bg-surface pt-safe pb-safe";

// The switcher's trigger leading a touch Pane's bar, which reaches across the
// page inset (`PAGE_TOP_BAR_START`) by the inset it keeps; in the sidebar it is a
// `PLACE_ROW` with the name at body 500.
// Its inset is what an icon act has round its glyph, half of what the control
// has over the control's icon.
export const SWITCHER =
	"gap-gap px-[calc((var(--spacing-control)-var(--spacing-icon-control))/2)] min-h-target rounded-control";
// The toasts' layer over the column (the desktop shell) or at a touch
// screen's foot, each toast a pair apart.
export const TOASTS = "p-page gap-gap";

export type PlaceTabState = keyof (typeof PLACE_TAB)["variants"]["state"];

// A place tab's content ink, its state's: the glyph reads it, and the label
// repeats it. The cell also draws a border, so the text colour is the one read.
export function placeTabContentTone(state: PlaceTabState): ContentTone {
	return toneOf(PLACE_TAB.variants.state[state], "text");
}
