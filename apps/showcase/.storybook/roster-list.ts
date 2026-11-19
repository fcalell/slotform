import { showcaseScenes } from "../src/roster/class-sets.ts";

// The roster, listed in a child process: docs/architecture/ui-core/showcase.md, "Story generation".
const components = new Map<
	string,
	{
		layer: string;
		component: string;
		stories: Set<string>;
		lone: Set<string>;
	}
>();
for (const scene of showcaseScenes()) {
	const entry = components.get(scene.component) ?? {
		layer: scene.layer,
		component: scene.component,
		stories: new Set<string>(),
		lone: new Set<string>(),
	};
	entry.stories.add(scene.story);
	if (scene.story !== scene.state) entry.lone.add(scene.story);
	components.set(scene.component, entry);
}
console.log(
	JSON.stringify({
		components: [...components.values()].map((entry) => ({
			...entry,
			stories: [...entry.stories],
			lone: [...entry.lone],
		})),
	}),
);
