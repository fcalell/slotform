import type { OptionPick } from "@fcalell/ui-core/descriptors";
import { DOCKED_LOG_FLOOR_ROWS } from "@fcalell/ui-core/variants";
import {
	createContext,
	type ReactNode,
	type RefObject,
	useContext,
	useMemo,
	useRef,
	useState,
} from "react";
import type { LayoutChangeEvent, ViewInstance } from "react-native";
import type { Route } from "./route";
import { useCSSVariable } from "./theme";

// What the container molecules hand each other: docs/architecture/ui-core/layout.md, "On the phone".
export const ShellSwitcher = createContext<OptionPick | undefined>(undefined);

// The Shell hands its tab bar to each Panes, which draws it under its Pane.
export const ShellTabs = createContext<ReactNode>(null);

// The box the toasts stand in, in the Shell's coordinates.
export interface ToastBox {
	top: number;
	height: number;
}

// The Shell's root and its way to place the toasts' layer: docs/architecture/plugins/native-ui.md, "Container host".
export interface ToastContainer {
	root: RefObject<ViewInstance | null>;
	place: (box: ToastBox) => void;
}
export const ToastContainer = createContext<ToastContainer | null>(null);

// The ref and `onLayout` of the box a page draws for the toasts: docs/architecture/plugins/native-ui.md, "Container host".
// TODO: the layer follows the box one layout late (a growing foot, the
// keyboard); place it by layout once React Native can stand a layer after the
// sheets' host from the page's tree, or once the sheets host the toasts.
export function useToastBox() {
	const frame = useContext(ToastContainer);
	const box = useRef<ViewInstance>(null);
	const onLayout = () => {
		const root = frame?.root.current;
		if (!root) return;
		box.current?.measureLayout(root, (_x, top, _width, height) =>
			frame.place({ top, height }),
		);
	};
	return { ref: box, onLayout };
}

// The route of the Shell's current place, where a read with no Pane's `back`
// around it leads back.
export const PlaceRoute = createContext<Route | undefined>(undefined);

// The route a Pane's back act returns to: docs/architecture/ui-core/layout.md, "Body".
export const BackRoute = createContext<Route | undefined>(undefined);

// The name of the Shell's current place (the tab's label, "More" on the More
// page), which titles the place's Pane and stands in a record's bar.
export const PlaceName = createContext<string | undefined>(undefined);

// Whether the Panes is read from across a room (`distance` `room`): the Pane
// insets its head by the room set's page inset.
export const DistanceContext = createContext(false);

// Whether the part stands alone in its Pane's body (the Pane's one child, no
// record head): a Section or Table then fills the body and windows its rows in
// its own scroll. docs/architecture/plugins/native-ui.md, "Long collections".
export const BodyAlone = createContext(false);

// What a docked foot's region hands the docked `Sheet` it draws: docs/architecture/plugins/native-ui.md, "Docked sheet".
export interface FootRegionValue {
	height: number;
	chrome: number;
	logFloor: number;
}

// `logged` is whether a log shares the region with the foot.
export function useFootRegion(logged: boolean) {
	const [height, setHeight] = useState(0);
	const onLayout = (event: LayoutChangeEvent) =>
		setHeight(event.nativeEvent.layout.height);
	const acts = useTokenPx("--spacing-gap");
	const hairline = useTokenPx("--spacing-hairline");
	const logFloor = DOCKED_LOG_FLOOR_ROWS * useTokenPx("--spacing-row");
	const value = useMemo(
		() => ({
			height,
			chrome: 2 * acts + hairline,
			logFloor: logged ? logFloor : 0,
		}),
		[height, acts, hairline, logFloor, logged],
	);
	return { value, onLayout };
}

// A size token as the layout reads it, zero while it is unset.
export function tokenPx(value: unknown): number {
	return Number.parseFloat(String(value ?? 0));
}

// A token in px where the component stands: the theme's `size` knob and a room
// scope's own values reach it, which a number fixed at the sheet's never does.
export function useTokenPx(name: string): number {
	return tokenPx(useCSSVariable(name));
}

// The claim a docked foot region holds for the input that returns: docs/architecture/plugins/native-ui.md, "Docked sheet".
export const FootReturn = createContext<RefObject<boolean> | null>(null);
