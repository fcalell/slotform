import {
	LegendList,
	type LegendListProps,
	type LegendListRef,
} from "@legendapp/list/react-native";
import type { ComponentProps, Ref } from "react";
import {
	KeyboardAvoidingView,
	KeyboardAwareScrollView,
	type KeyboardAwareScrollViewRef,
} from "react-native-keyboard-controller";
import { withUniwind } from "uniwind";
import { useTokenPx } from "./container";

const AwareScroll = withUniwind(KeyboardAwareScrollView);
// `withUniwind` maps `className` and `contentContainerClassName` but erases
// the type parameter the list takes, so it keeps LegendList's own type.
const StyledList = withUniwind(LegendList) as typeof LegendList;

/** What a `List`'s `ref` holds, to scroll it from code. */
export type ListRef = LegendListRef;

/** What a `Scroll`'s `ref` holds: a `ScrollView`, to scroll it from code. */
export type ScrollRef = KeyboardAwareScrollViewRef;

// The keyboard-aware scroll pane every Pane scrolls in: docs/architecture/ui-core/layout.md, "Body".
export function Scroll(props: ComponentProps<typeof AwareScroll>) {
	return <AwareScroll keyboardShouldPersistTaps="handled" {...props} />;
}

// The column a docked foot shares with what scrolls over it (a
// Thread's log, a Pane's body), lifted over the keyboard.
export const Lifted = withUniwind(KeyboardAvoidingView);

// What fills the free height of what it stands in (a Pane's body) by plain
// flex: a Thread, or a Section or Table that stands alone in its Pane.
export const FILL = "flex-1 min-h-0";

// A collection that windows in its own scroll: docs/architecture/plugins/native-ui.md, "Long collections".
// A row is never recycled, so its state is its own; a row's first size is the
// `row` spacing, and each is measured from then on.
export function List<T>(
	props: LegendListProps<T> & { ref?: Ref<LegendListRef> },
) {
	const row = useTokenPx("--spacing-row");
	return (
		<StyledList
			keyboardShouldPersistTaps="handled"
			estimatedItemSize={row}
			{...props}
			recycleItems={false}
		/>
	);
}
