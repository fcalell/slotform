// The values and types two or more component files build on. The four public
// modules (`roster.ts`, `descriptors.ts`, `variants.ts`, `variant-tables.ts`)
// import the component files to re-export them, so a component file takes what
// it shares from here or `./descriptors.ts`, never from them, and no file is in
// an import cycle.

import { cva } from "class-variance-authority";
import type { ClassValue } from "clsx";
import {
	COLOR_NAMES,
	type ColorName,
	type Move,
	type RadiusRole,
	type ShadowLevel,
	type Size,
	type SpacingRole,
	type TypeRole,
	type Width,
} from "../tokens.ts";

export const PLATFORMS = ["web", "native"] as const;
export type Platform = (typeof PLATFORMS)[number];

// The states a component can be drawn in: the eight interaction states, plus
// `empty` for a component with an empty form, and the states a read puts a
// frame or collection in: busy, stale, paused, more, streaming. The showcase
// draws each component in exactly the states its entry lists.
export const STATES = [
	"rest",
	"hover",
	"focus",
	"active",
	"disabled",
	"loading",
	"pending",
	"error",
	"selected",
	"empty",
	"busy",
	"stale",
	"paused",
	"more",
	"streaming",
] as const;
export type State = (typeof STATES)[number];

// The tokens a component may draw, by namespace: type roles, colours,
// radii, spacing roles, sizes and widths, shadow levels. A colour is a name,
// or a family prefix ending in `-` (`chip-` covers every chip role); every
// other namespace names its tokens. A namespace left out owns nothing.
export interface Owns {
	roles?: readonly TypeRole[];
	colors?: readonly (ColorName | `${string}-`)[];
	radii?: readonly RadiusRole[];
	spacing?: readonly SpacingRole[];
	sizes?: readonly (Size | Width)[];
	elevation?: readonly ShadowLevel[];
}

// A component's prop names, the cells it draws (a `FAMILIES` name for every
// cell of that family, `FAMILY.axis.value` for one of its cells, or a
// single-cell constant of `./variants`), the states it has a form for and the
// tokens it owns.
export interface RosterEntry {
	props: readonly string[];
	draws: readonly string[];
	states: readonly State[];
	motion: readonly Move[];
	owns?: Owns;
	// The platforms that ship it; absent means both.
	platforms?: readonly Platform[];
}

export type Axes = Record<string, Record<string, string>>;

export interface Matrix<T extends Axes> {
	base: string;
	variants: T;
	compoundVariants?: Array<{ [K in keyof T]?: keyof T[K] } & { class: string }>;
	defaultVariants?: { [K in keyof T]?: keyof T[K] };
}

// A variant's props: one optional pick per axis, and the class or the
// className a caller merges in, never both. The shape is cva's own, spelled
// here so the declarations this file emits name this package's types alone:
// cva keeps its prop types in a `types` module the emit would otherwise have
// to import by path, which is not portable and fails wherever the package is
// built inside a pnpm virtual store.
export type ClassProp =
	| { class: ClassValue; className?: never }
	| { class?: never; className: ClassValue }
	| { class?: never; className?: never };
export type VariantProps<T extends Axes> = {
	[K in keyof T]?: keyof T[K] | null | undefined;
} & ClassProp;
export type Variant<T extends Axes> = (props?: VariantProps<T>) => string;

export type ContentTone = ColorName;

export const PRESS = ["rest", "hover", "focus", "active"] as const;

// Identity, for the contextual typing: it keeps each cell key literal so a
// compound row or a default naming an absent key fails to compile.
export function matrix<T extends Axes>(config: Matrix<T>): Matrix<T> {
	return config;
}

// A state's look eases in on `fast` and a press lands on `instant`; never
// `outline`, since the focus ring snaps in and out and a key reads as a
// position. The phone has no hover and answers a press in Reanimated
// (`usePress`), which these classes leave alone.
export const ANSWER =
	"transition-[background-color,border-color,color,text-decoration-color,fill,stroke,opacity,scale] duration-fast ease-out active:duration-instant";
// A filled control gives to the press scale under a press; it lets go on
// ANSWER's `fast`.
export const GIVE = "active:scale-(--scale-press)";

// A fill is its full track scaled by transform, never a width or a height: the
// site sets `--fill` (a share, 0 to 1), the fill moves on `slow` `in-out` and
// its level colour cross-fades on `base`. One that mounts grows from its start
// (`starting:`), the start edge following the writing direction.
export const FILL_X =
	"origin-left rtl:origin-right scale-x-(--fill) starting:scale-x-0 transition-[scale,background-color] [transition-duration:var(--transition-duration-slow),var(--transition-duration-base)] ease-in-out";

// The role is the only way to set type; its ink, family and figures ride
// with it.
// Every cell is spelled out: Tailwind reads source text, so a cell built from
// a template would compile to nothing in a consumer build. c19 pins each cell
// to TYPE_SCALE, so the two cannot drift.
export const TEXT = matrix({
	base: "",
	variants: {
		role: {
			display:
				"text-display leading-display tracking-display font-medium text-ink-body tabular-nums",
			figure:
				"text-figure leading-figure font-medium text-ink-body tabular-nums",
			title:
				"text-title leading-title tracking-title font-medium text-ink-body",
			heading: "text-heading leading-heading font-medium text-ink-body",
			body: "text-body leading-body font-normal text-ink-body",
			meta: "text-meta leading-meta font-normal text-ink-meta",
			caption:
				"text-caption leading-caption tracking-caption font-normal text-ink-meta",
			code: "text-code leading-code font-normal text-ink-body font-mono",
		},
	},
	defaultVariants: { role: "body" },
});

