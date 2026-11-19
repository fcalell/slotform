import type { StoryObj } from "@storybook/react-vite";
import {
	type ShowcaseScene,
	showcaseScenes,
} from "../src/roster/class-sets.ts";
import { type Draw, Scene } from "../src/roster/scene.tsx";

const SCENES = showcaseScenes();

interface Args {
	classSet: string;
}

const classSetsOf = (scenes: ShowcaseScene[]) => [
	...new Set(scenes.map((scene) => scene.classSet.name)),
];

// The scenes of one density, a row per class set. `only` browses one class set.
function StoryScenes(props: {
	scenes: ShowcaseScene[];
	draw?: Draw;
	leaveOut?: boolean;
	only?: string;
}) {
	return (
		<>
			{classSetsOf(props.scenes)
				.filter((classSet) => !props.only || props.only === classSet)
				.map((classSet) => (
					// A row whose scenes are all left out draws nothing.
					<div
						key={classSet}
						className="flex flex-row flex-wrap gap-pair min-w-0 empty:hidden"
					>
						{props.scenes
							.filter((scene) => scene.classSet.name === classSet)
							.map((scene) => (
								<Scene
									key={scene.id}
									scene={scene}
									draw={props.draw}
									leaveOut={props.leaveOut}
								/>
							))}
					</div>
				))}
		</>
	);
}

// A component's stories: docs/architecture/ui-core/showcase.md, "The roster in Storybook".
export function stateStories(component: string, draw?: Draw) {
	const own = SCENES.filter((scene) => scene.component === component);
	return (story: string): StoryObj<Args> => {
		const inStory = own.filter((scene) => scene.story === story);
		return {
			args: { classSet: "all" },
			argTypes: {
				classSet:
					story === "rest"
						? { control: "select", options: ["all", ...classSetsOf(inStory)] }
						: { table: { disable: true } },
			},
			parameters: { layout: "padded" },
			render: (args, context) => {
				const density = String(context.globals.density);
				return (
					<div key={density} className="flex flex-col gap-inside">
						<StoryScenes
							scenes={inStory.filter((scene) => scene.density === density)}
							draw={draw}
							only={args.classSet === "all" ? undefined : args.classSet}
						/>
					</div>
				);
			},
		};
	};
}

// The face on one page: docs/architecture/ui-core/showcase.md, "The roster in Storybook".
// Each lone story is an iframe of its own story, so its page-wide queue stays in its own document.
export function specimen(
	drawn: [component: string, draw: Draw][],
	loneIds: string[],
): StoryObj {
	return {
		parameters: { layout: "padded" },
		render: (_args, context) => {
			const density = String(context.globals.density);
			return (
				<div key={density} className="flex flex-col gap-inside">
					{drawn.map(([component, draw]) => (
						<StoryScenes
							key={component}
							scenes={SCENES.filter(
								(scene) =>
									scene.component === component &&
									scene.story === "rest" &&
									scene.density === density,
							)}
							draw={draw}
							leaveOut
						/>
					))}
					{loneIds.map((id) => (
						<iframe
							key={id}
							title={id}
							src={`iframe.html?id=${id}&viewMode=story&globals=density:${density}`}
							className="w-full h-dvh border-0"
						/>
					))}
				</div>
			);
		},
	};
}
