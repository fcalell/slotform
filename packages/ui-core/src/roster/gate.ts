import type { RosterEntry } from "./shared.ts";
import { build, matrix } from "./shared.ts";

// A page outside the shell: docs/architecture/ui-core/layout.md, "Gate".
export const gateEntry: RosterEntry = {
	// `acts` is the web's alone, an act list drawn as an `ActionBar` under the
	// body: the phone's Gate draws its `Button`s in the body.
	props: ["title", "description", "step", "banner", "acts", "form", "children"],
	draws: [
		"BLOCK_IN",
		"GATE",
		"GATE_COLUMN",
		"GATE_STEP",
		"GATE_MARK",
		"GATE_MARK_ROW",
		"GATE_LOGO",
		"STEP_COUNT",
		"STEP_COUNT_SEGMENTS",
		"STEP_COUNT_SEGMENT",
		"TEXT.role.title",
		"TEXT.role.meta",
		"TEXT.role.body",
		"TEXT_STRONG.role.body",
		"BUTTON.act.primary",
		"BUTTON.fit.body",
		"BUTTON_LABEL.act.primary",
	],
	states: ["rest"],
	motion: ["answer", "give", "block"],
	owns: {
		roles: ["title", "meta", "body"],
		colors: [
			"ink-body",
			"ink-meta",
			"surface",
			"fill-neutral",
			"act-accent",
			"on-act-accent",
		],
		radii: ["full", "control"],
		spacing: ["page", "section", "stack", "gap", "pad"],
		sizes: ["auth", "line-body", "empty", "control", "icon-control"],
	},
};

// A step count's segment that turns done cross-fades its fill on `base`.
export const FILL_FADE = "transition-[background-color] duration-base ease-out";

// One segment of an onboarding step count at the meter's height, a gap: the steps
// done and the current one in the meta ink, the later ones a wash; never the
// accent. The segments share the row's width.
export const STEP_COUNT_SEGMENT = matrix({
	base: `h-gap rounded-chip ${FILL_FADE}`,
	variants: {
		state: {
			done: "bg-ink-meta",
			current: "bg-ink-meta",
			later: "bg-fill-neutral",
		},
	},
	defaultVariants: { state: "later" },
});

export const stepCountSegment = build(STEP_COUNT_SEGMENT);

export const STEP_COUNT = "gap-gap";
export const STEP_COUNT_SEGMENTS = "gap-gap";

// A page outside the shell, a Gate: the surface ground at the page inset, one
// column at the `auth` width (a column class set is a width; the region centres
// it). A step with a title is one stack, a fields gap between every part: the
// mark, the count, the title, the description, the banner and the body. The mark is the avatar's size, and a
// drawn lockup in the Gate stands taller, at `gate-mark`.
export const GATE = "bg-surface p-page";
export const GATE_COLUMN = "w-full max-w-auth";

// The app's lockup is the logo (`GATE_MARK`, the avatar's size) and the
// app's name a row apart, a row of the step.
export const GATE_MARK_ROW = "gap-gap";
// An app's drawn lockup stands in the row in place of the logo and the name,
// its width from its own proportion, held to the row, two body lines tall.
export const GATE_LOGO =
	"h-[calc(2*var(--spacing-line-body))] w-auto max-w-full";
