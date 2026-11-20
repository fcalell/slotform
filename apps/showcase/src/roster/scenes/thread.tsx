import { read } from "@slotform/query/read";
import { Pane } from "@slotform/react-ui/components/pane";
import { Section } from "@slotform/react-ui/components/section";
import { Panes } from "@slotform/react-ui/components/shell";
import { Thread } from "@slotform/react-ui/components/thread";
import type { Datum } from "@slotform/ui-core/read";
import { useMemo, useState } from "react";
import { isFirstClassSet, type ShowcaseScene } from "../class-sets.ts";
import { endedAt, itemsAt } from "../waiting.ts";
import { StandInList } from "./layout-context.tsx";
import { drawMessages } from "./message.tsx";
import { TURN, TURNS, type Turn, today } from "./message-fixtures.ts";
import { drawComposer } from "./message-input.tsx";
import { Column } from "./place.tsx";
import { act } from "./section-rows.ts";

// The class sets only the composer draws; its other class sets (a chip, a thumbnail, the
// provenance line) it shares with a message, and every other class set is a message's.
const COMPOSER_ONLY = /^(BUTTON|FIELD|CHIP\.trailing|ICON\.fit\.control)/;
const SHARED =
	/^(CHIP|IMAGE|ICON\.fit\.meta|TEXT\.role\.meta|MESSAGE_ATTACHMENTS)/;

// Board 53's thread in a Pane's body among its sections, under one: system
// lines (one opening, one folding its reads, a free act over its code, a
// proposal as its row), yours and the assistant's replies, the composer under
// them with its notice, the answer still working. No frame holds the thread's
// read: the thread is a frame of its items, so each scene draws its state in
// the log's place with the composer kept: the painted messages, the empty sentence,
// the failed and missing shapes, the conversation. The error state also draws a
// stream that stopped. The first class set draws these states and the
// disabled composer once; every class set draws the messages and composer scenes
// its part names, the paint class set a reply beside its painted shape.
export function drawThread(scene: ShowcaseScene) {
	const { id, state } = scene;
	const classSet = scene.classSet.name;
	if (state === "disabled")
		return isFirstClassSet(scene) ? drawComposer(scene) : undefined;
	if (state === "rest") {
		const parts = (
			<>
				{COMPOSER_ONLY.test(classSet) || SHARED.test(classSet)
					? drawComposer(scene)
					: null}
				{COMPOSER_ONLY.test(classSet) ? null : drawMessages(scene)}
			</>
		);
		return isFirstClassSet(scene) ? (
			<>
				<Conversation id={id} items={itemsAt(`${id}/turns`, "rest", TURNS)} />
				{parts}
			</>
		) : (
			parts
		);
	}
	if (!isFirstClassSet(scene)) return undefined;
	if (state === "empty" || state === "error")
		return (
			<>
				{endedAt<Turn>(id, state).map(({ title, items }) => (
					<Conversation key={title} id={`${id}/${title}`} items={items} />
				))}
				{state === "error" ? (
					<Conversation
						id={`${id}/stopped`}
						items={itemsAt(`${id}/turns`, "rest", TURNS)}
						stream="error"
					/>
				) : null}
			</>
		);
	return (
		<Conversation
			id={id}
			items={itemsAt(
				`${id}/turns`,
				state === "streaming" ? "rest" : state,
				TURNS,
			)}
			stream={state === "streaming" ? state : undefined}
		/>
	);
}

// The turn being written, as the read of a stream holds it: the first words of
// the answer with an emphasis still open. `streaming` has the stream running
// over them, `error` has it failed over them.
const PARTIAL: Turn = {
	id: "t10",
	author: "other",
	body: "The migration adds a **NOT NULL column with no default, so the `invoices",
	at: today("10:07"),
};

function replyAt(id: string, state: "streaming" | "error") {
	return read(
		{
			queryKey: ["showcase", id, "reply"],
			queryFn: (): Promise<Turn> =>
				state === "error"
					? Promise.reject(new Error("The showcase stream fails."))
					: new Promise<never>(() => {}),
			initialData: PARTIAL,
			staleTime: 0,
			retry: false,
		},
		{ kind: "stream" },
	);
}

function Conversation(props: {
	id: string;
	items: Datum<readonly Turn[]>;
	stream?: "streaming" | "error";
}) {
	const [value, setValue] = useState("");
	const [working, setWorking] = useState(true);
	const { id, stream } = props;
	const reply = useMemo(
		() => (stream ? replyAt(id, stream) : undefined),
		[id, stream],
	);
	return (
		<Column>
			<Panes title="Assistant">
				<Pane fill>
					{/* A Section over the Thread: on the desktop the messages start where its rows start and end at the measure. */}
					<Section title="Deploys">
						<StandInList />
					</Section>
					<Thread
						items={props.items}
						message={TURN}
						reply={reply}
						composer={{
							value,
							onChange: setValue,
							onAttach: act,
							placeholder: "Ask about this deploy",
							notice: {
								sentence: "12 of 50 answers left this month.",
								act: { label: "Upgrade", onAct: act },
							},
							working,
							onSend: () => {
								setValue("");
								setWorking(true);
							},
							onStop: () => setWorking(false),
						}}
					/>
				</Pane>
			</Panes>
		</Column>
	);
}
