import type { Leave } from "@fcalell/ui-core/leave";
import { createStore } from "@fcalell/ui-core/store";
import {
	createContext,
	type MouseEvent,
	use,
	useSyncExternalStore,
} from "react";
import { NOOP } from "./noop.ts";

// The slice of the router that routing in place needs: docs/architecture/plugins/react-ui.md, "Router bindings".
interface InPlaceRouter {
	navigate(options: { href: string }): unknown;
	preloadRoute(options: { href: string }): unknown;
	subscribe(event: "onResolved", listener: () => void): () => void;
	state: {
		location: { href: string };
		resolvedLocation?: { href: string };
		// The route chain of the page drawn, root first.
		matches?: readonly { routeId: string; pathname: string }[];
	};
	// The route tree by id: a route is a page when it has no children or one
	// of them is its index (`path: "/"`).
	routesById?: Record<
		string,
		{ children?: readonly { path?: string }[] | Record<string, unknown> }
	>;
	// A blocker resolves `true` to hold a navigation, as the router's own does.
	history: {
		block(blocker: {
			blockerFn: () => Promise<boolean>;
			enableBeforeUnload: () => boolean;
		}): () => void;
	};
}

// One router and one location listener: docs/architecture/plugins/react-ui.md, "Navigation".
let bound: InPlaceRouter | undefined;
// The bound router's `onResolved` subscription, ended when another binds.
let unbind: (() => void) | undefined;
// Bound, the router resolves a history move and `onResolved` tells the
// readers, so the window's events are heard only while unbound.
const changes = createStore(undefined, {
	source: (store) => {
		const hearWindow = () => {
			if (!bound) store.emit();
		};
		addEventListener("popstate", hearWindow);
		addEventListener("hashchange", hearWindow);
		return () => {
			removeEventListener("popstate", hearWindow);
			removeEventListener("hashchange", hearWindow);
		};
	},
});

// How long a pointer or focus rests on a route's anchor before its route is
// preloaded: TanStack's own intent delay, so a pass across a list loads
// nothing and a rest on one row loads that row.
const INTENT_DELAY = 50;
let intent: ReturnType<typeof setTimeout> | undefined;
let listening = false;

// One delegated listener for every anchor, and preload: docs/architecture/plugins/react-ui.md, "Navigation".
function wantsRoute(event: Event): void {
	clearTimeout(intent);
	intent = undefined;
	const link =
		event.target instanceof Element ? event.target.closest("a[href]") : null;
	const href = link?.getAttribute("href");
	if (!href || !isRoute(href) || href === drawn()) return;
	intent = setTimeout(() => {
		intent = undefined;
		bound?.preloadRoute({ href });
	}, INTENT_DELAY);
}

export function bindRouter(router: InPlaceRouter): void {
	bound = router;
	if (!listening) {
		listening = true;
		document.addEventListener("pointerover", wantsRoute);
		document.addEventListener("focusin", wantsRoute);
	}
	unbind?.();
	unbind = router.subscribe("onResolved", changes.emit);
	changes.emit();
}

const unheard = () => NOOP;

// Set by a Section around its rows: the route it read once, which each row
// reads instead of subscribing on its own.
export const ListedRoute = createContext<string | undefined>(undefined);

// The route drawn: the router's resolved location, so a place's selection
// flips with the page; unbound, the location's path, query and hash.
function drawn(): string {
	if (bound) return (bound.state.resolvedLocation ?? bound.state.location).href;
	return location.pathname + location.search + location.hash;
}

// The current route: the location's path, its query and its hash.
export function useRoute(): string {
	const listed = use(ListedRoute);
	const own = useSyncExternalStore(
		listed === undefined ? changes.subscribe : unheard,
		drawn,
		() => "/",
	);
	return listed ?? own;
}

// The route the page above this one is at: the nearest ancestor in the route
// chain whose pathname differs from the page's own (a pathless layout, or a
// layout the page shares its path with, is the page itself) and that is a page
// itself. Unbound, or on a router that hands over no chain, or at the top of
// the tree, it cannot be known.
function parentOf(): string | undefined {
	const matches = bound?.state.matches;
	const routes = bound?.routesById;
	if (!matches || !routes) return undefined;
	const page = matches.at(-1)?.pathname;
	for (let at = matches.length - 2; at >= 0; at--) {
		const match = matches[at];
		if (!match || match.pathname === page) continue;
		const children = routes[match.routeId]?.children;
		const list: readonly unknown[] = Array.isArray(children)
			? children
			: Object.values(children ?? {});
		if (
			list.length === 0 ||
			list.some(
				(child) =>
					typeof child === "object" &&
					child !== null &&
					"path" in child &&
					child.path === "/",
			)
		)
			return match.pathname;
	}
	return undefined;
}

// The route the page above this one is at, read with the route drawn so a
// move re-reads it (see `parentOf`); `undefined` where the router cannot say.
export function useParentRoute(): string | undefined {
	useRoute();
	return parentOf();
}

// The route a record's Pane goes back to: the page above it with the address's
// query, which holds the place's tab and filters, so the place's Pane stands as
// it stood when the record opened.
export function useReturnRoute(): string | undefined {
	const at = useRoute();
	const parent = parentOf();
	return parent === undefined
		? undefined
		: parent + (at.match(/\?[^#]*/)?.[0] ?? "");
}

// An href from the app's root is a route; a scheme (`https:`, `mailto:`), a
// protocol-relative `//` or a bare `#hash` is somewhere else.
export function isRoute(href: string): boolean {
	return /^\/(?!\/)/.test(href);
}

// Bound, a route opens in the router with no document load, and the promise
// settles once the router has resolved it; elsewhere the document loads.
export async function navigate(route: string): Promise<void> {
	if (bound && isRoute(route)) await bound.navigate({ href: route });
	else location.assign(route);
}

// A form that stands edited holds its leave: docs/architecture/ui-core/acts.md, "Leave".
export function blockLeave(
	leave: Leave,
	ask: () => Promise<boolean>,
): () => void {
	if (bound) {
		return bound.history.block({
			blockerFn: async () => !(await leave.attempt(ask)),
			enableBeforeUnload: leave.asks,
		});
	}
	const unload = (event: BeforeUnloadEvent) => {
		if (leave.asks()) event.preventDefault();
	};
	addEventListener("beforeunload", unload);
	return () => removeEventListener("beforeunload", unload);
}

// An anchor's click: docs/architecture/plugins/react-ui.md, "Navigation".
export function follow(event: MouseEvent<HTMLAnchorElement>): void {
	if (!bound || event.defaultPrevented) return;
	if (event.button !== 0) return;
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
	const href = event.currentTarget.getAttribute("href");
	if (href === null || !isRoute(href)) return;
	event.preventDefault();
	navigate(href);
}
