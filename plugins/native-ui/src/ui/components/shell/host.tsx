import { TOASTS } from "@fcalell/ui-core/variants";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { type ReactNode, useRef, useState } from "react";
import { View } from "react-native";
import { cn } from "../../lib/cn";
import { type ToastBox, ToastFrame } from "../../lib/frame";
import { Confirmations } from "../sheet/confirm";
import { ToastList } from "../toast/layer";

const FILL = "flex-1";
// The page's measured box gives the layer's `top` and `height`.
const TOAST_LAYER = "absolute inset-x-0 items-center justify-end";

// What a root frame (the Shell, the Gate) mounts around itself: docs/architecture/plugins/native-ui.md, "Frame host".
// Outside the package's exports.
export function FrameHost({ children }: { children: ReactNode }) {
	const root = useRef<View>(null);
	const [box, place] = useState<ToastBox>();
	const [toastFrame] = useState<ToastFrame>(() => ({ root, place }));
	return (
		<View ref={root} className={FILL}>
			<BottomSheetModalProvider>
				<ToastFrame.Provider value={toastFrame}>{children}</ToastFrame.Provider>
				<Confirmations />
			</BottomSheetModalProvider>
			{box ? (
				<View
					pointerEvents="box-none"
					style={box}
					className={cn(TOASTS, TOAST_LAYER)}
				>
					<ToastList />
				</View>
			) : null}
		</View>
	);
}
