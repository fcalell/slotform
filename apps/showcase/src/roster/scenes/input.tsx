import { Field } from "@base-ui/react/field";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import {
	Input,
	type InputKind,
} from "@fcalell/plugin-react-ui/components/input";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Panes } from "@fcalell/plugin-react-ui/components/shell";
import { FieldOwned } from "@fcalell/ui-core/react/field";
import { text } from "@fcalell/ui-core/variants";
import {
	type ReactNode,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { isFirstClassSet, type ShowcaseScene } from "../class-sets.ts";
import { waitingText } from "../waiting.ts";
import { drawFormField } from "./form-field.tsx";
import { GIVEN_ALL, refusing, SAVED, Submitted } from "./form-fixtures.tsx";
import { beside, isPaint, labelled } from "./painted.tsx";
import { hang } from "./pending.tsx";
import { Column } from "./place.tsx";
import { act } from "./section-rows.ts";

// The kinds the scene draws a value in.
type Drawn = Extract<InputKind, "text" | "source" | "search" | "number">;

const KINDS: Partial<Record<string, Drawn>> = {
	"FIELD_VALUE.kind.text": "text",
	"FIELD_VALUE.kind.code": "source",
	"FIELD_VALUE.kind.search": "search",
	"FIELD.trailing.act": "source",
};

const VALUES: Record<Drawn, string> = {
	text: "acme-inc",
	source: "whsec_8b1f4e2a9c7d3f06",
	search: "deploy failed",
	number: "250",
};

// A command wider than a phone, in a source field with its run act: it wraps
// in the box, which grows by its lines, and is cut nowhere.
const COMMAND =
	'test -f fixed.txt || { echo "missing fixed.txt"; exit 1; } && pnpm --filter @acme/web test';

const SHORT = "Marketing site for the launch.";
const LONG = [
	"Marketing site for the launch.",
	"Owns pricing and the changelog.",
	"Deploys from main on each merge.",
	"Previews post to the web channel.",
	"Archive after the launch review.",
].join("\n");
const SOURCE = Array.from(
	{ length: 40 },
	(_, line) => `line ${line + 1} of the page's source`,
).join("\n");
// The server refuses the page's source, under its field.
const REFUSED_SOURCE = refusing([
	{ path: ["why"], message: "Not valid markdown." },
]);

const ACCEPT = ["text/csv", ".har"];
const CHOSEN = {
	name: "invoices-q3.csv",
	size: 48_200,
	type: "text/csv",
	blob: () => Promise.resolve(new Blob()),
};

// Each kind draws the class sets its own parts are in, in the states it has: a
// class set shared by two kinds (`FIELD_VALUE`, `FIELD_PLACEHOLDER`) draws each
// beside the other.
const root = (scene: ShowcaseScene) => scene.classSet.name.split(".")[0] ?? "";
const states = (scene: ShowcaseScene, ...of: ShowcaseScene["state"][]) =>
	of.includes(scene.state);

// The scene's `error` and `disabled` reach the control through Base UI's
// `Field`, as a `FormField` puts them; `FIELD.state.error` is in error in
// every state. `FIELD.trailing.act` draws the in-field copy act, and
// `FIELD.trailing.none` a number with its unit; `PAINT.kind.control` the field
// beside the same field over a value that never arrives.
function drawLine(scene: ShowcaseScene) {
	if (!states(scene, "rest", "disabled", "error")) return undefined;
	if (isPaint(scene))
		return beside(
			scene,
			labelled(<Input label="Workspace" value={VALUES.text} onChange={act} />),
			labelled(<Input label="Workspace" value={waitingText} onChange={act} />),
		);
	const name = scene.classSet.name;
	if (
		![
			"FIELD",
			"FIELD_VALUE",
			"FIELD_PLACEHOLDER",
			"FIELD_UNIT",
			"FIELD_GLYPH",
		].includes(root(scene))
	)
		return undefined;
	const unit = name === "FIELD.trailing.none";
	const kind = unit ? "number" : (KINDS[name] ?? "text");
	return (
		<FieldOwned value>
			<Field.Root
				invalid={scene.state === "error" || name === "FIELD.state.error"}
				disabled={scene.state === "disabled"}
			>
				{kind === "search" ? null : (
					<Field.Label className={text({ role: "body" })}>
						Workspace URL
					</Field.Label>
				)}
				<Input
					label="Workspace URL"
					kind={kind}
					value={VALUES[kind]}
					onChange={act}
					unit={unit ? "ms" : undefined}
					act={
						name === "FIELD.trailing.act"
							? { icon: "Copy", label: "Copy", onAct: act }
							: undefined
					}
				/>
			</Field.Root>
			{name === "FIELD.trailing.act" ? (
				<Field.Root
					invalid={scene.state === "error"}
					disabled={scene.state === "disabled"}
				>
					<Field.Label className={text({ role: "body" })}>
						Check command
					</Field.Label>
					<Input
						label="Check command"
						kind="source"
						value={COMMAND}
						onChange={act}
						act={{ icon: "Play", label: "Run now", onAct: act }}
					/>
				</Field.Root>
			) : null}
		</FieldOwned>
	);
}

// `TEXT_AREA.state.error` is in error in every state;
// `TEXT_AREA_BUDGET.state.error` is over its budget, the rest under it;
// `FIELD_VALUE.kind.code` is a `source` field of a page's `Form`, which fills
// the page's height and scrolls its long value inside: locked when disabled,
// and in error refused by the server, its submit pressed once mounted;
// `search` has no form.
// `PAINT.kind.control` draws the box beside its painted shape, a value that
// never arrives.
function drawProse(scene: ShowcaseScene) {
	if (!states(scene, "rest", "disabled", "error")) return undefined;
	if (isPaint(scene))
		// Stacked, not side by side: a text area takes its column's width, which a
		// wrapping row would leave to its content.
		return scene.state === "rest" ? (
			<div className="flex flex-col gap-section">
				{labelled(
					<Input label="Workspace" kind="prose" value={SHORT} onChange={act} />,
				)}
				{labelled(
					<Input
						label="Workspace"
						kind="prose"
						value={waitingText}
						onChange={act}
					/>,
				)}
			</div>
		) : undefined;
	const name = scene.classSet.name;
	if (
		![
			"TEXT_AREA",
			"TEXT_AREA_BUDGET",
			"TEXT_AREA_VALUE",
			"FIELD_VALUE",
			"FIELD_PLACEHOLDER",
		].includes(root(scene))
	)
		return undefined;
	if (name === "FIELD_VALUE.kind.search") return undefined;
	if (name === "FIELD_VALUE.kind.code") {
		const page = (
			<Column>
				<div className="flex flex-col h-dvh">
					<Panes title="Page source">
						<Pane>
							<Form
								act={scene.state === "error" ? REFUSED_SOURCE : SAVED}
								given={GIVEN_ALL}
								values={{ why: SOURCE }}
								fields={{
									why: {
										label: "Source",
										control: "source",
										locked:
											scene.state === "disabled"
												? "Set by the page's template."
												: undefined,
									},
								}}
								acts={[{ label: "Discard", onAct: act }]}
								submit={{ label: "Save" }}
							/>
						</Pane>
					</Panes>
				</div>
			</Column>
		);
		return scene.state === "error" ? <Submitted>{page}</Submitted> : page;
	}
	const over = name === "TEXT_AREA_BUDGET.state.error";
	return (
		<FieldOwned value>
			<Field.Root
				invalid={scene.state === "error" || name === "TEXT_AREA.state.error"}
				disabled={scene.state === "disabled"}
			>
				<Field.Label className={text({ role: "body" })}>
					Description
				</Field.Label>
				<Input
					label="Description"
					kind="prose"
					value={over ? LONG : SHORT}
					onChange={act}
					budget={over ? 20 : 200}
				/>
			</Field.Root>
		</FieldOwned>
	);
}

// A code one digit short that types its last digit once mounted, so the check
// it starts never settles and the scene holds the look a real code would.
function Checking(props: { children: ReactNode }) {
	const rootRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const input = rootRef.current?.querySelector("input");
		const set = Object.getOwnPropertyDescriptor(
			HTMLInputElement.prototype,
			"value",
		)?.set;
		if (!input || !set) return;
		set.call(input, "481902");
		input.dispatchEvent(new Event("input", { bubbles: true }));
	}, []);
	return (
		<div ref={rootRef} className="contents">
			{props.children}
		</div>
	);
}

