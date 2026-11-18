import { showcaseScenes } from "../src/roster/class-sets.ts";

// The roster, listed in a child process: docs/architecture/ui-core/showcase.md, "Story generation".
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
