import { cn } from "@fcalell/ui-core/cn";
import type { ProcedureCall } from "@fcalell/ui-core/form";
import type { Acting } from "@fcalell/ui-core/react/acts";
import { useArrivals } from "@fcalell/ui-core/react/arrive";
import type { FormModel } from "@fcalell/ui-core/react/form";
import {
	type Frame,
	submitOf,
	useFrame,
	usePainted,
} from "@fcalell/ui-core/react/read";
import {
	type Touched,
	TouchedContext,
	useEditedByValue,
} from "@fcalell/ui-core/react/touched";
import { useWords } from "@fcalell/ui-core/react/words";
import type { Selection } from "@fcalell/ui-core/read";
import {
	CARD,
	FORM_FOOT,
	GROUP_ITEM,
	LIST_BAND,
	SHEET_PARTS,
	text,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Text as RNText, View } from "react-native";
import type { Act } from "../../lib/act";
import type { Closed } from "../../lib/closed";
import type { Empty } from "../../lib/empty";
import { between } from "../../lib/group";
import { useLeaveGuard } from "../../lib/leave";
import { blockIn, FadingView } from "../../lib/motion";
import { BusyMark, FrameBody, FrameLine } from "../../lib/read";
import type { ActionBarProps } from "../action-bar";
import { ActionBarBase } from "../action-bar/base";
import { Text } from "../text";

// The form is its rows over its foot; no hairline between fields: docs/architecture/ui-core/layout.md, "Rows grid".
const ROWS = "min-w-0";
// A group's band: the title line over the description.
const BAND = "min-w-0";
// The legend is a row, the busy mark after its title.
const LEGEND = "flex-row items-center gap-gap";

interface FormGroup {
	/** The group's name, its heading (a short phrase; wraps); without it the group draws no heading, for fields that lead or close the form among titled groups. */
	title?: string;
	/** Under the title (a sentence; wraps). */
	description?: string;
	/** A note ahead of the fields (a `Banner`, a sentence). */
	lead?: ReactNode;
	/** The group's `FormField`s. */
	fields: ReactNode;
	/** What the group's fields hold, read once for the group's frame: its leaves paint while it waits, and its failure and a missing record stand in the fields' place. */
	read?: Selection<unknown>;
	/** The fields' sentence when the group's `read` is empty. */
	empty?: Empty;
}

// A derived form's bar: its acts, and what a press of its blocked submit
// tells the form, as `useFormModel` gives it.
type FormBar = ActionBarProps &
	Pick<NonNullable<FormModel<ProcedureCall, Act>["bar"]>, "onBlocked">;

interface FormBase extends Closed {
	/** The acts that close the form, drawn in its foot; the bar's filled act submits the form. */
	bar?: FormBar;
	/** `field`: each field commits itself, so the form draws no bar and, standing edited, asks nothing when its screen is left. */
	commit?: "submit" | "field";
	/** What the form's fields hold, read once for the form's frame: the fields' leaves paint while it waits, the filled act with them, inert; its failure and a missing record stand in the fields' place. Each group has its own. */
	read?: Selection<unknown>;
	/** The fields' sentence when the `read`'s selection is empty. */
	empty?: Empty;
	/** What follows the fields at the card inset (a live preview of what the form would send), the bar after it. */
	after?: ReactNode;
	/** A field holds a value other than its first: the form's leave stands edited. */
	edited: boolean;
}

// The form's structure is its props: `children`, a flat run of `FormField`s,
// or `groups`, each drawn as a titled group; never both. A form among a
// screen's other sections is `Section > Form`, so every section's head-to-body
// gap stays the pair step.
/** The structure every form draws, which the derived `Form`, a `Sheet`'s form and a `Gate`'s form (each over a procedure) fill. */
export type FormFrameProps = FormBase &
	(
		| {
				/** A flat run of `FormField`s, a fields step apart. */
				children?: ReactNode;
				groups?: never;
		  }
		| {
				children?: never;
				/** Groups of fields, a sections step apart, each its heading with its fields a fields step apart. */
				groups: readonly FormGroup[];
		  }
	);

