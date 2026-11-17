import { cn } from "@fcalell/ui-core/cn";
import {
	type Frame,
	FrameHolds,
	useSelections,
} from "@fcalell/ui-core/react/read";
import { useWords } from "@fcalell/ui-core/react/words";
import { type Datum, type Drawn, isEnded, lift } from "@fcalell/ui-core/read";
import { ROW_RETRY, row } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { ButtonBase } from "../components/button/base.tsx";
import { MissingBase } from "../components/missing/base.tsx";
import { Text } from "../components/text/index.tsx";
import { IconButtonBase } from "../parts/button/glyph.tsx";
import { Icon } from "../parts/icon/index.tsx";
import { Spinner } from "../parts/spinner/index.tsx";
import type { Act } from "./act.ts";
import { wiringOf } from "./act.ts";
import { type Empty, EmptyBase, type EmptyFit } from "./empty.tsx";

/** The `data-still` a frame's own box carries while its held read has no data and nothing is coming (not asked for, or paused): its painted shape stands, and nothing breathes or scrambles in it. */
export const stillOf = (frame: Frame): "" | undefined =>
	frame.holds && frame.shape === "still" ? "" : undefined;

// A compact control's failed marks stand whole beside it.
const ENDED_MARKS = "flex shrink-0 items-center";
const FAILED_MARK = "inline-flex shrink-0 items-center text-danger";
const RETRY_MARK =
	"relative flex shrink-0 items-center justify-center text-ink-meta";
// The retry glyph gives way to the spinner after `--act-delay`, as an act's
// glyph does (`animate-act-out`, `animate-act-in`): a retry the server
// answers at once never flashes a spinner.
const RETRY_GLYPH = "opacity-0 animate-act-out";
const RETRY_SPIN =
	"absolute inset-0 flex items-center justify-center animate-act-in";

/** What a failed row draws in its value slot: the alert, in the danger ink. With a `label` it is named by it (a mark that stands where a sentence would). */
export function FailedMark({ label }: { label?: string }) {
	const mark = <Icon name="CircleAlert" />;
	return label === undefined ? (
		<span className={FAILED_MARK}>{mark}</span>
	) : (
		<span role="img" aria-label={label} className={FAILED_MARK}>
			{mark}
		</span>
	);
}

/** What a failed row draws at its end, where a chevron stands: the retry icon, in its own square, a spinner in its place once the retry has run `--act-delay`. Pressing the row retries. */
export function RetryMark({ busy }: { busy: boolean }) {
	return (
		<span className={cn(ROW_RETRY, RETRY_MARK)}>
			{busy ? (
				<>
					<span className={RETRY_GLYPH}>
						<Icon name="RotateCw" />
					</span>
					<span className={RETRY_SPIN}>
						<Spinner />
					</span>
				</>
			) : (
				<Icon name="RotateCw" />
			)}
		</span>
	);
}

// The empty shape. Its sentence may be a read of its own (a selection of what
// the frame holds), subscribed here and only here: a frame whose read failed has
// no such observer, which would mount on the failed read again each time the
// body changes shape and retry it, so the failed shape would never settle. The
// generic sentence stands until the selection lands.
function EmptyShape(props: {
	empty?: { sentence?: Datum<string>; act?: Empty["act"] };
	fit: EmptyFit;
	fill?: boolean;
}) {
	const { empty, fit, fill } = props;
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
		<EmptyBase
			fit={fit}
			tone="rest"
			fill={fill}
			sentence={sentence}
			act={empty?.act}
		/>
	);
}

/** What a frame draws in place of its body, or its body: the failed, missing and empty shapes; ready, waiting and idle are the loaded tree, its leaves painting. */
export function FrameBody(props: {
	frame: Frame;
	// What the frame says when its read is empty: the default sentence, none (`sentence: undefined` with an act), or its own.
	empty?: { sentence?: Datum<string>; act?: Empty["act"] };
	// Where the shapes stand: inside the card the frame draws (`part`), or on a
	// card of their own, the frame drawing none.
	fit?: EmptyFit;
	// The shapes fill the box they stand in (a canvas's ground).
	fill?: boolean;
	// The kind of record a missing read answers for, wording its sentence (a Pane's).
	noun?: string;
	// The sentence a missing read says, in place of the noun's (a Pane's).
	missing?: string;
	// The failed shape where the title never lands: docs/architecture/ui-core/reads.md, "Missing and failed shapes".
	headed?: boolean;
	children?: ReactNode;
}) {
	const {
		frame,
		empty,
		fit = "frame",
		fill,
		noun,
		missing,
		headed,
		children,
	} = props;
	const words = useWords();
	if (frame.shape === "failed") {
		return (
			<EmptyBase
				fit={fit}
				tone="failed"
				sentence={words.readFailed}
				act={{ label: words.retry, onAct: frame.retry }}
				fill={fill}
				headed={headed}
			/>
		);
	}
	if (frame.shape === "missing")
		return (
			<MissingBase
				fit={fit}
				fill={fill}
				noun={noun}
				sentence={missing}
				headed={headed}
			/>
		);
	if (frame.shape === "empty") {
		return <EmptyShape empty={empty} fit={fit} fill={fill} />;
	}
	// The reads this frame holds are not drawn again by a frame in its body.
	return <FrameHolds holds={frame.held}>{children}</FrameHolds>;
}

