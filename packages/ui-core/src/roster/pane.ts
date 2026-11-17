import type { Fact, OptionPick, Route, Run } from "./descriptors.ts";
import type { RosterEntry } from "./shared.ts";
import { FIGURES, ROWS_HOST, TEXT, WIDE_SPANS } from "./shared.ts";

// A column of the Shell's place: docs/architecture/ui-core/layout.md, "Pane".
export const paneEntry: RosterEntry = {
	// `context`, `state` and `fill` are the web's alone.
	props: [
		"title",
		"record",
		"noun",
		"missing",
		"acts",
		"more",
		"context",
		"state",
		"foot",
		"sheet",
		"read",
		"empty",
		"fill",
		"children",
	],
	draws: [
		"TITLE_CODE",
		"PAGE_WITHIN",
		"PAGE_WITHIN_SEP",
		"PAGE_HEAD",
		"PAGE_HEAD_ROOM",
		"PAGE_TOP_BAR",
		"PAGE_TOP_BAR_START",
		"PAGE_TOP_BAR_END",
		"PAGE_TITLE_FLOOR",
		"PAGE_CONTEXT",
		"TEXT.role.title",
		"PAGE_BODY",
		"ROWS_MEASURED",
		"FOOT_DOCKED",
		"PAGE_BODY_OVER_FOOT",
		"PAGE_BODY_TOAST_ROOM",
		"PAGE_BODY_UNDER_TOAST",
		"ICON_BUTTON.fit.body",
		"ICON_BUTTON_DESTRUCTIVE",
		"EMPTY_COLUMN",
		"EMPTY_TEXT",
		"EMPTY_LINE",
		"EMPTY_PART",
		"EMPTY_SENTENCE",
		"EMPTY_MARK",
		"ICON.fit.control",
		"TEXT.role.heading",
		"TEXT.role.meta",
		"PAINT.kind.glyphs",
		"SCRAMBLE",
		"PAINT.kind.control",
		"BLOCK_IN",
		"ITEM_HEADER",
		"ITEM_HEADER_PICTURE",
		"ITEM_OVERLINE",
		"ICON.fit.body",
		"IMAGE.fit.thumb",
		"IMAGE.state.rest",
		"IMAGE.state.loading",
		"IMAGE.state.error",
		"IMAGE_PICTURE.fit.thumb",
		"IMAGE_FAILED_INK",
		"ITEM_FACTS",
		"ITEM_FACT",
		"WORD_ACT",
		"ICON.fit.meta",
		"STATUS",
		"STATUS_DOT",
		"STATUS_SPINNER",
		"STATUS_LABEL",
		"SPINNER",
		"SPINNER_TRACK",
		"SPINNER_ARC",
		"COUNT",
		"COUNT_LABEL",
		"PAINT.kind.box",
		"CARD_PART",
		"BUTTON.act.secondary",
		"BUTTON.fit.body",
		"BUTTON_LABEL.act.secondary",
	],
	states: ["rest", "loading", "empty", "error", "busy", "stale", "paused"],
	motion: ["answer", "give", "block", "wait"],
	owns: {
		roles: ["title", "heading", "body", "meta", "caption"],
		colors: [
			"skeleton",
			"ink-body",
			"ink-meta",
			"ink-mark",
			"edge",
			"edge-raised",
			"raised",
			"wash-hover",
			"wash-press",
			"fill-neutral",
			"accent-ink",
			"ok",
			"warn",
			"ring",
			"chip-amber",
			"danger",
			"edge-strong",
		],
		radii: ["card", "control", "chip", "full"],
		spacing: ["gap", "page", "section", "stack", "pad"],
		sizes: [
			"icon-meta",
			"control",
			"icon-control",
			"measure",
			"measure-short",
			"target",
			"list",
			"region-min",
			"empty",
			"dot",
			"icon",
		],
	},
};

// A record head's fact: the base kinds and what only a head acts on: words
// that open a sheet or go to a route, a status that moves (a pick whose options
// carry states) and a count beside its word.
export type RecordFact<V extends string | null = string> =
	| Fact
	| { label: Run; onOpen: () => void }
	| { label: Run; href: Route; onOpen?: never }
	| { pick: OptionPick<V> }
	| { count: number; label: string };

