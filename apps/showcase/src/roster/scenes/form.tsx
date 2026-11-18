import {
	Form as Derived,
	type FormProps,
} from "@fcalell/plugin-react-ui/components/form";
import { Text } from "@fcalell/plugin-react-ui/components/text";
import type { Can, FormFields } from "@fcalell/ui-core/form";
import type { Selection } from "@fcalell/ui-core/read";
import type { ShowcaseScene } from "../class-sets.ts";
import { isHeld, readsAt, ready, waiting } from "../waiting.ts";
import {
	FILLED,
	GIVEN,
	GIVEN_ALL,
	GIVEN_BUT_KIND,
	KIND,
	NEVER,
	type Request,
	refusing,
	SAVED,
	Submitted,
} from "./form-fixtures.tsx";
import { Judged } from "./judged.tsx";
import { isPaint } from "./painted.tsx";

// The server refuses the directory, quoting its path between backticks.
const REFUSED = refusing([
	{
		path: ["directory"],
		message: "no project stands under `/srv/acme/billing-digest`",
	},
]);

const OWNERS = [
	{ value: "ana", label: "Ana Ruiz" },
	{ value: "ben", label: "Ben Kaya" },
];

const TITLE = { label: "What should change?" };
const WHY = {
	label: "Why?",
	description: "What this is for, in a few words.",
	control: "prose",
} as const;
const PRIORITY = { label: "Priority" };
const SEATS = { label: "Seats" };
const BUDGET = { label: "Budget", description: "In euros." };
const DUE = { label: "By when?", description: "As YYYY-MM-DD." };
const URGENT = { label: "Urgent", description: "A fix that may pass a lock." };
const NOTIFY = { label: "Tell the requester" };
const CHANNELS = { label: "Channels" };
const OWNER = { label: "Owner", options: OWNERS };
// A machine name a person types: one line in the mono.
const DIRECTORY = {
	label: "Project directory",
	description: "The directory's path on this machine.",
	control: "mono",
} as const;

const ALL: FormFields<Request> = {
	title: TITLE,
	why: WHY,
	kind: KIND,
	priority: PRIORITY,
	seats: SEATS,
	budget: BUDGET,
	due: DUE,
	urgent: URGENT,
	notify: NOTIFY,
	channels: CHANNELS,
	owner: OWNER,
	directory: DIRECTORY,
};

// The required keys the two forms below give, every one but the title, which
// they show.
const UNSHOWN = {
	...GIVEN,
	kind: FILLED.kind,
	seats: FILLED.seats,
	urgent: FILLED.urgent,
};

// A form of two fields and its bar over a read, in whichever form the read
// puts it: waiting (the fields' leaves paint, the filled act with them),
// failed, missing, empty or landed. Its submit never settles.
function Over(props: { read: Selection<unknown>; empty?: FormProps["empty"] }) {
	return (
		<Derived
			act={NEVER}
			given={UNSHOWN}
			values={{ title: "acme-web", owner: "Frankfurt, eu-central-1" }}
			read={props.read}
			empty={props.empty}
			fields={{ title: { label: "Project name" }, owner: { label: "Region" } }}
			submit={{ label: "Save" }}
		/>
	);
}

// A form of two groups over a read, which commits by field, so it draws no
// bar: the read is the whole form's, its wait or failure standing in both
// groups' place.
function Grouped(props: { read: Selection<unknown> }) {
	return (
		<Derived
			act={NEVER}
			given={UNSHOWN}
			commit="field"
			values={{ title: "Acme Inc", owner: "Frankfurt, eu-central-1" }}
			read={props.read}
			groups={[
				{ title: "General", fields: { title: { label: "Workspace name" } } },
				{ title: "Region", fields: { owner: { label: "Region" } } },
			]}
		/>
	);
}

