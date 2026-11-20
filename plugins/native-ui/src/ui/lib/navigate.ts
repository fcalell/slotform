import { usePort } from "@slotform/ui-core/react/port";
import { router, usePathname } from "expo-router";
import { RouterConfigContext } from "expo-router/build/global-state/routerConfigContext";
import { getStateForHref } from "expo-router/build/link/getStateForHref";
import { use, useCallback, useMemo } from "react";
import { Linking } from "react-native";
import type { Route } from "./route";
import { type Matches, warm } from "./warm";

// A route on a row or a back circle navigates through expo-router; the shell
// reads the pathname to mark the selected place.
export function navigate(route: Route): void {
	router.navigate(route);
}

export { usePathname };

// An href from the app's root is a route; a scheme (`https:`, `mailto:`) or a
// protocol-relative `//` is somewhere else, which the OS opens.
export function isRoute(href: string): href is Route {
	return /^\/(?!\/)/.test(href);
}

// A link's destination: a route navigates, anything else the OS opens.
export function open(href: string): void {
	if (isRoute(href)) navigate(href);
	else Linking.openURL(href);
}

// expo-router's route tree and its match of an href against it: docs/architecture/plugins/native-ui.md, "Routes and preload".
// The hrefs are from the app's root, so no current segments resolve them.
function useMatches(): Matches {
	const config = use(RouterConfigContext);
	if (!config) {
		throw new Error(
			"native-ui: a route link or a Pane is drawn outside expo-router's root (ExpoRoot).",
		);
	}
	return useMemo(
		() => ({
			routeNode: config.routeNode,
			getStateForHref: (href) =>
				getStateForHref(href, { segments: [] }, config.linking),
		}),
		[config],
	);
}

// Whether expo-router serves a route of its own at `href`: its state for the
// path ends in a screen, not the `+not-found` one.
function served(matches: Matches, href: string): boolean {
	let state = matches.getStateForHref(href);
	let name: string | undefined;
	while (state?.routes.length) {
		const last = state.routes.at(-1);
		name = last?.name;
		state = last?.state;
	}
	return name !== undefined && name !== "+not-found";
}

// The route the page above this one is at: the nearest path above the pathname
// (its last segment dropped, then the next, up to `/`) that expo-router
// serves a screen at. Groups (`(tabs)`) are not in the pathname, so they are
// never a step. Where nothing above is served (the pathname is `/`), it
// cannot be known.
export function useParentRoute(): Route | undefined {
	const matches = useMatches();
	const segments = usePathname().split("/").filter(Boolean);
	while (segments.length > 0) {
		segments.pop();
		const above = `/${segments.join("/")}`;
		// `served` has just found a screen at it.
		if (served(matches, above)) return above as Route;
	}
	return undefined;
}

// What a press on a route does first: docs/architecture/plugins/native-ui.md, "Routes and preload".
export function useWarm(): (href: string) => void {
	const port = usePort();
	const matches = useMatches();
	return useCallback(
		(href) => {
			if (isRoute(href)) warm(port.warm, matches, href);
		},
		[port, matches],
	);
}
