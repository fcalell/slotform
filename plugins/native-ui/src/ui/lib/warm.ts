import type { ReadPort } from "@fcalell/ui-core/react/port";

// The parts of expo-router's router a press-in reads: the route tree (a node per
// route file, loaded on demand) and the router's own match of an href against
// it, a nested state that names a route at each layout level.
export interface Matches {
	routeNode: Node | null;
	getStateForHref(href: string): Matched | undefined;
}

interface Node {
	route: string;
	children: Node[];
	loadRoute(): object;
}

interface Matched {
	routes: readonly Step[];
}

interface Step {
	name: string;
	params?: object;
	state?: Matched;
}

// expo-router names the tree's root `__root` in a matched state.
const ROOT = "__root";

// The route file an href opens, and the params the router read from the href
// along the way (a layout's dynamic segments belong to the routes under it).
function moduleOf(
	matches: Matches,
	href: string,
): { module: object; params: object } | undefined {
	let node = matches.routeNode;
	let step = matches.getStateForHref(href)?.routes.at(-1);
	let params = {};
	while (node && step) {
		params = { ...params, ...step.params };
		const next: Node | undefined =
			step.name === ROOT
				? node
				: node.children.find((child) => child.route === step?.name);
		if (!next) return undefined;
		node = next;
		step = step.state?.routes.at(-1);
	}
	return node ? { module: node.loadRoute(), params } : undefined;
}

// A press-in on a route starts the reads its screen is about to make: docs/architecture/plugins/native-ui.md, "Routes and preload".
export function warm(
	start: ReadPort["warm"],
	matches: Matches,
	href: string,
): void {
	try {
		const found = moduleOf(matches, href);
		if (found) start(found.module, found.params);
	} catch (error) {
		console.error(error);
	}
}
