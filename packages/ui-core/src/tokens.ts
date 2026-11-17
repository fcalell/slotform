// The closed token contract, as data: docs/architecture/ui-core/tokens.md, "The contract as data".

// Prefixes every error this package throws.
export const LABEL = "@fcalell/ui-core";

export const MODES = ["light", "dark"] as const;
export type Mode = (typeof MODES)[number];

// ── Knobs ───────────────────────────────────────────────────────────

// Density is the pointer and the width, never a knob: docs/architecture/ui-core/tokens.md, "Density and room".
export const DENSITIES = ["touch", "desktop", "room"] as const;
export type Density = (typeof DENSITIES)[number];

// The sets a theme resolves to px: `room` stands in canvas units, which
// `./scales` reads and the theme never holds.
export const PIXEL_DENSITIES = ["touch", "desktop"] as const;
export type PixelDensity = (typeof PIXEL_DENSITIES)[number];

// The canvas the room set is drawn on, the ten-foot guidance's own
// (Microsoft's XAML at 200 %, Android TV at mdpi): the room unit is the
// screen over it on the tighter axis, never under one pixel.
export const ROOM_CANVAS = { width: 960, height: 540 } as const;

export const FONT_ROLES = ["sans", "mono"] as const;
export type FontRole = (typeof FONT_ROLES)[number];

// The knobs: docs/architecture/ui-core/tokens.md, "Knobs".
export interface Knobs {
	hue: { accent: number; cast: number };
	radius: number;
	size: number;
	fonts: Record<FontRole, string>;
}

// The cast has no default of its own: it is the accent's.
export const KNOB_DEFAULTS: {
	hue: { accent: number };
	radius: number;
	size: number;
	fonts: Record<FontRole, string>;
} = {
	hue: { accent: 264 },
	radius: 6,
	size: 13,
	fonts: { sans: "IBM Plex Sans", mono: "IBM Plex Mono" },
};

// The `size` knob's range, in px of the desktop body.
export const SIZE_MIN = 12;
export const SIZE_MAX = 18;

// ── Colors ──────────────────────────────────────────────────────────

// The six hued chip families, in hue order (25, 85, 145, 195, 305, 350),
// the accent's 215–290 band left out so no family ever wears it.
const CHIP_HUES = ["red", "amber", "green", "teal", "violet", "pink"] as const;
type ChipHue = (typeof CHIP_HUES)[number];

// Every chip family: the six hues and `neutral`, the resting neutral ground
// under the body ink (an applied filter, a tag without a category), which
// has a soft and an ink and no mark.
export const CHIP_FAMILIES = [...CHIP_HUES, "neutral"] as const;
export type ChipFamily = (typeof CHIP_FAMILIES)[number];

export const AVATAR_STEPS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type AvatarStep = (typeof AVATAR_STEPS)[number];

// The palette by what each color is for, in the order the palette reads.
export const COLOR_GROUPS = {
	surfaces: [
		"canvas",
		"surface",
		"group",
		// the ground of a list's group band and a section band
		"band",
		"raised",
		"edge",
		"edge-raised",
		"edge-strong",
		"grid",
		"scrim",
	],
	inks: ["ink-body", "ink-meta", "ink-mark"],
	accent: ["accent", "on-accent", "accent-soft", "accent-ink", "accent-edge"],
	status: [
		"ok",
		"ok-soft",
		"ok-edge",
		"warn",
		"warn-soft",
		"warn-edge",
		"danger",
		"danger-soft",
		"danger-edge",
		// the neutral state's (`waiting`, `idle`): its ink is the meta ink and
		// it has no edge
		"neutral-soft",
	],
	// the mark, the soft ground, the ink on the soft; neutral has no mark
	chips: [
		...CHIP_HUES.flatMap(
			(family) =>
				[
					`chip-${family}`,
					`chip-${family}-soft`,
					`chip-${family}-ink`,
				] as const,
		),
		"chip-neutral-soft",
		"chip-neutral-ink",
	],
	// a chart series' fill: the chip hue, quieter, holding 3:1 on `surface` and
	// `group`; the seventh is the neutral family's grey
	chart: ([...CHIP_HUES, "neutral"] as const).map(
		(hue) => `chart-${hue}` as const,
	),
	// the fill and the initial on it
	avatars: AVATAR_STEPS.flatMap(
		(step) => [`avatar-${step}`, `avatar-${step}-ink`] as const,
	),
	// the body ink at an alpha, so they follow the mode and sit on any surface
	// as one more step
	washes: [
		"wash-hover",
		"wash-press",
		"wash-selected",
		"wash-selected-hover",
		"skeleton",
		"fill-disabled",
		"fill-neutral",
		"fill-badge",
	],
	// places, each an alias of the tone that draws it
	places: [
		"ring",
		"selected-outline",
		"edge-hover",
		"edge-error",
		"ink-error",
		"ink-disabled",
	],
	// the two act fills and their states
	acts: [
		"act-accent",
		"on-act-accent",
		"act-accent-hover",
		"act-accent-press",
		"act-accent-pending",
		"act-danger",
		"on-act-danger",
		"act-danger-hover",
		"act-danger-press",
		"act-danger-pending",
	],
	// the switch's track and knob, and the on fill every toggle shares
	switch: [
		"switch-off",
		"switch-off-hover",
		"toggle-on",
		"toggle-on-hover",
		"switch-thumb",
	],
	// a QR code's tile and its modules, the same in both modes
	qr: ["qr-tile", "qr-ink"],
} as const;
export type ColorGroup = keyof typeof COLOR_GROUPS;

export const COLOR_NAMES: readonly ColorName[] =
	Object.values(COLOR_GROUPS).flat();
export type ColorName = (typeof COLOR_GROUPS)[ColorGroup][number];

export type Hue = number | "accent" | "cast";

// A contrast ground: docs/architecture/ui-core/tokens.md, "Derivation".
export interface ContrastGrounds {
	on: ColorName;
	under?: ColorName;
	ratio: number;
}

export interface ColorValue {
	l: number;
	c: number;
	hue: Hue;
	alpha?: number;
	grounds?: readonly ContrastGrounds[];
}

// Grounds that re-point the hairline: docs/architecture/ui-core/tokens.md, "Edges".
export const RAISED_GROUNDS = [
	"group",
	"raised",
] as const satisfies readonly ColorName[];

