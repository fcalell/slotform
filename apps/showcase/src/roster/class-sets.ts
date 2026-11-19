import {
	type Layer,
	type RosterEntry,
	rosterEntries,
	type State,
} from "@fcalell/ui-core/roster";
import { MODES, type Mode } from "@fcalell/ui-core/tokens";
import { matrixClasses } from "@fcalell/ui-core/variants";

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
	// The story the scene stands in: its state's, or its own when it stands alone.
	story: DrawnState | LoneStory;
	mode: Mode;
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

// The scenes that stand alone, each the one scene of a story of its own: at
// rest, on its component's first class set, dark. What they raise into a
// page-wide queue (a toast's, a decision's) every root container on the page
// draws, so a page of several stages would show it in each.
const LONE_STORIES = {
	Sheet: ["confirm"],
	Toast: ["overSheet", "overPage"],
} as const satisfies Record<string, readonly string[]>;
export type LoneStory =
	(typeof LONE_STORIES)[keyof typeof LONE_STORIES][number];
const loneStories = (component: string): readonly LoneStory[] =>
	Object.entries(LONE_STORIES).find(([name]) => name === component)?.[1] ?? [];

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
// each in every drawn state its roster entry lists, every mode and density,
// then its lone scenes, each in every density.
export function showcaseScenes(): ShowcaseScene[] {
	const scenes: ShowcaseScene[] = [];
	const add = (scene: Omit<ShowcaseScene, "id">) =>
		scenes.push({
			...scene,
			id: [
				scene.component,
				scene.classSet.name,
				scene.story,
				scene.mode,
				scene.density,
			].join("/"),
		});
	for (const [layer, component, entry] of rosterEntries()) {
		const classSets = componentClassSets(entry);
		for (const classSet of classSets) {
			for (const state of entry.states) {
				if (!isDrawn(state)) continue;
				for (const density of DENSITIES) {
					for (const mode of MODES)
						add({
							layer,
							component,
							classSet,
							state,
							story: state,
							mode,
							density,
						});
				}
			}
		}
		const [first = BASE] = classSets;
		for (const story of loneStories(component))
			for (const density of DENSITIES)
				add({
					layer,
					component,
					classSet: first,
					state: "rest",
					story,
					mode: "dark",
					density,
				});
	}
	return scenes;
}
