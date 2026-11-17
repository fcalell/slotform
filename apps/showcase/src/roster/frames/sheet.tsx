import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Code } from "@fcalell/plugin-react-ui/components/code";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import { QrCode } from "@fcalell/plugin-react-ui/components/qr-code";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { Panes } from "@fcalell/plugin-react-ui/components/shell";
import { Thread } from "@fcalell/plugin-react-ui/components/thread";
import { cn } from "@fcalell/ui-core/cn";
import type { Act, Option } from "@fcalell/ui-core/descriptors";
import { SHELL_BANNER, SHELL_COLUMN } from "@fcalell/ui-core/variants";
import { useEffect, useRef, useState } from "react";
import { isFirstCell, type ShowcaseFrame } from "../cells.ts";
import { isHeld, readsAt } from "../waiting.ts";
import { StandInRows } from "./layout-context.tsx";
import { TURN } from "./message.tsx";
import { press, Stage } from "./overlay-stage.tsx";
import { fail, hang } from "./pending.tsx";
import { TURNS } from "./thread.tsx";

const act = () => {};

interface Question {
	title: string;
	options: Option[];
}

// The four questions a conversation asks before it acts, each a radio list.
const QUESTIONS: Question[] = [
	{
		title: "Which environment?",
		options: [
			{
				value: "production",
				label: "Production",
				recommended: true,
				line: "Where your customers are",
			},
			{ value: "staging", label: "Staging" },
			{ value: "preview", label: "Preview" },
		],
	},
	{
		title: "Which build image?",
		options: [
			{ value: "node-20", label: "Node 20", recommended: true },
			{ value: "node-18", label: "Node 18", line: "Leaves on Oct 12" },
			{ value: "bun", label: "Bun" },
		],
	},
	{
		title: "When should it run?",
		options: [
			{ value: "now", label: "Now" },
			{ value: "after", label: "After the migration" },
			{ value: "hold", label: "Hold it until I say" },
		],
	},
	{
		title: "Who hears about it?",
		options: [
			{ value: "me", label: "Only me" },
			{ value: "team", label: "The team", recommended: true },
			{ value: "channel", label: "The #deploys channel" },
		],
	},
];

// A conversation filling its page with a four-question sheet docked in its
// foot: each page a Section of one radio list, Back in the head from the
// second, Next on the first three and Send on the last, at a phone's height
// (844) under a banner. The body scrolls past two fifths of the region under
// the banner and keeps three rows, the log giving way; closing returns the
// input. Send's states open on the last page: blocked
// before the last question is answered (its reason shown once pressed),
// pending while it works, and failed, the act ready again with the error line
// under it saying why, in the line the reason keeps.
function DockedQuestions({ state }: { state: ShowcaseFrame["state"] }) {
	const frame = useRef<HTMLDivElement>(null);
	const [value, setValue] = useState("");
	const [at, setAt] = useState(state === "rest" ? 0 : QUESTIONS.length - 1);
	const [open, setOpen] = useState(true);
	const [answers, setAnswers] = useState<(string | null)[]>(
		QUESTIONS.map((_, i) =>
			state === "pending" || state === "error"
				? (QUESTIONS[i]?.options[0]?.value ?? null)
				: null,
		),
	);
	useEffect(() => {
		if (!frame.current) return;
		if (state === "disabled") pressSubmit(frame.current);
		if (state === "pending" || state === "error")
			pressNamed(frame.current, "Send");
	}, [state]);
	const question = QUESTIONS[at];
	const last = at === QUESTIONS.length - 1;
	const close = () => {
		setOpen(false);
		setAt(0);
	};
	const composer = {
		value,
		onChange: setValue,
		onAttach: act,
		placeholder: "Ask about this deploy",
		onSend: () => setValue(""),
	};
	return (
		<div
			ref={frame}
			className={cn(
				SHELL_COLUMN,
				"flex flex-col h-211 w-screen max-w-full overflow-hidden",
			)}
		>
			<div className={SHELL_BANNER}>
				<Banner
					tone="attention"
					sentence="You have used 46 of your 50 answers this month. Upgrade to keep asking."
					act={{ label: "Upgrade", onAct: act }}
				/>
			</div>
			<Panes title="Assistant">
				<Pane fill>
					<Thread
						items={TURNS}
						message={TURN}
						composer={composer}
						sheet={
							open && question
								? {
										open: true,
										onClose: close,
										back: at > 0 ? () => setAt(at - 1) : undefined,
										title: `Question ${at + 1} of ${QUESTIONS.length}`,
										description: "Before I redeploy",
										submit: {
											label: last ? "Send" : "Next",
											onAct: last ? actOf(state, close) : () => setAt(at + 1),
											blocked:
												last && state === "disabled"
													? "Choose who hears about it first."
													: undefined,
										},
										children: (
											<Section title={question.title}>
												<Picker
													fit="list"
													headed
													label={question.title}
													options={question.options}
													value={answers[at] ?? null}
													onChange={(next) =>
														setAnswers(
															answers.map((was, i) => (i === at ? next : was)),
														)
													}
												/>
											</Section>
										),
									}
								: undefined
						}
					/>
				</Pane>
			</Panes>
		</div>
	);
}

// A short form: one field placed alone, so the desktop sheet is a centred
// sheet.
function OneField() {
	const [value, setValue] = useState("production");
	return <Input label="Branch" value={value} onChange={setValue} />;
}

