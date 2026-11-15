import { ShellHome } from "@fcalell/ui-core/react/frame";
import { useWords } from "@fcalell/ui-core/react/words";
import { useContext } from "react";
import { Button } from "../components/button";
import { Gate } from "../components/gate";
import { MissingBase } from "../components/missing/base";
import { Pane } from "../components/pane";

// The page for an address nothing serves: the app's `+not-found` route, which
// stack's generated file re-exports, so it stands where expo-router stands a
// route, inside the root layout's Shell when the layout draws one and alone
// when it does not.
export default function NotFound() {
	const words = useWords();
	const home = useContext(ShellHome);
	if (home === undefined)
		return (
			<Gate title={words.notFound} description={[words.nowhere]}>
				<Button href="/" label={words.back} />
			</Gate>
		);
	return (
		<Pane title={words.notFound} record={{}}>
			<MissingBase fit="frame" sentence={words.nowhere} act={home} />
		</Pane>
	);
}
