import type {
	MultiPick,
	Option,
	OptionGroup,
	OptionPick,
} from "../descriptors.ts";
import type { RosterEntry } from "../roster.ts";
import type { ContentTone } from "../variants.ts";
import { build, matrix, toneOf } from "./shared.ts";

// Rules, one per row, each a pair (a source mapped to a target: from, an
// arrow, to) or a condition (a field, fixed operator words, a value), the
// terms each a `Picker` at the `bar` fit (a pick, or a pick of several as a
// removable chip, or from two values one token naming how many, its noun the label in lowercase) or an either (a pick whose list ends with the act that
// types a value, or the typed `Input` whose act picks again), and a
// remove act. From `tablet` the columns align across rows; a list
// narrower than its one-row width (`rulesOneRow`) stacks each rule's
// terms, the arrow turned down and the remove act beside the last term,
// so no term is cut under its floor of characters; on touch each rule is
// a card of stacked terms in a sheet, the remove act beside the last
// term. `add` ends the list.
export const rulesEntry: RosterEntry = {
	props: ["rules", "add"],
	draws: [
		"BLOCK_IN",
		"ICON.fit.meta",
		"RULES",
		"RULE_ROW",
		"RULE_CARD",
		"RULE_ARROW",
		"TEXT.role.meta",
	],
	states: ["rest"],
	motion: ["block"],
	owns: {
		roles: ["meta"],
		colors: ["ink-meta", "ink-disabled"],
		spacing: ["gap", "pad"],
		sizes: ["icon-meta"],
	},
};

// What a cell holds when it is a picked option or a typed value: the one
// the viewer chose, `picked` unset while neither is.
export type EitherValue<V extends string | null = string> =
	| { picked?: V }
	| { typed: string };

// A picked option or a typed value in one cell: the pick, whose list ends
// with the act that switches to typing, or the typed value, whose field ends
// with the act that switches back to the pick.
export interface EitherPick<V extends string | null = string> {
	// What is picked, the trigger's name (a short phrase; read aloud, never drawn on the trigger).
	label: string;
	options: readonly Option<V>[] | readonly OptionGroup<V>[];
	value: EitherValue<NoInfer<V>>;
	onChange: (value: EitherValue<NoInfer<V>>) => void;
	// The hint drawn while the typed value is empty (a short phrase; truncates).
	placeholder?: string;
}

// One term of a rule: a pick, a pick of several, or a picked option or a
// typed value.
export type RuleValue<V extends string | null = string> =
	| { pick: OptionPick<V>; picks?: never; either?: never }
	| { picks: MultiPick<V>; pick?: never; either?: never }
	| { either: EitherPick<V>; pick?: never; picks?: never };

// A rule's terms, one of two rows: a pair (a source mapped to a target) or a
// condition (a field, fixed operator words, a value).
export type RuleTerms<V extends string | null = string> =
	| { from: RuleValue<V>; to: RuleValue<V>; field?: never }
	| {
			field: OptionPick<V>;
			// The fixed words between the field and the value (a word; wraps).
			operator: string;
			value: RuleValue<V>;
			from?: never;
	  };

// One row of a `Rules` list: its `id`, unique in the list, its terms, and
// `onRemove`, which draws the row's remove act.
export interface Rule<V extends string | null = string> {
	id: string;
	terms: RuleTerms<V>;
	onRemove?: () => void;
}

// A pair row's arrow, in the meta ink while both sides are set and the
// disabled ink while either is not.
export const RULE_ARROW = matrix({
	base: "",
	variants: {
		state: {
			set: "text-ink-meta",
			unset: "text-ink-disabled",
		},
	},
	defaultVariants: { state: "set" },
});

export const ruleArrow = build(RULE_ARROW);

// A list of rules on the desktop: rows of flex terms sharing one basis, so the
// columns align across rows, a pair rhythm between rows and the inside gap
// between terms. A rule's terms keep the inside gap on touch too, stacked in
// its card (`RULE_CARD`'s inset, a sheet holding the cards).
export const RULES = "gap-y-gap";
export const RULE_ROW = "gap-gap";
export const RULE_CARD = "px-pad py-gap";

// A pair row's arrow ink, its state's.
export function ruleArrowContentTone(
	state: keyof (typeof RULE_ARROW)["variants"]["state"],
): ContentTone {
	return toneOf(RULE_ARROW.variants.state[state]);
}