// Soft grounds re-point the hairline: docs/architecture/ui-core/tokens.md, "Edges".
export const SOFT_GROUNDS = [
	"accent-soft",
	"ok-soft",
	"warn-soft",
	"danger-soft",
	"chip-neutral-soft",
] as const satisfies readonly ColorName[];

// A colour's forms: docs/architecture/ui-core/tokens.md, "Colour tokens".
export type MixTarget = ColorName | "black";

export type ColorDeclaration =
	| { light: ColorValue; dark: ColorValue }
	| { alias: ColorName }
	| { veil: ColorName; alpha: number }
	| {
			mix: ColorName;
			toward: MixTarget | Record<Mode, MixTarget>;
			amount: number;
			grounds?: Record<Mode, readonly ContrastGrounds[]>;
	  };

// A neutral's chroma: docs/architecture/ui-core/tokens.md, "Colour tokens".
function neutral(l: number, c: number, alpha?: number): ColorValue {
	return alpha === undefined
		? { l, c, hue: "cast" }
		: { l, c, hue: "cast", alpha };
}

function accent(l: number, c: number): ColorValue {
	return { l, c, hue: "accent" };
}

const WHITE: ColorValue = { l: 1, c: 0, hue: 0 };

// The chip hues' marks: docs/architecture/ui-core/tokens.md, "Chart colours".
const CHIP: Record<
	ChipHue,
	{ hue: number; light: [number, number]; dark: [number, number] }
> = {
	red: { hue: 25, light: [0.56, 0.2], dark: [0.75, 0.147] },
	amber: { hue: 85, light: [0.62, 0.13], dark: [0.75, 0.15] },
	green: { hue: 145, light: [0.5, 0.154], dark: [0.6, 0.185] },
	teal: { hue: 195, light: [0.61, 0.102], dark: [0.71, 0.118] },
	violet: { hue: 305, light: [0.51, 0.2], dark: [0.65, 0.2] },
	pink: { hue: 350, light: [0.51, 0.2], dark: [0.6, 0.2] },
};

const CHIP_SOFT_LIGHT: Record<ChipHue, number> = {
	red: 0.026,
	amber: 0.035,
	green: 0.035,
	teal: 0.035,
	violet: 0.032,
	pink: 0.031,
};

const CHIP_INK_LIGHT: Record<ChipHue, number> = {
	red: 0.1,
	amber: 0.085,
	green: 0.1,
	teal: 0.07,
	violet: 0.1,
	pink: 0.1,
};

const CHIP_INK_DARK: Record<ChipHue, number> = {
	red: 0.068,
	amber: 0.08,
	green: 0.08,
	teal: 0.08,
	violet: 0.078,
	pink: 0.08,
};

type ChipColor =
	| `chip-${ChipHue}`
	| `chip-${ChipFamily}-soft`
	| `chip-${ChipFamily}-ink`;

function chipColors(): Record<ChipColor, ColorDeclaration> {
	// The loop below declares the other keys.
	const out = {
		"chip-neutral-soft": { alias: "fill-neutral" },
		"chip-neutral-ink": { alias: "ink-body" },
	} as Record<ChipColor, ColorDeclaration>;
	for (const family of CHIP_HUES) {
		const { hue, light, dark } = CHIP[family];
		out[`chip-${family}`] = {
			light: { l: light[0], c: light[1], hue },
			dark: { l: dark[0], c: dark[1], hue },
		};
		out[`chip-${family}-soft`] = {
			light: { l: 0.945, c: CHIP_SOFT_LIGHT[family], hue },
			dark: { l: 0.3, c: 0.05, hue },
		};
		out[`chip-${family}-ink`] = {
			light: { l: 0.42, c: CHIP_INK_LIGHT[family], hue },
			dark: { l: 0.87, c: CHIP_INK_DARK[family], hue },
		};
	}
	return out;
}

// A chart series' fill: docs/architecture/ui-core/tokens.md, "Chart colours".
const CHART: Record<
	ChipHue | "neutral",
	{ light: [number, number]; dark: [number, number] }
> = {
	red: { light: [0.63, 0.12], dark: [0.55, 0.088] },
	amber: { light: [0.62, 0.078], dark: [0.54, 0.09] },
	green: { light: [0.61, 0.092], dark: [0.53, 0.111] },
	teal: { light: [0.61, 0.061], dark: [0.53, 0.071] },
	violet: { light: [0.63, 0.12], dark: [0.55, 0.12] },
	pink: { light: [0.63, 0.12], dark: [0.555, 0.12] },
	// The seventh series: docs/architecture/ui-core/tokens.md, "Chart colours".
	neutral: { light: [0.62, 0.012], dark: [0.57, 0.01] },
};

function chartColors(): Record<
	`chart-${ChipHue | "neutral"}`,
	ColorDeclaration
> {
	// The loop declares each hue's key and `chart-neutral` follows it.
	const out = {} as Record<`chart-${ChipHue | "neutral"}`, ColorDeclaration>;
	for (const family of CHIP_HUES) {
		const { hue } = CHIP[family];
		const { light, dark } = CHART[family];
		out[`chart-${family}`] = {
			light: { l: light[0], c: light[1], hue },
			dark: { l: dark[0], c: dark[1], hue },
		};
	}
	out["chart-neutral"] = {
		light: neutral(CHART.neutral.light[0], CHART.neutral.light[1]),
		dark: neutral(CHART.neutral.dark[0], CHART.neutral.dark[1]),
	};
	return out;
}

// Eight hues at 40–50° spacing: a pastel fill with a hue-darkened initial in
// light, a deep fill with a hue-lightened initial in dark. Each entry is the
// hue, then the chroma of the fill and of the ink, light and dark.
const AVATAR: Record<
	AvatarStep,
	{ hue: number; fill: [number, number]; ink: [number, number] }
> = {
	1: { hue: 20, fill: [0.062, 0.08], ink: [0.1, 0.04] },
	2: { hue: 60, fill: [0.07, 0.08], ink: [0.088, 0.05] },
	3: { hue: 100, fill: [0.07, 0.08], ink: [0.078, 0.05] },
	4: { hue: 150, fill: [0.07, 0.08], ink: [0.1, 0.05] },
	5: { hue: 190, fill: [0.07, 0.068], ink: [0.064, 0.05] },
	6: { hue: 230, fill: [0.07, 0.078], ink: [0.074, 0.047] },
	7: { hue: 270, fill: [0.057, 0.08], ink: [0.1, 0.037] },
	8: { hue: 320, fill: [0.07, 0.08], ink: [0.1, 0.05] },
};