// The submit's work by state: one that never settles while it pends, one the
// server refuses on `error`.
function actOf(state: ShowcaseFrame["state"], rest: () => void) {
	if (state === "pending") return hang;
	return state === "error" ? fail : rest;
}

function submitOf(state: ShowcaseFrame["state"]): Act {
	return {
		label: "Save",
		onAct: actOf(state, act),
		blocked: state === "disabled" ? "Add a description first." : undefined,
	};
}

// A pressed act, found by its name.
const pressNamed = (stage: HTMLElement, label: string) =>
	requestAnimationFrame(() =>
		press(
			[...stage.querySelectorAll("button")].find(
				(button) => button.textContent === label,
			),
		),
	);

// A blocked submit shows its reason once pressed.
const pressSubmit = (stage: HTMLElement) =>
	requestAnimationFrame(() =>
		press(stage.querySelector('[aria-disabled="true"]:not([aria-busy])')),
	);

// The body's read by state: the data landed, the wait that holds the submit
// painted and inert, the failure with its Retry in the body's place, and an
// empty selection; busy, stale and paused hold the data beside their mark or line.
function readOf(frame: ShowcaseFrame) {
	const reads = readsAt(frame.id);
	switch (frame.state) {
		case "rest":
			return reads.ready.at((rows) => rows);
		case "loading":
			return reads.waiting;
		case "error":
			return reads.failing;
		case "empty":
			return reads.empty.at((rows) => rows);
		default:
			return isHeld(frame.state) ? reads[frame.state] : undefined;
	}
}

// The submit pressed: the act runs its work.
const pressSave = (stage: HTMLElement) => pressNamed(stage, "Save");

// A set of codes shown once, which the viewer acknowledges.
const JOIN = "https://app.example.com/join?code=7k2m-9xq4-4tpw-h8nz";

const CODES = `7k2m-9xq4
4tpw-h8nz
c3vd-2rfj
9bqe-m6yk`;

// The desktop card (the bottom sheet on touch, its submit in the foot after
// the body) is a plain class constant, which no cell of its own keys: the
// Sheet's first cell draws it, the form in its four states (the failed one a
// line under the act in the foot) and a join sheet at rest, then a sheet over
// a read (two Sections in its body, a sections gap apart; the data landed at
// rest, the submit painted and inert while it waits, the failure with Retry in
// the body's place, the empty sentence, and busy, stale and paused over rows).
// Each sheet stands in a Gate, whose portal it mounts in. The rows inside are
// context. The bar fit cell draws the docked form, since
// the docked foot draws no matrix cell of its own: a conversation with a
// four-question sheet in its foot at a phone's height.
export function drawSheet(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	const { state } = frame;
	// The desktop card is a plain class constant, which no cell of its own keys:
	// the first cell the Sheet draws carries it, the form and the read's.
	const desktop = isFirstCell(frame);
	const reading = desktop && state !== "disabled" && state !== "pending";
	const forming = desktop && !isHeld(state);
	if (forming || reading)
		return (
			<>
				{forming ? (
					<Stage
						contain
						ready={
							state === "disabled"
								? pressSubmit
								: state === "pending" || state === "error"
									? pressSave
									: undefined
						}
					>
						<Gate title="Projects">
							<Sheet
								open
								onClose={act}
								title="Edit project"
								description="acme-web · production"
								submit={submitOf(state)}
							>
								<StandInRows />
							</Sheet>
						</Gate>
					</Stage>
				) : null}
				{forming && state === "rest" ? (
					// A join sheet: the code a camera reads, its address, and the
					// banner that waits for the device, which ends the body.
					<Stage contain>
						<Gate title="Projects">
							<Sheet
								open
								onClose={act}
								title="Add a device"
								description="Scan the code with the device, or open the address on it."
							>
								<QrCode value={JOIN} label="A code that adds a device" />
								<Code text={JOIN} copy />
								<Banner
									tone="running"
									sentence="Waiting for the new device"
									until={new Date(Date.now() + 5 * 60_000)}
								/>
							</Sheet>
						</Gate>
					</Stage>
				) : null}
				{reading ? (
					<Stage contain>
						<Gate title="Projects">
							<Sheet
								open
								onClose={act}
								title="Details"
								description="acme-web · production"
								submit={
									state === "rest" ? undefined : { label: "Save", onAct: act }
								}
								read={readOf(frame)}
								empty={
									state === "empty"
										? { sentence: "Nothing to show for this deploy." }
										: undefined
								}
							>
								<Section title="Properties">
									<StandInRows />
								</Section>
								<Section title="Activity">
									<StandInRows />
								</Section>
							</Sheet>
						</Gate>
					</Stage>
				) : null}
			</>
		);
	if (cell === "ICON_BUTTON.fit.body" && state === "rest")
		return (
			<Stage contain>
				<Gate title="Projects">
					<Sheet
						open
						onClose={act}
						back={act}
						title="Production environment"
						description="acme-web · what every production deploy reads"
						submit={submitOf(state)}
					>
						<OneField />
					</Sheet>
				</Gate>
			</Stage>
		);
	if (cell === "SHEET_FOOT" && state === "rest")
		return (
			<Stage contain>
				<Gate title="Projects">
					<Sheet
						open
						onClose={act}
						title="New recovery codes"
						description="Each opens recovery once. They are not shown again."
						submit={{ label: "I saved them" }}
					>
						<Code text={CODES} copy />
					</Sheet>
				</Gate>
			</Stage>
		);
	if (cell === "BUTTON.fit.bar") return <DockedQuestions state={state} />;
	return undefined;
}
