import { Form } from "@fcalell/plugin-react-ui/components/form";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import type { Option } from "@fcalell/ui-core/descriptors";
import { useState } from "react";
import { ago } from "../ago.ts";
import { isFirstClassSet, type ShowcaseScene } from "../class-sets.ts";
import { endedAt, itemsAt, waiting } from "../waiting.ts";
import { GIVEN_ALL, SAVED } from "./form.tsx";
import { Judged } from "./judged.tsx";
import { press, Stage } from "./overlay-stage.tsx";
import { beside } from "./painted.tsx";
import { drawList, FailedLists } from "./picker-list.tsx";
import { drawSegments } from "./picker-segments.tsx";
import { act } from "./section-rows.ts";

const ROLES = [
	{
		value: "owner",
		label: "Owner",
		line: "Everything, billing included",
	},
	{
		value: "admin",
		label: "Admin",
		line: "Manages members and settings",
	},
	{
		value: "member",
		label: "Member",
		line: "Creates and edits projects",
	},
	{ value: "viewer", label: "Viewer", line: "Reads and comments" },
] as const;
type Role = (typeof ROLES)[number]["value"];
const OWNERS = [
	{ value: null, label: "Anyone", line: "Every owner, no filter" },
	{ value: "ana", label: "Ana Ruiz", line: "ana@acme.app" },
	{ value: "ben", label: "Ben Kaya", line: "ben@acme.app" },
	{ value: "chen", label: "Chen Wu", line: "chen@acme.app" },
	{
		value: "dana",
		label: "Dana Moss",
		line: "dana@acme.app",
		blocked: "On leave until June",
	},
	{ value: "ema", label: "Ema Okafor", line: "ema@acme.app" },
	{ value: "felix", label: "Felix Varga", line: "felix@acme.app" },
];
// Options carrying their kind as a chip after the label.
const CONTEXTS = [
	{ value: "production", label: "Production" },
	{
		value: "billing",
		label: "Billing limits",
		chip: { family: "amber", label: "Draft" },
	},
	{
		value: "onboarding",
		label: "Onboarding copy",
		chip: { family: "green", label: "Ready" },
	},
] satisfies Option[];
const MEMBERS = [
	{ name: "Ben Kaya", email: "ben@acme.app", role: "admin" },
	{ name: "Chen Wu", email: "Invited 2 days ago", role: "member" },
	{ name: "Ema Okafor", email: "ema@acme.app", role: "member" },
] as const;

// A member's role as a row's trailing pick.
function Members() {
	return (
		<Section
			items={MEMBERS.map((member) => ({
				key: member.name,
				leading: { avatar: { name: member.name } },
				title: member.name,
				facts: [member.email],
				pick: {
					label: `${member.name}'s role`,
					options: [...ROLES],
					value: member.role,
					onChange: act,
				},
			}))}
		/>
	);
}

// A switch that moves as a status: a row's pick whose options carry states
// is the compact state pill, its chevron inside at its end, as a record
// head's status pick is; beside them a row whose pick carries no state keeps
// its value and chevron in the word act. The names are long enough to need
// their room beside the age and the pick at 320.
const POWER = [
	{ value: "on", label: "On", leading: { tone: "done" } },
	{ value: "off", label: "Off", leading: { tone: "idle" } },
] satisfies Option[];
const MODES = [
	{ value: "eco", label: "Eco" },
	{ value: "comfort", label: "Comfort" },
] satisfies Option[];

function Rooms() {
	return (
		<Section
			items={[
				{
					key: "bathroom",
					leading: { icon: "Lightbulb" },
					title: "Bathroom light",
					trailing: { age: ago(4) },
					pick: {
						label: "Bathroom light",
						options: POWER,
						value: "on",
						onChange: act,
					},
				},
				{
					key: "hall",
					leading: { icon: "Lightbulb" },
					title: "Hall light",
					trailing: { age: ago(95) },
					pick: {
						label: "Hall light",
						options: POWER,
						value: "off",
						onChange: act,
					},
				},
				{
					key: "heating",
					leading: { icon: "Thermometer" },
					title: "Invoice reminder schedule",
					trailing: { age: ago(30) },
					pick: {
						label: "Invoice reminder schedule",
						options: MODES,
						value: "comfort",
						onChange: act,
					},
				},
			]}
		/>
	);
}

