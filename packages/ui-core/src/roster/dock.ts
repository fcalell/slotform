import type { Peaks } from "./descriptors.ts";
import type { RosterEntry } from "./shared.ts";

// The player's dock, the part an app gives a Shell's `foot` (`<Shell foot={<Dock />}>`):
// while a track is loaded (`lib/player`) it stands under the place at the column's
// width, a hairline over the surface: the picture (a track with none, or one that
// did not load, stands as the tile's failed form, so the name keeps its place), the
// name over its line, previous, play or pause (the primary glyph) and next, the
// elapsed time, the seek (the waveform where the track has peaks, else a slider)
// and the total, mute and volume (not on touch, where the device's own buttons set
// the volume), and a close. On the web the name, the transport and the seek share
// the bar's width by flex, so the transport stands at its centre; on touch the
// transport and the name stand on one row and the seek on a second. On the phone it
// is one bar with a hairline of progress along its top, and a press opens a `Sheet`
// with the full player. It draws what the player holds (`lib/player`, over
// `createPlayer` of `@fcalell/ui-core/player`: the track, an optional queue, a
// `QueueProvider` such as `windowQueue` for a list too long to hold, the clock, the
// volume) and makes no sound: the app passes the sound as an `Output` once
// (`audioOutput()` on the web, `@fcalell/plugin-native-ui/audio/expo` on the phone),
// and nothing mounts a Dock by default. While it stands it takes Space and the
// horizontal arrows anywhere that is not typing or a control that takes those keys
// itself (a Table's grid takes them where it acts on them), and the system's media
// keys.
export const dockEntry: RosterEntry = {
	props: [],
	draws: [
		"DOCK",
		"DOCK_BAR",
		"DOCK_TEXT",
		"DOCK_TIME",
		"DOCK_VOLUME",
		"DOCK_PROGRESS",
		"IMAGE.fit.mini",
		"TEXT.role.body",
		"TEXT_STRONG.role.body",
		"TEXT.role.meta",
		"ICON_BUTTON.fit.body",
		"ICON_BUTTON_PRIMARY",
		"ICON.fit.control",
		"ICON.fit.meta",
		"WAVEFORM_BAR",
		"SLIDER_TRACK",
		"SLIDER_FILL",
		"SLIDER_REST",
		"SLIDER_THUMB",
	],
	states: ["rest", "error"],
	motion: [],
	owns: {
		roles: ["body", "meta", "code"],
		colors: [
			"surface",
			"edge",
			"ink-body",
			"ink-meta",
			"danger",
			"toggle-",
			"act-accent",
			"on-act-accent",
			"skeleton",
			"group",
			"edge-strong",
			"ring",
		],
		radii: ["chip", "control", "full"],
		spacing: ["gap", "badge", "page"],
		sizes: [
			"control",
			"figures",
			"hairline",
			"icon-meta",
			"icon-control",
			"line-body",
			"measure-short",
		],
	},
};

// What the player plays and the waveform draws: one audio file and what is
// known of it. `Peaks` make the dock draw a waveform where it would draw a plain
// seek slider.
export interface Track {
	// The audio's address (an http(s) URL, a blob or data URL).
	src: string;
	// The track's name (a short phrase; truncates).
	title: string;
	// What stands under the name, an artist or an album (a short phrase; truncates).
	line?: string;
	// A picture's address, drawn at the avatar's size in the dock; a track without one stands as a picture that did not load.
	image?: string;
	// The length in seconds, where it is known before the file answers (so the dock draws the total, and a waveform its scale, from the first frame).
	duration?: number;
	peaks?: Peaks;
	// Identifies the track in a queue where `src` does not (a signed URL that changes); `src` without one.
	key?: string;
}

// The player's Dock, which an app gives a Shell's `foot`: the surface over a
// hairline at the page inset, a bar of controls (the bar's gaps above and
// below), the name over its line, the elapsed and total times in the meta ink at
// the figures' width, the volume at the short measure. The phone's dock draws the
// progress as a hairline along the bar's top, over the border.
export const DOCK = "bg-surface border-t border-edge px-page";
export const DOCK_BAR = "gap-gap py-gap";
export const DOCK_TEXT = "gap-0";
export const DOCK_TIME =
	"min-w-figures tabular-nums text-code leading-code font-normal font-mono text-ink-meta";
export const DOCK_VOLUME = "w-measure-short";
export const DOCK_PROGRESS = "h-hairline bg-toggle-on";
