import { cn } from "@fcalell/ui-core/cn";
import type { Acting } from "@fcalell/ui-core/react/acts";
import { useArrivals } from "@fcalell/ui-core/react/arrive";
import {
	type Frame,
	submitOf,
	useFrame,
	usePainted,
} from "@fcalell/ui-core/react/read";
import { type Touched, TouchedContext } from "@fcalell/ui-core/react/touched";
import { useWords } from "@fcalell/ui-core/react/words";
import type { Selection } from "@fcalell/ui-core/read";
import {
	BLOCK_IN,
	FORM_GROUP,
	GROUP_ITEM,
	LIST_BAND,
	SHEET_PARTS,
	text,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { useId, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import type { Empty } from "../../lib/empty.tsx";
import { useLeaveGuard } from "../../lib/leave.ts";
import { BusyMark, FrameBody, FrameLine } from "../../lib/read.tsx";
import { DIVIDER } from "../../parts/section/card.tsx";
import { ActionBarBase } from "../action-bar/base.tsx";
import type { ActionBarProps } from "../action-bar/index.tsx";
import { Text } from "../text/index.tsx";

// The form is its rows over its foot: docs/architecture/ui-core/layout.md, "Rows grid".
const BAND = "flex flex-col";
// A sheet's parts after the fields stand in a column.
const AFTER = "flex flex-col";
// The legend is a line, the busy mark after its title.
const LEGEND = "flex items-center gap-gap";

/** One group of fields a `Form` draws as a run of its rows under a band. */
interface FormGroup {
	/** The group's name, on its band (a short phrase; wraps); without it the group is a run with no band, for fields that lead or close the form among titled groups. */
	title?: string;
	/** Under the title on the band (a sentence; wraps). */
	description?: string;
	/** A note ahead of the fields (a `Banner`, a sentence), a row at the card's inset. */
	lead?: ReactNode;
	/** The group's `FormField`s, its rows. */
	fields: ReactNode;
	/** What the group's fields hold, read once for the group's frame: its leaves paint while it waits, and its failure and a missing record stand in the fields' place. */
	read?: Selection<unknown>;
	/** The fields' sentence when the group's `read` is empty. */
	empty?: Empty;
}

interface FormBase extends Closed {
	/** The acts that close the form, its last row under a hairline; the bar's filled act submits the form. */
	bar?: ActionBarProps;
	/** `field`: each field commits itself, so the form draws no bar and, standing edited, asks nothing when its page is left. */
	commit?: "submit" | "field";
	/** What the form's fields hold, read once for the form's frame: the fields' leaves paint while it waits, the filled act with them, inert; its failure and a missing record stand in the fields' place, the filled act blocked with the failed sentence. Each group has its own, which the bar never reads. */
	read?: Selection<unknown>;
	/** The fields' sentence when the `read`'s selection is empty. */
	empty?: Empty;
	/** What follows the fields at the card inset (a live preview of what the form would send), the bar after it. */
	after?: ReactNode;
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
// labels align with the rest), its legend a band, then its lead and its
// fields, which are the group's own frame when it holds a `read`. A block of
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
			data-still={(frame.holds && frame.shape === "still") || undefined}
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
			{group.lead ? <div className={GROUP_ITEM}>{group.lead}</div> : null}
			<FrameBody frame={frame} fit="part" empty={group.empty}>
				{group.fields}
			</FrameBody>
		</div>
	);
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
	const arrived = useArrivals(
		groups?.map((group, index) => group.title ?? String(index)) ?? [],
		frame.shape === "ready",
	);
	return (
		<>
			<div className={cn(FORM_GROUP, DIVIDER)}>
				<FrameLine frame={frame} flow />
				<FrameBody frame={frame} fit="part" empty={empty}>
					{groups
						? groups.map((group, index) => (
								<GroupBox
									key={group.title ?? index}
									group={group}
									arrived={arrived.has(group.title ?? String(index))}
								/>
							))
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
	bar: ActionBarProps | undefined,
	frame: Frame,
	/** The reads the bar paints under besides the form's own (the sheet's read, the ability the form is gated on); constants are no read. */
	outer: readonly unknown[],
	/** The holder of the bar's run, when the form stands in one that holds more than the bar (a sheet's dismissal). */
	acting?: Acting<number>,
): ReactNode {
	// A group's read is the group's, not the bar's.
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
	className: string;
	children: ReactNode;
}) {
	const { frame, touch } = props;
	useLeaveGuard(touch.leave, props.guards);
	return (
		<TouchedContext value={touch}>
			{/* The submit act's click runs its `onAct`; the submit only stays on the page. */}
			<form
				onSubmit={(event) => event.preventDefault()}
				onChange={touch.touch}
				aria-busy={(frame.holds && frame.shape === "waiting") || undefined}
				data-still={(frame.holds && frame.shape === "still") || undefined}
				className={props.className}
			>
				{props.children}
			</form>
		</TouchedContext>
	);
}