function Triggers() {
	return (
		<div className="flex flex-wrap items-start gap-section">
			<Picker label="Role" options={[...ROLES]} value="admin" onChange={act} />
			<Picker label="Owner" options={OWNERS} value={null} onChange={act} />
			<Picker label="Reviewer" options={OWNERS.slice(1)} onChange={act} />
			<Picker label="Role" options={[...ROLES]} onChange={act} fit="row" />
			<Picker
				label="Context"
				options={CONTEXTS}
				value="billing"
				onChange={act}
			/>
			<Picker
				label="Context"
				options={CONTEXTS}
				value="billing"
				onChange={act}
				fit="row"
			/>
		</div>
	);
}

// The chips of a pick of several are pills inset in their box; the scenes that hold one judge every chip run: docs/architecture/ui-core/components.md, "Picker".
// The scenes' class sets mount as they are read, so the judge waits well past the first paint.
const SETTLE = 90;
// The least room a chip keeps from its box's edge, in px: the run's badge
// inset and the box's hairline, less a pixel's rounding.
const MIN_INSET = 4;
function chipFaults(host: Element): string[] {
	const faults: string[] = [];
	for (const run of host.querySelectorAll<HTMLElement>('[class~="py-badge"]')) {
		const box = run.parentElement?.getBoundingClientRect();
		if (!box) continue;
		for (const chip of run.children) {
			const r = chip.getBoundingClientRect();
			if (r.height === 0) continue;
			const label = chip.textContent?.trim() || "a chip";
			if (box.height - r.height < 4)
				faults.push(
					`the chip ${label} stands ${Math.round(r.height)} px tall in a ${Math.round(box.height)} px box, with no room above and below it`,
				);
			// A run that wraps stands its chips on lines, so a chip is judged
			// by the room it keeps from the box's edges, never by its centre.
			const above = r.top - box.top;
			const below = box.bottom - r.bottom;
			if (above < MIN_INSET || below < MIN_INSET)
				faults.push(
					`the chip ${label} stands ${Math.round(above)} px from the top of its box and ${Math.round(below)} px from the bottom`,
				);
		}
	}
	return faults;
}
function judgeChips(host: HTMLElement) {
	for (const fault of chipFaults(host)) console.error(`Picker: ${fault}`);
}

// The bar fit fills its column: a pick, and a pick of several holding its
// values as chips (two, none, then a blocked option in the value).
function Bars() {
	const [roles, setRoles] = useState<Role[]>(["admin", "member"]);
	const [reviewers, setReviewers] = useState<(string | null)[]>([]);
	// Dana is blocked and chosen: her chip removes, and her row draws as any
	// chosen one.
	const [approvers, setApprovers] = useState<(string | null)[]>(["dana"]);
	return (
		<Judged settle={SETTLE} judge={judgeChips} className="min-w-0">
			<div className="flex w-popover max-w-full flex-col gap-gap">
				<Picker
					label="Role"
					options={[...ROLES]}
					value="admin"
					onChange={act}
				/>
				<Picker
					label="Roles"
					options={[...ROLES]}
					value={roles}
					onChange={setRoles}
				/>
				<Picker
					label="Reviewers"
					options={OWNERS.slice(1)}
					value={reviewers}
					onChange={setReviewers}
				/>
				<Picker
					label="Approvers"
					options={OWNERS.slice(1)}
					value={approvers}
					onChange={setApprovers}
				/>
			</div>
		</Judged>
	);
}