type AvatarColor = `avatar-${AvatarStep}` | `avatar-${AvatarStep}-ink`;

function avatarColors(): Record<AvatarColor, ColorDeclaration> {
	// The loop declares each step's two keys.
	const out = {} as Record<AvatarColor, ColorDeclaration>;
	for (const step of AVATAR_STEPS) {
		const { hue, fill, ink } = AVATAR[step];
		out[`avatar-${step}`] = {
			light: { l: 0.88, c: fill[0], hue },
			dark: { l: 0.4, c: fill[1], hue },
		};
		out[`avatar-${step}-ink`] = {
			light: { l: 0.38, c: ink[0], hue },
			dark: { l: 0.92, c: ink[1], hue },
		};
	}
	return out;
}

// The danger ink in light, which the filled act wears as it is.
const DANGER_LIGHT: ColorValue = {
	l: 0.55,
	c: 0.19,
	hue: 25,
	grounds: [{ on: "group", under: "wash-press", ratio: 4.5 }],
};

// The faintest text ink's floor: docs/architecture/ui-core/tokens.md, "Contrast floors".
const META_GROUNDS: readonly ContrastGrounds[] = [
	{ on: "neutral-soft", ratio: 4.5 },
	{ on: "canvas", ratio: 4.5 },
	{ on: "surface", ratio: 4.5 },
	{ on: "group", ratio: 4.5 },
	{ on: "surface", under: "wash-selected", ratio: 4.5 },
];

const MARK_GROUNDS: readonly ContrastGrounds[] = [
	{ on: "canvas", ratio: 3 },
	{ on: "surface", ratio: 3 },
	{ on: "group", ratio: 3 },
	{ on: "surface", under: "wash-selected", ratio: 3 },
];

// The neutral soft ground is a veil, so it holds on each ground it can lie over;
// the tinted ones are opaque.
const EDGE_STRONG_GROUNDS: readonly ContrastGrounds[] = [
	{ on: "surface", under: "wash-press", ratio: 3 },
	{ on: "surface", under: "wash-selected", ratio: 3 },
	{ on: "accent-soft", ratio: 3 },
	{ on: "ok-soft", ratio: 3 },
	{ on: "warn-soft", ratio: 3 },
	{ on: "danger-soft", ratio: 3 },
	{ on: "canvas", under: "chip-neutral-soft", ratio: 3 },
	{ on: "surface", under: "chip-neutral-soft", ratio: 3 },
	{ on: "group", under: "chip-neutral-soft", ratio: 3 },
];