// A form's controls show their placeholder or value whole: docs/architecture/ui-core/layout.md, "Definition rows".
// The scene logs an error where one is cut or a toggle falls under its name or off its name's line (a description beneath).
const SETTLE = 60;
// The form stands in a Pane's container, as in an app, so its rows stack where
// the Pane is too narrow for a label and a value side by side.
const IN_PAGE = "@container/page w-sheet max-w-full min-w-0";
function judgeControls(host: HTMLElement) {
	const controls = host.querySelectorAll<HTMLElement>(
		"input:not([aria-hidden=true]), textarea, [role=combobox], [role=combobox] *",
	);
	for (const control of controls) {
		const shown =
			control instanceof HTMLInputElement ||
			control instanceof HTMLTextAreaElement
				? control.value || control.placeholder
				: control.textContent?.trim();
		if (
			shown &&
			control.clientWidth > 0 &&
			control.scrollWidth > control.clientWidth
		)
			console.error(`Form: a control cuts "${shown}"`);
	}
	for (const toggle of host.querySelectorAll<HTMLElement>(
		"[role=switch], [role=checkbox]",
	)) {
		// The field is the nearest box around the toggle holding its name.
		let field = toggle.parentElement;
		while (field && !field.querySelector("label")) field = field.parentElement;
		const name = field?.querySelector<HTMLElement>("label");
		if (!name || toggle.clientWidth === 0) continue;
		const own = name.getBoundingClientRect();
		const box = toggle.getBoundingClientRect();
		if (box.top >= own.bottom)
			console.error(
				`Form: the toggle of "${name.textContent?.trim()}" falls under its name`,
			);
		// With a description under both, the toggle stands beside its name, never
		// level with the description under it.
		else {
			const centre = box.top + box.height / 2;
			if (centre < own.top || centre > own.bottom)
				console.error(
					`Form: the toggle of "${name.textContent?.trim()}" is off its name's line`,
				);
		}
	}
}

function Flat(props: {
	act?: typeof SAVED;
	values?: Partial<Request>;
	can?: Can;
}) {
	return (
		<Derived
			act={props.act ?? SAVED}
			given={GIVEN}
			values={props.values}
			can={props.can}
			fields={ALL}
			submit={{ label: "Send request" }}
		/>
	);
}

function Grouped3() {
	return (
		<Derived
			act={SAVED}
			given={GIVEN}
			groups={[
				{
					title: "The request",
					description: "What it asks for.",
					fields: { title: TITLE, why: WHY, kind: KIND, owner: OWNER },
				},
				{
					title: "Limits",
					description: "How much and by when.",
					fields: { seats: SEATS, budget: BUDGET, due: DUE },
				},
				{
					title: "Notifications",
					description: "Who hears about it.",
					fields: { urgent: URGENT, notify: NOTIFY, channels: CHANNELS },
				},
			]}
		/>
	);
}

// Picks empty and filled: a required pick shows its placeholder, an optional
// pick and an optional pick of several their empty word ("None"), and a field's
// own `empty` replaces it ("Every visit").
const PICKS: FormFields<Request> = {
	kind: KIND,
	priority: PRIORITY,
	channels: CHANNELS,
	owner: { ...OWNER, empty: "Every visit" },
};
// A pick whose schema defaults (`.default("compact")`) always holds a value: no
// "Optional" under its label and no empty choice, beside a truly optional pick
// that keeps both.
function Defaulted() {
	return (
		<Derived
			act={SAVED}
			given={GIVEN_BUT_KIND}
			fields={{ kind: KIND, density: { label: "Density" }, priority: PRIORITY }}
		/>
	);
}
// Labels that are sentences, the way a long field is worded: the label column
// stops at one short measure and wraps them at their words, so the pick beside
// them keeps its value whole (`judgeControls` logs one that is cut).
const LONG: FormFields<Request> = {
	seats: SEATS,
	urgent: URGENT,
	title: {
		label:
			"Which of the available destinations should this entry be sent to once it is approved",
	},
	kind: {
		...KIND,
		label: "Which kind of request is this, as the person asking sees it",
	},
	owner: {
		...OWNER,
		label: "Who on the team is responsible for it from day to day",
	},
};
function LongLabels() {
	return (
		<Derived
			act={SAVED}
			given={GIVEN}
			values={{ ...FILLED, kind: "measurement", owner: "ana" }}
			fields={LONG}
			submit={{ label: "Send request" }}
		/>
	);
}
function Optional() {
	return (
		<div className="flex flex-col gap-section">
			<Derived act={SAVED} given={GIVEN_BUT_KIND} fields={PICKS} />
			<Derived
				act={SAVED}
				given={GIVEN_BUT_KIND}
				values={{
					kind: "change",
					priority: "high",
					channels: ["email", "slack"],
					owner: "ana",
				}}
				fields={PICKS}
			/>
			<Derived
				act={SAVED}
				given={GIVEN_ALL}
				commit="field"
				fields={{ owner: OWNER, priority: PRIORITY }}
			/>
			<Derived
				act={SAVED}
				given={GIVEN_ALL}
				commit="field"
				fields={{ owner: { ...OWNER, empty: "Not chosen" } }}
			/>
			<Derived
				act={SAVED}
				given={GIVEN_ALL}
				commit="field"
				values={ready.at((): Partial<Request> => ({ owner: undefined }))}
				fields={{ owner: OWNER, priority: PRIORITY }}
			/>
			<Derived
				act={SAVED}
				given={GIVEN_ALL}
				commit="field"
				values={ready.at((): Partial<Request> => ({ owner: undefined }))}
				fields={{ owner: { ...OWNER, empty: "Not chosen" } }}
			/>
		</div>
	);
}

