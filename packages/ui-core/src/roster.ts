// The roster as data: docs/architecture/ui-core/roster.md, "The roster".

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
import type { Platform, RosterEntry } from "./roster/shared.ts";
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

export {
	type Owns,
	PLATFORMS,
	type Platform,
	type RosterEntry,
	STATES,
	type State,
} from "./roster/shared.ts";

const LAYERS = ["atom", "layout", "shared", "content"] as const;
export type Layer = (typeof LAYERS)[number];

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
