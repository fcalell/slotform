import { cn } from "@slotform/ui-core/cn";
import { groupKey, type ProcedureCall } from "@slotform/ui-core/form";
import type { Acting } from "@slotform/ui-core/react/acts";
import { useArrivals } from "@slotform/ui-core/react/arrive";
import type { FormModel, StepModel } from "@slotform/ui-core/react/form";
import {
	type Frame,
	submitOf,
	useFrame,
	usePainted,
} from "@slotform/ui-core/react/read";
import {
	type Touched,
	TouchedContext,
	useEditedByValue,
} from "@slotform/ui-core/react/touched";
import { useWords } from "@slotform/ui-core/react/words";
import type { Selection } from "@slotform/ui-core/read";
import {
	BLOCK_IN,
	FORM_FIELD_SUMMARY_GLYPH,
	FORM_GROUP,
	LIST_BAND,
	row,
	SHEET_PARTS,
	text,
	textStrong,
} from "@slotform/ui-core/variants";
import type { ReactNode } from "react";
import { useId, useState } from "react";
import { Icon } from "../../atoms/icon/index.tsx";
import { DIVIDER } from "../../atoms/section/card.tsx";
import type { Act } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import type { Empty } from "../../lib/empty.tsx";
import { useLeaveGuard } from "../../lib/leave.ts";
import { BusyMark, FrameBody, FrameLine, stillOf } from "../../lib/read.tsx";
import { ActionBarBase } from "../action-bar/base.tsx";
import type { ActionBarProps } from "../action-bar/index.tsx";
import { Button } from "../button/index.tsx";
import { Text } from "../text/index.tsx";

// The form is its rows over its foot: docs/architecture/ui-core/layout.md, "Rows grid".
const BAND = "flex flex-col";
// A sheet's parts after the fields stand in a column.
const AFTER = "flex flex-col";
// The legend is a line, the busy mark after its title.
const LEGEND = "flex items-center gap-gap";
// A folded step's row: the check, the title, the answers cut at the line's
// end, the Edit act.
const SUMMARY = "flex items-center min-w-0";
const SUMMARY_GLYPH = "flex shrink-0";
const SUMMARY_TITLE = "min-w-0 truncate";
const SUMMARY_ANSWERS = "min-w-0 grow truncate";

/** One group of fields a `Form` draws as a run of its rows under a band. */
interface FormGroup {
	/** The group's name, on its band (a short phrase; wraps); without it the group is a run with no band, for fields that lead or close the form among titled groups. */
	title?: string;
	/** Under the title on the band (a sentence; wraps). */
	description?: string;
	/** The group's `FormField`s, its rows. */
	fields: ReactNode;
	/** What the group's fields hold, read once for the group's frame: its leaves paint while it waits, and its failure and a missing record stand in the fields' place. */
	read?: Selection<unknown>;
	/** The fields' sentence when the group's `read` is empty. */
	empty?: Empty;
	/** Where a form that asks one step at a time stands at this group: folded to its summary row, open, or not reached and not drawn. */
	step?: StepModel;
}

// A derived form's bar: its acts, and what a press of its blocked submit
// tells the form, as `useFormModel` gives it.
type FormBar = ActionBarProps &
	Pick<NonNullable<FormModel<ProcedureCall, Act>["bar"]>, "onBlocked">;

interface FormBase extends Closed {
	/** The acts that close the form, its last row under a hairline; the bar's filled act submits the form. */
	bar?: FormBar;
	/** `field`: each field commits itself, so the form draws no bar and, standing edited, asks nothing when its page is left. */
	commit?: "submit" | "field";
	/** What the form's fields hold, read once for the form's frame: the fields' leaves paint while it waits, the filled act with them, inert; its failure and a missing record stand in the fields' place, the filled act blocked with the failed sentence. Each group has its own, which the bar never reads. */
	read?: Selection<unknown>;
	/** The fields' sentence when the `read`'s selection is empty. */
	empty?: Empty;
	/** What follows the fields at the card inset (a live preview of what the form would send), the bar after it. */
	after?: ReactNode;
	/** A field holds a value other than its first: the form's leave stands edited. */
	edited: boolean;
}

/** The structure every form draws, which the derived `Form`, a `Sheet`'s form and a `Gate`'s form (each over a procedure) fill. Its structure is its props: `children`, a flat run of `FormField`s, or `groups`, each a run of rows under a band; never both. A form among a page's other sections is `Section > Form`, so every section's head-to-body gap stays the pair step. */
export type FormFrameProps = FormBase &
	(
		| {
				/** A flat run of `FormField`s, the form's rows. */
				children?: ReactNode;
				groups?: never;
		  }
		| {
				children?: never;
				/** Groups of fields, each a run of the form's rows under its band (the title over the description), a hairline between the runs. */
				groups: readonly FormGroup[];
		  }
	);

