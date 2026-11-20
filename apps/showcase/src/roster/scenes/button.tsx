import {
	Button,
	type ButtonAttemptProps,
} from "@slotform/react-ui/components/button";
import { Form } from "@slotform/react-ui/components/form";
import { Section } from "@slotform/react-ui/components/section";
import { Text } from "@slotform/react-ui/components/text";
import { createLeave } from "@slotform/ui-core/leave";
import { TouchedContext } from "@slotform/ui-core/react/touched";
import type { ButtonAct, ButtonFit } from "@slotform/ui-core/variants";
import type { ShowcaseScene } from "../class-sets.ts";
import { waiting } from "../waiting.ts";
import { FILLED, GIVEN, SAVED } from "./form-fixtures.tsx";
import { STAND_INS, Wide } from "./layout-context.tsx";
import { beside, isPaint } from "./painted.tsx";
import { hang, Pressed } from "./pending.tsx";
import { act } from "./section-rows.ts";

const LABEL: Record<ButtonAct, string> = {
	primary: "Save",
	danger: "Delete",
	secondary: "Cancel",
	quiet: "Resend",
	destructive: "Delete",
};
const REASON = "Name the project first.";
// A touched form, so a blocked act shows its reason.
const TOUCHED = { touched: true, touch: act, leave: createLeave() };
// The count class set: a secondary act in a bar with its count after the label.
const COUNTED: ButtonAttemptProps = {
	act: "secondary",
	icon: "ListFilter",
	label: "Filter",
	count: 2,
};

// `ICON_BUTTON.fit.<fit>` draws the icon form at that fit and `LINK.fit.<fit>`
// the link form, inside a line of text or on its own, both at rest (the icon
// form also pending). `BUTTON.act.<act>` draws that act at the body fit, `BUTTON.fit.<fit>` the
// primary act at that fit, `ICON.fit.control` the primary act with its
// glyph; `BUTTON.fit.body` adds the counted act beside it (the `COUNT_LABEL` class set);
// `pending` presses them into an act that never settles. `disabled` draws the blocked act twice, as the
// board's two columns: before it is pressed, then in a touched form with its
// reason shown. The `BUTTON_LABEL` class sets are drawn inside every button.
// `PAINT.kind.control` draws the filled act and the icon form beside the hosts
// that paint them while their read waits, the box kept and the label and glyph
// not drawn: a form's filled act, and a Section's act and more.
export function drawButton(scene: ShowcaseScene) {
	if (isPaint(scene)) {
		const own = {
			icon: "Plus",
			label: "New project",
			count: 2,
		} as const;
		return beside(
			scene,
			<>
				<Button {...own} onAct={act} />
				<Button glyph icon="Ellipsis" label="More" onAct={act} />
			</>,
			<Wide>
				<Form
					act={SAVED}
					given={{ ...GIVEN, ...FILLED }}
					read={waiting}
					fields={{ owner: { label: "Project name" } }}
					submit={{ label: own.label }}
				/>
				<Section
					title="Projects"
					act={waiting.at(() => ({
						icon: own.icon,
						label: own.label,
						onAct: act,
					}))}
					more={waiting.at(() => [{ label: "Export as CSV", onAct: act }])}
					items={STAND_INS}
				/>
			</Wide>,
		);
	}
	// The class set's name is `<matrix group>.<axis>.<value>` over the matrix's own axis values, so an `act` value is a `ButtonAct` and a `fit` value a `ButtonFit`.
	const [group, axis, value] = scene.classSet.name.split(".");
	if (group === "LINK")
		return scene.state === "rest" ? drawLink(value === "inline") : undefined;
	if (group === "ICON_BUTTON")
		return drawGlyph(scene.state, value as ButtonFit);
	const glyph = group === "ICON";
	if (group !== "BUTTON" && !glyph) return undefined;
	const kind = axis === "act" ? (value as ButtonAct) : "primary";
	const fit = !glyph && axis === "fit" ? (value as ButtonFit) : "body";
	const own: ButtonAttemptProps = {
		act: kind,
		fit,
		icon: glyph ? "Plus" : undefined,
		label: glyph ? "New project" : LABEL[kind],
	};
	const acts =
		!glyph && axis === "fit" && fit === "body" ? [own, COUNTED] : [own];
	if (scene.state === "pending")
		return (
			<Pressed>
				{acts.map((props) => (
					<Button key={props.label} {...props} onAct={hang} />
				))}
			</Pressed>
		);
	if (scene.state !== "disabled")
		return (
			<>
				{acts.map((props) => (
					<Button key={props.label} {...props} onAct={act} />
				))}
			</>
		);
	return (
		<>
			{acts.map((props) => (
				<Button key={props.label} {...props} blocked={REASON} />
			))}
			<TouchedContext value={TOUCHED}>
				{acts.map((props) => (
					<Button key={props.label} {...props} blocked={REASON} />
				))}
			</TouchedContext>
		</>
	);
}

function drawLink(inline: boolean) {
	if (inline)
		return (
			<Text kind="body">
				Read the <Button href="#" fit="inline" label="deploy guide" /> first.
			</Text>
		);
	return <Button href="#" label="All deployments" />;
}

function drawGlyph(state: ShowcaseScene["state"], fit: ButtonFit) {
	if (state !== "rest" && state !== "pending") return undefined;
	const pending = state === "pending";
	const drawn = (
		<Button
			glyph
			icon="Ellipsis"
			fit={fit}
			label="More"
			onAct={pending ? hang : act}
		/>
	);
	return pending ? <Pressed>{drawn}</Pressed> : drawn;
}