function Typed() {
	const [code, setCode] = useState("48190");
	return (
		<Input
			label="Code"
			kind="code"
			length={6}
			value={code}
			onChange={setCode}
			onComplete={hang}
		/>
	);
}

// The scene's `error` reaches the control through Base UI's `Field`, as a
// `FormField` puts it; `OTP_BOX.state.error` is in error in every state.
function drawCode(scene: ShowcaseScene) {
	if (!states(scene, "rest", "pending", "error")) return undefined;
	if (
		!["OTP", "OTP_BOX", "OTP_DIGIT", "TEXT", "FIELD_ERROR_LINE"].includes(
			root(scene),
		)
	)
		return undefined;
	const pending = scene.state === "pending";
	return (
		<FieldOwned value>
			<Field.Root
				invalid={
					scene.state === "error" ||
					scene.classSet.name === "OTP_BOX.state.error"
				}
			>
				<Field.Label className={text({ role: "body" })}>Code</Field.Label>
				{pending ? (
					<Checking>
						<Typed />
					</Checking>
				) : (
					<Input
						label="Code"
						kind="code"
						length={6}
						value="481"
						onChange={act}
					/>
				)}
			</Field.Root>
		</FieldOwned>
	);
}

// A file control placed alone is its field, which labels it and draws the
// error line a refused file lands in; the scene's `error` reaches the control
// through its `error`. `FIELD.state.error` is in error in every state. The
// class sets that draw the box's own parts stand empty (the word in its placeholder
// ink, the whole box the act); the rest hold a chosen file, its size after the
// name and the act that removes it. Disabled, the file pick is a form's locked
// field, which holds the file's content and no chosen file, so it stands empty.
const FILE_CLASS_SETS = [
	"FIELD.trailing.none",
	"FIELD.trailing.act",
	"FIELD.state.rest",
	"FIELD.state.error",
	"FIELD_VALUE.kind.text",
	"FIELD_PLACEHOLDER",
	"TEXT.role.meta",
	"FIELD_GLYPH",
	"FIELD_ERROR_LINE",
	"ICON.fit.control",
];