// A record's head under the Pane's bar: the overline and the facts line a pair apart;
// the facts wrap at the fields rhythm, a counted fact its word beside its
// count. The line stands at the meta line's height whichever facts it holds:
// a fact that acts or changes (a pick, an opening fact) keeps its
// target-height hit box and reaches past the line above and below it
// (`factReach`), so a fact that opens joining the line moves nothing under it.
export const ITEM_HEADER = "gap-gap";
// A record head's picture beside its text: the thumbnail tile and the head's
// column a stack gap apart, the tile at the top of the head (each platform
// sets the direction and the alignment, which are overlays).
export const ITEM_HEADER_PICTURE = "gap-stack";
export const ITEM_FACTS = "gap-x-stack gap-y-gap";
export const ITEM_FACT = "gap-gap";

// A record head's overline: the meta role on one line (each platform draws the
// one line: a truncating box on the web, `numberOfLines` on the phone), its
// figures at one width so an age that changes moves nothing beside it.
export const ITEM_OVERLINE = `${TEXT.variants.role.meta} ${FIGURES}`;

// A record's name, or a Pane's title, that is code: the title role in the mono family.
export const TITLE_CODE = "font-mono";

// A Pane. Its head insets its bar at the page inset over one hairline: the
// back act or (on touch) the switcher, the title, then the acts, in one row.
// The bar is at a set height, a floor as a row's. The body insets its
// sections at the page inset.
export const PAGE_HEAD = "px-page border-b border-edge bg-surface";
// A room Pane stands its head a pad off the top, on the table: the ten-foot
// safe area is what the head's text keeps from the edge, the pad and the bar's
// own gap over its line, so the safe area is no band of the head's surface (the
// page inset all round would take 48 of the canvas's 540 over the bar). The
// table shows above the bar; the bar's surface starts at the pad.
export const PAGE_HEAD_ROOM = "pt-pad";
// A bar is a row of controls: the control height and the gap above and below
// (the floor counts the padding, so it is spelt as that sum).
export const PAGE_TOP_BAR =
	"gap-gap py-gap min-h-[calc(var(--spacing-control)+2*var(--spacing-gap))]";
// A record's place in the bar: docs/architecture/ui-core/layout.md, "Bar".
export const PAGE_WITHIN = "text-ink-meta";
export const PAGE_WITHIN_SEP = "text-ink-mark px-gap before:content-['/']";
// On touch the back act or the switcher reaches the page inset by its start,
// the acts by their end, and the title stands at the inset.
// Each reaches by what an icon act has round its glyph.
export const PAGE_TOP_BAR_START =
	"-ms-[calc((var(--spacing-control)-var(--spacing-icon-control))/2)]";
export const PAGE_TOP_BAR_END =
	"-me-[calc((var(--spacing-control)-var(--spacing-icon-control))/2)]";

// A bar that holds a context pick (a scope) keeps the same floor: the pick
// keeps its content up to three fifths of the row (`PAGE_CONTEXT`, the floor's
// complement) and its label truncates before the title is cut below its floor.
export const PAGE_CONTEXT = "max-w-3/5";
export const PAGE_BODY = "gap-section p-page";

export const PAGE_BODY_OVER_FOOT = "pb-section";
// A body with no foot: docs/architecture/ui-core/layout.md, "Foot".
export const PAGE_BODY_TOAST_ROOM =
	"pb-[calc(2*var(--spacing-control)+2*var(--spacing-gap)+2*var(--spacing-page))]";
export const PAGE_BODY_UNDER_TOAST =
	"in-[main:has([data-toast])]:pb-[calc(2*var(--spacing-control)+2*var(--spacing-gap)+2*var(--spacing-page))]";

// The run of rows with a third track after its two: the rows end at the reading
// width and the track takes the rest. A subgrid draws in its parent's columns, so
// a cap on each part's box would not bound its rows, the columns do. It is
// `ROWS` with its columns replaced, so no `!` is needed to beat them.
export const ROWS_MEASURED = `${ROWS_HOST} [grid-template-columns:fit-content(var(--container-measure-short))_minmax(0,1fr)_max(0px,calc(100%-var(--container-reading)))] col-span-2 *:col-span-2 ${WIDE_SPANS} gap-x-0`;
