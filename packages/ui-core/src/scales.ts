import { record } from "./record.ts";
import {
	BODY_SIZE,
	type Density,
	HAIRLINE_PX,
	ICON_RATIO,
	KNOB_DEFAULTS,
	MEASURE_CHARACTERS,
	type Measure,
	MONO_ADVANCE,
	type PxWidth,
	ROOM_TYPE_SIZE,
	SANS_ADVANCE,
	SIZES,
	type Size,
	SPACE_BASE,
	SPACING_RATIO,
	SPACING_ROLES,
	type SpacingRole,
	TARGET_PX,
	TEXT_MEASURE_CHARACTERS,
	TYPE_ROLES,
	TYPE_SCALE,
	type TypeRole,
	WIDTH_VALUE,
} from "./tokens.ts";

// The scales density moves: docs/architecture/ui-core/tokens.md, "Density and room".

// The nearest even pixel; a tie rounds up.
function roundEven(value: number): number {
	return 2 * Math.round(value / 2);
}

// The body size at a density: docs/architecture/ui-core/tokens.md, "Type roles".
function bodyOf(density: Density, size = KNOB_DEFAULTS.size): number {
	if (density === "desktop") return size;
	return Math.max(
		BODY_SIZE.touch,
		Math.round((size * BODY_SIZE[density]) / BODY_SIZE.desktop),
	);
}

export function sizeOf(
	density: Density,
	role: TypeRole,
	size = KNOB_DEFAULTS.size,
): number {
	const ratio =
		(density === "room" ? ROOM_TYPE_SIZE[role] : undefined) ??
		TYPE_SCALE[role].size;
	return Math.round(bodyOf(density, size) * ratio);
}

export function leadingOf(
	density: Density,
	role: TypeRole,
	size = KNOB_DEFAULTS.size,
): number {
	return roundEven(sizeOf(density, role, size) * TYPE_SCALE[role].leading);
}

export function typeFor(
	density: Density,
	size = KNOB_DEFAULTS.size,
): Record<TypeRole, { size: string; leading: string }> {
	return record(TYPE_ROLES, (role) => ({
		size: `${sizeOf(density, role, size)}px`,
		leading: `${leadingOf(density, role, size)}px`,
	}));
}

// A role is its multiple of the base, the base following the body size from
// the sheet's, to the pixel.
export function spacingOf(
	density: Density,
	role: SpacingRole,
	size = KNOB_DEFAULTS.size,
): number {
	const base = (SPACE_BASE * bodyOf(density, size)) / BODY_SIZE[density];
	return Math.round(base * SPACING_RATIO[density][role]);
}

export function spacingFor(
	density: Density,
	size = KNOB_DEFAULTS.size,
): Record<SpacingRole, string> {
	return record(SPACING_ROLES, (role) => `${spacingOf(density, role, size)}px`);
}

// A px width: docs/architecture/ui-core/tokens.md, "Widths".
export function widthPx(width: PxWidth, size = KNOB_DEFAULTS.size): number {
	const base = (SPACE_BASE * bodyOf("desktop", size)) / BODY_SIZE.desktop;
	return Math.round(base * WIDTH_VALUE[width]);
}

// A measure's width in px: its characters at the sans figure advance of the
// density's body size, rounded up, so every role of text stands at one width.
function measureWidth(
	characters: number,
	density: Density,
	size: number,
): number {
	return Math.ceil(characters * SANS_ADVANCE * bodyOf(density, size));
}

// Every size is derived from the type, the space and the target, but the
// target, which is declared per density, and the hairline, a set pixel; the
// meta and control icons stand a step of 2 px under and over the icon, so each
// stays an even size.
export function sizePx(
	density: Density,
	name: Size,
	size = KNOB_DEFAULTS.size,
): number {
	const line = leadingOf(density, "body", size);
	const gap = spacingOf(density, "gap", size);
	const target = TARGET_PX[density];
	const icon = roundEven(bodyOf(density, size) * ICON_RATIO);
	switch (name) {
		// The body line and the gap above and below it, at least the target. A
		// row is the same measure, as a floor.
		case "control":
		case "row":
			return Math.max(line + 2 * gap, target);
		case "target":
			return target;
		case "line-body":
			return line;
		case "hairline":
			return HAIRLINE_PX;
		case "icon":
			return icon;
		case "icon-meta":
			return icon - 2;
		case "icon-control":
			return icon + 2;
		case "dot":
			return (icon - 2) / 2;
		case "figures":
			return Math.ceil(4 * MONO_ADVANCE * sizeOf(density, "code", size));
		case "measure":
			return measureWidth(TEXT_MEASURE_CHARACTERS, density, size);
	}
}

export function sizesFor(
	density: Density,
	size = KNOB_DEFAULTS.size,
): Record<Size, string> {
	return record(SIZES, (name) => `${sizePx(density, name, size)}px`);
}

// Native's short measure in px: its characters at the sans figure advance of
// the touch body size, rounded up, since uniwind reads no `ch`.
export function nativeMeasurePx(
	measure: Measure,
	size = KNOB_DEFAULTS.size,
): number {
	return measureWidth(MEASURE_CHARACTERS[measure], "touch", size);
}
