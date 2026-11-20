import { ShellHome } from "@slotform/ui-core/react/frame";
import { useWords } from "@slotform/ui-core/react/words";
import { useContext } from "react";
import { Button } from "../components/button";
import { Gate } from "../components/gate";
import { MissingBase } from "../components/missing/base";
import { Pane } from "../components/pane";

// The page for an address nothing serves: docs/architecture/plugins/native-ui.md, "What it contributes".
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
