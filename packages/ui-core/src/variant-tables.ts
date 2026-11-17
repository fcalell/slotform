// The variant matrices as data, internal with no subpath: docs/architecture/ui-core/roster.md, "Matrices".

import { ANSWER, FILL_X, matrix } from "./roster/shared.ts";

export { BANNER, BANNER_GLYPH } from "./roster/banner.ts";
export {
	CHART_BAND,
	CHART_FILL,
	FILL_Y,
	TRAVEL_Y,
} from "./roster/bar-chart.ts";
export { BUTTON, ICON_BUTTON } from "./roster/button.ts";
export {
	CANVAS_GROUP,
	CANVAS_NODE,
	CANVAS_NODE_GLYPH,
	CANVAS_NODE_INK,
	CANVAS_NODE_MARK,
	CANVAS_NODE_NAME,
	CANVAS_NODE_TEXT,
	LIFT,
	PATH_TONE,
} from "./roster/canvas.ts";
export { CODE_TEXT } from "./roster/code.ts";
export { COLUMNS } from "./roster/columns.ts";
export { DIFF_LINE, PROSE_DIFF_RUN } from "./roster/diff.ts";
export { FILL_FADE, STEP_COUNT_SEGMENT } from "./roster/gate.ts";
export {
	FIELD_VALUE,
	OTP_BOX,
	TEXT_AREA,
	TEXT_AREA_BUDGET,
} from "./roster/input.ts";
export {
	OPTION_RADIO,
	PICKER,
	RADIO_DOT,
	SEGMENT,
	SEGMENT_LABEL,
} from "./roster/picker.ts";
export { PROSE_MARKER } from "./roster/prose.ts";
export { RULE_ARROW } from "./roster/rules.ts";
export { FILE_COUNT, FILE_PATH_PART } from "./roster/section.ts";
export type { Axes, Matrix } from "./roster/shared.ts";
export { ANSWER, BUTTON_LABEL, FILL_X, GIVE, TEXT } from "./roster/shared.ts";
export {
	CURRENT_BAR,
	CURRENT_ROOM,
	PLACE_ROW,
	PLACE_ROW_GLYPH,
	PLACE_TAB,
	PLACE_TAB_LABEL,
} from "./roster/shell.ts";
export { STAGE, STAGE_MARK, STAGE_RAIL } from "./roster/stages.ts";
export { TRAVEL_X } from "./roster/stats.ts";
export { SWITCH, SWITCH_THUMB, TOGGLE_THUMB } from "./roster/switch.ts";
export {
	TABLE_CHANGE_VALUE,
	TABLE_FROZEN_CELL,
	TABLE_HEAD,
	TABLE_HEAD_LABEL,
	TABLE_ROW,
} from "./roster/table.ts";
export { MESSAGE } from "./roster/thread.ts";
export { TOAST_STATE } from "./roster/toast.ts";

// ── Motion cells ────────────────────────────────────────────────────

// The cells a move spells: docs/architecture/ui-core/motion.md, "Moves and move cells".

// A checkbox's mark grows from 0.6 with its opacity on `fast` and leaves on
// `instant` (Base UI keeps it mounted through the leave).
export const CHECK_MARK =
	"transition-[scale,opacity] duration-fast ease-out data-starting-style:scale-60 data-starting-style:opacity-0 data-ending-style:scale-60 data-ending-style:opacity-0 data-ending-style:duration-instant";

// A disclosure chevron turns by transform on `fast`, in and out, instead of
// swapping glyphs; the site names the turn (`-rotate-90` closed).
export const CHEVRON = "transition-transform duration-fast ease-in-out";

// A value that changes while shown swaps old for new: the new enters over
// `fast`, the old leaves over it, each by opacity and a transform the site
// names with `--swap-y` (a figure's roll: the share of its own height the old
// leaves by and the new rises from) and `--swap-scale` (a mark's: it grows from
// there). Neither set, it is a cross-fade. The old one's style is its end
// state (`swap-gone`) and its animation runs from rest toward it, so it is
// gone wherever animations are off.
export const SWAP_IN =
	"animate-[swap-in_var(--transition-duration-fast)_var(--ease-out)_both]";
export const SWAP_OUT =
	"swap-gone animate-[swap-out_var(--transition-duration-fast)_var(--ease-out)_both]";

// ── Text ────────────────────────────────────────────────────────────

// Emphasis inside a line: weight 500, never a size. `display`, `figure`,
// `title` and `heading` already sit at or above it.
export const TEXT_STRONG = matrix({
	base: "",
	variants: {
		role: {
			display: "",
			figure: "",
			title: "",
			heading: "",
			body: "font-medium",
			meta: "font-medium",
			caption: "font-medium",
			code: "font-medium",
		},
	},
});

