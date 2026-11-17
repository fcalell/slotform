import type { ResolvedTheme } from "@fcalell/ui-core/derive";
import {
	densityTokens,
	modeTokens,
	raisedGroundTokens,
	reducedMotionTokens,
	roomScope,
	rootTokens,
	shadowUtilities,
	softGroundTokens,
	themeTokens,
} from "@fcalell/ui-core/emit";
import {
	actsStackedMax,
	definitionsOneRow,
	rowOneLine,
	rulesOneRow,
} from "@fcalell/ui-core/overflow";
import {
	BREAKPOINT_PX,
	BREAKPOINTS,
	COLOR_NAMES,
	DURATIONS,
	EASINGS,
	LABEL_TRACKING_NAME,
	MODES,
	RADIUS_ROLES,
	RAISED_GROUNDS,
	SHADOW_ELEVATIONS,
	SIZES,
	SOFT_GROUNDS,
	SPACING_ROLES,
	TRACKED_ROLES,
	TYPE_ROLES,
	WIDTHS,
} from "@fcalell/ui-core/tokens";
import { DESKTOP_MEDIA, ROOM_SCOPE, TOUCH_MEDIA } from "../density.ts";
import type { CssBlock, CssLayer, CssSourceInline } from "../types.ts";
import { renderMediaRule, renderRule } from "./codegen.ts";

// Web-only keyframe tokens: docs/architecture/ui-core/motion.md, "Web motion".
const WEB_ONLY: Record<string, string> = {
	"--animate-content-show":
		"content-show var(--transition-duration-base) var(--ease-out)",
	"--animate-content-hide":
		"content-hide var(--transition-duration-base) var(--ease-in)",
	"--animate-spin": "spin var(--transition-duration-loop) linear infinite",
};

// The `@theme` block seeds the light palette and the touch set, then the
// web's animations.
export function themeBlock(resolved: ResolvedTheme): CssBlock {
	return {
		kind: "theme",
		declarations: { ...themeTokens(resolved), ...WEB_ONLY },
	};
}

// Every contract utility is generated: docs/architecture/plugins/react-ui.md, "Stylesheet assembly".
export function tokenSources(): CssSourceInline[] {
	const set = (names: readonly string[]) => `{${names.join(",")}}`;
	return [
		`{bg,text,border,outline,divide}-${set(COLOR_NAMES)}`,
		`{p,px,py,pt,pb,pl,pr,gap,gap-x,gap-y,w}-${set(SPACING_ROLES)}`,
		`{h,w,min-h,min-w,max-w,size,p,translate-x}-${set(SIZES)}`,
		`{w,min-w,max-w}-${set(WIDTHS)}`,
		`{text,leading}-${set(TYPE_ROLES)}`,
		`tracking-${set([...TRACKED_ROLES, LABEL_TRACKING_NAME])}`,
		`rounded-${set(RADIUS_ROLES)}`,
		`shadow-${set(SHADOW_ELEVATIONS)}`,
		`duration-${set([...DURATIONS, "loop"])}`,
		`ease-${set(EASINGS)}`,
	];
}

// `--shadow-*` is one of the reset namespaces, so the elevation ladder ships
// as custom utilities, each reading its mode's variable.
export function shadowBlocks(): CssBlock[] {
	return Object.entries(shadowUtilities()).map(([name, declarations]) => ({
		kind: "utility",
		name,
		declarations,
	}));
}

// The root's own values: the hairline, the focus ring and the light shadows,
// which no utility reads and no mode scope has to be present for.
export function rootLayer(resolved: ResolvedTheme): CssLayer {
	return { name: "base", content: renderRule(":root", rootTokens(resolved)) };
}

// The desktop and room sets: docs/architecture/plugins/react-ui.md, "Density".
const PINNED_DESKTOP = ':root[data-density="desktop"]';
const PINNED_TOUCH = ':root[data-density="touch"]';