// One group: a run of the form's rows, its legend a band, then its lead and
// its fields, which are the group's own frame when it holds a `read`. A block
// of the form: it fades in as it mounts if it came on its own once the form
// was drawn.
function GroupBox(props: { group: FormGroup; arrived: boolean; at: number }) {
	const { group } = props;
	const frame = useFrame(group.read);
	return (
		<FadingView
			entering={props.arrived ? blockIn() : undefined}
			role="group"
			accessibilityLabel={group.title}
			accessibilityState={{
				busy: frame.holds && frame.shape === "waiting",
			}}
			className={cn(ROWS, between(props.at))}
		>
			{group.title || group.description ? (
				<View className={cn(LIST_BAND, BAND)}>
					{group.title ? (
						<View className={LEGEND}>
							<RNText
								accessibilityRole="header"
								className={cn(text({ role: "heading" }), "shrink")}
							>
								{group.title}
							</RNText>
							<BusyMark frame={frame} />
						</View>
					) : null}
					{group.description ? (
						<Text kind="meta">{group.description}</Text>
					) : null}
				</View>
			) : null}
			<FrameLine frame={frame} flow />
			{group.lead ? <View className={GROUP_ITEM}>{group.lead}</View> : null}
			<FrameBody frame={frame} fit="part" empty={group.empty}>
				{group.fields}
			</FrameBody>
		</FadingView>
	);
}

// The form's rows: its read's line and body over its groups or its flat run of
// fields, then its `after` at the card inset, where the form draws it (a sheet
// draws its form's `after` itself, over the foot's bar). Outside the
// package's exports.
export function FormRows({
	children,
	groups,
	empty,
	after,
	frame,
}: FormFrameProps & { frame: Frame }) {
	const arrived = useArrivals(
		groups?.map((group, index) => group.title ?? String(index)) ?? [],
		frame.shape === "ready",
	);
	return (
		<>
			<View className={ROWS}>
				<FrameLine frame={frame} flow />
				<FrameBody frame={frame} fit="part" empty={empty}>
					{groups
						? groups.map((group, index) => (
								<GroupBox
									key={group.title ?? index}
									group={group}
									arrived={arrived.has(group.title ?? String(index))}
									at={index}
								/>
							))
						: children}
				</FrameBody>
			</View>
			{after ? <View className={SHEET_PARTS}>{after}</View> : null}
		</>
	);
}

// The form's foot: the bar it is given, its last row under a hairline, which
// submits what the form's own read gives (a group's read is the group's), and
// the `outer` reads': it paints while either waits and stands blocked once the
// form's has ended. A sheet that hoists the bar into its foot draws none here.
// Outside the package's exports.
export function useFormBar(
	bar: FormBar | undefined,
	frame: Frame,
	// The reads the bar paints under besides the form's own (the sheet's read,
	// the ability the form is gated on); constants are no read.
	outer: readonly unknown[],
	// The holder of the bar's run, when the form stands in one that holds more
	// than the bar (a docked sheet's dismissal).
	acting?: Acting<number>,
): ReactNode {
	const words = useWords();
	const { waiting, ended } = submitOf(words, frame.shape);
	const outerWaits = usePainted(outer);
	return bar ? (
		<View className={FORM_FOOT}>
			<ActionBarBase
				{...bar}
				acting={acting}
				painted={waiting || outerWaits}
				ended={ended}
			/>
		</View>
	) : null;
}

// What every form stands in: the touched state and the leave guard: docs/architecture/ui-core/acts.md, "Leave".
// Outside the package's exports.
export function FormShell({
	touch,
	guard,
	edited,
	card,
	frame,
	children,
}: {
	touch: Touched;
	guard: boolean;
	// A field holds a value other than its first: a value put back un-edits the form.
	edited: boolean;
	card: boolean;
	frame: Frame;
	children: ReactNode;
}) {
	useLeaveGuard(touch.leave, guard);
	useEditedByValue(touch, edited);
	return (
		<TouchedContext.Provider value={touch}>
			<View
				accessibilityState={{ busy: frame.holds && frame.shape === "waiting" }}
				className={cn(card && CARD, ROWS)}
			>
				{children}
			</View>
		</TouchedContext.Provider>
	);
}
