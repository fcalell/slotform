import type { StoryObj } from "@storybook/react-vite";
import { showcaseScenes } from "../src/roster/class-sets.ts";
import { type Draw, Scene } from "../src/roster/scene.tsx";

const SCENES = showcaseScenes();

interface Args {
	classSet: string;
}

// One story per component and state: every class set the component draws in that
// state, light and dark side by side, at the toolbar's density. The `rest`
// story takes a `classSet` arg to browse one class set.
export function stateStories(component: string, draw?: Draw) {
	const own = SCENES.filter((scene) => scene.component === component);
	return (state: string): StoryObj<Args> => {
		const classSets = [
			...new Set(
				own
					.filter((scene) => scene.state === state)
					.map((f) => f.classSet.name),
			),
		];
		return {
			args: { classSet: "all" },
			argTypes: {
				classSet:
					state === "rest"
						? { control: "select", options: ["all", ...classSets] }
						: { table: { disable: true } },
			},
			parameters: { layout: "padded" },
			render: (args, context) => {
				const density = String(context.globals.density);
				return (
					<div key={density} className="flex flex-col gap-inside">
						{classSets
							.filter(
								(classSet) =>
									args.classSet === "all" || args.classSet === classSet,
							)
							.map((classSet) => (
								<div
									key={classSet}
									className="flex flex-row flex-wrap gap-pair min-w-0"
								>
									{own
										.filter(
											(scene) =>
												scene.classSet.name === classSet &&
												scene.state === state &&
												scene.density === density,
										)
										.map((scene) => (
											<Scene key={scene.id} scene={scene} draw={draw} />
										))}
								</div>
							))}
					</div>
				);
			},
		};
	};
}
