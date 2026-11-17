import { cn } from "@fcalell/ui-core/cn";
import { text } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import type { ShowcaseFrame } from "./cells.ts";

// A drawer returns the real component in the frame's cell and state, or
// `undefined` for a cell the component has no form for.
export type Draw = (frame: ShowcaseFrame) => ReactNode | undefined;

// A frame shrinks to the viewport and stands on the canvas: docs/architecture/ui-core/showcase.md, "Roster frames".
export function Frame(props: { frame: ShowcaseFrame; draw?: Draw }) {
	const { frame } = props;
	const drawn = props.draw?.(frame);
	return (
		<div
			data-cell={frame.id}
			className={cn(
				frame.mode,
				"flex flex-col gap-gap p-pad min-w-0 rounded-card bg-canvas",
			)}
		>
			<p className={text({ role: "caption" })}>
				{frame.cell.name} · {frame.state} · {frame.mode}
			</p>
			{drawn ?? (
				<>
					<p className={text({ role: "body" })}>{frame.component}</p>
					<p className={text({ role: "code" })}>
						{frame.cell.classes.join(" ")}
					</p>
				</>
			)}
		</div>
	);
}
