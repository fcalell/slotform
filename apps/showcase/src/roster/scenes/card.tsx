import { Card } from "@fcalell/plugin-react-ui/components/card";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import { Prose } from "@fcalell/plugin-react-ui/components/prose";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Slider } from "@fcalell/plugin-react-ui/components/slider";
import { Stats } from "@fcalell/plugin-react-ui/components/stats";
import { Wide } from "./layout-context.tsx";

const NOTE =
	"Every pull request gets its own preview URL, torn down when the branch merges.";
const change = () => {};

// A usage window: its meter is a Stats and the reserve a part that is no row, in a Card beside it: docs/architecture/ui-core/layout.md, "Cards".
const WINDOW = [
	{
		label: "Used",
		value: 42,
		bound: 100,
		line: "Resets at 13:44",
	},
] as const;

// The card at rest, standing a Prose on its surface; then fields placed alone
// in a Card, which take the label column the Section's cards share (the name
// over the box on touch): an optional text area, a line and a pick that holds
// none; and a usage window, a Stats and a Card of its own.
export function drawCard() {
	return (
		<Wide>
			<Card>
				<Prose markdown={NOTE} />
			</Card>
			<Section title="Package">
				<Card>
					<Input
						label="Package directory"
						optional
						kind="prose"
						value=""
						placeholder="/home/you/mail"
						onChange={change}
					/>
				</Card>
			</Section>
			<Section title="Fields">
				<Card>
					<Input label="Address" value="db.internal:5432" onChange={change} />
					<Picker
						label="Projects"
						description="Each runs in the same session."
						options={[
							{ value: "triage", label: "Triage" },
							{ value: "retro", label: "Retro" },
						]}
						value={[]}
						onChange={change}
					/>
				</Card>
			</Section>
			<Section title="Five hours">
				<Stats items={WINDOW} />
				<Card>
					<Slider
						label="Reserve"
						value={0}
						min={0}
						max={100}
						onChange={change}
					/>
				</Card>
			</Section>
		</Wide>
	);
}
