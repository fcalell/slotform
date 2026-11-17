import { View } from "react-native";
import { useToastBox } from "../../lib/container";

const SPACE = "absolute inset-0";
const BOX = "flex-1";

// The box the Shell's toasts stand in, drawn by the region that stands over
// the page's docked foot (a Pane's body, a Gate's column), so the toasts stand
// above the foot, and the tab bar under it, by layout.
export function ToastSpace() {
	const box = useToastBox();
	return (
		<View pointerEvents="none" className={SPACE}>
			<View ref={box.ref} onLayout={box.onLayout} className={BOX} />
		</View>
	);
}
