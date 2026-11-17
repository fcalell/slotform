import { Form } from "@fcalell/plugin-react-ui/components/form";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { useEffect, useRef } from "react";
import { isFirstClassSet, type ShowcaseScene } from "../class-sets.ts";
import { endedAt, waitingText } from "../waiting.ts";
import { FILLED, GIVEN, refusing, SAVED, Submitted } from "./form.tsx";
import { Wide } from "./layout-context.tsx";
import { isPaint } from "./painted.tsx";

const change = () => {};
const REGIONS = [
	{ value: "eu-central-1", label: "Frankfurt, eu-central-1" },
	{ value: "us-east-1", label: "N. Virginia, us-east-1" },
];
// The required keys the fields below do not show.
const UNSHOWN = { ...GIVEN, kind: FILLED.kind, seats: FILLED.seats };
// The server refuses the URL and the region, each under its field.
const REFUSED = refusing([
	{ path: ["title"], message: "Use lowercase letters, digits and dashes." },
	{ path: ["owner"], message: "Pick where new databases are created." },
]);
const LOCKED = "Set by your organisation's SSO.";

// A field whose options read failed: its label in the label column, the sentence and
// Retry in the value column on one line, level with each other. It judges its own
// edge: the sentence and Retry share a centre, and the label's start is the column's.
function Unread(props: { id: string }) {
	const host = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const timer = setTimeout(() => {
			const field = host.current;
			if (!field) return;
			const centres = [
				...field.querySelectorAll<HTMLElement>("button, p, span, div"),
			]
				.filter(
					(part) =>
						part.children.length === 0 &&
						part.textContent &&
						/didn.t load|Retry/.test(part.textContent),
				)
				.map((part) => {
					const box = part.getBoundingClientRect();
					return box.top + box.height / 2;
				});
			if (centres.length > 1 && Math.max(...centres) - Math.min(...centres) > 1)
				console.error(
					"FormField: the failed read's sentence and Retry differ in centre",
				);
		}, 300);
		return () => clearTimeout(timer);
	}, []);
	const [failed] = endedAt<{ value: string; label: string }>(props.id, "error");
	return (
		<div ref={host} className="contents">
			<Form
				act={SAVED}
				given={{ ...UNSHOWN, title: FILLED.title, urgent: FILLED.urgent }}
				commit="field"
				fields={{
					owner: { label: "Default region", options: failed?.items ?? REGIONS },
				}}
			/>
		</div>
	);
}

// Board 41's fields as a form's rows: a typed field, a pick and a switch, each
// described; in error the server's messages take the descriptions' places (the
// submit pressed once mounted), and disabled each field is locked, its reason
// in the description's place. `PAINT.kind.control` draws a field beside the
// same field over a value that never arrives, each placed alone: the label and
// the description stand, the control paints.
export function drawFormField(scene: ShowcaseScene) {
	if (isPaint(scene))
		return scene.state === "rest" ? (
			<Wide>
				<Input
					label="Workspace URL"
					description="Changing it breaks links."
					value="acme-inc"
					onChange={change}
				/>
				<Input
					label="Workspace URL"
					description="Changing it breaks links."
					value={waitingText}
					onChange={change}
				/>
			</Wide>
		) : undefined;
	const { state } = scene;
	const locked = state === "disabled" ? LOCKED : undefined;
	const error = state === "error";
	const form = (
		<Form
			act={error ? REFUSED : SAVED}
			given={UNSHOWN}
			values={{
				title: error ? "acme inc" : "acme-inc",
				owner: error ? undefined : "eu-central-1",
				urgent: true,
			}}
			fields={{
				title: {
					label: "Workspace URL",
					description: "Changing it breaks shared links.",
					locked,
				},
				owner: {
					label: "Default region",
					description: "Where new databases are created.",
					options: REGIONS,
					locked,
				},
				urgent: {
					label: "Require two-factor",
					description: "Every member confirms a code at sign-in.",
					locked,
				},
			}}
		/>
	);
	return (
		<Wide>
			{error ? <Submitted>{form}</Submitted> : form}
			{error && isFirstClassSet(scene) ? <Unread id={scene.id} /> : null}
		</Wide>
	);
}
