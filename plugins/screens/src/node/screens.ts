// What a route's screens are, shared by the story files that declare them and
// the stories that draw them.

// The states a screen is drawn in: one story each, exported under `exportName`.
export const SCREEN_STATES = [
	{ state: "data", exportName: "Data", name: "Data" },
	{ state: "loading", exportName: "Loading", name: "Loading" },
	{ state: "error", exportName: "Error", name: "Error" },
	{ state: "empty", exportName: "Empty", name: "Empty" },
	{ state: "notFound", exportName: "NotFound", name: "Not found" },
] as const;

// The sidebar title of a route's screens: its id under `Screens/` without the
// segments that add no URL (a pathless layout `_app`, a group `(auth)`), a
// trailing slash (an index route) named `index` so it never shares a title
// with the route it indexes.
export function screenTitle(routeId: string): string {
	const path = routeId
		.replace(/^\//, "")
		.split("/")
		.filter((segment) => !/^(_|\(.*\)$)/.test(segment))
		.join("/");
	if (path === "") return "Screens/index";
	return `Screens/${path.endsWith("/") ? `${path}index` : path}`;
}