export function densityLayer(resolved: ResolvedTheme): CssLayer {
	const desktop = densityTokens(resolved, "desktop");
	const rules = [
		renderMediaRule(DESKTOP_MEDIA, renderRule(":root", desktop)),
		renderMediaRule(
			DESKTOP_MEDIA,
			renderRule(PINNED_TOUCH, densityTokens(resolved, "touch")),
		),
		renderRule(PINNED_DESKTOP, desktop),
		renderRule(
			ROOM_SCOPE,
			roomScope(resolved.knobs.radius, resolved.knobs.size),
		),
	];
	return { name: "base", content: rules.join("\n") };
}

const slot = (selector: string) => `${selector} & {\n\t@slot;\n}`;

// The `touch:` variant: docs/architecture/plugins/react-ui.md, "Density".
export function touchVariant(): CssBlock {
	return {
		kind: "variant",
		name: "touch",
		content: [
			slot(PINNED_TOUCH),
			slot(ROOM_SCOPE),
			renderMediaRule(TOUCH_MEDIA, slot(':root:not([data-density="desktop"])')),
		].join("\n"),
	};
}

// The size containers and their variants: docs/architecture/plugins/react-ui.md, "Size containers and variants".
export function pageVariants(resolved: ResolvedTheme): CssBlock[] {
	const size = resolved.knobs.size;
	const row: CssBlock = {
		kind: "variant",
		name: "row-two-line",
		content: `@container row (width < ${rowOneLine(size)}px) {\n\t@slot;\n}`,
	};
	const rules: CssBlock = {
		kind: "variant",
		name: "rules-stacked",
		content: `@container rules (width < ${rulesOneRow(size)}px) {\n\t@slot;\n}`,
	};
	const definitions: CssBlock = {
		kind: "variant",
		name: "definitions-stacked",
		content: `@container page (width < ${definitionsOneRow(size)}px) {\n\t@slot;\n}`,
	};
	const time: CssBlock = {
		kind: "variant",
		name: "time-fits",
		content: "@container time (width >= 1ch) {\n\t@slot;\n}",
	};
	const acts: CssBlock = {
		kind: "variant",
		name: "acts-stacked",
		content: `@container acts (width <= ${actsStackedMax(size)}px) {\n\t@slot;\n}`,
	};
	const sized = (["page", "place"] as const).flatMap((container) =>
		BREAKPOINTS.flatMap((bp): CssBlock[] => {
			const px = `${BREAKPOINT_PX[bp]}px`;
			return [
				{
					kind: "variant",
					name: `${container}-${bp}`,
					content: `@container ${container} (width >= ${px}) {\n\t@slot;\n}`,
				},
				{
					kind: "variant",
					name: `${container}-max-${bp}`,
					content: `@container ${container} (width < ${px}) {\n\t@slot;\n}`,
				},
			];
		}),
	);
	return [...sized, row, rules, definitions, time, acts];
}

// `pb-safe` keeps a bottom bar clear of the home indicator and `pt-safe` the
// top of the column clear of the notch or status bar, under `viewport-fit=cover`.
export function safeAreaUtilities(): CssBlock[] {
	return [
		{
			kind: "utility",
			name: "pb-safe",
			declarations: { "padding-bottom": "env(safe-area-inset-bottom)" },
		},
		{
			kind: "utility",
			name: "pt-safe",
			declarations: { "padding-top": "env(safe-area-inset-top)" },
		},
	];
}

// Each mode is a class scope in `@layer base`: docs/architecture/plugins/react-ui.md, "Modes".
export function modeLayer(resolved: ResolvedTheme): CssLayer {
	const rules = MODES.map((mode) =>
		renderRule(`.${mode}`, {
			"color-scheme": mode,
			...modeTokens(resolved, mode),
		}),
	);
	rules.push(
		renderRule(
			RAISED_GROUNDS.map((ground) => `.bg-${ground}`).join(", "),
			raisedGroundTokens(),
		),
		renderRule(
			SOFT_GROUNDS.map((ground) => `.bg-${ground}`).join(", "),
			softGroundTokens(),
		),
	);
	return { name: "base", content: rules.join("\n") };
}

// Under reduced motion every duration rung is 0, so no transition or
// animation that reads one moves.
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export function motionLayer(): CssLayer {
	return {
		name: "base",
		content: renderMediaRule(
			REDUCED_MOTION,
			renderRule(":root", reducedMotionTokens()),
		),
	};
}
