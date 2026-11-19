import { sizeOf, sizePx, spacingOf, widthPx } from "./scales.ts";
import { KNOB_DEFAULTS, MEASURE_CHARACTERS, SANS_ADVANCE } from "./tokens.ts";
import { PAGE_TITLE_FLOOR, ROW_TEXT_FLOOR } from "./variants.ts";

// The one overflow rule for acts side by side: docs/architecture/ui-core/layout.md, "Overflow rules".
const ACTS_STAND = 1;

export function actsSplit<T>(acts: readonly T[]): {
	standing: readonly T[];
	folded: readonly T[];
} {
	return {
		standing: acts.slice(0, ACTS_STAND),
		folded: acts.slice(ACTS_STAND),
	};
}

// A share of its parent a floor's class string holds as `<utility>-<a>/<b>`.
function shareOf(name: string, classes: string, utility: string): number {
	const [, over, under] =
		new RegExp(`\\b${utility}-(\\d+)/(\\d+)\\b`).exec(classes) ?? [];
	if (over === undefined || under === undefined) {
		throw new Error(`${name} holds no fractional ${utility}`);
	}
	return Number(over) / Number(under);
}

// A row's one-line form, a rule of its width: docs/architecture/ui-core/layout.md, "Overflow rules".
// The text group's share of the row, read from its floor's `basis-<a>/<b>`.
const TEXT_FLOOR = shareOf("ROW_TEXT_FLOOR", ROW_TEXT_FLOOR, "basis");
const CHARACTERS = MEASURE_CHARACTERS["measure-short"] * SANS_ADVANCE;
export function rowOneLine(size = KNOB_DEFAULTS.size): number {
	const gap = spacingOf("desktop", "gap", size);
	const text =
		CHARACTERS *
			(sizeOf("desktop", "body", size) + sizeOf("desktop", "meta", size)) +
		gap;
	const end = 2 * CHARACTERS * sizeOf("desktop", "caption", size) + gap;
	return Math.ceil(Math.max(text / TEXT_FLOOR, end / (1 - TEXT_FLOOR)));
}

// A rules list's one-row form, a rule of its width: docs/architecture/ui-core/layout.md, "Overflow rules".
const RULE_TERM_CHARACTERS = 12;
export function rulesOneRow(size = KNOB_DEFAULTS.size): number {
	const gap = spacingOf("desktop", "gap", size);
	const control = sizePx("desktop", "control", size);
	const term =
		RULE_TERM_CHARACTERS * SANS_ADVANCE * sizeOf("desktop", "body", size) +
		2 * spacingOf("desktop", "pad", size) +
		gap +
		control;
	return Math.ceil(2 * term + 2 * control + 3 * gap);
}

// A Pane's side-by-side definitions, a rule of its width: docs/architecture/ui-core/layout.md, "Overflow rules".
export function definitionsOneRow(size = KNOB_DEFAULTS.size): number {
	const stack = spacingOf("desktop", "stack", size);
	const page = spacingOf("desktop", "page", size);
	return Math.ceil(
		2 * CHARACTERS * sizeOf("desktop", "body", size) + stack + 2 * page,
	);
}

// A Pane bar's whole trail, a rule of its width: docs/architecture/ui-core/layout.md, "Bar".
// The title keeps its floor's share of the bar (`min-w-<a>/<b>`), so the trail
// has the rest. A trail of `TRAIL_FOLDS` places, each at the short measure and a slash after it.
const TITLE_FLOOR = shareOf("PAGE_TITLE_FLOOR", PAGE_TITLE_FLOOR, "min-w");
// A bar's trail folds from three places: the top, those between, the current.
const TRAIL_FOLDS = 3;

// The trail above a bar's own place: the top stands, the places between fold
// below `trailWhole`.
export function trailSplit<T>(above: readonly T[]): {
	top: readonly T[];
	between: readonly T[];
} {
	return { top: above.slice(0, 1), between: above.slice(1) };
}

export function trailWhole(size = KNOB_DEFAULTS.size): number {
	const body = sizeOf("desktop", "body", size);
	const slash = SANS_ADVANCE * body + 2 * spacingOf("desktop", "gap", size);
	const trail = TRAIL_FOLDS * (CHARACTERS * body + slash);
	return Math.ceil(
		trail / (1 - TITLE_FLOOR) + 2 * spacingOf("desktop", "page", size),
	);
}

// The widest block whose act bar stacks its acts: docs/architecture/ui-core/acts.md, "ActionBar".
export function actsStackedMax(size = KNOB_DEFAULTS.size): number {
	return widthPx("auth", size);
}

// A two-line row's title lines, read by the web's `line-clamp` and the phone's `numberOfLines`: docs/architecture/ui-core/layout.md, "Overflow rules".
export const ROW_TITLE_LINES = 3;
