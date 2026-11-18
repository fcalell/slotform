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

// The tags a story carries, which a test run narrows by: one per checked
// global (`mode:dark`) and one for its state (`state:loading`).
export const globalTag = (name: string, value: string): string =>
	`${name}:${value}`;
export const stateTag = (state: string): string => `state:${state}`;

// Whether a route id's segment adds nothing to the URL: a pathless layout
// (`_app`) or a group (`(auth)`).
export const isPathless = (segment: string): boolean =>
	/^(_|\(.*\)$)/.test(segment);

// A route's sidebar title: docs/architecture/plugins/screens.md, "Story generation".
export function screenTitle(routeId: string): string {
	const path = routeId
		.replace(/^\//, "")
		.split("/")
		.filter((segment) => !isPathless(segment))
		.join("/");
	if (path === "") return "Screens/index";
	return `Screens/${path.endsWith("/") ? `${path}index` : path}`;
}
