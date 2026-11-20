import { Card } from "@slotform/native-ui/components/card";
import { Input } from "@slotform/native-ui/components/input";
import { Pane } from "@slotform/native-ui/components/pane";
import { Thread } from "@slotform/native-ui/components/thread";
import { toast } from "@slotform/native-ui/lib/toast";
import { type StreamRead, streamRead } from "@slotform/query/read";
import { useEffect, useRef, useState } from "react";

interface Turn {
	id: string;
	author: "you" | "other";
	body: string;
	at: string;
}

const FIRST: Turn[] = [
	{
		id: "t1",
		author: "other",
		body: "Ask about anything on this device.",
		at: new Date().toISOString(),
	},
];

const FIRST_WORD = 700;
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
async function* spoken(signal: AbortSignal, words: string[]) {
	for (const [at, word] of words.entries()) {
		await pause(at === 0 ? FIRST_WORD : PACE, signal);
		if (signal.aborted) return;
		yield word;
	}
}

// One answer as a stream read: the turn grows a word at a time in the read's
// own data, so a word renders the Thread's reply turn and nothing else. When
// the stream ends, `done` gets the whole turn, which the thread's items then
// hold.
function answerOf(
	id: string,
	body: string,
	done: (turn: Turn) => void,
): StreamRead<Turn> {
	const words = body.split(/(?<= )/);
	return streamRead<string, Turn>({
		queryKey: ["ask", "answer", id],
		stream: (signal) => spoken(signal, words),
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

// A conversation that arrives after a moment, under a field typed into before
// it does: the field keeps its text as the conversation takes the page. Its
// answers stream in a word at a time and join the thread when they end.
export default function Ask() {
	const [topic, setTopic] = useState("");
	const [turns, setTurns] = useState<Turn[]>();
	const [value, setValue] = useState("");
	const [working, setWorking] = useState(false);
	const [answer, setAnswer] = useState<StreamRead<Turn>>();
	const asked = useRef(0);
	useEffect(() => {
		const arrive = setTimeout(() => setTurns(FIRST), 3000);
		return () => clearTimeout(arrive);
	}, []);
	const record = (turn: Turn) => setTurns((all = []) => [...all, turn]);
	const send = () => {
		record({
			id: `y${asked.current}`,
			author: "you",
			body: value,
			at: new Date().toISOString(),
		});
		setValue("");
		setWorking(true);
		asked.current += 1;
		setAnswer(
			answerOf(
				`a${asked.current}`,
				`About ${topic || "that"}: nothing new since this morning, and nothing waiting on you.`,
				(turn) => {
					record(turn);
					setWorking(false);
				},
			),
		);
	};
	// The words so far stay in the thread.
	const stop = async () => {
		const partial = await answer?.stop();
		if (partial?.body) record(partial);
		setAnswer(undefined);
		setWorking(false);
		toast("Answer stopped");
	};
	return (
		<Pane>
			<Card>
				<Input label="Topic" value={topic} onChange={setTopic} />
			</Card>
			{turns ? (
				<Thread
					items={turns}
					reply={answer}
					message={{
						key: (turn) => turn.id,
						author: (turn) => turn.author,
						name: (turn) => (turn.author === "other" ? "Slotform" : undefined),
						body: (turn) => turn.body,
						at: (turn) => turn.at,
					}}
					composer={{
						value,
						onChange: setValue,
						placeholder: "Ask about this device",
						working,
						onSend: send,
						onStop: stop,
					}}
				/>
			) : null}
		</Pane>
	);
}
