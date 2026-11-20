import type { Size, SpacingRole } from "@slotform/ui-core/tokens";

// A spacing role or a size in pixels at the current density (a popup's
// offset, a glyph's side), read off the root so it follows the density.
export function spacing(role: SpacingRole | Size): number {
	return Number.parseFloat(
		getComputedStyle(document.documentElement).getPropertyValue(
			`--spacing-${role}`,
		),
	);
}

// A type role's size in pixels at the current density, read off `node` (the
// root by default) so the theme's size knob moves it.
export function textSize(
	role: "meta",
	node: Element = document.documentElement,
): number {
	return Number.parseFloat(
		getComputedStyle(node).getPropertyValue(`--text-${role}`),
	);
}
