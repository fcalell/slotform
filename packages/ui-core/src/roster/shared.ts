// Shared by two or more component files: docs/architecture/ui-core/roster.md, "Roster files".

import { cva } from "class-variance-authority";
import type { ClassValue } from "clsx";
import {
	COLOR_NAMES,
	type ColorName,
	type Move,
	type RadiusRole,
	type ShadowElevation,
	type Size,
	type SpacingRole,
	type TypeRole,
	type Width,
} from "../tokens.ts";

export const PLATFORMS = ["web", "native"] as const;
export type Platform = (typeof PLATFORMS)[number];

// The states a component can be drawn in: docs/architecture/ui-core/roster.md, "Roster entries".
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

// The tokens a component may draw: docs/architecture/ui-core/roster.md, "Token ownership".
export interface Owns {
	roles?: readonly TypeRole[];
	colors?: readonly (ColorName | `${string}-`)[];
	radii?: readonly RadiusRole[];
	spacing?: readonly SpacingRole[];
	sizes?: readonly (Size | Width)[];
	elevation?: readonly ShadowElevation[];
}

// A roster entry: docs/architecture/ui-core/roster.md, "Roster entries".
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

// A variant's props: docs/architecture/ui-core/roster.md, "Variants".
// cva keeps its prop types in a `types` module the emit would import by path, which fails where the package is built inside a pnpm virtual store.
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

// Identity, for the contextual typing: it keeps each class-set key literal so a
// compound row or a default naming an absent key fails to compile.
export function matrix<T extends Axes>(config: Matrix<T>): Matrix<T> {
	return config;
}

// A state's look and a press: docs/architecture/ui-core/motion.md, "Press".
export const ANSWER =
	"transition-[background-color,border-color,color,text-decoration-color,fill,stroke,opacity,scale] duration-fast ease-out active:duration-instant";
// A filled control gives to the press scale under a press; it lets go on
// ANSWER's `fast`.
export const GIVE = "active:scale-(--scale-press)";

// A fill scales by transform: docs/architecture/ui-core/motion.md, "Value and fills".
export const FILL_X =
	"origin-left rtl:origin-right scale-x-(--fill) starting:scale-x-0 transition-[scale,background-color] [transition-duration:var(--transition-duration-slow),var(--transition-duration-base)] ease-in-out";

// A type role sets type, every class set spelled out: docs/architecture/ui-core/roster.md, "Class sets".
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

// The only way a cva is built: docs/architecture/ui-core/roster.md, "Variants".
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

// The rows grid's tokens: docs/architecture/ui-core/layout.md, "Rows grid".
export const ROWS_HOST = "rows-host grid";
export const SUBGRID = "grid grid-cols-subgrid";

// Figures at one width, beside the type role of the line they stand in (a
// table's number and age, a meter's share, a chart's total, ticks and times).
export const FIGURES = "tabular-nums";

// A card: docs/architecture/ui-core/layout.md, "Cards".
export const CARD = "rounded-card border border-edge bg-surface";
export const CARD_PART = `p-pad ${CARD}`;

// A failed image's glyph, in the meta ink its alt text is drawn in.
export const IMAGE_FAILED_INK = "text-ink-meta";

// A run of rows is one grid: docs/architecture/ui-core/layout.md, "Rows grid".
export const WIDE_SPANS =
	"[&>[data-wide]]:col-span-full [&>:has([data-wide])]:col-span-full";
export const ROWS = `${ROWS_HOST} grid-cols-[fit-content(var(--container-measure-short))_minmax(0,1fr)] [.rows-host>&]:grid-cols-subgrid col-span-2 *:col-span-2 ${WIDE_SPANS} gap-x-0`;

export const COLOR_SET: ReadonlySet<string> = new Set(COLOR_NAMES);

// A tone read back off a class set: docs/architecture/ui-core/roster.md, "Class sets".
export function toneOf(classSet: string): ContentTone {
	const tone = classSet
		.split(/\s+/)
		.map((name) => /^(?:text|bg|border)-(.+)$/.exec(name)?.[1])
		.find((name) => name !== undefined && COLOR_SET.has(name));
	// A class set naming no contract colour reads as `ink-body`.
	return (tone ?? "ink-body") as ContentTone;
}