// Surfaces, hairlines and inks: docs/architecture/ui-core/tokens.md, "Surfaces and ink".
export const COLORS: Record<ColorName, ColorDeclaration> = {
	canvas: { light: neutral(0.974, 0.002), dark: neutral(0.16, 0.005) },
	surface: { light: WHITE, dark: neutral(0.207, 0.006) },
	group: { light: neutral(0.947, 0.004), dark: neutral(0.25, 0.007) },
	band: { alias: "surface" },
	raised: { light: WHITE, dark: neutral(0.25, 0.007) },
	edge: { light: neutral(0.915, 0.004), dark: neutral(0.298, 0.008) },
	"edge-raised": { light: neutral(0.915, 0.004), dark: neutral(0.332, 0.008) },
	// A control's boundary stays one on a pressed or selected row, the
	// checkbox and radio in a list among them.
	"edge-strong": {
		light: { ...neutral(0.7, 0.012), grounds: EDGE_STRONG_GROUNDS },
		dark: { ...neutral(0.53, 0.01), grounds: EDGE_STRONG_GROUNDS },
	},
	// The canvas's dot grid: 1.5:1 on `canvas` in both modes, between the hairline
	// (1.19 light, 1.41 dark) and a control's boundary, so a dot reads without
	// competing with a node's edge.
	grid: { light: neutral(0.843, 0.004), dark: neutral(0.315, 0.008) },
	scrim: {
		light: neutral(0.2, 0.01, 0.45),
		dark: { l: 0, c: 0, hue: 0, alpha: 0.5 },
	},
	"ink-body": { light: neutral(0.2, 0.008), dark: neutral(0.97, 0.002) },
	"ink-meta": {
		light: { ...neutral(0.45, 0.012), grounds: META_GROUNDS },
		dark: { ...neutral(0.76, 0.01), grounds: META_GROUNDS },
	},
	// The grounds a mark stands on: docs/architecture/ui-core/tokens.md, "Contrast floors".
	"ink-mark": {
		light: { ...neutral(0.61, 0.01), grounds: MARK_GROUNDS },
		dark: { ...neutral(0.575, 0.01), grounds: MARK_GROUNDS },
	},
	// In dark the accent fill is a control's boundary on a group tile (a
	// checked box, a switch on), so it holds 3:1 there.
	accent: {
		light: accent(0.52, 0.19),
		dark: { ...accent(0.52, 0.19), grounds: [{ on: "group", ratio: 3 }] },
	},
	"on-accent": { light: WHITE, dark: WHITE },
	"accent-soft": { light: accent(0.95, 0.023), dark: accent(0.29, 0.06) },
	"accent-ink": {
		light: {
			...accent(0.505, 0.19),
			grounds: [
				{ on: "group", ratio: 4.5 },
				{ on: "canvas", ratio: 3 },
				{ on: "accent-soft", under: "wash-press", ratio: 4.5 },
			],
		},
		dark: {
			...accent(0.72, 0.13),
			grounds: [
				{ on: "group", ratio: 4.5 },
				{ on: "canvas", ratio: 3 },
				{ on: "accent-soft", under: "wash-press", ratio: 4.5 },
			],
		},
	},
	// The accent's edge on its soft ground (a canvas start node's): the ink
	// half way to the soft, so a selection, which is the ink itself, still
	// stands out from it.
	"accent-edge": { mix: "accent-ink", toward: "accent-soft", amount: 0.5 },
	// A state chip's edge: a step darker than its soft fill, toward its ink.
	"ok-edge": { mix: "ok", toward: "ok-soft", amount: 0.5 },
	"warn-edge": { mix: "warn", toward: "warn-soft", amount: 0.5 },
	"danger-edge": { mix: "danger", toward: "danger-soft", amount: 0.5 },
	// In dark the ok ink holds the text floor on its soft fill with room (4.9:1,
	// where 0.64 stood at it), still the least light of the three status inks.
	ok: {
		light: { l: 0.49, c: 0.129, hue: 150 },
		dark: { l: 0.66, c: 0.17, hue: 150 },
	},
	"ok-soft": {
		light: { l: 0.965, c: 0.04, hue: 150 },
		dark: { l: 0.28, c: 0.05, hue: 150 },
	},
	warn: {
		light: { l: 0.48, c: 0.099, hue: 70 },
		dark: { l: 0.75, c: 0.15, hue: 80 },
	},
	"warn-soft": {
		light: { l: 0.965, c: 0.036, hue: 85 },
		dark: { l: 0.25, c: 0.035, hue: 75 },
	},
	// A hairline destructive act's label holds text contrast under its press
	// wash on a group, the darkest ground it takes in light; the filled
	// danger act holds its own label.
	danger: {
		light: DANGER_LIGHT,
		dark: {
			l: 0.71,
			c: 0.178,
			hue: 25,
		},
	},
	"danger-soft": {
		light: { l: 0.965, c: 0.016, hue: 20 },
		dark: { l: 0.25, c: 0.04, hue: 25 },
	},
	// The neutral state's ground: docs/architecture/ui-core/tokens.md, "Surfaces and ink".
	"neutral-soft": {
		light: neutral(0.92, 0.012),
		dark: neutral(0.33, 0.012),
	},
	...chipColors(),
	...chartColors(),
	...avatarColors(),
	// Measured on surface in CIE L*: light 100 → hover 95.8 → selected 91.0 →
	// selected + hover 87.8; dark 8.1 → 13.1 → 19.7 → 23.8.
	"wash-hover": { veil: "ink-body", alpha: 0.05 },
	"wash-press": { veil: "ink-body", alpha: 0.08 },
	"wash-selected": { veil: "ink-body", alpha: 0.11 },
	"wash-selected-hover": { veil: "ink-body", alpha: 0.15 },
	skeleton: { veil: "ink-body", alpha: 0.09 },
	"fill-disabled": { veil: "ink-body", alpha: 0.06 },
	"fill-neutral": { veil: "ink-body", alpha: 0.08 },
	// A badge's soft ground: the meta ink at a tenth, so the words in the meta
	// ink hold the text floor on it in both modes (`badge.test.ts`).
	"fill-badge": { veil: "ink-meta", alpha: 0.1 },
	ring: { alias: "accent-ink" },
	"selected-outline": { alias: "accent-ink" },
	"edge-hover": { alias: "edge-strong" },
	"edge-error": { alias: "danger" },
	"ink-error": { alias: "danger" },
	// A disabled control's text recedes below the floor on purpose; it is no
	// alias of `ink-mark`, which is no text.
	"ink-disabled": { light: neutral(0.665, 0.01), dark: neutral(0.506, 0.01) },
	// Hover, press and pending: docs/architecture/ui-core/tokens.md, "Interaction colours".
	"act-accent": { alias: "accent" },
	"on-act-accent": { alias: "on-accent" },
	"act-accent-hover": { mix: "accent", toward: "black", amount: 0.12 },
	"act-accent-press": { mix: "accent", toward: "black", amount: 0.22 },
	"act-accent-pending": {
		mix: "accent",
		toward: { light: "on-accent", dark: "canvas" },
		amount: 0.3,
		grounds: {
			light: [{ on: "on-act-accent", ratio: 3 }],
			dark: [{ on: "on-act-accent", ratio: 3 }],
		},
	},
	"act-danger": {
		light: DANGER_LIGHT,
		dark: {
			l: 0.5,
			c: 0.17,
			hue: 25,
			grounds: [{ on: "on-act-danger", ratio: 4.5 }],
		},
	},
	"on-act-danger": { light: WHITE, dark: WHITE },
	"act-danger-hover": { mix: "act-danger", toward: "black", amount: 0.12 },
	"act-danger-press": { mix: "act-danger", toward: "black", amount: 0.22 },
	"act-danger-pending": {
		mix: "act-danger",
		toward: { light: "on-act-danger", dark: "canvas" },
		amount: 0.3,
		grounds: {
			light: [{ on: "on-act-danger", ratio: 3 }],
			dark: [{ on: "on-act-danger", ratio: 3 }],
		},
	},
	// A toggle on: docs/architecture/ui-core/tokens.md, "Interaction colours".
	"switch-off": { alias: "edge-strong" },
	"switch-off-hover": { mix: "edge-strong", toward: "ink-body", amount: 0.15 },
	"toggle-on": { alias: "accent" },
	"toggle-on-hover": {
		mix: "accent",
		toward: { light: "black", dark: "on-accent" },
		amount: 0.12,
	},
	"switch-thumb": { alias: "on-accent" },
	// The QR tile stays light: docs/architecture/ui-core/tokens.md, "Interaction colours".
	"qr-tile": { light: WHITE, dark: WHITE },
	"qr-ink": { light: neutral(0.2, 0.008), dark: neutral(0.2, 0.008) },
};

// The series order: docs/architecture/ui-core/tokens.md, "Chart colours".
export const CHART_SERIES = [
	"teal",
	"violet",
	"amber",
	"pink",
	"green",
	"red",
	"neutral",
] as const satisfies readonly (ChipHue | "neutral")[];

// The share of its max at or above which a meter is near; above the max it
// is over.
export const METER_NEAR = 0.9;

// The share of its foot's region past which a docked sheet's body scrolls.
export const SHEET_DOCKED_BODY_SHARE = 0.4;

// A docked sheet's body cap: docs/architecture/ui-core/layout.md, "Sheet".
export function dockedBodyMax({
	region,
	pinned,
	floor,
	logFloor,
}: {
	region: number;
	pinned: number;
	floor: number;
	logFloor: number;
}): number {
	const space = region - pinned;
	const cap = Math.max(floor, SHEET_DOCKED_BODY_SHARE * region);
	return Math.max(
		0,
		Math.max(Math.min(floor, space), Math.min(cap, space - logFloor)),
	);
}

// ── Type ────────────────────────────────────────────────────────────

// Which role a text takes: docs/architecture/ui-core/tokens.md, "Type roles".
export const TYPE_ROLES = [
	"display",
	"figure",
	"title",
	"heading",
	"body",
	"meta",
	"caption",
	"code",
] as const;
export type TypeRole = (typeof TYPE_ROLES)[number];

// The roles that carry tracking; the rest are 0 and emit none.
export const TRACKED_ROLES = ["display", "title", "caption"] as const;
export type TrackedRole = (typeof TRACKED_ROLES)[number];

export type FontWeight = "regular" | "medium";

