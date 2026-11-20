import type { Dialog } from "@base-ui/react/dialog";
import { cn } from "@slotform/ui-core/cn";
import type { Acting } from "@slotform/ui-core/react/acts";
import { askDiscard } from "@slotform/ui-core/react/confirm";
import { hasBody, submitOf, useFrame } from "@slotform/ui-core/react/read";
import {
	TouchedContext,
	usePageTurn,
	useTouchState,
} from "@slotform/ui-core/react/touched";
import { useWords } from "@slotform/ui-core/react/words";
import type { Selection } from "@slotform/ui-core/read";
import {
	SHEET_FOOT,
	SHEET_PARTS,
	SHEET_PARTS_END,
} from "@slotform/ui-core/variants";
import type { ReactNode } from "react";
import { DIVIDER } from "../../atoms/section/card.tsx";
import type { Act } from "../../lib/act.ts";
import { useAct } from "../../lib/act.ts";
import type { Empty } from "../../lib/empty.tsx";
import { FIELDS, firstTabbable } from "../../lib/focus.ts";
import { useTouch } from "../../lib/media.ts";
import { FrameBody, stillOf } from "../../lib/read.tsx";
import { useScrolls } from "../../lib/scrolls.ts";
import { Scroller, useScroller } from "../../lib/window.tsx";
import { ActionBarBase } from "../action-bar/base.tsx";
import { SheetHead } from "./head.tsx";
import { SheetLayer } from "./layer.tsx";

// The body takes a tab stop only while it scrolls with nothing tabbable inside.
const BODY =
	"flex flex-col grow min-h-0 overflow-y-auto overscroll-contain focus-visible:-outline-offset-2";
const PARTS = "flex flex-col";
// The card's foot carries the raised ground to the box's corners, so it follows
// the box's radius; on touch the box rounds its top only. The foot is a row
// on the desktop, a stack on touch, its acts at its end. It stands after the
// body, so a submit follows the fields it submits at both densities.
const FOOT =
	"flex items-center rounded-b-sheet touch:flex-col touch:items-stretch touch:rounded-b-none";
const END_ONLY = "justify-end";

/** A submit that runs nothing: the viewer says they have taken in what the sheet shows ("I saved them"), and the press closes the sheet. */
export interface Acknowledge {
	/** The acknowledgement's words (a short phrase; truncates). */
	label: string;
	onAct?: never;
	sheet?: never;
}

/** What completes a sheet: an act, or an acknowledgement that closes it. */
export type SheetSubmit = Act | Acknowledge;

/** Whether a sheet's submit acknowledges: it neither runs nor opens anything. Outside the package's exports. */
function acknowledges(submit: SheetSubmit): submit is Acknowledge {
	return submit.onAct === undefined && submit.sheet === undefined;
}

/** The act a sheet's submit runs: its own, or the sheet's close where it acknowledges. Outside the package's exports. */
export function submitAct(submit: SheetSubmit, close: () => void): Act {
	return acknowledges(submit) ? { label: submit.label, onAct: close } : submit;
}

/** What a task sheet draws: the public `Sheet`, the confirm and the toolbar's touch filters. Outside the package's exports. */
interface SheetBaseProps {
	open: boolean;
	onClose: () => void;
	/** Hears a trigger tied by `handle` opening the sheet. */
	onOpen?: () => void;
	title: string;
	description?: string;
	/** A task sheet's second page: its way back stands first in the head (`Sheet`'s `back`). */
	back?: () => void;
	submit?: SheetSubmit;
	/** A decision's acts, the foot's `ActionBar` at both densities. */
	acts?: Act[];
	/** A decision is centred on the desktop. */
	centred?: boolean;
	/** What the body holds, read once for the frame (`Sheet`'s `read`): the submit paints, inert, while it waits or stands still, and stands blocked with the failed sentence once it failed or is missing. */
	read?: Selection<unknown>;
	/** The body's sentence when the `read` is empty. */
	empty?: Empty;
	/** The holder of the sheet's acts' attempt, when a form in its body has a bar of its own (the one holder keeps the dismissal held while either runs). Absent, the sheet hosts its own. */
	acting?: Acting<number>;
	/** What the sheet opens focused on: its first field (a confirm's typed name); a decision without it opens on its first act, the way out, and a task's body on its first field, else its first control, else the close act. */
	focus?: "field";
	/** Ties a trigger elsewhere (a `Dialog.Trigger`) to the sheet. */
	handle?: Dialog.Handle<unknown>;
	/** The body's parts, at the card inset. */
	children?: ReactNode;
	/** The body's form (a `SheetForm`), after the parts under a hairline: its rows flush on the sheet, its foot stuck to the body's. */
	fields?: ReactNode;
	/** The sheet opened after this one (the sheet outlet's), drawn inside this one's dialog. */
	nested?: ReactNode;
}

