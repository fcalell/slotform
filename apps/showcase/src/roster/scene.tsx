import { cn } from "@fcalell/ui-core/cn";
import { text } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import type { ShowcaseScene } from "./class-sets.ts";

// A drawer returns the real component in the scene's class set and state, or
// `undefined` for a class set the component has no form for.
export type Draw = (scene: ShowcaseScene) => ReactNode | undefined;

// A scene shrinks to the viewport and stands on the canvas: docs/architecture/ui-core/showcase.md, "Roster scenes".
export function Scene(props: { scene: ShowcaseScene; draw?: Draw }) {
	const { scene } = props;
	const drawn = props.draw?.(scene);
	return (
		<div
			data-cell={scene.id}
			className={cn(
				scene.mode,
				"flex flex-col gap-gap p-pad min-w-0 rounded-card bg-canvas",
			)}
		>
			<p className={text({ role: "caption" })}>
				{scene.classSet.name} · {scene.story} · {scene.mode}
			</p>
			{drawn ?? (
				<>
					<p className={text({ role: "body" })}>{scene.component}</p>
					<p className={text({ role: "code" })}>
						{scene.classSet.classes.join(" ")}
					</p>
				</>
			)}
		</div>
	);
}