// The body size per density: docs/architecture/ui-core/tokens.md, "Type roles".
export const BODY_SIZE: Record<Density, number> = {
	desktop: 13,
	touch: 16,
	room: 16,
};

// A role's size ratio in `room` where it differs from `TYPE_SCALE`: a
// glanceable figure stands five times its label, where the touch ratio is a
// stat's inside a page.
export const ROOM_TYPE_SIZE: Partial<Record<TypeRole, number>> = {
	display: 5,
};

// A role's size, leading and tracking: docs/architecture/ui-core/tokens.md, "Type roles".
export interface TypeRoleSpec {
	size: number;
	leading: number;
	weight: FontWeight;
	ink: "ink-body" | "ink-meta";
	family: FontRole;
	tabular: boolean;
}

export const TYPE_SCALE: Record<TypeRole, TypeRoleSpec> = {
	display: {
		size: 2.77,
		leading: 1.1,
		weight: "medium",
		ink: "ink-body",
		family: "sans",
		tabular: true,
	},
	figure: {
		size: 1.846,
		leading: 1.2,
		weight: "medium",
		ink: "ink-body",
		family: "sans",
		tabular: true,
	},
	title: {
		size: 1.5,
		leading: 1.3,
		weight: "medium",
		ink: "ink-body",
		family: "sans",
		tabular: false,
	},
	heading: {
		size: 1,
		leading: 1.5,
		weight: "medium",
		ink: "ink-body",
		family: "sans",
		tabular: false,
	},
	body: {
		size: 1,
		leading: 1.5,
		weight: "regular",
		ink: "ink-body",
		family: "sans",
		tabular: false,
	},
	meta: {
		size: 0.923,
		leading: 1.5,
		weight: "regular",
		ink: "ink-meta",
		family: "sans",
		tabular: false,
	},
	caption: {
		size: 0.923,
		leading: 1.5,
		weight: "regular",
		ink: "ink-meta",
		family: "sans",
		tabular: false,
	},
	code: {
		size: 0.923,
		leading: 1.5,
		weight: "regular",
		ink: "ink-body",
		family: "mono",
		tabular: false,
	},
};

// A section's label (uppercase, caption size at 500) is tracked apart from the
// caption role, which a chip and a count share at the tighter value.
export const LABEL_TRACKING = "0.07em";
export const LABEL_TRACKING_NAME = "label";

export const TYPE_TRACKING: Record<TrackedRole, string> = {
	display: "-0.02em",
	title: "-0.01em",
	caption: "0.01em",
};

// Emphasis inside a line; muted text is never above it.
export const STRONG_WEIGHT: FontWeight = "medium";

// The mono advance: docs/architecture/ui-core/tokens.md, "Fonts and advances".
export const MONO_ADVANCE = 0.6;

// The sans advance: docs/architecture/ui-core/tokens.md, "Fonts and advances".
export const SANS_ADVANCE = 0.6;

// ── Space ───────────────────────────────────────────────────────────

// The spacing base: docs/architecture/ui-core/tokens.md, "Spacing".
export const SPACE_BASE = 4;

// The six spacing roles: docs/architecture/ui-core/tokens.md, "Spacing".
export const SPACING_ROLES = [
	"gap",
	"badge",
	"pad",
	"stack",
	"section",
	"page",
] as const;
export type SpacingRole = (typeof SPACING_ROLES)[number];

// The touch and room spacing: docs/architecture/ui-core/tokens.md, "Spacing".
const TOUCH_SPACING: Record<SpacingRole, number> = {
	gap: 2,
	badge: 1,
	pad: 4,
	stack: 4,
	section: 6,
	page: 4,
};

export const SPACING_RATIO: Record<Density, Record<SpacingRole, number>> = {
	desktop: { gap: 1.5, badge: 1, pad: 3, stack: 4, section: 6, page: 6 },
	touch: TOUCH_SPACING,
	room: { ...TOUCH_SPACING, page: 12 },
};

// ── Sizes ───────────────────────────────────────────────────────────

// The sizes: docs/architecture/ui-core/tokens.md, "Sizes and hit target".
export const SIZES = [
	"control",
	"target",
	"row",
	"line-body",
	"hairline",
	"icon-meta",
	"icon",
	"icon-control",
	"dot",
	"figures",
	"measure",
] as const;
export type Size = (typeof SIZES)[number];

// The hit floor per density: docs/architecture/ui-core/tokens.md, "Sizes and hit target".
export const TARGET_PX: Record<Density, number> = {
	desktop: 28,
	touch: 44,
	room: 44,
};

// An icon is the body size and a sixth, to the even pixel; the meta icon one
// even step under it, the control's one over it.
export const ICON_RATIO = 7 / 6;

// ── Radius, hairline, ring, widths, breakpoints ─────────────────────

// Radii by role: docs/architecture/ui-core/tokens.md, "Radius, hairline and focus ring".
export const RADIUS_ROLES = [
	"chip",
	"badge",
	"control",
	"row",
	"card",
	"popover",
	"sheet",
	"full",
] as const;
export type RadiusRole = (typeof RADIUS_ROLES)[number];

export const RADIUS_MAX = 12;

export function radiusPx(role: RadiusRole, radius: number): number {
	switch (role) {
		case "chip":
		case "control":
		case "row":
			return radius;
		case "badge":
			return Math.max(radius - 1, 0);
		case "card":
		case "popover":
		case "sheet":
			return radius + Math.ceil(radius / 3);
		case "full":
			return 9999;
	}
}

// The hairline and the focus ring: docs/architecture/ui-core/tokens.md, "Radius, hairline and focus ring".
export const HAIRLINE_PX = 1;
export const RING_PX = 2;
export const RING_OFFSET_PX = 2;
export const RING_EDGE_OFFSET_PX = -1;

// Icon strokes: docs/architecture/ui-core/tokens.md, "Icon strokes".
export const ICON_STROKE = { line: 2, mark: 3.5 } as const;
export type IconStroke = keyof typeof ICON_STROKE;

// The two kinds of width: docs/architecture/ui-core/tokens.md, "Widths".
export const MEASURES = ["measure-short"] as const;
export type Measure = (typeof MEASURES)[number];

// The measure of a short label (a chip's, a row pick's value, a skeleton
// label's lane).
export const MEASURE_CHARACTERS: Record<Measure, number> = {
	"measure-short": 20,
};

// Running text's characters per line, the `measure` size.
export const TEXT_MEASURE_CHARACTERS = 58;