// A pick placed alone, so it is its field: the label over the box at the
// form's field height, the placeholder in its ink while nothing is chosen (a
// pick of several given none reads None, as an empty list does), the field's
// error state on the box; a pick of one, then of several, each chosen and not.
function Fielded(props: { invalid?: boolean; only?: boolean }) {
	const { invalid, only } = props;
	const [roles, setRoles] = useState<Role[]>(["admin", "member"]);
	const [blocked, setBlocked] = useState<Role[]>([]);
	const [helpers, setHelpers] = useState<Role[]>([]);
	const error = invalid ? "Pick a role." : undefined;
	return (
		<Judged settle={SETTLE} judge={judgeChips} className="min-w-0">
			<div className="flex w-popover max-w-full flex-col gap-stack">
				<Picker
					label="Default role"
					description="Given to anyone who joins."
					error={error}
					value="admin"
					onChange={act}
					options={[...ROLES]}
					placeholder="Choose a role"
				/>
				{only ? null : (
					<>
						<Picker
							label="Fallback role"
							error={error}
							onChange={act}
							options={[...ROLES]}
							placeholder="Choose a role"
						/>
						<Picker
							label="Allowed roles"
							error={error}
							value={roles}
							onChange={setRoles}
							options={[...ROLES]}
							placeholder="Choose roles"
						/>
						<Picker
							label="Blocked roles"
							error={error}
							value={blocked}
							onChange={setBlocked}
							options={[...ROLES]}
							placeholder="Choose roles"
						/>
						<Picker
							label="Helpers"
							description="Each runs with the read tools alone."
							error={error}
							value={helpers}
							onChange={setHelpers}
							options={[...ROLES]}
						/>
					</>
				)}
			</div>
		</Judged>
	);
}

// The same picks as a form's fields, each locked: disabled, its reason in the
// description's place; a pick of one chosen, one with nothing chosen, and one
// of several chosen.
function Locked() {
	const locked = "Set by your organisation.";
	return (
		<Judged settle={SETTLE} judge={judgeChips} className="min-w-0">
			<div className="flex w-popover max-w-full flex-col">
				<Form
					act={SAVED}
					given={GIVEN_ALL}
					commit="field"
					values={{ owner: "admin", channels: ["email", "slack"] }}
					fields={{
						owner: { label: "Default role", options: ROLES, locked },
						priority: { label: "Priority", locked },
						channels: { label: "Channels", locked },
					}}
				/>
			</div>
		</Judged>
	);
}

// The trigger opens from the pointer: a popover's on its press down, a
// sheet's on its click.
function openFirst(stage: HTMLElement) {
	const trigger = stage.querySelector("button");
	for (const type of ["pointerdown", "mousedown"])
		trigger?.dispatchEvent(
			new PointerEvent(type, {
				bubbles: true,
				pointerType: "mouse",
				button: 0,
			}),
		);
	press(trigger);
}

// The class sets only the list fit draws, and those only the segments fit does; every
// other class set is the menu's.
const LIST_CLASS_SETS = [
	"BLOCK_IN",
	"OPTION_LIST",
	"OPTION_GROUP_LABEL",
	"TEXT_STRONG",
	"OPTION_LINE",
	"LINE_BOX",
	"CHECKBOX",
	"OPTION_RADIO",
	"ROW_TITLE_LINE",
	"ROW_META_LINE",
	"OPTION_CHILDREN",
	"OPTION_INDENT",
	"PAINT.kind.glyphs",
	"SCRAMBLE",
	"FLOW_IN",
];
const SEGMENT_CLASS_SETS = ["SEGMENT"];
const drawn = (classSet: string, prefixes: readonly string[]) =>
	prefixes.some((prefix) => classSet.startsWith(prefix));

