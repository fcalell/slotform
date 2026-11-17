import { Form } from "@fcalell/plugin-react-ui/components/form";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Switch } from "@fcalell/plugin-react-ui/components/switch";
import type { ShowcaseScene } from "../class-sets.ts";
import { waiting } from "../waiting.ts";
import { FILLED, GIVEN, SAVED } from "./form.tsx";
import { beside, isPaint } from "./painted.tsx";

const change = () => {};
// A value that never arrives: a switch given it paints.
const waitingOn = waiting.at(() => true);

// `SWITCH.state.<value>` and `SWITCH_THUMB.state.<value>` draw the switch
// off or on in every state; `selected` is the on switch alone. A disabled
// switch is a locked field's (a form's field with a `locked` reason, its
// reason under it) and a locked row's (a row's `lock`): both are the control's
// disabled form, greyed and `disabled` for assistive tech alike.
// `PAINT.kind.control` draws the on switch beside the same switch over a value
// that never arrives, each placed alone, so each is its field.
export function drawSwitch(scene: ShowcaseScene) {
	if (isPaint(scene))
		return beside(
			scene,
			<Switch checked onChange={change} label="Weekly summary" />,
			<Switch checked={waitingOn} onChange={change} label="Weekly summary" />,
		);
	const on = scene.classSet.name.endsWith(".on");
	if (scene.state === "selected" && !on) return undefined;
	const control = (
		<Switch checked={on} onChange={change} label="Weekly summary" />
	);
	// A row, as a settings row holds it, so the hit box keeps its own width.
	if (scene.state === "disabled")
		return (
			<>
				<Form
					act={SAVED}
					given={{ ...GIVEN, ...FILLED }}
					commit="field"
					values={{ notify: on }}
					fields={{
						notify: {
							label: "Weekly summary",
							locked: "Set by your organisation.",
						},
					}}
				/>
				<Section
					title="Retro"
					items={[
						{
							key: "retro",
							label: "Retro",
							facts: ["Runs when you start it"],
							switch: { checked: on, onChange: change },
							lock: "Retro's model is not picked yet.",
						},
					]}
				/>
			</>
		);
	return <div className="flex">{control}</div>;
}
