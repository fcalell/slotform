import { Card } from "@fcalell/plugin-react-ui/components/card";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { cn } from "@fcalell/ui-core/cn";
import { row, text, textStrong } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";

// Context the layout containers place inside their molecules: stand-in rows at
// the row cell until the row molecules are built, the width a board's scene
// draws a molecule at, shrinking to a narrow viewport.

const NAMES = ["Ana Ruiz", "Ben Kaya", "Ema Okafor"];

export function Wide(props: { children: ReactNode }) {
	return (
		<div className="flex flex-col gap-section w-sheet max-w-full">
			{props.children}
		</div>
	);
}

// The stand-in names as a Section's rows; a scene that tests what holds a
// Section's parts uses `StandInCard` instead.
export const STAND_INS = NAMES.map((name) => ({ key: name, title: name }));

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

/** The stand-in rows on a `Card`, a part of a Section's body. */
export function StandInCard() {
	return (
		<Card>
			<StandInRows />
		</Card>
	);
}

/** The stand-in rows on the page: static rows no component owns. */
export function StandInRows() {
	return NAMES.map((name) => <StandInRow key={name} name={name} />);
}
