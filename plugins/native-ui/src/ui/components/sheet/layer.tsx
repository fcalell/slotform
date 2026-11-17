import {
	PortProvider,
	type ReadPort,
	usePort,
} from "@fcalell/ui-core/react/port";
import {
	type Touched,
	TouchedContext,
	usePageTurn,
	useTouchState,
} from "@fcalell/ui-core/react/touched";
import { createStore, type Store } from "@fcalell/ui-core/store";
import { SCRIM, SHEET } from "@fcalell/ui-core/variants";
import {
	BottomSheetBackdrop,
	type BottomSheetBackdropProps,
	type BottomSheetBackgroundProps,
	BottomSheetFooter,
	type BottomSheetFooterProps,
	BottomSheetModal,
	BottomSheetScrollView,
	BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
	createContext,
	type PropsWithChildren,
	type ReactNode,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";
import { FieldNameContext } from "../../lib/field";
import { released } from "../../lib/follow";
import { timing } from "../../lib/motion";
import { RaisedGround } from "../../lib/raised";

// The modal layer over the app while the sheet is open.
const LAYER = "absolute inset-0";
// A view's children fill the whole layer over the scrim.
const VIEW = "flex-1";
const FULL = ["100%"];
// The sheet enters at the base rung on the out curve and leaves at the base
// rung on the in curve (`LAYER_SHEET_BOTTOM`); the scrim fades with it, its
// opacity read off the sheet's position. gorhom follows the finger's drag
// down 1:1 and runs the release (the settle back or the swipe's close) and the
// scrim's close on the sheet's `animationConfigs`, so the sheet holds the
// enter timing until it has settled open, the release timing (`base` `out`,
// the follow's) from then on. The timings are read when the sheet opens, so
// the tuning page's rungs reach the next one.
const enter = () => timing("base", "out");
const leave = () => timing("base", "in");

// The scrim under the sheet, its own fill at full opacity.
const ScrimBase = withUniwind(BottomSheetBackdrop);
const ViewBody = withUniwind(BottomSheetView);

// What the head, the foot and the scrim draw: docs/architecture/plugins/native-ui.md, "Sheets". The regions are module
// components reading this, never closures.
interface Parts {
	title: string;
	head?: ReactNode;
	foot?: ReactNode;
	// The dismissal is held while an act of the sheet runs.
	holds: boolean;
	touched: Touched;
	// The read port: the body is drawn in gorhom's portal, outside the providers
	// above the sheet, and its leaves subscribe to their reads through it.
	port: ReadPort;
}

const PartsContext = createContext<Parts | undefined>(undefined);

function useParts(): Parts {
	const parts = useContext(PartsContext);
	if (!parts) throw new Error("A sheet's part is drawn outside its sheet.");
	return parts;
}

// A sheet's layer reads its value through a store: docs/architecture/plugins/native-ui.md, "Sheets".
function layerOf(parts: Store<Parts>) {
	return function Layer({ children }: PropsWithChildren) {
		const current = useSyncExternalStore(parts.subscribe, parts.get);
		return (
			<PortProvider port={current.port}>
				{current.port.carry(
					<PartsContext.Provider value={current}>
						<FieldNameContext.Provider value={current.title}>
							<TouchedContext.Provider value={current.touched}>
								<View
									accessibilityViewIsModal
									pointerEvents="box-none"
									className={LAYER}
								>
									{children}
								</View>
							</TouchedContext.Provider>
						</FieldNameContext.Provider>
					</PartsContext.Provider>,
				)}
			</PortProvider>
		);
	};
}

function Ground({ style }: BottomSheetBackgroundProps) {
	return <View pointerEvents="none" style={style} className={SHEET} />;
}

function Scrim(props: BottomSheetBackdropProps) {
	const { holds } = useParts();
	return (
		<ScrimBase
			{...props}
			className={SCRIM}
			opacity={1}
			appearsOnIndex={0}
			disappearsOnIndex={-1}
			pressBehavior={holds ? "none" : "close"}
		/>
	);
}

function Head() {
	return useParts().head;
}

// The home indicator's inset is the footer's `bottomInset`: gorhom lifts the
// footer by it while the keyboard is down and drops it once the keyboard is
// up, so no gap stands between the foot and the keyboard.
function Footer(props: BottomSheetFooterProps) {
	const insets = useSafeAreaInsets();
	const { foot } = useParts();
	return (
		<BottomSheetFooter {...props} bottomInset={insets.bottom}>
			<RaisedGround>{foot}</RaisedGround>
		</BottomSheetFooter>
	);
}

/** The bottom sheet's modal layer every sheet stands in: the public `Sheet`, the confirm, a `Menu`, the Picker's options and an image's full view. Outside the package's exports. */
interface SheetLayerProps {
	open: boolean;
	onClose: () => void;
	// Names a typing control inside that no `FormField` labels. A new `title`
	// or `description` is a new page, which has taken no input.
	title: string;
	description?: string;
	// The head, fixed at the top (a `SheetHead`).
	head?: ReactNode;
	// The foot in gorhom's footer, measured with the sheet and held above the
	// keyboard; given, the footer is always gorhom's, so its height is measured
	// with the sheet, and it is no height while the foot draws nothing.
	foot?: ReactNode;
	// An act of the sheet runs: the scrim and the drag down do not dismiss it.
	holds?: boolean;
	// Stands at the cap from its first frame (a menu that searches, so its
	// list does not jump as the filter narrows); the rest grow with their
	// content.
	tall?: boolean;
	// The children over the whole screen inside the safe area (an image's full
	// size), with no head, ground or foot, so no accessible name of its own
	// (the children name themselves): the scrim and the children's own close
	// act dismiss it.
	view?: boolean;
	children?: ReactNode;
}

// A bottom sheet over the scrim, content-tall and growing with its content up
// to the screen under its top inset, the children scrolling past it: the head
// fixed at the top, the children under it, and the foot in gorhom's footer.
export function SheetLayer({
	open,
	onClose,
	title,
	description,
	head,
	foot,
	holds = false,
	tall,
	view,
	children,
}: SheetLayerProps) {
	const port = usePort();
	const insets = useSafeAreaInsets();
	const { height } = useWindowDimensions();
	const ref = useRef<BottomSheetModal>(null);
	const [settled, setSettled] = useState(false);
	const [touchedValue, setTouched] = useTouchState();
	// A tall sheet and a view stand at the full height of the screen.
	const full = tall || view;
	usePageTurn(open, title, description, () => setTouched(false));
	// gorhom sizes the sheet to its content (the head, the body and, through
	// `enableFooterMarginAdjustment`, the footer it measures) up to this cap;
	// past it the body scrolls. Nothing here decides the height after
	// `present()`.
	const cap = height - insets.top;
	// Whether gorhom holds the sheet, from `present()` to its `onDismiss`.
	// A `dismiss()` while it holds none marks the modal dismissing for good,
	// and every later `present()` then draws nothing.
	const held = useRef(false);
	const timings = useMemo(
		() => ({ enter: enter(), release: released() }),
		[open],
	);
	useEffect(() => {
		if (open) {
			setSettled(false);
			held.current = true;
			ref.current?.present();
		} else if (held.current) ref.current?.dismiss(leave());
	}, [open]);
	const parts: Parts = {
		title,
		head,
		foot,
		holds,
		touched: touchedValue,
		port,
	};
	const [{ partsStore, Layer }] = useState(() => {
		const created = createStore<Parts>(parts);
		return {
			partsStore: created,
			Layer: layerOf(created),
		};
	});
	useLayoutEffect(() => partsStore.set(parts));
	const footed = foot !== undefined;
	// The body's end keeps the home indicator's inset, gorhom adding the
	// footer's height to it.
	const end = { paddingBottom: insets.bottom };
	return (
		<BottomSheetModal
			ref={ref}
			// Every sheet reaches the screen under reduced motion through this
			// commit; the mechanism is undiagnosed.
			onChange={(index) => setSettled(index >= 0)}
			onDismiss={() => {
				held.current = false;
				onClose();
			}}
			containerComponent={Layer}
			accessible={false}
			backgroundComponent={view ? null : Ground}
			backdropComponent={Scrim}
			handleComponent={head === undefined ? null : Head}
			footerComponent={footed ? Footer : undefined}
			enablePanDownToClose={!holds}
			enableDynamicSizing={!full}
			maxDynamicContentSize={cap}
			snapPoints={full ? FULL : undefined}
			animationConfigs={settled ? timings.release : timings.enter}
		>
			{view ? (
				<ViewBody
					style={{
						paddingTop: insets.top,
						paddingBottom: insets.bottom,
						paddingLeft: insets.left,
						paddingRight: insets.right,
					}}
					className={VIEW}
				>
					{children}
				</ViewBody>
			) : (
				<BottomSheetScrollView
					enableFooterMarginAdjustment={footed}
					keyboardShouldPersistTaps="handled"
					contentContainerStyle={end}
				>
					<RaisedGround>{children}</RaisedGround>
				</BottomSheetScrollView>
			)}
		</BottomSheetModal>
	);
}
