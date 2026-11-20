import type { Procedure } from "@slotform/api/types";
import type { RegisteredRouter } from "@tanstack/react-router";

// The answers of an app's procedures, by the router's own shape.
// Fixtures: plugins/screens/guide/fixtures.md.
export type Fixtures<TRouter> = {
	[K in keyof TRouter]?: TRouter[K] extends Procedure<infer I, infer O>
		? (input: I) => O
		: TRouter[K] extends Record<string, unknown>
			? Fixtures<TRouter[K]>
			: never;
};

type ParamValues = Record<string, string>;

// The `$param` names a route id holds: `$id`, `{$id}`, `{-$id}`, and the bare
// `$` of the splat (`_splat`).
type Trim<Name extends string> = Name extends `${infer Bare}}${string}`
	? Bare extends ""
		? "_splat"
		: Bare
	: Name extends ""
		? "_splat"
		: Name;
type ParamName<Rest extends string> = Rest extends `${infer Name}/${string}`
	? Trim<Name>
	: Trim<Rest>;
type NamesOf<Id extends string> = Id extends `${string}$${infer Rest}`
	? ParamName<Rest> | NamesOf<Rest>
	: never;

// The ids of the registered router's routes; `string` where no router is
// registered (its ids are then any string), which `RouteParams` takes as
// untyped keys.
type RouteId = string extends keyof RegisteredRouter["routesById"]
	? string
	: Extract<keyof RegisteredRouter["routesById"], `/${string}`>;

// The route ids of `Id` that are `Root` or lie under it.
type Under<Root extends string, Id extends string> = Id extends
	| Root
	| `${Root}/${string}`
	? Id
	: never;

// The example values of the app's routes, by name.
// Keys and typing: docs/architecture/plugins/screens.md, "How a screen is served".
export type RouteParams<Id extends string = RouteId> = string extends Id
	? { [name: string]: string | ParamValues }
	: { [Name in NamesOf<Id>]?: string } & {
			[K in Id]?: { [Name in NamesOf<Under<K, Id>>]?: string };
		};

// The opening frame of each channel the app's screens read over the `node` plugin's socket, by channel name.
// Channel fixtures: plugins/screens/guide/fixtures.md, "Channels".
type ChannelFixtures<TSnapshots = Record<string, unknown>> = {
	[K in keyof TSnapshots]?: (params: ParamValues) => TSnapshots[K];
};

export interface ScreenFixtures<TRouter, TSnapshots = Record<string, unknown>> {
	procedures: Fixtures<TRouter>;
	params: RouteParams;
	// An example query string every screen is drawn at (`?token=abc`, with or
	// without the `?`), for a route that reads its search.
	search: string;
	channels: ChannelFixtures<TSnapshots>;
}

// The default export of the app's `src/app/fixtures.ts`.
// Fixtures: plugins/screens/guide/fixtures.md.
export function defineFixtures<TRouter, TSnapshots = Record<string, unknown>>(
	procedures: Fixtures<TRouter>,
	params: RouteParams = {},
	channels: ChannelFixtures<TSnapshots> = {},
	search = "",
): ScreenFixtures<TRouter, TSnapshots> {
	return { procedures, params, channels, search };
}
