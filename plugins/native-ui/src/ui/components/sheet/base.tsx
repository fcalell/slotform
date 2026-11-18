import { cn } from "@fcalell/ui-core/cn";
import type { Acting } from "@fcalell/ui-core/react/acts";
import { submitOf, useFrame, usePainted } from "@fcalell/ui-core/react/read";
import { useWords } from "@fcalell/ui-core/react/words";
import type { Selection } from "@fcalell/ui-core/read";
import {
	SHEET_FOOT,
	SHEET_PARTS,
	SHEET_PARTS_END,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { View } from "react-native";
import type { Act } from "../../lib/act";
import { useAct } from "../../lib/act";
import type { Empty } from "../../lib/empty";
import { FrameBody, useSubmitOf } from "../../lib/read";
import type { ActionBarProps } from "../action-bar";
import { ActionBarBase } from "../action-bar/base";
import { SheetHead } from "./head";
import { SheetLayer } from "./layer";

const BODY = "grow min-h-0";

interface FootProps {
	submit?: Act;
	acts?: Act[];
	// The form's bar.
	bar?: ActionBarProps;
	// The holder of the sheet's acts' attempt: its submit, its foot's acts and its
	// form's bar share it, and it holds the dismissal while one runs.
	acting: Acting<number>;
	// The body's read waits or stands still: the submit paints, inert.
	painted?: boolean;
	// Why the body's read ended: the form's bar stands blocked under it too.
	ended?: string;
	// What the form in the body holds: the form's bar, hoisted into the foot,
	// submits what that gives.
	barRead?: Selection<unknown>;
	// The reads the form's bar paints under besides the form's and the body's
	// (the ability the form is gated on).
	barOuter?: readonly unknown[];
}

// The form's bar: it subscribes to the form's read itself, since the form that
// owns the read stands in the body and the bar in the footer.
function FormBar({
	bar,
	acting,
	painted,
	ended,
	barRead,
	barOuter = [],
}: Omit<FootProps, "submit" | "acts">) {
	const form = useSubmitOf(barRead);
	const outerWaits = usePainted(barOuter);
	if (!bar) return null;
	return (
		<ActionBarBase
			{...bar}
			acting={acting}
			painted={painted || form.waiting || outerWaits}
			ended={ended ?? form.ended}
		/>
	);
}

// A decision's acts, the submit, then the form's bar, in gorhom's footer:
// gorhom measures it with the sheet and keeps it above the keyboard, so the
// submit follows the fields it submits and a keyboard never covers it. The
// bar stands the submit painted while the body's read waits and blocked once
// it ended, its reason or a failed run's sentence under it. Nothing in it, it
// draws nothing and the footer is no height.
function Foot({
	acts,
	submit,
	bar,
	acting,
	painted,
	ended,
	barRead,
	barOuter,
}: FootProps) {
	if (!acts && !submit && !bar) return null;
	return (
		<View className={SHEET_FOOT}>
			{acts ? <ActionBarBase acts={acts} acting={acting} /> : null}
			{submit ? (
				<ActionBarBase
					acts={[submit]}
					acting={acting}
					painted={painted}
					ended={ended}
				/>
			) : null}
			{bar ? (
				<FormBar
					bar={bar}
					acting={acting}
					painted={painted}
					ended={ended}
					barRead={barRead}
					barOuter={barOuter}
				/>
			) : null}
		</View>
	);
}

/** A submit that runs nothing: the viewer says they have taken in what the sheet shows ("I saved them"), and the press closes the sheet. */
export interface Acknowledge {
	/** The acknowledgement's words (a short phrase; truncates). */
	label: string;
	onAct?: never;
	sheet?: never;
}

/** What completes a sheet: an act, or an acknowledgement that closes it. */
export type SheetSubmit = Act | Acknowledge;

/** The act a sheet's submit runs: its own, or the sheet's close where it acknowledges (it neither runs nor opens anything). Outside the package's exports. */
export function submitAct(submit: SheetSubmit, close: () => void): Act {
	return submit.onAct !== undefined || submit.sheet !== undefined
		? submit
		: { label: submit.label, onAct: close };
}

/** What a task sheet draws: the public `Sheet` and the confirm. Outside the package's exports. */
interface SheetBaseProps {
	open: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	back?: () => void;
	submit?: SheetSubmit;
	// A decision's acts, the foot's `ActionBar`.
	acts?: Act[];
	// A form's bar, the foot's `ActionBar`.
	bar?: ActionBarProps;
	// What the body holds, read once for the frame (`Sheet`'s `read`): the submit
	// paints, inert, while it waits or stands still, and stands blocked with the
	// failed sentence once it failed or is missing.
	read?: Selection<unknown>;
	// The body's sentence when the `read` is empty.
	empty?: Empty;
	// The read the form in the body holds: the form's bar, hoisted into the
	// foot, paints while it or the body's waits and stands blocked once either
	// has ended. A group's read is the group's.
	barRead?: Selection<unknown>;
	// The reads the form's bar paints under besides the form's and the body's
	// (the ability the form is gated on).
	barOuter?: readonly unknown[];
	// The holder of the sheet's acts' attempt, when a holder above it hosts more
	// (a `Sheet` holds its form's bar too). Absent, the sheet hosts its own.
	acting?: Acting<number>;
	// The body's parts, at the card inset.
	children?: ReactNode;
	/** The body's parts after the `form`, at the card inset: what follows the fields it answers (a live preview of what the form would send). */
	after?: ReactNode;
	// The body's form (a `SheetForm`), after the parts: its rows flush on the
	// sheet.
	fields?: ReactNode;
}

// A task sheet in the `SheetLayer`: the head (the close act, or back on a
// second page, or neither for a decision, whose acts dismiss it, the title,
// the description under it), the body under it, and the foot (a decision's
// acts, the submit, a form's bar) in gorhom's footer, measured with the sheet
// and held above the keyboard. A submit that acknowledges closes the sheet.
export function SheetBase({
	open,
	onClose,
	title,
	description,
	back,
	submit: offered,
	acts,
	bar,
	acting: given,
	read,
	empty,
	barRead,
	barOuter,
	children,
	after,
	fields,
}: SheetBaseProps) {
	const frame = useFrame(read);
	const words = useWords();
	// The submit waits only on the sheet's own read: painted while it waits or
	// stands still, blocked with the sentence once it ended.
	const { waiting, ended } = submitOf(words, frame.shape);
	const submit = offered && submitAct(offered, onClose);
	const own = useAct<number>("line");
	const acting = given ?? own;
	let body: ReactNode = null;
	if (children || after || fields || read !== undefined)
		body = (
			<View
				accessibilityState={{ busy: frame.holds && frame.shape === "waiting" }}
				className={BODY}
			>
				<FrameBody frame={frame} fit="part" empty={empty}>
					{children ? (
						<View
							className={cn(
								SHEET_PARTS,
								submit === undefined &&
									acts === undefined &&
									!fields &&
									!after &&
									SHEET_PARTS_END,
							)}
						>
							{children}
						</View>
					) : null}
					{fields}
					{after ? (
						<View
							className={cn(
								SHEET_PARTS,
								submit === undefined && acts === undefined && SHEET_PARTS_END,
							)}
						>
							{after}
						</View>
					) : null}
				</FrameBody>
			</View>
		);
	return (
		<SheetLayer
			open={open}
			onClose={onClose}
			title={title}
			description={description}
			holds={acting.holds}
			head={
				<SheetHead
					title={title}
					description={description}
					back={back}
					onClose={acts ? undefined : onClose}
					holds={acting.holds}
					frame={frame}
				/>
			}
			foot={
				<Foot
					acts={acts}
					submit={submit}
					bar={bar}
					acting={acting}
					painted={waiting}
					ended={ended}
					barRead={barRead}
					barOuter={barOuter}
				/>
			}
		>
			{body}
		</SheetLayer>
	);
}
