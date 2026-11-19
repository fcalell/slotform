import type { TrailPart } from "@fcalell/ui-core/route";
import { DOCKED_LOG_FLOOR_ROWS } from "@fcalell/ui-core/variants";
import {
	createContext,
	type RefObject,
	useLayoutEffect,
	useState,
} from "react";
import type { IconAct } from "./act.ts";

// The Shell's places-layer act, handed to the Pane: docs/architecture/ui-core/layout.md, "Container context".
export const ShellMenu = createContext<IconAct | undefined>(undefined);

// The Shell's trail (`placeTrail`), the current place last: a Pane draws the
// places above it, and a read with no Pane's `back` around it leads back to
// the last.
export const PlaceTrail = createContext<readonly TrailPart[]>([]);

// The route a Pane's back act returns to: docs/architecture/ui-core/layout.md, "Body".
export const BackRoute = createContext<string | undefined>(undefined);

// The two kinds of Pane a Panes holds, one of each at most: the place's own,
// and a record's after it.
export type PaneKind = "place" | "record";

// What a Panes hands its Panes: docs/architecture/ui-core/layout.md, "Panes".
export const PanesContainer = createContext<
	| { name: string | undefined; stand: (kind: PaneKind) => () => void }
	| undefined
>(undefined);

// Whether what draws stands in a Pane's body: the page for an unknown
// address under a record's Pane is that Pane's body, not a Pane of its own.
export const InPane = createContext(false);

// The id of the title that names what stands in a Pane or a Gate (the labelling
// a Thread's log and a Table's grid take).
export const PageTitle = createContext<string | undefined>(undefined);

// What a docked foot's region hands the docked `Sheet`: docs/architecture/ui-core/layout.md, "Container context".
export interface FootRegionValue {
	height: number;
	chrome: number;
	logFloor: number;
}

const BLOCK_PADDING = ["paddingTop", "paddingBottom"] as const;
const BLOCK_SIDES = [
	...BLOCK_PADDING,
	"borderTopWidth",
	"borderBottomWidth",
] as const;

function sum(
	style: CSSStyleDeclaration,
	sides: readonly (typeof BLOCK_SIDES)[number][],
): number {
	return sides.reduce(
		(total, side) => total + Number.parseFloat(style[side]),
		0,
	);
}

// The block padding of the body over the foot: the foot is bounded by the
// region less it, so the body's insets stand even where the foot takes the
// rest.
function overPadding(node: HTMLElement | null | undefined): number {
	return node ? sum(getComputedStyle(node), BLOCK_PADDING) : 0;
}

/** The region's measured value and the ref to put on it. `docked` is whether a docked sheet stands in the foot, the one reader of the value: the region is measured only while it does, so a region that grows with its content (a Thread among sections, a message landing) does not commit its owner a second time per update. `dock` is the foot's own node, which shares the region with a log; `over` is the body standing over the foot, whose block padding never gives way to it. */
export function useFootRegion(
	docked: boolean,
	dock: RefObject<HTMLElement | null>,
	over?: RefObject<HTMLElement | null>,
) {
	const [node, ref] = useState<HTMLElement | null>(null);
	const [value, setValue] = useState<FootRegionValue>({
		height: 0,
		chrome: 0,
		logFloor: 0,
	});
	// A sheet that docks is measured in the commit that draws it, before the
	// paint, and the value it was last measured at stands until then.
	useLayoutEffect(() => {
		if (!node || !docked) return;
		const measure = () => {
			const style = dock.current ? getComputedStyle(dock.current) : null;
			const next = {
				height: Math.round(node.getBoundingClientRect().height),
				chrome:
					(style ? sum(style, BLOCK_SIDES) : 0) + overPadding(over?.current),
				logFloor: style
					? DOCKED_LOG_FLOOR_ROWS *
						Number.parseFloat(style.getPropertyValue("--spacing-row"))
					: 0,
			};
			setValue((last) =>
				last.height === next.height &&
				last.chrome === next.chrome &&
				last.logFloor === next.logFloor
					? last
					: next,
			);
		};
		measure();
		const resize = new ResizeObserver(measure);
		resize.observe(node);
		return () => resize.disconnect();
	}, [node, docked, dock, over]);
	return { value, ref };
}
