import { Field } from "@base-ui/react/field";
import { cn } from "@slotform/ui-core/cn";
import { FieldOwned } from "@slotform/ui-core/react/field";
import { text } from "@slotform/ui-core/variants";
import type { ReactNode } from "react";
import type { ShowcaseScene } from "../class-sets.ts";

// A `PAINT` class set draws an atom's painted shape beside its loaded one.
export const isPaint = (scene: ShowcaseScene) =>
	scene.classSet.name.startsWith("PAINT.");

// The loaded part, then the same part painted, at rest: the painted state is
// no interaction, so the other states have no form for it. items-start, so the
// scene's column does not stretch the inline parts.
export function beside(
	scene: ShowcaseScene,
	loaded: ReactNode,
	painted: ReactNode,
) {
	if (scene.state !== "rest") return undefined;
	return (
		<div className="flex flex-wrap items-center gap-section">
			{loaded}
			{painted}
		</div>
	);
}

// A control under its label, as a FormField gives it one: the painted shape of
// a control keeps the label it will have, and a loaded one is named for the
// accessibility run. The wrapper takes no more than its row has, so the
// control truncates as it does beside its painted shape.
export function labelled(control: ReactNode) {
	return (
		<FieldOwned value>
			<Field.Root className="flex flex-col min-w-0 max-w-full">
				<Field.Label className={cn(text({ role: "body" }), "truncate")}>
					Workspace
				</Field.Label>
				{control}
			</Field.Root>
		</FieldOwned>
	);
}