export const BUTTON_LABEL = matrix({
	base: `text-body leading-body font-medium ${ANSWER}`,
	variants: {
		act: {
			primary: "text-on-act-accent",
			danger: "text-on-act-danger",
			secondary: "text-ink-body",
			destructive: "text-danger",
			quiet: "text-ink-meta",
		},
	},
	defaultVariants: { act: "primary" },
});

// The only way a cva is built. Taking the whole matrix leaves no second
// argument to get wrong, so a cva cannot end up rendering another table's cells
// or dropping its own base. cva's own config and prop types are conditional
// on a concrete axis set, which is why one generic helper has to widen both.
export function build<T extends Axes>(table: Matrix<T>): Variant<T> {
	return cva<T>(
		table.base,
		table as unknown as Parameters<typeof cva<T>>[1],
	) as Variant<T>;
}

export const text = build(TEXT);

// `w-max` because a popup mounts in a zero-size container, where its shrink-to-fit
// width would be its longest word.
export const NAME_GROUND =
	"w-max px-gap py-gap bg-raised border border-edge-raised rounded-control shadow-float text-meta leading-meta font-normal text-ink-body";

// What lays a box out in its run of rows' columns, the tokens every class
// list built on them keeps whatever a component merges over them (the walk's
// grid exceptions name these): a run of rows is a grid that marks itself the
// rows' host (`ROWS_HOST`), and a definition row or a form's group a subgrid of
// its columns (`SUBGRID`).
export const ROWS_HOST = "rows-host grid";
export const SUBGRID = "grid grid-cols-subgrid";

// Figures at one width, beside the type role of the line they stand in (a
// table's number and age, a meter's share, a chart's total, ticks and times).
export const FIGURES = "tabular-nums";

// A card: the surface inside a hairline edge at the card radius. Every part
// of a Section's body is one (a sheet's rows flush on it, a Form's
// rows, a Table's; anything else, a Prose, a Stages, at the card's inset:
// `CARD_PART`), and so is a block a reader reads whole (Code, Diff:
// a diff's soft grounds sit on the surface wherever it stands), a Message's
// card and an empty state outside a card.
export const CARD = "rounded-card border border-edge bg-surface";
export const CARD_PART = `p-pad ${CARD}`;

// A failed image's glyph, in the meta ink its alt text is drawn in.
export const IMAGE_FAILED_INK = "text-ink-meta";

// Every run of rows (a sheet's, a Form's) is one grid of two
// columns, so a definition row's label column is as wide as the widest label
// of the run; the grid places each entry across both columns, and a
// definition row alone subgrids them (`DEFINITION_BOX`). A form's group is a
// run inside the form's (`FORM_GROUP`, a subgrid, so its labels align with
// the rest). The two columns are one chain down a Pane: its body, a Section,
// the Section's body, the sheet or the Form each stand in `ROWS`, which is
// its own two columns, and a subgrid of its parent's where the parent is a
// `rows-host` (the marker is on every `ROWS` grid; a Pane body that fills is
// a flex column and carries none), so every
// definition list in a Pane shares the label column of the widest label among
// them, and a run standing alone (a Sheet's, a Column's) keeps its own. The run draws the hairline between its rows once, so no row
// carries one: a child selector is one uniwind drops, so native draws that
// hairline per row and the web draws it as an overlay on the run (a
// pseudo-element on each entry but the last, so a rounded row keeps a
// straight hairline). The label column is as wide as the widest label, no
// wider than one short measure: a longer label wraps at its words, and since a
// row needs two short measures the value column keeps one at least, so a long
// label never starves a pick of its words.
// Wide content (a Table, a line Diff, a code block, a Canvas, a chart) marks itself
// `data-wide` and spans every track of the run it stands in, and so does each
// part of the chain that holds it: it stands at the body's width, past the
// reading width's third track (`ROWS_MEASURED`), while the rows beside it keep
// the reading width. Content decides it, so no Pane or Section is told.
export const WIDE_SPANS =
	"[&>[data-wide]]:col-span-full [&>:has([data-wide])]:col-span-full";
export const ROWS = `${ROWS_HOST} grid-cols-[fit-content(var(--container-measure-short))_minmax(0,1fr)] [.rows-host>&]:grid-cols-subgrid col-span-2 *:col-span-2 ${WIDE_SPANS} gap-x-0`;

export const COLOR_SET: ReadonlySet<string> = new Set(COLOR_NAMES);

// The matrices already carry the answer, so the tint a plugin hands to its
// own glyph or spinner is read back off a cell's colour instead of being
// written a second time.
export function toneOf(cell: string): ContentTone {
	const tone = cell
		.split(/\s+/)
		.map((name) => /^(?:text|bg|border)-(.+)$/.exec(name)?.[1])
		.find((name) => name !== undefined && COLOR_SET.has(name));
	// Every cell these read names a contract colour, which c22 pins.
	return (tone ?? "ink-body") as ContentTone;
}
