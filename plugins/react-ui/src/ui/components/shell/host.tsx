import { Toast as ToastControl } from "@base-ui/react/toast";
import { Tooltip } from "@base-ui/react/tooltip";
import { cn } from "@fcalell/ui-core/cn";
import { useWords } from "@fcalell/ui-core/react/words";
import { TOASTS } from "@fcalell/ui-core/variants";
import { type ReactNode, use, useState } from "react";
import { useModality } from "../../lib/modality.ts";
import { PortalContainer, PortalRegion } from "../../lib/portal.ts";
import { RECENT } from "../../lib/rest.ts";
import { toasts } from "../../lib/toast.ts";
import { Confirmations } from "../sheet/confirm.tsx";
import { ToastList } from "../toast/layer.tsx";
import { CutText } from "./cut.tsx";
import { DragLayer } from "./drag.tsx";

// The frame's `main` landmark: it holds the toasts' layer over the page.
const MAIN = "relative flex flex-col grow min-h-0";
// The toasts' layer stands over the sheets: docs/architecture/plugins/react-ui.md, "Toast anchor and stacking".
// The popups' mount: docs/architecture/plugins/react-ui.md, "Popups".
const PORTAL = "fixed top-0 left-0 size-0 z-(--layer-popover)";
// A sheet as tall as the viewport leaves the layer no room above it, so the
// layer keeps its frontmost toast's height and the page inset round it (Base UI's
// `--toast-frontmost-height` on the viewport) and the toast then stands at the
// top of the viewport, over the sheet's head, never off the screen.
export const TOASTS_LAYER =
	"fixed inset-0 bottom-[anchor(--docked-foot_top,0px)] min-h-[calc(var(--toast-frontmost-height,0px)+2*var(--spacing-page))] z-(--layer-toasts) flex flex-col items-end justify-end pointer-events-none touch:items-center";

/** What a root container (the Shell, the Gate) mounts around itself: the `toast()` queue, the `confirm()` decisions, the tooltips' shared window, the one tooltip for cut text, the layer a drag draws on and the modality its rings read. Outside the package's exports. */
export function ContainerHost({ children }: { children: ReactNode }) {
	useModality();
	// The popups' container is an element of `main`, so it is state until the
	// frame's `main` mounts it.
	const [portal, setPortal] = useState<HTMLElement | null>(null);
	return (
		<ToastControl.Provider toastManager={toasts}>
			<Tooltip.Provider timeout={RECENT}>
				<PortalContainer value={portal}>
					<PortalRegion value={setPortal}>
						{children}
						<Confirmations />
						<CutText />
						<DragLayer />
					</PortalRegion>
				</PortalContainer>
			</Tooltip.Provider>
		</ToastControl.Provider>
	);
}

/** The frame's `main`: its page and the toasts' layer over it. It stands inside a `ContainerHost`, whose popups' container it mounts. */
export function ContainerMain(props: {
	children: ReactNode;
	className?: string;
}) {
	const words = useWords();
	const region = use(PortalRegion);
	return (
		<main className={cn(MAIN, props.className)}>
			{props.children}
			<div ref={region} className={PORTAL} />
			<ToastControl.Viewport
				aria-label={words.notifications}
				className={cn(TOASTS, TOASTS_LAYER)}
			>
				<ToastList />
			</ToastControl.Viewport>
		</main>
	);
}