// ── Icon ────────────────────────────────────────────────────────────

// `fit` is what the icon sits beside: meta or caption text, body text, or
// the inside of a control. Its ink is the place's (currentColor on the web).
export const ICON = matrix({
	base: "",
	variants: {
		fit: {
			meta: "size-icon-meta",
			body: "size-icon",
			control: "size-icon-control",
		},
	},
	defaultVariants: { fit: "body" },
});

// ── Link ────────────────────────────────────────────────────────────

// Accent ink at 500 in the type of the line it sits in. `inline` is
// underlined at rest; `standalone` is not, and stands on the target height
// (`LINK_TARGET`).
export const LINK = matrix({
	base: `font-medium text-accent-ink ${ANSWER}`,
	variants: {
		fit: {
			inline: "underline",
			standalone: "no-underline",
		},
	},
	defaultVariants: { fit: "inline" },
});

// ── Avatar ──────────────────────────────────────────────────────────

// The step's fill under its initials; the image form draws the base alone. An
// avatar is a body line and a badge's room square.
export const AVATAR = matrix({
	base: "rounded-full size-[calc(var(--spacing-line-body)+var(--spacing-badge))]",
	variants: {
		step: {
			"1": "bg-avatar-1",
			"2": "bg-avatar-2",
			"3": "bg-avatar-3",
			"4": "bg-avatar-4",
			"5": "bg-avatar-5",
			"6": "bg-avatar-6",
			"7": "bg-avatar-7",
			"8": "bg-avatar-8",
		},
	},
});

export const AVATAR_LABEL = matrix({
	base: "text-caption leading-caption tracking-caption font-medium",
	variants: {
		step: {
			"1": "text-avatar-1-ink",
			"2": "text-avatar-2-ink",
			"3": "text-avatar-3-ink",
			"4": "text-avatar-4-ink",
			"5": "text-avatar-5-ink",
			"6": "text-avatar-6-ink",
			"7": "text-avatar-7-ink",
			"8": "text-avatar-8-ink",
		},
	},
});

// ── Status ──────────────────────────────────────────────────────────

// The status colour is the dot's alone; the word is meta ink in every
// state. `idle` is the hollow dot, so it reads apart from `waiting`.
// `running` draws no dot: a spinner stands in its place (`STATUS_SPINNER`).
export const STATUS_DOT = matrix({
	base: "size-dot rounded-full",
	variants: {
		tone: {
			active: "bg-accent-ink",
			waiting: "bg-ink-meta",
			done: "bg-ok",
			attention: "bg-chip-amber",
			failed: "bg-danger",
			idle: "border border-ink-meta",
		},
	},
});

// A state chip: the state's dot (`STATUS_DOT`, the spinner while `running`)
// and word on the state's soft fill under the state's ink, a hairline a step
// darker than the fill, the chip's height, corners and inset. It stands where
// a `Status` is given its own word. Every tone leads with its dot, so a chip
// reads as a state and says which: the neutral states (`waiting`, `idle`),
// which share a soft of their own, opaque and apart from a disabled act's
// fill and the sheet an outlined pill stands on, under the meta ink, are told
// apart as in a row, the filled dot from the hollow one. They draw no edge: a
// grey box in a grey hairline is a control's outline. A state chip is a chip:
// its caption line between its hairlines, no height of its own.
export const STATE_CHIP = matrix({
	base: "rounded-chip px-pad border",
	variants: {
		tone: {
			active: "bg-accent-soft text-accent-ink border-accent-edge",
			waiting: "bg-neutral-soft text-ink-meta border-transparent",
			running: "bg-accent-soft text-accent-ink border-accent-edge",
			done: "bg-ok-soft text-ok border-ok-edge",
			attention: "bg-warn-soft text-warn border-warn-edge",
			failed: "bg-danger-soft text-danger border-danger-edge",
			idle: "bg-neutral-soft text-ink-meta border-transparent",
		},
	},
});

// A row's change mark: its glyph in the kind's ink in a lane one icon wide.
// A marked row's lane stands ahead of its label, so the marked rows of a
// change set align; an unmarked row draws no lane. Added is `ok`, removed
// `danger`, changed and stale `warn` (told apart by their glyphs), unchanged
// the meta ink.
export const CHANGE_MARK = matrix({
	base: "size-icon",
	variants: {
		kind: {
			added: "text-ok",
			changed: "text-warn",
			removed: "text-danger",
			unchanged: "text-ink-meta",
			stale: "text-warn",
		},
	},
});

// ── Chip ────────────────────────────────────────────────────────────

