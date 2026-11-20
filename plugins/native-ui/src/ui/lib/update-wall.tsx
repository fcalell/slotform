import { onUpdateRequired } from "@slotform/expo/client";
import { useWords } from "@slotform/ui-core/react/words";
import Constants from "expo-constants";
import { type ReactNode, useEffect, useState } from "react";
import { Linking, Platform } from "react-native";
import { Button } from "../components/button";
import { Gate } from "../components/gate";

// The app, until the version gate answers 426; then the update wall in its
// place until the app restarts: docs/architecture/plugins/native-ui.md, "Update wall".
export function UpdateWall({ children }: { children: ReactNode }) {
	const words = useWords();
	const [walled, wall] = useState(false);
	useEffect(() => onUpdateRequired(() => wall(true)), []);
	if (!walled) return children;
	const store = Platform.select({
		ios: Constants.expoConfig?.ios?.appStoreUrl,
		android: Constants.expoConfig?.android?.playStoreUrl,
	});
	return (
		<Gate title={words.updateRequired} description={[words.updateFromStore]}>
			{store ? (
				<Button label={words.update} onAct={() => Linking.openURL(store)} />
			) : null}
		</Gate>
	);
}
