import { Form } from "@slotform/react-ui/components/form";
import { Input } from "@slotform/react-ui/components/input";
import { useWords } from "@slotform/ui-core/react/words";
import { useEffect, useRef } from "react";
import { isFirstClassSet, type ShowcaseScene } from "../class-sets.ts";
import { endedAt, waitingText } from "../waiting.ts";
import {
	FILLED,
	GIVEN,
	GIVEN_ALL,
	GIVEN_BUT_KIND,
	KIND,
	refusing,
	SAVED,
	Submitted,
} from "./form-fixtures.tsx";
import { Wide } from "./layout-context.tsx";
import { isPaint } from "./painted.tsx";
import { act } from "./section-rows.ts";

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
	const words = useWords();
	useEffect(() => {
		const said = [words.readFailed, words.retry];
		const timer = setTimeout(() => {
			const field = host.current;
			if (!field) return;
			const centres = [
				...field.querySelectorAll<HTMLElement>("button, p, span, div"),
			]
				.filter(
					(part) =>
						part.children.length === 0 &&
						said.some((word) => part.textContent?.includes(word)),
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
	}, [words.readFailed, words.retry]);
	const [failed] = endedAt<{ value: string; label: string }>(props.id, "error");
	return (
		<div ref={host} className="contents">
			<Form
				act={SAVED}
				given={GIVEN_ALL}
				commit="field"
				fields={{
					owner: { label: "Default region", options: failed?.items ?? REGIONS },
				}}
			/>
		</div>
	);
}

// The choice hints: one choice as the option list (`list`) and as the
// segmented row (`segments`, over a pick whose schema defaults), and several
// as the option list with a checkbox per option.
function Choices() {
	return (
		<Form
			act={SAVED}
			given={GIVEN_BUT_KIND}
			values={{ kind: "measurement", channels: ["email"] }}
			fields={{
				kind: { ...KIND, control: "list" },
				density: {
					label: "Density",
					description: "How much each row shows.",
					control: "segments",
				},
				channels: {
					label: "Channels",
					description: "Where the requester hears about it.",
					control: "list",
				},
			}}
		/>
	);
}

// Sets a typed control's value as the viewer's typing does, through the
// element's own setter, so React hears the input.
function typeInto(field: HTMLInputElement | HTMLTextAreaElement, text: string) {
	const own = Object.getOwnPropertyDescriptor(
		Object.getPrototypeOf(field),
		"value",
	);
	own?.set?.call(field, text);
	field.dispatchEvent(new Event("input", { bubbles: true }));
}

// Fields edited once mounted, each against its first value: the URL changed,
// the note added where it was empty, the switch turned off (its empty), and
// another kind chosen, so each draws its change mark.
function Edited() {
	const host = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const form = host.current;
		if (!form) return;
		const line = form.querySelector("input");
		const note = form.querySelector("textarea");
		if (line) typeInto(line, "acme-labs");
		if (note) typeInto(note, "Moved to the new domain.");
		form.querySelector<HTMLElement>("[role=switch]")?.click();
		form.querySelectorAll<HTMLElement>("[role=radio]")[2]?.click();
	}, []);
	return (
		<div ref={host} className="contents">
			<Form
				act={SAVED}
				given={{ ...GIVEN, seats: FILLED.seats }}
				values={{ title: "acme-inc", urgent: true, kind: "change" }}
				fields={{
					title: { label: "Workspace URL" },
					why: { label: "Note", control: "prose" },
					urgent: { label: "Require two-factor" },
					kind: { ...KIND, control: "list" },
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
					onChange={act}
				/>
				<Input
					label="Workspace URL"
					description="Changing it breaks links."
					value={waitingText}
					onChange={act}
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
			{state === "rest" && isFirstClassSet(scene) ? (
				<>
					<Choices />
					<Edited />
				</>
			) : null}
		</Wide>
	);
}
