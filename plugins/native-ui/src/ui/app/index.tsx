import { WordsProvider } from "@fcalell/ui-core/react/words";
import type { Words } from "@fcalell/ui-core/tokens";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { ReactNode } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

const FLEX_FILL = { flex: 1 } as const;

// The UI-shell providers for use outside the generated entry: docs/architecture/plugins/native-ui.md, "Provider order".
export function AppProviders({
	children,
	words,
}: {
	children: ReactNode;
	words?: Words;
}) {
	const themed = (
		<GestureHandlerRootView style={FLEX_FILL}>
			<KeyboardProvider>
				<SafeAreaProvider>
					<BottomSheetModalProvider>{children}</BottomSheetModalProvider>
				</SafeAreaProvider>
			</KeyboardProvider>
		</GestureHandlerRootView>
	);
	return words ? <WordsProvider words={words}>{themed}</WordsProvider> : themed;
}
