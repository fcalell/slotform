import type { ComponentProps } from "react";
import {
	KeyboardAvoidingView,
	KeyboardAwareScrollView,
	type KeyboardAwareScrollViewRef,
} from "react-native-keyboard-controller";
import { withUniwind } from "uniwind";

const AwareScroll = withUniwind(KeyboardAwareScrollView);

/** What a `Scroll`'s `ref` holds: a `ScrollView`, to scroll it from code. */
export type ScrollRef = KeyboardAwareScrollViewRef;

// The keyboard-aware scroll pane every Pane scrolls in: docs/architecture/ui-core/layout.md, "Body".
export function Scroll(props: ComponentProps<typeof AwareScroll>) {
	return <AwareScroll keyboardShouldPersistTaps="handled" {...props} />;
}

// The column a docked foot shares with what scrolls over it (a
// Thread's log, a Pane's body), lifted over the keyboard.
export const Lifted = withUniwind(KeyboardAvoidingView);
