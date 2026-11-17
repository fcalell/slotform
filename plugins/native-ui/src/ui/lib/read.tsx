import { timings } from "@fcalell/ui-core/paint";
import {
	type Frame,
	FrameHolds,
	useSelections,
} from "@fcalell/ui-core/react/read";
import { useWords } from "@fcalell/ui-core/react/words";
import {
	type Datum,
	type Drawn,
	endedReason,
	lift,
	type Selection,
} from "@fcalell/ui-core/read";
import { ROW_RETRY, text } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Text as RNText, View } from "react-native";
import { ButtonBase } from "../components/button/base";
import { MissingBase } from "../components/missing/base";
import { Icon } from "../parts/icon";
import { Spinner } from "../parts/spinner";
import type { Act } from "./act";
import { wiringOf } from "./act";
import { cn } from "./cn";
import { type Empty, EmptyBase, type EmptyFit } from "./empty";
import { Ink } from "./ink";
import { useShown } from "./paint";

const RETRY_MARK = "shrink-0 items-center justify-center";

// What a failed row draws in its value slot: the alert, in the danger ink.
export function FailedMark({ label }: { label?: string }) {
	return (
		<View
			accessible={label !== undefined}
			accessibilityRole={label === undefined ? undefined : "image"}
			accessibilityLabel={label}
			className="shrink-0 items-center"
		>
			<Ink.Provider value="danger">
				<Icon name="CircleAlert" />
			</Ink.Provider>
		</View>
	);
}

// What a failed row draws at its end: docs/architecture/ui-core/reads.md, "What a frame draws". Pressing the row retries.
export function RetryMark({ busy }: { busy: boolean }) {
	const spinning = useShown(busy, timings.actDelay);
	return (
		<View pointerEvents="none" className={cn(ROW_RETRY, RETRY_MARK)}>
			<Ink.Provider value="ink-meta">
				{spinning ? <Spinner /> : <Icon name="RotateCw" />}
			</Ink.Provider>
		</View>
	);
}

// `submitOf` for a bar whose frame stands elsewhere: a sheet's foot holds its
// form's bar, hoisted out of the form that owns the read.
export function useSubmitOf(read?: Selection<unknown>) {
	const words = useWords();
	const [one] = useSelections([read]);
	if (!one.painted) return { waiting: false, ended: undefined };
	const ended = endedReason(words, one.phase);
	return { waiting: ended === undefined, ended };
}

// The empty form: docs/architecture/ui-core/reads.md, "Missing and failed forms". Its sentence's read is subscribed here and only here.
function EmptyForm(props: {
	empty?: { sentence?: Datum<string>; act?: Empty["act"] };
	fit: EmptyFit;
}) {
	const { empty, fit } = props;
	const words = useWords();
	const [said] = useSelections([
		lift<{ sentence?: string }, "sentence">(empty, ["sentence"]),
	] as const);
	const sentence = empty
		? said.painted
			? words.readEmpty
			: said.value?.sentence
		: words.readEmpty;
	return (
		<EmptyBase fit={fit} tone="rest" sentence={sentence} act={empty?.act} />
	);
}

// What a frame draws in place of its body, or its body: docs/architecture/ui-core/reads.md, "What a frame draws".
export function FrameBody(props: {
	frame: Frame;
	fit: EmptyFit;
	// What the frame says when its read is empty: the default sentence, none
	// (`sentence: undefined` with an act), or its own.
	empty?: { sentence?: Datum<string>; act?: Empty["act"] };
	// The kind of record a missing read answers for, wording its sentence (a
	// Pane's).
	noun?: string;
	// The sentence a missing read says, in place of the noun's (a Pane's).
	missing?: string;
	// The empty form stands in a hairline frame even for a sentence alone (a
	// Section's).
	children?: ReactNode;
}) {
	const { frame, fit, empty, noun, missing, children } = props;
	const words = useWords();
	if (frame.form === "failed") {
		return (
			<EmptyBase
				fit={fit}
				tone="failed"
				sentence={words.readFailed}
				act={{ label: words.retry, onAct: frame.retry }}
			/>
		);
	}
	if (frame.form === "missing")
		return <MissingBase fit={fit} noun={noun} sentence={missing} />;
	if (frame.form === "empty") {
		return <EmptyForm empty={empty} fit={fit} />;
	}
	// The reads this frame holds are not drawn again by a frame in its body.
	return <FrameHolds holds={frame.held}>{children}</FrameHolds>;
}

// The trailing line carries the room under itself, as the web's does.
const LINE = "flex-row flex-wrap items-center gap-gap pb-gap";
// In a form's flow (a group, the form) the gap around it is the room.
const LINE_IN_FLOW = "flex-row flex-wrap items-center gap-gap";

// A frame's busy mark, after its heading: docs/architecture/ui-core/reads.md, "Busy mark".
export function BusyMark({ frame }: { frame: Frame }) {
	const busy = frame.holds && frame.marks && frame.busy;
	const shown = useShown(busy);
	return shown ? <Spinner /> : null;
}

// One meta sentence with an optional quiet act after it: what a frame says in
// its head about its read's state.
export function StateLine(props: {
	sentence: string;
	act?: Act;
	flow?: boolean;
}) {
	const { sentence, act, flow } = props;
	return (
		<View className={flow ? LINE_IN_FLOW : LINE}>
			<RNText className={cn(text({ role: "meta" }), "shrink")}>
				{sentence}
			</RNText>
			{act ? (
				<ButtonBase
					act="quiet"
					label={act.label}
					onAct={act.onAct}
					{...wiringOf(act)}
				/>
			) : null}
		</View>
	);
}

// The line under a control whose options have ended: docs/architecture/ui-core/reads.md, "Failed, stale and paused lines".
export function OptionsLine(props: {
	drawn: Drawn<unknown>;
	retry: () => Promise<unknown>;
}) {
	const { drawn, retry } = props;
	const words = useWords();
	if (!drawn.painted) return null;
	if (drawn.phase === "failed") {
		return (
			<StateLine
				flow
				sentence={words.readFailed}
				act={{ label: words.retry, onAct: retry }}
			/>
		);
	}
	return drawn.phase === "missing" ? (
		<StateLine flow sentence={words.missing} />
	) : null;
}

// The line under a frame's heading row, stale or paused: docs/architecture/ui-core/reads.md, "Failed, stale and paused lines".
export function FrameLine({
	frame,
	flow,
}: {
	frame: Frame;
	// The line stands among a form's gapped children, which are its room.
	flow?: boolean;
}) {
	const words = useWords();
	if (!frame.holds) return null;
	if (frame.stale) {
		return (
			<StateLine
				flow={flow}
				sentence={words.readStale}
				act={{ label: words.retry, onAct: frame.retry }}
			/>
		);
	}
	return frame.paused ? (
		<StateLine flow={flow} sentence={words.readPaused} />
	) : null;
}