// The mark fades in after `--wait-delay` like the paint does, so a refetch
// the server answers at once draws nothing a viewer sees; it stands in the
// heading's ink, the size of the glyphs beside it.
const BUSY = "inline-flex shrink-0 items-center text-ink-meta animate-paint";
// The line trails its heading row, so it carries the room under itself.
const LINE = "flex flex-wrap items-center gap-gap pb-gap";
// In a form (the form's rows, a group's) the line is a row of the run.
const LINE_IN_FLOW = cn(row({ state: "rest" }), "flex flex-wrap items-center");
// A field's failed read stands in its value column in the place of the control: the
// sentence and Retry on one control-high line, centred as the control would be, so
// the label beside it shares their centre.
const LINE_IN_VALUE = "flex flex-wrap items-center gap-gap min-h-control";

/** A frame's busy mark, after its heading: a spinner while a read it holds refetches or retries, faded in after `WAIT_DELAY`. A frame that holds no read and a frame with no heading draw none, and of sibling frames over one read only the first draws it, so one refetch stands as one mark. */
export function BusyMark({ frame }: { frame: Frame }) {
	if (!(frame.holds && frame.flags && frame.busy)) return null;
	return (
		<span data-busy="" className={BUSY}>
			<Spinner />
		</span>
	);
}

/** One meta sentence with an optional quiet act after it: what a frame says in its head about its read's state. */
export function StateLine(props: {
	sentence: string;
	act?: Act;
	flow?: boolean;
	/** The line is a field's value, in the control's place. */
	lone?: boolean;
}) {
	const { sentence, act, flow, lone } = props;
	return (
		<div className={lone ? LINE_IN_VALUE : flow ? LINE_IN_FLOW : LINE}>
			<Text kind="meta">{sentence}</Text>
			{act ? (
				<ButtonBase
					act="quiet"
					label={act.label}
					onAct={act.onAct}
					{...wiringOf(act)}
				/>
			) : null}
		</div>
	);
}

/** The line under a control whose options have ended: the failed sentence with Retry, or `words.missing`; nothing while they wait, stand still or answered. A `compact` control (a row's pick, a head's pill) has no line to stand under it, so its failure is the failed row's mark and retry icon at its end, named by the sentence and Retry: one line whatever the width, never past the row. */
export function OptionsLine(props: {
	drawn: Drawn<unknown>;
	retry: () => Promise<unknown>;
	compact?: boolean;
	/** The field's value: the line stands in the control's place, in the value column. */
	lone?: boolean;
}) {
	const { drawn, retry, compact, lone } = props;
	const words = useWords();
	if (!drawn.painted) return null;
	if (compact && isEnded(drawn.phase)) {
		const failed = drawn.phase === "failed";
		return (
			<span className={ENDED_MARKS}>
				<FailedMark label={failed ? words.readFailed : words.missing} />
				{failed ? (
					<IconButtonBase
						icon="RotateCw"
						label={words.retry}
						onClick={() => void retry()}
					/>
				) : null}
			</span>
		);
	}
	if (drawn.phase === "failed") {
		return (
			<StateLine
				flow={!lone}
				lone={lone}
				sentence={words.readFailed}
				act={{ label: words.retry, onAct: retry }}
			/>
		);
	}
	return drawn.phase === "missing" ? (
		<StateLine flow={!lone} lone={lone} sentence={words.missing} />
	) : null;
}

/** The line under a frame's heading row when a read it holds has data it could not refresh (stale, with Retry, pending while it runs) or waits for a connection (paused, nothing to press). */
export function FrameLine({
	frame,
	flow,
}: {
	frame: Frame;
	/** The line stands among a form's gapped children, which are its room. */
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
