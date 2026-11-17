import type { ChipMark } from "./descriptors.ts";
import type { RosterEntry } from "./shared.ts";

// The toolbar: docs/architecture/ui-core/components.md, "Toolbar".
export const toolbarEntry: RosterEntry = {
	// `tabs` is the web's alone.
	props: ["tabs", "search", "filters", "chips", "children"],
	draws: [
		"TOOLBAR",
		"TOOLBAR_TABS",
		"TOOLBAR_ROW",
		"TOOLBAR_LINE",
		"TOOLBAR_SEARCH",
		"TOOLBAR_CHIPS",
		"TOOLBAR_FILTERS",
		"TOOLBAR_FILTERS_POPOVER",
		"POPOVER",
		"LAYER_POPOVER",
	],
	states: ["rest"],
	motion: ["block", "layer"],
	owns: {
		colors: ["edge", "raised", "edge-raised"],
		radii: ["popover"],
		spacing: ["gap", "stack"],
		sizes: ["column"],
		elevation: ["float"],
	},
};

// A toolbar's search: the `search` `Input`'s value and the keystrokes it
// hears, with the hint it draws while empty (the field's name is the slot word
// `search`).
export interface ToolbarSearch {
	value: string;
	onChange: (value: string) => void;
	// The hint drawn while the value is empty (a short phrase; truncates).
	placeholder?: string;
}

// An applied filter in a toolbar: a removable chip.
export interface ToolbarChip extends ChipMark {
	// Removes the filter.
	onRemove: () => void;
}

// A toolbar's band over a list, in a page's body, so its controls stand at the
// body's own inset (no inset of its own: a second one put them a page inset
// past the headings and the list under it) and its hairline spans the same
// width: its controls and acts in wrapping rows at the acts rhythm, the
// applied filters' chips at the pair rhythm.
export const TOOLBAR = "gap-gap border-b border-edge";
export const TOOLBAR_ROW = "gap-gap";
export const TOOLBAR_LINE =
	"py-gap min-h-[calc(var(--spacing-control)+2*var(--spacing-gap))]";
// The tabs stand first in the row; on touch, where the row wraps, they take
// the first line whole and the control scrolls sideways inside it.
export const TOOLBAR_TABS = "min-w-0 touch:w-full";
// The search grows from a basis of the short measure up to the `column`
// width (the filters' range), so the row wraps only when the search cannot
// keep that measure beside the acts (`guide/voice.md`, "Rows": one row, the search leading and
// the filters a glyph), never on the input's own width. On the desktop the
// acts keep the row's end past it; on touch it takes the width they leave.
export const TOOLBAR_SEARCH =
	"grow min-w-0 basis-[min(100%,var(--container-measure-short))] max-w-column touch:max-w-none";
export const TOOLBAR_CHIPS = "gap-gap";
// A toolbar's folded filters: the labelled picks in one column a fields gap
// apart, in the desktop popover at the column's width (the filters pattern's
// range is 300 to 500) at the inside inset past the popover's own float inset.
export const TOOLBAR_FILTERS = "gap-stack";
export const TOOLBAR_FILTERS_POPOVER = "w-column p-gap";
