import type { StoryObj } from "@storybook/react-vite";
import { showcaseScenes } from "../src/roster/class-sets.ts";
import { type Draw, Scene } from "../src/roster/scene.tsx";

const SCENES = showcaseScenes();

interface Args {
	classSet: string;
}

// A component's stories: docs/architecture/ui-core/showcase.md, "The roster in Storybook".
export function stateStories(component: string, draw?: Draw) {
	const own = SCENES.filter((scene) => scene.component === component);
	return (story: string): StoryObj<Args> => {
		const classSets = [
			...new Set(
				own
					.filter((scene) => scene.story === story)
					.map((f) => f.classSet.name),
			),
		];
		return {
			args: { classSet: "all" },
			argTypes: {
				classSet:
					story === "rest"
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
												scene.story === story &&
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