// A data value's tag: docs/architecture/ui-core/roster.md, "Status and chips".
export const CHIP = matrix({
	base: "rounded-chip border gap-gap text-ink-body",
	variants: {
		trailing: {
			none: "px-pad",
			remove: "pl-pad",
		},
		ground: {
			edge: "border-edge bg-surface",
			soft: "border-transparent bg-chip-neutral-soft",
		},
	},
	defaultVariants: { trailing: "none", ground: "edge" },
});

// The chip's dot: docs/architecture/ui-core/roster.md, "Status and chips".
export const CHIP_DOT = matrix({
	base: "size-dot rounded-full shrink-0",
	variants: {
		family: {
			red: "bg-chip-red",
			amber: "bg-chip-amber",
			green: "bg-chip-green",
			teal: "bg-chip-teal",
			violet: "bg-chip-violet",
			pink: "bg-chip-pink",
		},
	},
});

// ── Field ───────────────────────────────────────────────────────────

// A typing or choosing control's box: the surface with the hairline as its
// hairline (the strong edge under the pointer, the accent when focused),
// `edge-error` in error. It stands at the control height (the body line and
// the gap above and below it) in a form's row and in a bar (a toolbar's
// search box or picker) alike; `trailing` is its right inset (an in-field act
// sits `inside` from the edge).
export const FIELD = matrix({
	base: `min-h-control gap-gap rounded-control border bg-surface ${ANSWER}`,
	variants: {
		trailing: {
			none: "px-pad",
			act: "pl-pad pr-gap",
		},
		state: {
			rest: "border-edge",
			error: "border-edge-error",
		},
	},
	defaultVariants: { trailing: "none", state: "rest" },
});

// ── Switch and checkbox ─────────────────────────────────────────────

export const CHECKBOX = matrix({
	base: `size-icon-control rounded-chip ${ANSWER}`,
	variants: {
		state: {
			unchecked: "border border-edge bg-surface",
			checked: "bg-toggle-on",
			mixed: "bg-toggle-on",
		},
	},
	defaultVariants: { state: "unchecked" },
});

// ── Row ─────────────────────────────────────────────────────────────

// A row in a group, a list or a popover. `lines` is what it stands
// for: one line, a title over its meta, or a setting (a label over its
// description), or `whole`, a title wrapped to every line it needs (no
// minimum height, the lines set it); the taller forms pad so a wrapped line
// keeps air. Highlighted (the
// keyboard's or the pointer's current option) under the hover wash, pressed
// under the press wash, selected under the selection wash, and the selection
// under the pointer a step darker. One form everywhere: the row radius at the
// card's inset, so a row's text meets the title over its card or list and its
// wash is rounded in a bare list and in a group alike (a row inside a card keeps
// its role's radius), and a group draws the hairline between its rows.
export const ROW = matrix({
	base: `gap-gap px-pad py-gap rounded-row ${ANSWER}`,
	variants: {
		state: {
			rest: "",
			highlighted: "bg-wash-hover",
			pressed: "bg-wash-press",
			selected: "bg-wash-selected",
			"selected-hover": "bg-wash-selected-hover",
		},
	},
	defaultVariants: { state: "rest" },
});

// A list row's title at body size and weight 400, its ink by how it stands:
// `name` the body ink; `dim` a row off a highlighted path, in the meta ink,
// never faded, so it keeps the text floor. A title read as a passage (a note)
// takes the same cells, wrapped to every line.
export const ROW_TITLE = matrix({
	base: "text-body leading-body font-normal",
	variants: {
		lines: {
			name: "text-ink-body",
			dim: "text-ink-meta",
		},
	},
	defaultVariants: { lines: "name" },
});

// A row's type mark: one or two characters (`T`, `#`, `[ ]`, `{ }`) in the code
// face at the caption size, weight 600, in the family's ink on its soft ground,
// in a box the control's icon square, with the chip's corners.
export const ROW_MARK = matrix({
	base: "flex size-icon-control shrink-0 items-center justify-center rounded-chip whitespace-nowrap text-caption leading-caption font-semibold font-mono",
	variants: {
		family: {
			red: "bg-chip-red-soft text-chip-red-ink",
			amber: "bg-chip-amber-soft text-chip-amber-ink",
			green: "bg-chip-green-soft text-chip-green-ink",
			teal: "bg-chip-teal-soft text-chip-teal-ink",
			violet: "bg-chip-violet-soft text-chip-violet-ink",
			pink: "bg-chip-pink-soft text-chip-pink-ink",
			neutral: "bg-chip-neutral-soft text-chip-neutral-ink",
		},
	},
});

