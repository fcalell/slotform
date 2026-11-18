import type { ResolvedTheme } from "./derive.ts";
import {
	leadingOf,
	nativeMeasurePx,
	sizeOf,
	sizePx,
	spacingOf,
	widthPx,
} from "./scales.ts";
import {
	BREAKPOINTS,
	COLOR_NAMES,
	DURATIONS,
	EASINGS,
	FONT_ROLES,
	HAIRLINE_PX,
	LABEL_TRACKING,
	LABEL_TRACKING_NAME,
	MEASURES,
	MOTION_KNOBS,
	type Mode,
	type MotionKnobName,
	type PixelDensity,
	PULSE_LOW,
	PX_WIDTHS,
	RADIUS_ROLES,
	RING_EDGE_OFFSET_PX,
	RING_OFFSET_PX,
	RING_PX,
	ROOM_CANVAS,
	radiusPx,
	SHADOW_ELEVATIONS,
	type ShadowElevation,
	SIZES,
	SPACING_ROLES,
	STACK_ORDER,
	TRACKED_ROLES,
	TYPE_ROLES,
	type TypeRole,
	WIDTHS,
	ZEROED_NAMESPACES,
} from "./tokens.ts";

export type ShadowUtility = `shadow-${ShadowElevation}`;

// The `@theme` record: docs/architecture/ui-core/tokens.md, "Emit".
export function themeTokens(resolved: ResolvedTheme): Record<string, string> {
	const tokens: Record<string, string> = {};
	for (const namespace of ZEROED_NAMESPACES) tokens[namespace] = "initial";
	Object.assign(tokens, densityTokens(resolved, "touch"));
	for (const role of TRACKED_ROLES) {
		tokens[`--text-${role}--letter-spacing`] = resolved.tracking[role];
	}
	for (const role of TRACKED_ROLES) {
		tokens[`--tracking-${role}`] = resolved.tracking[role];
	}
	tokens[`--tracking-${LABEL_TRACKING_NAME}`] = LABEL_TRACKING;
	for (const role of RADIUS_ROLES) {
		tokens[`--radius-${role}`] = resolved.radii[role];
	}
	for (const width of WIDTHS) {
		tokens[`--container-${width}`] = resolved.widths[width];
	}
	for (const bp of BREAKPOINTS) {
		tokens[`--breakpoint-${bp}`] = resolved.breakpoints[bp];
	}
	for (const role of FONT_ROLES) {
		tokens[`--font-${role}`] = resolved.fonts[role];
	}
	// The delays hold under reduced motion: docs/architecture/ui-core/motion.md, "Reduced motion".
	for (const knob of MOTION_KNOBS) {
		tokens[knob.cssVar] = `${knob.default}${knob.unit}`;
	}
	for (const easing of EASINGS) {
		tokens[`--ease-${easing}`] =
			`cubic-bezier(${resolved.motion.easings[easing].join(", ")})`;
	}
	// A bare `transition` takes the base rung and `out`, through the variables,
	// so it stills with them under reduced motion.
	tokens["--default-transition-duration"] = "var(--transition-duration-base)";
	tokens["--default-transition-timing-function"] = "var(--ease-out)";
	// A bare `border` and a `divide` read the hairline, so the room scales them.
	tokens["--default-border-width"] = "var(--hairline)";
	for (const name of COLOR_NAMES) {
		tokens[`--color-${name}`] = resolved.colors.light[name];
	}
	return tokens;
}

// The root values outside `@theme`: docs/architecture/ui-core/tokens.md, "Emit".
export function rootTokens(resolved: ResolvedTheme): Record<string, string> {
	const tokens: Record<string, string> = {
		"--hairline": `${HAIRLINE_PX}px`,
		...ringTokens((px) => `${px}px`),
		// The fill's share at the pulse's low (`PULSE`'s keyframes mix it).
		"--pulse-low": `${Math.round(PULSE_LOW * 100)}%`,
	};
	STACK_ORDER.forEach((layer, at) => {
		tokens[`--layer-${layer}`] = String(at + 1);
	});
	for (const elevation of SHADOW_ELEVATIONS) {
		tokens[`--shadow-${elevation}`] = resolved.shadows.light[elevation];
	}
	return tokens;
}

// One density's set: docs/architecture/ui-core/tokens.md, "Density and room".
export function densityTokens(
	resolved: ResolvedTheme,
	density: PixelDensity,
): Record<string, string> {
	const tokens: Record<string, string> = {};
	for (const role of TYPE_ROLES) {
		const { size, leading } = resolved.type[density][role];
		Object.assign(tokens, typeTokens(role, size, leading));
	}
	for (const role of SPACING_ROLES) {
		tokens[`--spacing-${role}`] = resolved.spacing[density][role];
	}
	for (const size of SIZES) {
		tokens[`--spacing-${size}`] = resolved.sizes[density][size];
	}
	return tokens;
}

// A type role's size and leading, as the Tailwind v4 modifier and the
// standalone namespace: docs/architecture/ui-core/tokens.md, "Emit".
function typeTokens<T>(role: TypeRole, size: T, leading: T): Record<string, T> {
	return {
		[`--text-${role}`]: size,
		[`--text-${role}--line-height`]: leading,
		[`--leading-${role}`]: leading,
	};
}

