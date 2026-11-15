// The roster as data: every component both UI plugins ship, its layer, the
// prop names it takes, the cells it draws, the tokens it owns, the moves it
// makes and the states it has, the same in both. DESIGN.md is emitted from it
// and the showcase draws each component in exactly the states its entry lists.
// Each entry is declared in its component's `roster/<component>.ts`, beside the
// component's descriptors, matrices and cells; `ROSTER` groups them by layer.

import { actionBarEntry } from "./roster/action-bar.ts";
import { bannerEntry } from "./roster/banner.ts";
import { barChartEntry } from "./roster/bar-chart.ts";
import { buttonEntry } from "./roster/button.ts";
import { canvasEntry } from "./roster/canvas.ts";
import { cardEntry } from "./roster/card.ts";
import { codeEntry } from "./roster/code.ts";
import { columnsEntry } from "./roster/columns.ts";
import { diffEntry } from "./roster/diff.ts";
import { dockEntry } from "./roster/dock.ts";
import { formEntry } from "./roster/form.ts";
import { galleryEntry } from "./roster/gallery.ts";
import { gateEntry } from "./roster/gate.ts";
import { imageEntry } from "./roster/image.ts";
import { inputEntry } from "./roster/input.ts";
import { paneEntry } from "./roster/pane.ts";
import { pickerEntry } from "./roster/picker.ts";
import { proseEntry } from "./roster/prose.ts";
import { qrCodeEntry } from "./roster/qr-code.ts";
import { rulesEntry } from "./roster/rules.ts";
import { sectionEntry } from "./roster/section.ts";
import { sheetEntry } from "./roster/sheet.ts";
import { shellEntry } from "./roster/shell.ts";
import { sliderEntry } from "./roster/slider.ts";
import { stagesEntry } from "./roster/stages.ts";
import { statsEntry } from "./roster/stats.ts";
import { switchEntry } from "./roster/switch.ts";
import { tableEntry } from "./roster/table.ts";
import { textEntry } from "./roster/text.ts";
import { threadEntry } from "./roster/thread.ts";
import { toastEntry } from "./roster/toast.ts";
import { toolbarEntry } from "./roster/toolbar.ts";
import { waveformEntry } from "./roster/waveform.ts";
import type {
	ColorName,
	Move,
	RadiusRole,
	ShadowLevel,
	Size,
	SpacingRole,
	TypeRole,
	Width,
} from "./tokens.ts";

const LAYERS = ["atom", "layout", "shared", "content"] as const;
export type Layer = (typeof LAYERS)[number];

export const PLATFORMS = ["web", "native"] as const;
export type Platform = (typeof PLATFORMS)[number];

// The states a component can be drawn in: the eight interaction states, plus
// `empty` for a component with an empty form, and the states a read puts a
// frame or collection in: busy, stale, paused, more, streaming. The showcase
// draws each component in exactly the states its entry lists.
export const STATES = [
	"rest",
	"hover",
	"focus",
	"active",
	"disabled",
	"loading",
	"pending",
	"error",
	"selected",
	"empty",
	"busy",
	"stale",
	"paused",
	"more",
	"streaming",
] as const;
export type State = (typeof STATES)[number];

// The tokens a component may draw, by namespace: type roles, colours,
// radii, spacing roles, sizes and widths, shadow levels. A colour is a name,
// or a family prefix ending in `-` (`chip-` covers every chip role); every
// other namespace names its tokens. A namespace left out owns nothing.
export interface Owns {
	roles?: readonly TypeRole[];
	colors?: readonly (ColorName | `${string}-`)[];
	radii?: readonly RadiusRole[];
	spacing?: readonly SpacingRole[];
	sizes?: readonly (Size | Width)[];
	elevation?: readonly ShadowLevel[];
}

// A component's prop names, the cells it draws (a `FAMILIES` name for every
// cell of that family, `FAMILY.axis.value` for one of its cells, or a
// single-cell constant of `./variants`), the states it has a form for and the
// tokens it owns.
export interface RosterEntry {
	props: readonly string[];
	draws: readonly string[];
	states: readonly State[];
	// The motion moves it makes (`MOVES`).
	motion: readonly Move[];
	owns?: Owns;
	// The platforms that ship it; absent means both.
	platforms?: readonly Platform[];
}

export const ROSTER: Record<Layer, Record<string, RosterEntry>> = {
	atom: {
		Text: textEntry,
		Button: buttonEntry,
		Input: inputEntry,
		Slider: sliderEntry,
		Switch: switchEntry,
	},
	layout: {
		Pane: paneEntry,
		Gate: gateEntry,
		Section: sectionEntry,
		Card: cardEntry,
		Form: formEntry,
		Toolbar: toolbarEntry,
		Columns: columnsEntry,
		Shell: shellEntry,
	},
	shared: {
		Sheet: sheetEntry,
		ActionBar: actionBarEntry,
		Picker: pickerEntry,
		Toast: toastEntry,
		Banner: bannerEntry,
	},
	content: {
		Prose: proseEntry,
		Code: codeEntry,
		Diff: diffEntry,
		Table: tableEntry,
		Rules: rulesEntry,
		Stages: stagesEntry,
		Stats: statsEntry,
		BarChart: barChartEntry,
		Dock: dockEntry,
		Waveform: waveformEntry,
		Thread: threadEntry,
		Image: imageEntry,
		Gallery: galleryEntry,
		QrCode: qrCodeEntry,
		Canvas: canvasEntry,
	},
};

// `FormField` → `form-field`: the component directory under `src/ui/components`.
export function componentDir(name: string): string {
	return name.replace(/(?<!^)[A-Z]/g, (ch) => `-${ch}`).toLowerCase();
}

// With a platform, only the entries that ship on it.
export function rosterEntries(
	platform?: Platform,
): Array<[Layer, string, RosterEntry]> {
	const out: Array<[Layer, string, RosterEntry]> = [];
	for (const layer of LAYERS) {
		for (const [name, entry] of Object.entries(ROSTER[layer])) {
			if (platform && entry.platforms && !entry.platforms.includes(platform)) {
				continue;
			}
			out.push([layer, name, entry]);
		}
	}
	return out;
}
