import { sizeOf, sizePx, spacingOf, widthPx } from "./scales.ts";
import { KNOB_DEFAULTS, MEASURE_CHARACTERS, SANS_ADVANCE } from "./tokens.ts";

// The one fold rule for acts side by side: docs/architecture/ui-core/layout.md, "Fold rules".
const ACTS_STAND = 1;

// The acts that stand and those the more menu holds, in their order.
export function actsSplit<T>(acts: readonly T[]): {
	standing: readonly T[];
	folded: readonly T[];
} {
	return {
		standing: acts.slice(0, ACTS_STAND),
		folded: acts.slice(ACTS_STAND),
	};
}

// A row's one-line form, a rule of its width: docs/architecture/ui-core/layout.md, "Fold rules".
const TEXT_FLOOR = 2 / 5;
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

// A rules list's one-row form, a rule of its width: docs/architecture/ui-core/layout.md, "Fold rules".
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

// A Pane's side-by-side definitions, a rule of its width: docs/architecture/ui-core/layout.md, "Fold rules".
export function definitionsOneRow(size = KNOB_DEFAULTS.size): number {
	const stack = spacingOf("desktop", "stack", size);
	const page = spacingOf("desktop", "page", size);
	return Math.ceil(
		2 * CHARACTERS * sizeOf("desktop", "body", size) + stack + 2 * page,
	);
}

// The widest block whose act bar stacks its acts: docs/architecture/ui-core/acts.md, "ActionBar".
export function actsStackedMax(size = KNOB_DEFAULTS.size): number {
	return widthPx("auth", size);
}

// A two-line row's title lines, read by the web's `line-clamp` and the phone's `numberOfLines`: docs/architecture/ui-core/layout.md, "Fold rules".
export const ROW_TITLE_LINES = 3;