// The focus ring's width and offsets, each px through `scale`.
function ringTokens<T>(scale: (px: number) => T): Record<string, T> {
	return {
		"--focus-ring": scale(RING_PX),
		"--focus-ring-offset": scale(RING_OFFSET_PX),
		"--focus-ring-edge-offset": scale(RING_EDGE_OFFSET_PX),
	};
}

// ── The room set ────────────────────────────────────────────────────

const ROOM_UNIT = "--room-unit";

// The room unit: docs/architecture/ui-core/tokens.md, "The room".
function roomUnit(): string {
	const { width, height } = ROOM_CANVAS;
	return `max(1px, min(100vw / ${width}, 100dvh / ${height}))`;
}

// The same unit as a number, for a window of this size in px (native, which
// has no `vw`).
export function roomUnitFor(width: number, height: number): number {
	return Math.max(
		1,
		Math.min(width / ROOM_CANVAS.width, height / ROOM_CANVAS.height),
	);
}

// The room set as one record: docs/architecture/ui-core/tokens.md, "The room".
export function roomTokens<T>(
	scale: (units: number) => T,
	radius: number,
	size: number,
): Record<string, T> {
	const tokens: Record<string, T> = {};
	for (const role of TYPE_ROLES) {
		const leading = scale(leadingOf("room", role, size));
		Object.assign(
			tokens,
			typeTokens(role, scale(sizeOf("room", role, size)), leading),
		);
	}
	for (const role of SPACING_ROLES) {
		tokens[`--spacing-${role}`] = scale(spacingOf("room", role, size));
	}
	for (const name of SIZES) {
		tokens[`--spacing-${name}`] = scale(sizePx("room", name, size));
	}
	for (const role of RADIUS_ROLES) {
		tokens[`--radius-${role}`] = scale(radiusPx(role, radius));
	}
	for (const width of PX_WIDTHS) {
		tokens[`--container-${width}`] = scale(widthPx(width, size));
	}
	tokens["--hairline"] = scale(HAIRLINE_PX);
	return tokens;
}

// Native's short measure in the room: docs/architecture/ui-core/tokens.md, "Widths".
export function roomMeasureTokens(
	scale: (units: number) => number,
	size: number,
): Record<string, number> {
	const tokens: Record<string, number> = {};
	for (const measure of MEASURES) {
		tokens[`--container-${measure}`] = scale(nativeMeasurePx(measure, size));
	}
	return tokens;
}

// What the web declares under a room scope: docs/architecture/ui-core/tokens.md, "Emit".
export function roomScope(
	radius: number,
	size: number,
): Record<string, string> {
	const scale = (units: number) => `calc(${units} * var(${ROOM_UNIT}))`;
	return {
		[ROOM_UNIT]: roomUnit(),
		...roomTokens(scale, radius, size),
		...ringTokens(scale),
	};
}

// Every duration rung and the tick at 0: docs/architecture/ui-core/motion.md, "Reduced motion".
const STILLED: readonly MotionKnobName[] = [...DURATIONS, "tick"];
export function reducedMotionTokens(): Record<string, string> {
	const tokens: Record<string, string> = {};
	for (const knob of MOTION_KNOBS) {
		if (STILLED.includes(knob.name)) tokens[knob.cssVar] = `0${knob.unit}`;
	}
	return tokens;
}

// One mode's values, keyed by full custom-property name: every color and
// the two shadows.
export function modeTokens(
	resolved: ResolvedTheme,
	mode: Mode,
): Record<string, string> {
	const tokens: Record<string, string> = {};
	for (const name of COLOR_NAMES) {
		tokens[`--color-${name}`] = resolved.colors[mode][name];
	}
	for (const elevation of SHADOW_ELEVATIONS) {
		tokens[`--shadow-${elevation}`] = resolved.shadows[mode][elevation];
	}
	return tokens;
}

// A raised ground's hairline: docs/architecture/ui-core/tokens.md, "Edges".
export const RAISED_GROUND_TOKENS: Record<string, string> = {
	"--color-edge": "var(--color-edge-raised)",
};

// A soft ground's hairline: docs/architecture/ui-core/tokens.md, "Edges".
export const SOFT_GROUND_TOKENS: Record<string, string> = {
	"--color-edge": "var(--color-edge-strong)",
};

// The elevation utilities' declarations: docs/architecture/ui-core/tokens.md, "Emit".
export function shadowUtilities(): Record<
	ShadowUtility,
	Record<string, string>
> {
	// The loop declares each elevation's key.
	const utilities = {} as Record<ShadowUtility, Record<string, string>>;
	for (const elevation of SHADOW_ELEVATIONS) {
		utilities[`shadow-${elevation}`] = {
			"box-shadow": `var(--shadow-${elevation})`,
		};
	}
	return utilities;
}

// Native's short measure over the web's `ch`: docs/architecture/ui-core/tokens.md, "Widths".
export function nativeMeasureTokens(
	resolved: ResolvedTheme,
): Record<string, string> {
	const tokens: Record<string, string> = {};
	for (const measure of MEASURES) {
		tokens[`--container-${measure}`] = resolved.nativeMeasures[measure];
	}
	return tokens;
}
