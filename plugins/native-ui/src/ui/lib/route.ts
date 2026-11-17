import type { Href } from "expo-router";

// A route on the phone is one of the app's expo-router paths: docs/architecture/plugins/native-ui.md, "Routes and preload".
declare module "@fcalell/ui-core/descriptors" {
	interface RouteRegistry {
		route: Extract<Href, string>;
	}
}

export type { Route } from "@fcalell/ui-core/descriptors";
