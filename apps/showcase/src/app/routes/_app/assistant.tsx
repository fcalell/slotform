import { preload } from "@slotform/query/preload";
import { type StreamRead, streamRead } from "@slotform/query/read";
import { useQueryClient } from "@slotform/query/tanstack-query";
import { Pane } from "@slotform/react-ui/components/pane";
import { Thread } from "@slotform/react-ui/components/thread";
import { navigate } from "@slotform/react-ui/lib/navigate";
import { toast } from "@slotform/react-ui/lib/toast";
import type { Attachment, Notice } from "@slotform/ui-core/descriptors";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import type { AppRouter } from "../../../../.slotform/worker";
import { orpc } from "../../lib/api.ts";
import { NAME, PLAN_USED } from "../../lib/assistant.ts";

export const Route = createFileRoute("/_app/assistant")({
	loader: ({ context }) =>
		preload(context.queryClient, orpc.assistant.history.read()),
	component: Assistant,
});

type Turn = AppRouter["assistant"]["history"]["__output"][number];

const ANSWER = `${PLAN_USED} Most come from \`acme-web\` itself; the rest from \`acme-api\`.`;

// The answer arrives a word at a time, after a first wait.
const WORDS = ANSWER.split(/(?<= )/);
const FIRST = 900;
const PACE = 90;

const pause = (ms: number, signal: AbortSignal) =>
	new Promise<void>((resolve) => {
		const timer = setTimeout(resolve, ms);
		signal.addEventListener(
			"abort",
			() => {
				clearTimeout(timer);
				resolve();
			},
			{ once: true },
		);
	});

// The words of one answer, ending where the read is cancelled.
async function* spoken(signal: AbortSignal) {
	for (const [at, word] of WORDS.entries()) {
		await pause(at === 0 ? FIRST : PACE, signal);
		if (signal.aborted) return;
		yield word;
	}
}

// The composer's draft attachment and notice, drawn in every state: neither
// is part of the query.
const ATTACHED: Attachment[] = [{ id: "log", name: "build-0c5e4aa.log" }];

const NOTICE: Notice = {
	sentence: "12 of 50 answers left this month.",
	act: { label: "See usage", href: "/usage" },
};

// While an answer comes, the notice says what becomes of a message sent then.
const QUEUED: Notice = {
	sentence: "A message sent now is read once this answer ends.",
};

// One answer as a stream read: the turn grows a word at a time in the read's
// own data, so a word renders the Thread's reply turn and nothing else. When
// the stream ends, `done` gets the whole turn, which the history then holds.
function answerOf(id: string, done: (turn: Turn) => void): StreamRead<Turn> {
	return streamRead<string, Turn>({
		queryKey: ["assistant", "answer", id],
		stream: spoken,
		reducer: (turn, word) => ({ ...turn, body: turn.body + word }),
		initialValue: {
			id,
			author: "other",
			body: "",
			at: new Date().toISOString(),
		},
		onDone: done,
	});
}

// The conversation: docs/architecture/ui-core/components.md, "Thread".
function Assistant() {
	const queryClient = useQueryClient();
	const history = orpc.assistant.history.read();
	const [value, setValue] = useState("");
	const [attachments, setAttachments] = useState<Attachment[]>(ATTACHED);
	const [working, setWorking] = useState(false);
	const [answer, setAnswer] = useState<StreamRead<Turn>>();
	const asked = useRef(0);
	// The messages sent while an answer came, each answered in turn.
	const queued = useRef(0);
	const record = (turn: Turn) =>
		queryClient.setQueryData<readonly Turn[]>(
			history.options.queryKey,
			(all = []) => [...all, turn],
		);
	const say = (turn: Omit<Turn, "id" | "at">) =>
		queryClient.setQueryData<readonly Turn[]>(
			history.options.queryKey,
			(all = []) => [
				...all,
				{ ...turn, id: `s${all.length + 1}`, at: new Date().toISOString() },
			],
		);
	const reply = () => {
		setWorking(true);
		asked.current += 1;
		setAnswer(
			answerOf(`a${asked.current}`, (turn) => {
				record(turn);
				if (queued.current === 0) setWorking(false);
				else {
					queued.current -= 1;
					reply();
				}
			}),
		);
	};
	return (
		<Pane fill>
			<Thread
				items={history}
				empty={{
					sentence:
						"Ask about your deploys: why one failed, what changed between two, or how much of the plan is used.",
				}}
				reply={answer}
				message={{
					key: (turn) => turn.id,
					author: (turn) => turn.author,
					name: (turn) =>
						turn.author === "system" ? undefined : NAME[turn.author],
					body: (turn) => turn.body,
					at: (turn) => turn.at,
					onOpen: (turn) => {
						const { deploy } = turn;
						if (deploy === undefined) return undefined;
						return () => navigate(`/deploys/${deploy}`);
					},
				}}
				composer={{
					value,
					onChange: setValue,
					attachments,
					onAttach: (files) =>
						setAttachments((all) => [
							...all,
							...files.map((file) => ({
								id: crypto.randomUUID(),
								name: file.name,
								src: file.src,
							})),
						]),
					onDetach: (id) => {
						const gone = attachments.find((each) => each.id === id)?.src;
						if (gone?.startsWith("blob:")) URL.revokeObjectURL(gone);
						setAttachments((all) => all.filter((each) => each.id !== id));
					},
					placeholder: "Ask about your deploys",
					notice: working ? QUEUED : NOTICE,
					working,
					onSend: () => {
						say({ author: "you", body: value });
						setValue("");
						setAttachments([]);
						if (working) queued.current += 1;
						else reply();
					},
					onStop: async () => {
						// The words so far stay in the conversation, then the line
						// that says the answer was stopped.
						const partial = await answer?.stop();
						if (partial?.body) record(partial);
						setAnswer(undefined);
						queued.current = 0;
						setWorking(false);
						say({ author: "system", body: "Answer stopped" });
						toast("Answer stopped");
					},
				}}
			/>
		</Pane>
	);
}