// One step of a row's step list: a status mark beside its label at meta
// size, the running step in the body ink and the others (done, waiting) in
// the meta ink; the status colour stays on the mark.
export const ROW_STEP = matrix({
	base: "gap-gap text-meta leading-meta font-normal",
	variants: {
		state: {
			running: "text-ink-body",
			rest: "text-ink-meta",
		},
	},
	defaultVariants: { state: "rest" },
});

// A box one line of a type role tall: a control or a skeleton bar centred on
// the line it stands beside or in for (a checkbox on its label's line, a
// loading line at its text's height).
export const LINE_BOX = matrix({
	base: "",
	variants: {
		role: {
			body: "text-body leading-body",
			meta: "text-meta leading-meta",
			title: "text-title leading-title",
			heading: "text-heading leading-heading",
			code: "text-code leading-code",
			figure: "text-figure leading-figure",
			display: "text-display leading-display",
		},
	},
	defaultVariants: { role: "body" },
});

// ── Menu ────────────────────────────────────────────────────────────

// A menu's acts by its `lines`: a popover at the popover's width (its ground
// and inset are `POPOVER`'s), or the rows inside a touch sheet at the
// popover's rhythm and inset.
export const MENU = matrix({
	base: "",
	variants: {
		lines: {
			popover: "w-popover",
			sheet: "gap-gap p-gap",
		},
	},
	defaultVariants: { lines: "popover" },
});

// A menu's group of rows (its acts, or the destructive acts last): the first
// group stands alone, a group after another under a hairline between them.
export const MENU_GROUP = matrix({
	base: "",
	variants: {
		place: {
			first: "",
			after: "border-t border-edge pt-gap",
		},
	},
	defaultVariants: { place: "first" },
});

// A menu act's label: the body role's, in `danger` for an act that removes
// or ends something.
export const MENU_LABEL = matrix({
	base: "",
	variants: {
		kind: {
			act: "",
			destructive: "text-danger",
		},
	},
	defaultVariants: { kind: "act" },
});

// ── Stats meter ───────────────────────────────────────────────────────────

// A meter's fill by its level (`METER_NEAR`): under in the meta ink, near in
// the amber mark, over in `danger`; never the accent. A goal's meter reaches
// `met` in `ok`, the good tone, and is `under` short of it.
export const METER_FILL = matrix({
	base: `size-full ${FILL_X}`,
	variants: {
		level: {
			under: "bg-ink-meta",
			near: "bg-chip-amber",
			over: "bg-danger",
			met: "bg-ok",
		},
	},
	defaultVariants: { level: "under" },
});

// ── Image ───────────────────────────────────────────────────────────

// The frame an image stands in, a hairline on the page. A thumbnail is a
// square tile at its radius; the content fit takes its container's width and
// the card's radius, down to the height cap, where its width narrows to its
// aspect (the component's box) so the cap never crops the picture, and the
// narrowed box stands centred in its container. Waiting it
// is a skeleton and failed a group ground holding a glyph over the alt text,
// each at the loaded height: the thumbnail's side, and the content fit's
// aspect, which its consumer always gives since its bytes have none yet.
export const IMAGE = matrix({
	base: `border border-edge ${ANSWER}`,
	variants: {
		fit: {
			thumb: "size-[calc(4*var(--spacing-line-body))] rounded-control",
			// A body line and a badge's room: the picture beside a name in a bar.
			mini: "size-[calc(var(--spacing-line-body)+var(--spacing-badge))] rounded-chip",
			content:
				"w-full max-h-[calc(20*var(--spacing-line-body))] self-center rounded-card",
			// A gallery's tile: a fixed height at the picture's aspect, no wider
			// than its container.
			tile: "h-[calc(8*var(--spacing-line-body))] max-w-full rounded-control",
		},
		state: {
			rest: "",
			loading: "bg-skeleton",
			error: "gap-gap p-gap bg-group",
		},
	},
	defaultVariants: { fit: "content", state: "rest" },
});

// The picture inside its frame: a thumbnail fills its square; the content fit
// fills the width at the image's own aspect, down to the height cap; a tile
// fills its box (each plugin crops it from the picture's top, where a page's
// head is).
export const IMAGE_PICTURE = matrix({
	base: "",
	variants: {
		fit: {
			thumb: "size-full",
			mini: "size-full",
			content: "w-full max-h-[calc(20*var(--spacing-line-body))]",
			tile: "size-full",
		},
	},
	defaultVariants: { fit: "content" },
});

// ── Paint ───────────────────────────────────────────────────────────

// What a part draws while its data is not here: docs/architecture/ui-core/reads.md, "Paint shapes".
export const PAINT = matrix({
	base: "bg-skeleton",
	variants: {
		kind: {
			glyphs: "text-transparent rounded-chip",
			box: "",
			control: "border-transparent",
		},
	},
});
