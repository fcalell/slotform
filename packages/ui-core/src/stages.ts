// The rail below a stage and the painted rail's stages, free of any framework: both platforms' `Stages` draw from it.

import type { Stage, StepState } from "./descriptors.ts";
import { PAINT_ROWS } from "./paint.ts";
import type { STAGE_RAIL } from "./roster/stages.ts";

export type RailState = keyof (typeof STAGE_RAIL)["variants"]["state"];

export const railBelow = (state: StepState | "ended"): RailState =>
	state === "done" ? "done" : "ahead";

// The painted rail: its stages' number is the data's, so a collection's.
export const WAITING: readonly Stage[] = Array.from(
	{ length: PAINT_ROWS },
	() => ({
		state: "later",
		label: "",
	}),
);
