import type { ChipMark } from "./descriptors.ts";
import type { RosterEntry } from "./shared.ts";

// The tabs, the search, the filters, the acts and the applied filters' chips
// over a list. `tabs` are links, each a label and an href, drawn as a
// `Picker` in `fit: segments`. `filters` are data, each a `Picker`'s own props in a toolbar (a
// pick of one, `value` a string while set, or of several, set while it
// holds any): on the desktop two or fewer stand inline as picks (a set one reads "Label:
// value", an unset one or one on its `null` option its label alone) and
// three or more (`FOLD_FILTERS_AT`, one constant for both platforms) fold,
// and at touch every filter folds, all of them, behind one outlined Filters act with the count of those set
// after its label ("Filters 2", Deel's count beside the select's name),
// opening the filters as labelled picks that apply at once: a popover
// under the act at the column's width on the desktop, a sheet on touch,
// "Clear filters" at its end while any is set. Each set filter of a folded
// toolbar is a removable neutral chip, "Work type: Change" (a pick of
// several its one value, from two "Projects: 5 projects"), first in the
// chips row before the toolbar's own `chips`; removing one sets the filter
// to its empty value (`null`, `[]` for several), so nothing set is hidden.
// The words are `filters` and `clearFilters`, and `tabs` names the tab strip's
// navigation landmark. `options` may be a read, as a
// `Picker`'s: while it waits the chip paints, and once it ended it draws
// none (the picker's line says why).
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
// keep that measure beside the acts (voice 14: one row, the search leading and
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