// A path the server refused, the submit pressed once mounted: the mono line
// holds the path as the issue under it quotes it.
function Refused() {
	return (
		<Submitted>
			<Derived
				act={REFUSED}
				given={{ ...GIVEN, kind: FILLED.kind, urgent: FILLED.urgent }}
				values={{
					title: FILLED.title,
					seats: FILLED.seats,
					directory: "/srv/acme/billing-digest",
				}}
				fields={{ title: TITLE, seats: SEATS, directory: DIRECTORY }}
				submit={{ label: "Send request" }}
			/>
		</Submitted>
	);
}

// A form over a record that never arrives: the controls paint.
function Painted() {
	return (
		<Derived
			act={SAVED}
			given={GIVEN}
			values={waiting.at((): Partial<Request> => ({}))}
			fields={{ title: TITLE, kind: KIND, seats: SEATS, urgent: URGENT }}
		/>
	);
}

// The `TEXT.role.meta` class set (a field's description) draws a form of every
// derived control, the `TEXT.role.heading` class set (a group's title) a form of
// three groups, and `PAINT.kind.control` a form over a record that never
// arrives. At rest the form is filled in by hand; pending it has pressed its
// submit act into one that never settles; disabled the caller cannot submit;
// in error the `TEXT.role.meta` class set draws a mono path the server refused over
// the forms whose read failed.
// Loading, a form over a read and one of groups over a read wait beside it,
// painted. Busy, stale and paused draw both over a read that holds rows, the
// read's line at the form's top.
export function drawForm(scene: ShowcaseScene) {
	if (isPaint(scene)) return scene.state === "rest" ? <Painted /> : undefined;
	const create = scene.classSet.name === "TEXT.role.meta";
	const settings = scene.classSet.name === "TEXT.role.heading";
	const loading = scene.state === "loading";
	const reads = readsAt(scene.id);
	const other = readsAt(`${scene.id}/2`);
	if (isHeld(scene.state))
		return (
			<div className="flex flex-col gap-section">
				<Over read={reads[scene.state]} />
				<Grouped read={readsAt(`${scene.id}/3`)[scene.state]} />
			</div>
		);
	if (scene.state === "error")
		return (
			<div className="flex flex-col gap-section">
				{create ? <Refused /> : null}
				<Over read={reads.failing} />
				<Over read={reads.missing} />
				<Grouped read={readsAt(`${scene.id}/3`).failing} />
			</div>
		);
	if (scene.state === "empty")
		return (
			<div className="flex flex-col gap-section">
				<Over
					read={reads.empty}
					empty={{ sentence: "There are no settings to change." }}
				/>
				<Over read={other.empty} />
				<Grouped read={reads.empty.at((rows) => rows)} />
			</div>
		);
	if (scene.state === "pending")
		return create ? (
			<Submitted>
				<Flat act={NEVER} values={FILLED} />
			</Submitted>
		) : undefined;
	if (scene.state === "disabled")
		return create ? (
			<Flat values={FILLED} can={["send", "request"]} />
		) : undefined;
	const drawn = create ? (
		<Judged settle={SETTLE} judge={judgeControls} className={IN_PAGE}>
			<div className="flex flex-col gap-stack">
				<Text>
					A request is one procedure and its field labels. The form below stands
					as wide as this paragraph, the page's column.
				</Text>
				<Flat />
				<Optional />
				<Defaulted />
				<LongLabels />
			</div>
		</Judged>
	) : settings ? (
		<Judged settle={SETTLE} judge={judgeControls} className={IN_PAGE}>
			<Grouped3 />
		</Judged>
	) : undefined;
	if (drawn === undefined) return undefined;
	if (loading)
		return (
			<div className="flex flex-col gap-section">
				{drawn}
				<Over read={reads.waiting} />
				<Grouped read={other.waiting} />
			</div>
		);
	return (
		<div className="flex flex-col gap-section">
			{drawn}
			<Over read={reads.ready.at((rows) => rows)} />
		</div>
	);
}