// The unit widths: docs/architecture/ui-core/tokens.md, "Widths".
export const UNIT_WIDTHS = [
	"popover",
	"toast",
	"dialog",
	"sheet",
	"sidebar",
	"list",
	"region-min",
	// The widest a Pane body's part stands, wide content (a table, a diff) aside.
	"reading",
	"column",
	"auth",
	"empty",
	"node",
] as const;
export type UnitWidth = (typeof UNIT_WIDTHS)[number];

// Each unit width as a count of `SPACE_BASE`.
export const WIDTH_VALUE: Record<UnitWidth, number> = {
	popover: 60,
	toast: 90,
	dialog: 130,
	sheet: 160,
	sidebar: 55,
	list: 130,
	"region-min": 85,
	reading: 180,
	column: 75,
	auth: 100,
	empty: 80,
	// A canvas node, 240 px at the default `size`.
	node: 60,
};

// The widths declared in px: no measure.
export const PX_WIDTHS = UNIT_WIDTHS;
export type PxWidth = UnitWidth;

export const WIDTHS = [...MEASURES, ...PX_WIDTHS] as const;
export type Width = (typeof WIDTHS)[number];

export const BREAKPOINTS = ["tablet", "desktop"] as const;
export type Breakpoint = (typeof BREAKPOINTS)[number];

export const BREAKPOINT_PX: Record<Breakpoint, number> = {
	tablet: 768,
	desktop: 1024,
};

// ── Elevation ───────────────────────────────────────────────────────

// The two shadow elevations: docs/architecture/ui-core/tokens.md, "Layers and shadows".
export const SHADOW_ELEVATIONS = ["float", "modal"] as const;
export type ShadowElevation = (typeof SHADOW_ELEVATIONS)[number];

export interface ShadowLayer {
	y: number;
	blur: number;
	alpha: number;
}

export const SHADOW_INK: Record<Mode, ColorValue> = {
	light: neutral(0.2, 0.01),
	dark: { l: 0, c: 0, hue: 0 },
};

export const SHADOW_LAYERS: Record<
	ShadowElevation,
	Record<Mode, readonly ShadowLayer[]>
> = {
	float: {
		light: [
			{ y: 1, blur: 2, alpha: 0.06 },
			{ y: 4, blur: 12, alpha: 0.08 },
		],
		dark: [
			{ y: 1, blur: 2, alpha: 0.4 },
			{ y: 4, blur: 12, alpha: 0.5 },
		],
	},
	modal: {
		light: [
			{ y: 2, blur: 4, alpha: 0.06 },
			{ y: 16, blur: 40, alpha: 0.14 },
		],
		dark: [
			{ y: 2, blur: 4, alpha: 0.4 },
			{ y: 16, blur: 40, alpha: 0.65 },
		],
	},
};

// ── Stacking order ──────────────────────────────────────────────────

// The layers over the page: docs/architecture/ui-core/tokens.md, "Layers and shadows".
export const STACK_ORDER = ["sidebar", "sheet", "popover", "toasts"] as const;

// ── Motion ──────────────────────────────────────────────────────────

// One duration scale: docs/architecture/ui-core/motion.md, "One table of numbers".
export const DURATIONS = ["instant", "fast", "base", "slow"] as const;
export type Duration = (typeof DURATIONS)[number];

export const DURATION_MS: Record<Duration, number> = {
	instant: 100,
	fast: 150,
	base: 200,
	slow: 300,
};

// A loop, not a transition: outside the scale and kept under reduced motion,
// because the spin is the only sign a wait is live.
export const LOOP_MS = 800;

// The skeleton's breath: one pulse across the page, two turns of the spinner
// so it reads as calm. Stills under reduced motion.
export const PULSE_MS = 1600;

// How long a toast stands, in ms: Base UI's default.
export const TOAST_MS = 5000;

// The scramble's step.
export const TICK_MS = 70;

// A pressed filled control gives to this scale, a lifted canvas node rises to
// the other.
export const PRESS_SCALE = 0.97;
export const LIFT_SCALE = 1.02;

// A release past this speed toward the way off (px per ms) leaves, past it
// the other way goes back, and a slower one leaves once it was carried this
// share of its extent (`follow.ts`).
export const FOLLOW_FLING = 0.5;
export const FOLLOW_REACH = 0.4;

// The fill's alpha at the pulse's low (its high is the fill itself).
export const PULSE_LOW = 0.55;

// The wait delays: docs/architecture/ui-core/reads.md, "Timing".
// The defaults of `paint.ts`'s `WAIT_DELAY`, `ACT_DELAY` and `waitMin`, in ms.
const WAIT_DELAY_MS = 400;
const ACT_DELAY_MS = 300;
const WAIT_MIN_MS = 0;

export type MotionKnobName =
	| Duration
	| "loop"
	| "pulse"
	| "tick"
	| "press"
	| "lift"
	| "fling"
	| "reach"
	| "waitDelay"
	| "actDelay"
	| "waitMin";

// A tunable motion number: docs/architecture/ui-core/motion.md, "One table of numbers".
export interface MotionKnob {
	name: MotionKnobName;
	cssVar: string;
	default: number;
	unit: "ms" | "";
	min: number;
	max: number;
	step: number;
}