// One group: a run of the form's rows (a subgrid of the form's columns, so its
// labels align with the rest), its legend a band, then its fields, which are the group's own frame when it holds a `read`. A block of
// the form, fading in if it came on its own once the form was drawn (held
// from the first render, so a later commit does not cut it short).
function GroupBox(props: { group: FormGroup; arrived: boolean }) {
	const { group } = props;
	const frame = useFrame(group.read);
	const [fades] = useState(props.arrived);
	const id = useId();
	return (
		// biome-ignore lint/a11y/useSemanticElements: a fieldset lays its grid on an anonymous box, which cannot subgrid the form's columns
		<div
			role="group"
			aria-labelledby={group.title ? id : undefined}
			aria-busy={(frame.holds && frame.shape === "waiting") || undefined}
			data-still={stillOf(frame)}
			className={cn(FORM_GROUP, DIVIDER, fades && BLOCK_IN)}
		>
			{group.title || group.description ? (
				<div className={cn(LIST_BAND, BAND)}>
					{group.title ? (
						<span id={id} className={cn(text({ role: "heading" }), LEGEND)}>
							{group.title}
							<BusyMark frame={frame} />
						</span>
					) : null}
					{group.description ? (
						<Text kind="meta">{group.description}</Text>
					) : null}
				</div>
			) : null}
			<FrameLine frame={frame} flow />
			<FrameBody frame={frame} fit="part" empty={group.empty}>
				{group.fields}
			</FrameBody>
		</div>
	);
}

// A folded step: its check, its title, its answers a middle dot apart, and the
// Edit act that unfolds it.
function StepSummary(props: { step: StepModel }) {
	const { step } = props;
	const words = useWords();
	return (
		<div className={cn(row({ state: "rest" }), SUMMARY)}>
			<span className={cn(FORM_FIELD_SUMMARY_GLYPH, SUMMARY_GLYPH)}>
				<Icon name="Check" />
			</span>
			<p
				className={cn(
					text({ role: "body" }),
					textStrong({ role: "body" }),
					SUMMARY_TITLE,
				)}
			>
				{step.title}
			</p>
			<p className={cn(text({ role: "meta" }), SUMMARY_ANSWERS)}>
				{step.summary}
			</p>
			<Button
				glyph
				icon="Pencil"
				label={`${words.edit} ${step.title}`}
				onAct={step.edit}
			/>
		</div>
	);
}

// A group as the form draws it: a step not reached draws nothing, a folded one
// its summary row.
function drawnGroup(
	group: FormGroup,
	index: number,
	arrived: ReadonlySet<string>,
) {
	const key = groupKey(group, index);
	if (group.step?.state === "later") return null;
	if (group.step?.state === "done")
		return <StepSummary key={key} step={group.step} />;
	return <GroupBox key={key} group={group} arrived={arrived.has(key)} />;
}

/** A form's rows: its fields (`children`, or `groups` each under its band) in the frame of the form's own `read`, then what follows them (`after`) at the card inset. Outside the package's exports: a `Form`, a `Sheet`'s form and a `Gate`'s form stand them in their `FormShell`. */
export function FormRows({
	children,
	groups,
	empty,
	after,
	frame,
}: Pick<FormBase, "empty" | "after"> & {
	children?: ReactNode;
	groups?: readonly FormGroup[];
	/** The frame of the form's own `read`. */
	frame: Frame;
}) {
	// A step the viewer opens lands at once: every group's key, a step not
	// reached included, is the form's from its first draw.
	const arrived = useArrivals(
		groups?.map(groupKey) ?? [],
		frame.shape === "ready",
	);
	return (
		<>
			<div className={cn(FORM_GROUP, DIVIDER)}>
				<FrameLine frame={frame} flow />
				<FrameBody frame={frame} fit="part" empty={empty}>
					{groups
						? groups.map((group, index) => drawnGroup(group, index, arrived))
						: children}
				</FrameBody>
			</div>
			{after ? (
				<div className={cn(SHEET_PARTS, AFTER, DIVIDER)}>{after}</div>
			) : null}
		</>
	);
}

/** A form's bar: its acts, the filled one submitting the form. It submits what the form's own read gives, and the `outer` reads': it paints while either waits and stands blocked once the form's has ended. Outside the package's exports. */
export function useFormBar(
	bar: FormBar | undefined,
	frame: Frame,
	/** The reads the bar paints under besides the form's own (the sheet's read, the ability the form is gated on); constants are no read. */
	outer: readonly unknown[],
	/** The holder of the bar's run, when the form stands in one that holds more than the bar (a sheet's dismissal). */
	acting?: Acting<number>,
): ReactNode {
	const words = useWords();
	const { waiting, ended } = submitOf(words, frame.shape);
	const outerWaits = usePainted(outer);
	return bar ? (
		<ActionBarBase
			{...bar}
			acting={acting}
			painted={waiting || outerWaits}
			ended={ended}
			submits
		/>
	) : null;
}

/** The form element every form stands in: it hands its fields the `touch` it edits, asks before its page is left while that stands edited where it `guards` a leave, and says the busy and still state of the form's own read. Outside the package's exports. */
export function FormShell(props: {
	frame: Frame;
	/** The touched state the fields edit: the form's own, or a sheet's, which the sheet asks when it is closed. */
	touch: Touched;
	/** Leaving the page asks first while the form stands edited. */
	guards: boolean;
	/** A field holds a value other than its first: a value put back un-edits the form. */
	edited: boolean;
	className: string;
	children: ReactNode;
}) {
	const { frame, touch } = props;
	useLeaveGuard(touch.leave, props.guards);
	useEditedByValue(touch, props.edited);
	return (
		<TouchedContext value={touch}>
			{/* The submit act's click runs its `onAct`; the submit only stays on the page. */}
			<form
				onSubmit={(event) => event.preventDefault()}
				onChange={touch.touch}
				aria-busy={(frame.holds && frame.shape === "waiting") || undefined}
				data-still={stillOf(frame)}
				className={props.className}
			>
				{props.children}
			</form>
		</TouchedContext>
	);
}
