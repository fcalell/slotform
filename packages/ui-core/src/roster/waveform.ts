import type { RosterEntry } from "./shared.ts";
import { PRESS } from "./shared.ts";

// A track's precomputed peaks drawn on a canvas, the web's alone: the played
// part in the toggle ink, the rest in the edge and a playhead.
// It is a slider: the arrows seek by `SEEK`, a press or a drag on it seeks to
// the pointer. `fit` is `bar` (the control's height, the dock's) or `record`
// (two controls tall).
export const waveformEntry: RosterEntry = {
	props: ["label", "peaks", "duration", "at", "onSeek", "fit"],
	platforms: ["web"],
	draws: ["WAVEFORM_BAR", "WAVEFORM_RECORD"],
	states: [...PRESS],
	motion: ["follow"],
	owns: {
		colors: ["toggle-", "edge-strong", "ink-body", "ring"],
		radii: ["control"],
		sizes: ["control"],
	},
};

export const WAVEFORM_RECORD =
	"h-[calc(2*var(--spacing-control))] rounded-control";