export const MOTION_KNOBS: readonly MotionKnob[] = [
	{
		name: "instant",
		cssVar: "--transition-duration-instant",
		default: DURATION_MS.instant,
		unit: "ms",
		min: 50,
		max: 200,
		step: 10,
	},
	{
		name: "fast",
		cssVar: "--transition-duration-fast",
		default: DURATION_MS.fast,
		unit: "ms",
		min: 100,
		max: 300,
		step: 10,
	},
	{
		name: "base",
		cssVar: "--transition-duration-base",
		default: DURATION_MS.base,
		unit: "ms",
		min: 100,
		max: 400,
		step: 10,
	},
	{
		name: "slow",
		cssVar: "--transition-duration-slow",
		default: DURATION_MS.slow,
		unit: "ms",
		min: 200,
		max: 600,
		step: 10,
	},
	{
		name: "loop",
		cssVar: "--transition-duration-loop",
		default: LOOP_MS,
		unit: "ms",
		min: 400,
		max: 2000,
		step: 50,
	},
	{
		name: "pulse",
		cssVar: "--pulse",
		default: PULSE_MS,
		unit: "ms",
		min: 800,
		max: 4000,
		step: 100,
	},
	{
		name: "tick",
		cssVar: "--tick",
		default: TICK_MS,
		unit: "ms",
		min: 30,
		max: 200,
		step: 10,
	},
	{
		name: "press",
		cssVar: "--scale-press",
		default: PRESS_SCALE,
		unit: "",
		min: 0.9,
		max: 1,
		step: 0.01,
	},
	{
		name: "lift",
		cssVar: "--scale-lift",
		default: LIFT_SCALE,
		unit: "",
		min: 1,
		max: 1.1,
		step: 0.01,
	},
	{
		name: "fling",
		cssVar: "--follow-fling",
		default: FOLLOW_FLING,
		unit: "",
		min: 0.2,
		max: 1,
		step: 0.05,
	},
	{
		name: "reach",
		cssVar: "--follow-reach",
		default: FOLLOW_REACH,
		unit: "",
		min: 0.2,
		max: 0.6,
		step: 0.05,
	},
	{
		name: "waitDelay",
		cssVar: "--wait-delay",
		default: WAIT_DELAY_MS,
		unit: "ms",
		min: 0,
		max: 1000,
		step: 50,
	},
	{
		name: "actDelay",
		cssVar: "--act-delay",
		default: ACT_DELAY_MS,
		unit: "ms",
		min: 0,
		max: 1000,
		step: 50,
	},
	{
		name: "waitMin",
		cssVar: "--wait-min",
		default: WAIT_MIN_MS,
		unit: "ms",
		min: 0,
		max: 1000,
		step: 50,
	},
];

// What a motion does for the viewer; a roster entry's `motion` names the
// moves its component makes.
export const MOVES = [
	"answer",
	"give",
	"toggle",
	"layer",
	"block",
	"flow",
	"value",
	"wait",
	"follow",
	"stream",
] as const;
export type Move = (typeof MOVES)[number];

// The glyph regions a theme can paint by the scramble instead of the pulse
// (`theme.loading`); a shape always pulses.
export const LOADING_REGIONS = ["text", "figure", "id"] as const;
export type LoadingRegion = (typeof LOADING_REGIONS)[number];
export const LOADING_PAINTS = ["pulse", "scramble"] as const;
export type LoadingPaint = (typeof LOADING_PAINTS)[number];

export const EASINGS = ["out", "in", "in-out"] as const;
export type Easing = (typeof EASINGS)[number];

// `out` for what enters or answers a touch, `in` for what leaves, `in-out`
// for what moves between two places. No curve overshoots.
export const EASING: Record<Easing, readonly [number, number, number, number]> =
	{
		out: [0.16, 1, 0.3, 1],
		in: [0.7, 0, 0.84, 0],
		"in-out": [0.65, 0, 0.35, 1],
	};

// ── Fonts and the reset ─────────────────────────────────────────────

// Namespaces reset to `initial`: docs/architecture/ui-core/tokens.md, "Tailwind reset".
export const ZEROED_NAMESPACES = [
	"--color-*",
	"--radius-*",
	"--text-*",
	"--leading-*",
	"--tracking-*",
	"--shadow-*",
	"--font-*",
	"--container-*",
	"--breakpoint-*",
	"--transition-duration-*",
	"--ease-*",
] as const;

// The stacks each family falls back to on both platforms, after the knob's
// family and its metric fallback face.
export const FONT_FALLBACKS: Record<FontRole, string> = {
	sans: "ui-sans-serif, system-ui, sans-serif",
	mono: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
};

const FALLBACK_SUFFIX = " Fallback";

// The metric fallback face: docs/architecture/ui-core/tokens.md, "Fonts and advances".
export function fallbackFace(family: string): string {
	return `${family}${FALLBACK_SUFFIX}`;
}

// ── Words ───────────────────────────────────────────────────────────

// The vocabulary of tone: docs/architecture/ui-core/roster.md, "Status and chips".
export const TONES = [
	"active",
	"running",
	"waiting",
	"done",
	"attention",
	"failed",
	"idle",
] as const;
export type Tone = (typeof TONES)[number];

// Every word a molecule draws on its own. A consumer's sentence
// is a prop on the molecule that draws it, never a key here.
export const WORD_KEYS = [
	...TONES,
	"recommended",
	"copy",
	"copied",
	"download",
	"back",
	"close",
	"cancel",
	"dismiss",
	"more",
	"send",
	"stop",
	"attach",
	"search",
	"checking",
	"retry",
	"add",
	"remove",
	"edit",
	"details",
	"places",
	"foldSidebar",
	"dockSidebar",
	"notifications",
	"code",
	"added",
	"removed",
	"sort",
	"message",
	"copyFailed",
	"downloadFailed",
	"latest",
	"missing",
	"readFailed",
	"readEmpty",
	"readStale",
	"readPaused",
	"showMore",
	"moreFailed",
	"replyStopped",
	"actFailed",
	"chooseFile",
	"choose",
	"replace",
	"removeSecret",
	"typeValue",
	"pickValue",
	"locked",
	"photos",
	"files",
	"changed",
	"unchanged",
	"stale",
	"chooseAll",
	"chooseNone",
	"columns",
	"reset",
	"noMatches",
	"noOptions",
	"imageFiles",
	"audioFiles",
	"videoFiles",
	"textFiles",
	"expand",
	"collapse",
	"zoomIn",
	"zoomOut",
	"fit",
	"arrange",
	"off",
	"notFound",
	"nowhere",
	"discardEdit",
	"keepEditing",
	"discard",
	"editUnsaved",
	"filters",
	"clearFilters",
	"tabs",
	"open",
	"none",
	"optional",
	"required",
	"badFormat",
	"wholeNumber",
	"denied",
	"linesUnshown",
	"previous",
	"next",
	"player",
	"play",
	"pause",
	"mute",
	"unmute",
	"volume",
	"seek",
	"playFailed",
	"actions",
	"moveUp",
	"moveDown",
	"moveFirst",
	"moveLast",
] as const;
export type WordKey = (typeof WORD_KEYS)[number];

// A word drawn with a number: `one` where the count is one, `other` at
// every other count, each spelling `{count}` where the number stands.
export const COUNTED_WORD_KEYS = [
	"earlierLines",
	"unshownLines",
	"dragged",
] as const;
export type CountedWordKey = (typeof COUNTED_WORD_KEYS)[number];

export interface CountedWord {
	one: string;
	other: string;
}

