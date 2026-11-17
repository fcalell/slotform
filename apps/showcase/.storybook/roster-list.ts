import { showcaseScenes } from "../src/roster/class-sets.ts";

// Runs in a child process so each listing reads the roster fresh: Node caches
// an ES module for the life of a process, and the roster is edited while
// Storybook runs.
const components = new Map<
	string,
	{ layer: string; component: string; states: Set<string> }
>();
for (const scene of showcaseScenes()) {
	const entry = components.get(scene.component) ?? {
		layer: scene.layer,
		component: scene.component,
		states: new Set<string>(),
	};
	entry.states.add(scene.state);
	components.set(scene.component, entry);
}
console.log(
	JSON.stringify({
		components: [...components.values()].map((entry) => ({
			...entry,
			states: [...entry.states],
		})),
	}),
);