// The menu fit: the row fit's class sets draw the members' picks and the rooms'
// (two picks of states, one of none); the open state draws the
// role pick's list (four options, no search) on the row fit class sets and the
// owner filter's (seven two-line options, the search leading and an act after
// them, which stands the touch sheet full height) on the field class sets; every other
// class set the field-fit triggers (two of them an option's chip after its label),
// with a value, with the empty choice and with
// none (its label in the placeholder's ink, a row fit's too).
//
// `PAINT.kind.control` draws the field-fit trigger beside the same trigger over
// a value that never arrives, then the list's and the segments'. The list fit
// and the segments fit draw the class sets they own (`drawList`, `drawSegments`);
// loading, the menu's options wait and its trigger paints. The open state
// stands in a Gate, whose portal the popup mounts in.
export function drawPicker(scene: ShowcaseScene) {
	const classSet = scene.classSet.name;
	if (classSet === "PAINT.kind.control")
		return beside(
			scene,
			// The column stretches its rows to its own width, so a list's
			// `max-w-full` holds it to the scene at 320 rather than to its content.
			<div className="flex flex-col min-w-0 gap-section">
				<div className="flex flex-wrap items-center gap-section">
					<Picker
						label="Role"
						options={[...ROLES]}
						value="admin"
						onChange={act}
					/>
					<Picker
						label="Role"
						options={[...ROLES]}
						value={waiting.at((): Role => "admin")}
						onChange={act}
					/>
				</div>
				{drawList(scene)}
				{drawSegments(scene)}
			</div>,
			null,
		);
	if (drawn(classSet, LIST_CLASS_SETS)) return drawList(scene);
	if (drawn(classSet, SEGMENT_CLASS_SETS)) return drawSegments(scene);
	if (scene.state === "loading")
		return (
			<Picker
				label="Role"
				options={itemsAt(scene.id, "loading", [...ROLES])}
				value="admin"
				onChange={act}
			/>
		);
	// The error state, on the first class set, adds the picker over options that fail
	// and answer not found, which no frame holds, so it says so itself.
	if (scene.state === "error")
		return (
			<div className="flex w-popover max-w-full flex-col gap-section">
				<Fielded invalid />
				{isFirstClassSet(scene)
					? endedAt<Option>(scene.id, "error").map(({ title, items }) => (
							<Picker
								key={title}
								label={title}
								options={items}
								value="admin"
								onChange={act}
							/>
						))
					: null}
				{isFirstClassSet(scene) ? <FailedLists id={scene.id} /> : null}
			</div>
		);
	const row =
		classSet.startsWith("PICKER.fit.row") ||
		classSet === "WORD_ACT" ||
		classSet === "PICKER_VALUE" ||
		classSet.startsWith("ICON.fit.meta") ||
		classSet.startsWith("ROW.");
	const bar = classSet.startsWith("PICKER.fit.bar");
	// The field's class sets draw the picks placed alone, and the disabled state of
	// the rest the same picks locked in a form.
	const fielded =
		classSet === "FIELD.state.error" ||
		(scene.state === "disabled" && !row && !bar);
	if (scene.state === "selected")
		return (
			<Stage contain={scene.density === "touch"} ready={openFirst}>
				<Gate title="Members">{opened(row, bar, fielded)}</Gate>
			</Stage>
		);
	if (fielded) return scene.state === "disabled" ? <Locked /> : <Fielded />;
	if (row)
		return (
			<div className="flex flex-col gap-section">
				<Members />
				<Rooms />
			</div>
		);
	return bar ? <Bars /> : <Triggers />;
}

// What the open state draws: the members' row picks, the bar fit's picks, a
// field's pick, or the owner filter.
function opened(row: boolean, bar: boolean, fielded: boolean) {
	if (row) return <Members />;
	if (bar) return <Bars />;
	if (fielded) return <Fielded only />;
	return (
		<Picker
			label="Owner"
			options={OWNERS}
			value={null}
			onChange={act}
			act={{ icon: "Plus", label: "Add an owner", onAct: act }}
		/>
	);
}