// A word drawn with values: each spells its blanks as `{name}` where the
// value stands, drawn through `filled()`.
export const BLANK_WORDS = {
	wrongType: ["name", "types"],
	stepOf: ["at", "of"],
	chosenOf: ["count", "of"],
	chosenNounOf: ["count", "of", "noun"],
	countOver: ["max"],
	missingNoun: ["noun"],
	badLine: ["at"],
	fewestCharacters: ["min"],
	mostCharacters: ["max"],
	leastNumber: ["min"],
	mostNumber: ["max"],
	moreThan: ["min"],
	lessThan: ["max"],
	giveField: ["label"],
	pickField: ["label"],
	checkField: ["label"],
	savedEndsIn: ["tail"],
} as const satisfies Record<string, readonly string[]>;
export type BlankWordKey = keyof typeof BLANK_WORDS;
// `Object.keys` widens to `string`; the keys are the record's own.
export const BLANK_WORD_KEYS = Object.keys(BLANK_WORDS) as BlankWordKey[];

export type Words = Record<WordKey, string> &
	Record<CountedWordKey, CountedWord> &
	Record<BlankWordKey, string>;

export const ENGLISH: Words = {
	active: "Active",
	running: "Running",
	waiting: "Waiting",
	done: "Done",
	attention: "Attention",
	failed: "Failed",
	idle: "Idle",
	recommended: "Recommended",
	copy: "Copy",
	copied: "Copied",
	download: "Download",
	back: "Back",
	close: "Close",
	cancel: "Cancel",
	dismiss: "Dismiss",
	more: "More",
	send: "Send",
	stop: "Stop",
	attach: "Attach",
	search: "Search",
	checking: "Checking the code",
	retry: "Retry",
	add: "Add",
	remove: "Remove",
	edit: "Edit",
	details: "Details",
	places: "Places",
	foldSidebar: "Collapse sidebar",
	dockSidebar: "Keep sidebar open",
	notifications: "Notifications",
	code: "Code",
	added: "Added",
	removed: "Removed",
	sort: "Sort",
	message: "Message",
	copyFailed: "Couldn't copy",
	downloadFailed: "Couldn't download",
	latest: "Latest",
	missing: "Couldn't find this.",
	readFailed: "This didn't load.",
	readEmpty: "Nothing here yet.",
	readStale: "Couldn't refresh.",
	readPaused: "Waiting for a connection.",
	showMore: "Show more",
	moreFailed: "Couldn't load more.",
	replyStopped: "The reply stopped.",
	actFailed: "That didn't go through.",
	chooseFile: "Choose file",
	choose: "Choose",
	replace: "Replace",
	removeSecret: "A removed value can't be read back.",
	typeValue: "Type a value",
	pickValue: "Pick a field",
	locked: "Locked",
	photos: "Photos",
	files: "Files",
	changed: "Changed",
	unchanged: "Unchanged",
	stale: "Stale",
	chooseAll: "Select all",
	chooseNone: "Deselect all",
	columns: "Columns",
	reset: "Reset",
	noMatches: "No matches",
	noOptions: "Nothing to choose yet.",
	imageFiles: "Images",
	audioFiles: "Audio",
	videoFiles: "Video",
	textFiles: "Text files",
	expand: "Expand",
	collapse: "Collapse",
	zoomIn: "Zoom in",
	zoomOut: "Zoom out",
	fit: "Fit",
	arrange: "Arrange",
	off: "Off",
	notFound: "Not found",
	nowhere: "Nothing is at this address.",
	discardEdit: "Discard your edit?",
	keepEditing: "Keep editing",
	discard: "Discard",
	editUnsaved: "What you changed here is not saved.",
	filters: "Filters",
	clearFilters: "Clear filters",
	tabs: "Sections",
	open: "Open",
	none: "None",
	optional: "Optional",
	required: "Required",
	badFormat: "This isn't in the form this field takes.",
	wholeNumber: "Use a whole number.",
	denied: "You can't do this.",
	linesUnshown: "Lines not shown",
	previous: "Previous",
	next: "Next",
	player: "Player",
	play: "Play",
	pause: "Pause",
	mute: "Mute",
	unmute: "Unmute",
	volume: "Volume",
	seek: "Seek",
	playFailed: "Couldn't play this.",
	actions: "Actions",
	moveUp: "Move up",
	moveDown: "Move down",
	moveFirst: "Move to top",
	moveLast: "Move to bottom",
	dragged: { one: "{count} item", other: "{count} items" },
	earlierLines: {
		one: "Show {count} earlier line",
		other: "Show {count} earlier lines",
	},
	unshownLines: {
		one: "{count} line not shown",
		other: "{count} lines not shown",
	},
	wrongType: "{name} isn't one of {types}",
	stepOf: "Step {at} of {of}",
	chosenOf: "{count} of {of} chosen",
	chosenNounOf: "{count} of {of} {noun} chosen",
	countOver: "{max}+",
	missingNoun: "Couldn't find this {noun}.",
	badLine: "Line {at} isn't a value this list takes.",
	fewestCharacters: "Use at least {min} characters.",
	mostCharacters: "Use at most {max} characters.",
	leastNumber: "Use {min} or more.",
	mostNumber: "Use {max} or less.",
	moreThan: "Use more than {min}.",
	lessThan: "Use less than {max}.",
	giveField: "Give the {label}.",
	pickField: "Pick the {label}.",
	checkField: "Check the {label}.",
	savedEndsIn: "Saved, ends in {tail}",
};

// A blank word with its values: `filled(words.stepOf, { at, of })`.
export function filled(word: string, values: Record<string, string>): string {
	return word.replace(
		/\{(\w+)\}/g,
		(blank, name: string) => values[name] ?? blank,
	);
}

// The most a tab's count draws; a count past it reads as the blank word
// `countOver` ("99+"), so the count stays inside the bar at the narrowest width.
export const TAB_COUNT_MAX = 99;

// A tab's count as drawn: `tabCount(words, 44)` is "44", `tabCount(words, 444)` "99+".
export function tabCount(words: Words, count: number): string {
	return count > TAB_COUNT_MAX
		? filled(words.countOver, { max: String(TAB_COUNT_MAX) })
		: String(count);
}

// An act's word over what it acts on, the word alone when there is nothing
// to name: `named(words.copy, "Terminal")`, `named(words.copy, undefined)`.
export function named(word: string, name: string | undefined): string {
	return name === undefined ? word : `${word} ${name}`;
}

// A counted word at a count: `counted(words.earlierLines, 3)`.
export function counted(word: CountedWord, count: number): string {
	return (count === 1 ? word.one : word.other).replace(
		"{count}",
		String(count),
	);
}
