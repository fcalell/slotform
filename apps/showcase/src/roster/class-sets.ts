import {
	type Layer,
	type RosterEntry,
	rosterEntries,
	type State,
} from "@fcalell/ui-core/roster";
import { matrixClasses } from "@fcalell/ui-core/variants";

export const MODES = ["light", "dark"] as const;
export type ShowcaseMode = (typeof MODES)[number];

export const DENSITIES = ["touch", "desktop"] as const;
export type ShowcaseDensity = (typeof DENSITIES)[number];

interface ShowcaseClassSet {
	// `BUTTON.act.primary`, or `base` for a component that draws no matrix.
	name: string;
	classes: readonly string[];
}

export interface ShowcaseScene {
	id: string;
	layer: Layer;
	component: string;
	classSet: ShowcaseClassSet;
	state: DrawnState;
	mode: ShowcaseMode;
	density: ShowcaseDensity;
}

// The states a scene draws: each one a prop of the component. A pointer or
// focus look is reached by driving the real component, so no scene draws it.
const DRAWN_STATES = [
	"rest",
	"disabled",
	"loading",
	"pending",
	"error",
	"empty",
	"selected",
	"busy",
	"stale",
	"paused",
	"streaming",
	"more",
] as const satisfies readonly State[];
type DrawnState = (typeof DRAWN_STATES)[number];
const isDrawn = (state: State): state is DrawnState =>
	DRAWN_STATES.some((drawn) => drawn === state);

const CLASS_SETS = matrixClasses();
const BASE: ShowcaseClassSet = { name: "base", classes: [] };

// A component shows every class set of a matrix group it draws and each group class set it
// names; one that draws no matrix shows one `base` class set.
function componentClassSets(entry: RosterEntry): ShowcaseClassSet[] {
	const { draws } = entry;
	const classSets = [...CLASS_SETS]
		.filter(
			([path]) =>
				draws.includes(path) || draws.includes(path.split(".")[0] ?? ""),
		)
		.map(([name, set]) => ({ name, classes: [...set] }));
	return classSets.length > 0 ? classSets : [BASE];
}

const FIRST = new Map(
	Array.from(rosterEntries(), ([, component, entry]): [string, string] => [
		component,
		componentClassSets(entry)[0]?.name ?? BASE.name,
	]),
);

/** Whether the scene's class set is the first its component draws: the one a state whose form no class set changes (a collection's failed shape, a control's options failing) draws on, once. */
export function isFirstClassSet(scene: ShowcaseScene): boolean {
	return FIRST.get(scene.component) === scene.classSet.name;
}

// Every scene the showcase draws, in roster order: each component's class sets,
// each in every drawn state its roster entry lists, every mode and density.
export function showcaseScenes(): ShowcaseScene[] {
	const scenes: ShowcaseScene[] = [];
	for (const [layer, component, entry] of rosterEntries()) {
		for (const classSet of componentClassSets(entry)) {
			for (const state of entry.states) {
				if (!isDrawn(state)) continue;
				for (const density of DENSITIES) {
					for (const mode of MODES) {
						scenes.push({
							id: [component, classSet.name, state, mode, density].join("/"),
							layer,
							component,
							classSet,
							state,
							mode,
							density,
						});
					}
				}
			}
		}
	}
	return scenes;
}