/** A sheet over the scrim: on touch raised from the bottom edge, its submit alone in the foot after the body, a blocked submit's reason under it; on the desktop a card centred across the page, its top a static inset under the viewport's top, capped at the viewport less the page inset, its body scrolling, with the submit after Cancel in the foot (alone where it acknowledges), or a decision centred. Base UI's dialog traps focus and closes on Escape and on a press outside. */
export function SheetBase({
	open,
	onClose,
	onOpen,
	title,
	description,
	back,
	submit: given,
	acts,
	centred: decision,
	handle,
	acting: holder,
	focus,
	read,
	empty,
	children,
	fields,
	nested,
}: SheetBaseProps) {
	const touch = useTouch();
	const frame = useFrame(read);
	const words = useWords();
	const own = useAct<number>("line");
	// The submit waits only on the sheet's own read: painted while it waits or
	// stands still, blocked with the sentence once it ended.
	const { waiting, ended } = submitOf(words, frame.shape);
	// A submit that acknowledges closes the sheet, and stands alone: there is
	// nothing to cancel.
	const acknowledging = given !== undefined && acknowledges(given);
	const offered = given && submitAct(given, onClose);
	// The sheet hosts its acts' attempt: its foot bar and its form's bar share one,
	// so one act pends at a time and the dismissal is held while it runs.
	const acting = holder ?? own;
	// A sheet with no foot (no submit, no bar of acts) ends on its last part, which
	// keeps a sections gap under it (`SHEET_PARTS_END`).
	const footless = acts === undefined && offered === undefined;
	// The body is the frame's: its failure and its emptiness stand in its place,
	// at the sheet's inset. Its parts stand at the card inset; the form after
	// them is rows flush on the sheet, the hairline between the two drawn once.
	const body =
		hasBody(frame, children) || fields ? (
			<FrameBody frame={frame} fit="part" empty={empty}>
				{children ? (
					<div
						className={cn(
							SHEET_PARTS,
							PARTS,
							footless && !fields && SHEET_PARTS_END,
						)}
					>
						{children}
					</div>
				) : null}
				{fields}
			</FrameBody>
		) : null;
	const [touchedValue, setTouched] = useTouchState();
	const { leave } = touchedValue;
	const scroll = useScroller();
	useScrolls(scroll.node);
	// A sheet whose `form` stands edited asks before it closes: "Discard your
	// edit?", as a page's form does when its page is left, since the form's
	// edit is dropped as the sheet opens again. A bare control in the body holds
	// the app's value, which the sheet keeps, so it asks nothing for it. A
	// decision holds no edit of the sheet's: what it takes is its own pick.
	const asks = !decision && leave.asks();
	const dismiss = () => {
		if (!asks) return onClose();
		void leave
			.attempt(() => askDiscard(words))
			.then((discard) => {
				if (discard) onClose();
			});
	};
	const centred = decision === true && !touch;
	usePageTurn(open, title, description, () => setTouched(false));
	// A decision draws no close act: its acts dismiss it.
	const head = (
		<SheetHead
			title={title}
			description={description}
			back={back}
			frame={frame}
			centred={centred}
			close={!acts}
			holds={acting.holds}
			asks={asks}
			onClose={onClose}
		/>
	);
	// The submit stands in the foot's bar after the body, after Cancel on the
	// desktop and alone on touch, where the close act leads the head, and where
	// it acknowledges. The bar stands it blocked once the read ended and draws
	// the sentence on a press only; a blocked reason and a failed run's
	// sentence stand under it.
	const bar =
		acts ??
		(offered
			? touch || acknowledging
				? [offered]
				: [{ label: words.cancel, onAct: dismiss }, offered]
			: undefined);
	const actionBar = bar ? (
		<ActionBarBase
			acts={bar}
			acting={acting}
			painted={waiting}
			ended={acts ? undefined : ended}
		/>
	) : null;
	const footer = actionBar ? (
		<div className={cn(SHEET_FOOT, FOOT, END_ONLY)}>{actionBar}</div>
	) : null;
	const content = centred ? (
		<>
			{head}
			{body}
			{actionBar}
		</>
	) : (
		<>
			{head}
			{body ? (
				<div
					ref={scroll.ref}
					aria-busy={(frame.holds && frame.shape === "waiting") || undefined}
					data-still={stillOf(frame)}
					className={cn(BODY, DIVIDER)}
				>
					<Scroller value={scroll}>{body}</Scroller>
				</div>
			) : null}
			{footer}
		</>
	);
	return (
		<SheetLayer
			handle={handle}
			open={open}
			onOpen={onOpen}
			onClose={() => {
				if (!acting.holds) dismiss();
			}}
			place={decision ? "centred" : undefined}
			// A field and an act take no ref (their props are closed), so the
			// popup finds them. A decision opens on its way out: on touch the
			// stack draws the filled act first, so the first tabbable is not it.
			focus={
				focus === "field"
					? (popup) => popup?.querySelector("input") ?? true
					: acts
						? (popup) =>
								[...(popup?.querySelectorAll("button") ?? [])].find(
									(act) => act.textContent === acts[0]?.label,
								) ?? true
						: // The head's close act stands first in the tab order, but
							// the task is the body's: its first field, else its first
							// control.
							() =>
								firstTabbable(scroll.holder.current, FIELDS) ??
								firstTabbable(scroll.holder.current) ??
								true
			}
			// A field inside takes input: a blocked act says its reason.
			// Only the sheet's `form` edits its leave (through its own
			// form's change): a bare control holds the app's value, which
			// the sheet does not drop, so it asks nothing for it.
			onChange={() => setTouched(true)}
			nested={nested}
		>
			<TouchedContext value={touchedValue}>{content}</TouchedContext>
		</SheetLayer>
	);
}
