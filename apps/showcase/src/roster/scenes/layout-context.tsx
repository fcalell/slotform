import { Card } from "@fcalell/plugin-react-ui/components/card";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { cn } from "@fcalell/ui-core/cn";
import { row, text, textStrong } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { ROWS } from "../waiting.ts";

// Context the layout containers place inside their molecules: stand-in rows at
// the row cell until the row molecules are built, the width a board's scene
// draws a molecule at, shrinking to a narrow viewport.

export function Wide(props: { children: ReactNode }) {
	return (
		<div className="flex flex-col gap-section w-sheet max-w-full">
			{props.children}
		</div>
	);
}

// The stand-in names as a Section's rows; a scene that tests what holds a
// Section's parts uses `StandInCard` instead.
export const STAND_INS = ROWS.map((name) => ({ key: name, title: name }));

export function StandInList() {
	return <Section items={STAND_INS} />;
}

function StandInRow(props: { name: string }) {
	return (
		<div className={cn(row({}), "flex items-center")}>
			<span
				className={cn(text({ role: "body" }), textStrong({ role: "body" }))}
			>
				{props.name}
			</span>
		</div>
	);
}

export function StandInCard() {
	return (
		<Card>
			<StandInRows />
		</Card>
	);
}

// Static rows no component owns.
export function StandInRows() {
	return ROWS.map((name) => <StandInRow key={name} name={name} />);
}
