import type { RosterEntry } from "../roster.ts";
import type { TEXT } from "./shared.ts";

// A paragraph in a type role, its `kind` (`body` or `meta`); `children` are runs: words, with `{ strong }` runs at
// weight 500 (only the weight, the line's role, ink and family inherited) and
// `{ code }` runs.
export const textEntry: RosterEntry = {
	props: ["kind", "children"],
	draws: [
		"TEXT.role.body",
		"TEXT.role.meta",
		"TEXT_STRONG.role.body",
		"TEXT_STRONG.role.meta",
	],
	states: ["rest"],
	motion: [],
	owns: {
		roles: ["body", "meta"],
		colors: ["ink-body", "ink-meta"],
		sizes: ["measure"],
	},
};

// The roles `Text` draws: a primary line and a secondary one. The other roles
// are drawn by the molecule that owns their place.
export type TextRole = Extract<
	keyof (typeof TEXT)["variants"]["role"],
	"body" | "meta"
>;
