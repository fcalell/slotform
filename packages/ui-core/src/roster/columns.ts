import type { RosterEntry } from "./shared.ts";
import { build, matrix } from "./shared.ts";

export const columnsEntry: RosterEntry = {
	props: ["fit", "children"],
	draws: ["COLUMNS"],
	states: ["rest"],
	motion: [],
	owns: { spacing: ["stack", "page", "section"], sizes: ["column"] },
};

// A page's sections side by side. `fit` is where they stand: `board` is a
// row scrolling sideways from the page inset (a web overlay bleeds it to the
// the place's edge and sets each child at the `column` width in a grid track;
// the phone's children stand at their own width); `half` is two to a row filling the
// body from the place's `desktop` width and stacking in order below it (a
// web overlay), at the sections rhythm between rows and columns. The phone
// stacks every fit.
export const COLUMNS = matrix({
	base: "",
	variants: {
		fit: {
			board: "gap-stack px-page",
			half: "gap-section",
		},
	},
	defaultVariants: { fit: "board" },
});

export const columns = build(COLUMNS);

export type ColumnsFit = keyof (typeof COLUMNS)["variants"]["fit"];
