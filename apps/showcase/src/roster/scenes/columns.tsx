import { Columns } from "@slotform/react-ui/components/columns";
import { Pane } from "@slotform/react-ui/components/pane";
import { Section } from "@slotform/react-ui/components/section";
import { Panes } from "@slotform/react-ui/components/shell";
import type { ShowcaseScene } from "../class-sets.ts";
import { STAND_INS, StandInCard } from "./layout-context.tsx";
import { Column } from "./place.tsx";
import { act } from "./section-rows.ts";

const BOARD = [
	{ title: "Todo" },
	{ title: "In progress" },
	{ title: "In review" },
	{ title: "Done" },
];
const HEALTH = [
	{ title: "Deploys" },
	{ title: "Failing tests" },
	{ title: "Open incidents" },
	{ title: "Slow queries" },
];

// The `board` class set: four columns in a scene at the place's content width,
// inset at the page inset the row bleeds through, so the fourth column meets
// the edge and the row scrolls sideways. The `half` class set: a project's health
// in a Panes at the showcase's width, four sections two to a row from
// the place's desktop width and stacked below it.
export function drawColumns(scene: ShowcaseScene) {
	if (scene.classSet.name === "COLUMNS.fit.half")
		return (
			<Column>
				<Panes title="Project health">
					<Pane>
						<Columns fit="half">
							{HEALTH.map(({ title }) => (
								<Section key={title} title={title}>
									<StandInCard />
								</Section>
							))}
						</Columns>
						{/* Unequal columns: the shorter keeps its own height, its rows
						at the top, never spread to the taller one's. Both draw the
						same rows, so what one column draws is what the other does:
						the second column's rows are the first's in surface and
						weight. */}
						<Columns fit="half">
							<Section title="Spec" items={STAND_INS} />
							<Section title="Inventory" items={STAND_INS.slice(0, 2)} />
						</Columns>
					</Pane>
				</Panes>
			</Column>
		);
	return (
		<div className="flex flex-col px-page w-sheet max-w-full overflow-hidden">
			<Columns>
				{BOARD.map(({ title }) => (
					<Section
						key={title}
						title={title}
						act={{ icon: "Plus", label: `New issue in ${title}`, onAct: act }}
					>
						<StandInCard />
					</Section>
				))}
			</Columns>
		</div>
	);
}
