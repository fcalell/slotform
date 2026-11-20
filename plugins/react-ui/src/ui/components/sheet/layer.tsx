import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@slotform/ui-core/cn";
import {
	LAYER_CARD,
	LAYER_SCRIM,
	LAYER_SHEET_BOTTOM,
	SCRIM,
	SHEET,
	SHEET_CENTERED,
	SHEET_DESKTOP,
} from "@slotform/ui-core/variants";
import {
	createContext,
	type ReactNode,
	type RefObject,
	use,
	useId,
	useRef,
} from "react";
import { PageTitle } from "../../lib/container.ts";
import { useReturnFocus } from "../../lib/focus.ts";
import { HeadingContext } from "../../lib/heading.ts";
import { useTouch } from "../../lib/media.ts";
import { PortalContainer } from "../../lib/portal.ts";
import { SHEET_BACKDROP } from "../../lib/walk-classes.ts";

// The layer the sheet stands on over the scrim (`SHEET_BACKDROP`): from the
// bottom edge on touch, centred on the desktop. The page inset above a bottom
// sheet keeps a strip of scrim over the tallest one, so a press above it still
// dismisses.
const LAYER_BOTTOM = `${SHEET_BACKDROP} flex flex-col justify-end pt-page`;
// A decision is centred over the page with no cap of its own.
const LAYER_CENTRED = `${SHEET_BACKDROP} flex items-center justify-center`;
// Any other card on the desktop opens one static top inset under the viewport's
// top and grows downward from it, the page inset below it, and gives way to what
// they leave, its body scrolling. A flex centre would move its top by half of
// every change under the member's hands (a textarea a line at a time, a
// wizard's next page).
const LAYER_DESKTOP = `${SHEET_BACKDROP} flex flex-col items-center pt-[12dvh] pb-page`;
const BOX_CARD = "max-h-full min-h-0";
// The popup takes focus only where nothing in it can (its body still painted
// while its read waits): it is no control, so it draws no ring, which would
// read as the whole sheet chosen.
const BOX = "relative flex flex-col focus-visible:outline-none";
// A view stands over the whole layer, rising and fading as a centred sheet
// does (it does not travel from its thumbnail). It takes no
// press, so the layer around its content hears one as a press on the scrim
// and dismisses; its content takes its own.
const BOX_VIEW = "relative size-full pointer-events-none";
// A bottom sheet is the toasts' anchor: docs/architecture/plugins/react-ui.md, "Toast anchor and stacking".
const BOX_BOTTOM = "max-h-full pb-safe [anchor-name:--docked-foot]";
// A menu that searches grows to the layer's height, which `max-h-full` caps at
// the page inset under the viewport's top.
const BOX_TALL = "grow";
const BOX_FLOAT = "max-w-full";

/** The layer's popup and the id of the title that names it, which its `SheetHead` draws. Outside the package's exports. */
export const SheetLayerContext = createContext<{
	popup: RefObject<HTMLDivElement | null>;
	titleId: string;
}>({ popup: { current: null }, titleId: "" });

/** A modal layer over the scrim: on touch a box raised from the bottom edge, on the desktop a card under a static top inset, a decision's card centred, a view over the whole layer. Base UI's dialog traps focus and closes on Escape and on a press outside; focus returns to where it was when it closes. Outside the package's exports. */
export function SheetLayer({
	open,
	onOpen,
	onClose,
	handle,
	place,
	tall,
	label,
	focus,
	onChange,
	nested,
	children,
}: {
	open: boolean;
	/** Hears a trigger tied by `handle` opening the layer. */
	onOpen?: () => void;
	/** Hears Escape and a press outside. */
	onClose: () => void;
	/** Ties a trigger elsewhere (a `Dialog.Trigger`) to the layer. */
	handle?: Dialog.Handle<unknown>;
	/** A decision is an alert, centred on the desktop; a view (an image's full size) is its children over the whole layer. */
	place?: "centred" | "view";
	/** A menu that searches stands the whole viewport height from its first frame, so its list does not jump as the filter narrows. */
	tall?: boolean;
	/** The layer's name where no `SheetHead` titles it (a view). */
	label?: string;
	/** What the layer opens focused on: the element a ref holds, or the one a function finds in the popup. */
	focus?:
		| RefObject<HTMLElement | null>
		| ((popup: HTMLDivElement | null) => HTMLElement | true);
	/** Hears a field inside taking input. */
	onChange?: () => void;
	/** A sheet opened over this one, drawn in this dialog's tree and outside its popup, so it takes none of the popup's contexts. */
	nested?: ReactNode;
	children?: ReactNode;
}) {
	const touch = useTouch();
	const container = use(PortalContainer);
	const titleId = useId();
	const popup = useRef<HTMLDivElement | null>(null);
	useReturnFocus(open, popup);
	const centred = place === "centred" && !touch;
	const view = place === "view";
	// The head's title names the layer unless a label does (a view).
	const named = label === undefined ? titleId : undefined;
	const box = view
		? cn(BOX_VIEW, LAYER_CARD)
		: touch
			? cn(SHEET, BOX, BOX_BOTTOM, tall && BOX_TALL, LAYER_SHEET_BOTTOM)
			: centred
				? cn(SHEET_CENTERED, BOX, BOX_FLOAT, LAYER_CARD)
				: cn(SHEET_DESKTOP, BOX, BOX_FLOAT, BOX_CARD, LAYER_CARD);
	const layer =
		view || centred ? LAYER_CENTRED : touch ? LAYER_BOTTOM : LAYER_DESKTOP;
	return (
		<Dialog.Root
			handle={handle}
			open={open}
			onOpenChange={(next) => {
				if (next) onOpen?.();
				else onClose();
			}}
		>
			<Dialog.Portal container={container}>
				<Dialog.Backdrop className={cn(SCRIM, SHEET_BACKDROP, LAYER_SCRIM)} />
				<Dialog.Viewport
					// A press on the scrim (the layer around the sheet) keeps focus
					// inside the sheet.
					onMouseDown={(event) => {
						if (event.target === event.currentTarget) event.preventDefault();
					}}
					className={layer}
				>
					<Dialog.Popup
						ref={popup}
						initialFocus={
							typeof focus === "function" ? () => focus(popup.current) : focus
						}
						role={place === "centred" ? "alertdialog" : "dialog"}
						// Base UI hides the page behind a modal and traps focus but
						// leaves the popup unmarked; the role promises it.
						aria-modal
						aria-label={label}
						aria-labelledby={named}
						onChange={onChange}
						className={box}
					>
						<SheetLayerContext value={{ popup, titleId }}>
							{/* The head's title is the layer's h2: what the layer holds heads under it, and its title names the parts a page title names. */}
							<PageTitle value={named}>
								<HeadingContext value={3}>{children}</HeadingContext>
							</PageTitle>
						</SheetLayerContext>
					</Dialog.Popup>
				</Dialog.Viewport>
			</Dialog.Portal>
			{
				// Base UI dismisses a modal on a press in a sibling modal; a dialog
				// under this one's root is its nested dialog, and only the topmost
				// hears Escape and a press outside.
				nested
			}
		</Dialog.Root>
	);
}
