import { ShellHome } from "@fcalell/ui-core/react/frame";
import { useWords } from "@fcalell/ui-core/react/words";
import type { ReactNode } from "react";
import { use } from "react";
import { Button } from "../components/button/index.tsx";
import { Gate } from "../components/gate/index.tsx";
import { MissingBase } from "../components/missing/base.tsx";
import { Pane } from "../components/pane/index.tsx";
import { InPane } from "./frame.ts";

// The slice of the router the not-found page needs: docs/architecture/plugins/react-ui.md, "Router bindings".
interface NotFoundRouter {
	update(options: { defaultNotFoundComponent: () => ReactNode }): void;
}

// The page for an address nothing serves: docs/architecture/plugins/react-ui.md, "Router bindings".
function NotFound() {
	const words = useWords();
	const home = use(ShellHome);
	const inPane = use(InPane);
	if (home === undefined)
		return (
			<Gate title={words.notFound} description={[words.nowhere]}>
				<Button href="/" label={words.back} />
			</Gate>
		);
	const missing = <MissingBase sentence={words.nowhere} act={home} />;
	if (inPane) return missing;
	return (
		<Pane title={words.notFound} record={{}}>
			{missing}
		</Pane>
	);
}

// The router's default not-found page, set once the app's own routes are
// known: a route's own `notFoundComponent` (an app's catch-all) wins over it.
export function bindNotFound(router: NotFoundRouter): void {
	router.update({ defaultNotFoundComponent: NotFound });
}
