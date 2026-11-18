import { SCHEMA } from "virtual:stack-schema";
import {
	bindRouter,
	fixtures,
	handlers,
	pluginFixtures,
	prefixes,
	routeTree,
} from "virtual:stack-screens";
import { useQueryClient } from "@fcalell/plugin-query/tanstack-query";
import type { StoryObj } from "@storybook/react-vite";
import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { useState } from "react";
import { fixtureHandlers, type ScreenState } from "./answer.ts";
import { setStory } from "./channels.ts";
import { paramsFor, routeUrl, withSearch } from "./route.ts";

type Story = { state: ScreenState; params: Record<string, string> };

// The story's client is made inside its providers, so the router is built
// with a stand-in and `Screen` hands it the real one as its context.
const standIn = { queryClient: undefined as never };

// `stack screens test --search`: the search every screen is drawn at, in
// place of the fixtures' example (an empty one draws none).
// `import.meta.env` is Vite's: this package's tsconfig loads no `vite/client`.
const searchOverride = (
	import.meta as { env?: Record<string, string | undefined> }
).env?.STACK_SCREENS_SEARCH;

// The app's real router at a route's URL, in a memory history: the URL is the
// route's full path with its params filled from the fixtures, then their example search. A first router
// reads the full path, which only a built route knows.
function routerAt(routeId: string) {
	const probe = createRouter({
		routeTree,
		history: createMemoryHistory(),
		context: standIn,
	});
	// `routeTree` is an `AnyRoute`: its routes are untyped.
	const route = (
		probe.routesById as Record<string, { fullPath: string } | undefined>
	)[routeId];
	if (!route) throw new Error(`the route tree holds no route ${routeId}`);
	const url = withSearch(
		routeUrl(routeId, route.fullPath, fixtures?.params ?? {}),
		searchOverride ?? fixtures?.search,
	);
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [url] }),
		context: standIn,
	});
	bindRouter(router);
	return router;
}

function Screen({ routeId, story }: { routeId: string; story: Story }) {
	// Set before the router mounts, so the socket it opens finds its story.
	const [router] = useState(() => {
		setStory({ channels: fixtures?.channels, ...story });
		return routerAt(routeId);
	});
	const queryClient = useQueryClient();
	return <RouterProvider router={router} context={{ queryClient }} />;
}

// One screen of a route in one state: the app's router at the route's URL,
// while the worker answers every call to the app's procedures from the
// fixtures for that state. `globals` pins toolbar globals for the story, which
// a story file does for the combinations a test run checks.
export function screenStory(
	routeId: string,
	state: ScreenState,
	globals: Record<string, string> = {},
): StoryObj {
	const story = {
		state,
		params: paramsFor(routeId, fixtures?.params ?? {}),
	};
	return {
		globals,
		parameters: {
			layout: "fullscreen",
			msw: {
				handlers: [
					...handlers,
					...fixtureHandlers(
						prefixes,
						fixtures?.procedures,
						pluginFixtures,
						story,
						SCHEMA,
					),
				],
			},
		},
		render: () => <Screen routeId={routeId} story={story} />,
	};
}