// A form's file field locked by its reason, which stands it disabled.
const LOCKED = (
	<Form
		act={SAVED}
		given={GIVEN_ALL}
		commit="field"
		fields={{
			directory: {
				label: "Invoices file",
				control: "file",
				accept: ACCEPT,
				locked: "Set by your organisation.",
			},
		}}
	/>
);

// Puts a file on its form's file input as the scene mounts, as the system
// dialog would, so the field holds it chosen: a field's chosen file is the
// viewer's pick, never a value the form is given.
function Chosen(props: { children: ReactNode }) {
	const root = useRef<HTMLDivElement>(null);
	useLayoutEffect(() => {
		const input = root.current?.querySelector("input[type=file]");
		if (!(input instanceof HTMLInputElement)) return;
		const files = new DataTransfer();
		files.items.add(
			new File([new Uint8Array(CHOSEN.size)], CHOSEN.name, {
				type: CHOSEN.type,
			}),
		);
		input.files = files.files;
		input.dispatchEvent(new Event("change", { bubbles: true }));
	}, []);
	return (
		<div ref={root} className="contents">
			{props.children}
		</div>
	);
}

function drawFile(scene: ShowcaseScene) {
	const name = scene.classSet.name;
	if (!states(scene, "rest", "disabled", "error", "empty")) return undefined;
	if (!FILE_CLASS_SETS.includes(name)) return undefined;
	const empty =
		scene.state === "empty" ||
		scene.state === "error" ||
		name === "FIELD.trailing.none" ||
		name === "FIELD.state.error" ||
		name === "FIELD_PLACEHOLDER";
	const error = scene.state === "error" || name === "FIELD.state.error";
	if (scene.state === "disabled")
		return (
			<>
				{LOCKED}
				<Chosen>{LOCKED}</Chosen>
			</>
		);
	return (
		<Input
			label="Invoices file"
			kind="file"
			value={empty ? null : CHOSEN}
			onChange={act}
			accept={ACCEPT}
			error={error ? "Choose a CSV or HAR file." : undefined}
		/>
	);
}

// A field's error is a sentence read whole: docs/architecture/ui-core/acts.md, "Fields".
const PATH = "../../apps/web/src/routes/settings/bil";
const ADDRESS = [
	{ code: "ftp://ha.lan" },
	" is no address: type it as ",
	{ code: "ha.lan:8123" },
	" or ",
	{ code: "http://ha.lan:8123" },
	".",
];
const SHOWN = [
	"Compare each fingerprint with what the machine itself shows (",
	{ code: "ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub" },
	").",
];

function drawPath(scene: ShowcaseScene) {
	if (scene.state !== "error" || scene.classSet.name !== "FIELD.state.error")
		return undefined;
	return (
		<>
			<Input
				label="Upload folder"
				value={PATH}
				onChange={act}
				error={[{ code: PATH }, " is not a directory."]}
			/>
			<Input
				label="Address"
				value="ftp://ha.lan"
				onChange={act}
				error={ADDRESS}
			/>
			<Input label="Host key" value="" onChange={act} error={SHOWN} />
		</>
	);
}

// The field drawer wraps every control (`Input`'s roster entry draws its class sets),
// so its scene stands once, on the first class set, in the states a field has.
function drawField(scene: ShowcaseScene) {
	if (!isFirstClassSet(scene) || !states(scene, "rest", "disabled", "error"))
		return undefined;
	return drawFormField(scene);
}

export function drawInput(scene: ShowcaseScene) {
	const drawn = [
		drawField(scene),
		drawLine(scene),
		drawProse(scene),
		drawCode(scene),
		drawFile(scene),
		drawPath(scene),
	];
	if (drawn.every((one) => one === undefined)) return undefined;
	return (
		<>
			{drawn.map((one, place) => (
				<div key={place} className="contents">
					{one}
				</div>
			))}
		</>
	);
}
