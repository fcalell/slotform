import assert from "node:assert/strict";
import { test } from "node:test";
import {
	flatPlaces,
	isCurrent,
	type PlaceNode,
	placeAt,
	placesFolded,
	placeTrail,
	trailEnds,
} from "./route.ts";

const tree: PlaceNode[] = [
	{ route: "/library" },
	{
		route: "/projects",
		children: [
			{
				route: "/projects/archive",
				children: [{ route: "/projects/archive/active" }],
			},
			{ route: "/projects/draft" },
		],
	},
];

test("flatPlaces lists each place before its children", () => {
	assert.deepEqual(
		flatPlaces(tree).map((place) => place.route),
		[
			"/library",
			"/projects",
			"/projects/archive",
			"/projects/archive/active",
			"/projects/draft",
		],
	);
});

const labelled = [
	{ route: "/library", label: "Library" },
	{
		route: "/boards",
		label: "Boards",
		children: [
			{
				route: "#teams",
				label: "Teams",
				children: [{ route: "/boards/web", label: "Web" }],
			},
		],
	},
];

const trailOf = (places: readonly PlaceNode[], at: string) =>
	placeTrail(places, at).map((place) => place.route);

test("a top-level place's trail is the place alone", () => {
	assert.deepEqual(
		placeTrail(labelled, "/library").map(({ label, route }) => ({
			label,
			route,
		})),
		[{ label: "Library", route: "/library" }],
	);
});

test("a trail runs from the top-level place down to the owner, two deep and below it", () => {
	assert.deepEqual(trailOf(tree, "/projects/archive/active"), [
		"/projects",
		"/projects/archive",
		"/projects/archive/active",
	]);
	assert.deepEqual(trailOf(tree, "/projects/archive/active/42"), [
		"/projects",
		"/projects/archive",
		"/projects/archive/active",
	]);
});

test("a folder stands in the trail as an ancestor, never as its owner", () => {
	assert.deepEqual(
		placeTrail(labelled, "/boards/web/42").map((place) => place.label),
		["Boards", "Teams", "Web"],
	);
	assert.deepEqual(trailOf(labelled, "/boards#teams"), ["/boards"]);
});

test("a trail is empty where no place owns the address", () => {
	assert.deepEqual(trailOf(tree, "/elsewhere"), []);
});

test("placesFolded opens the path and what the viewer chose", () => {
	const path = (...routes: string[]) => routes.map((route) => ({ route }));
	assert.deepEqual(placesFolded(tree, {}, []), [
		"/projects",
		"/projects/archive",
	]);
	assert.deepEqual(
		placesFolded(tree, {}, path("/projects", "/projects/archive")),
		[],
	);
	// A choice beats the path, both ways.
	assert.deepEqual(
		placesFolded(
			tree,
			{ "/projects": false, "/projects/archive": true },
			path("/projects"),
		),
		["/projects"],
	);
});

test("a trailing slash names the same place, on the route and on the address", () => {
	assert.equal(isCurrent("/projects/", "/projects"), true);
	assert.equal(isCurrent("/projects", "/projects/"), true);
	assert.equal(isCurrent("/projects/", "/projects/p-1"), true);
	assert.equal(isCurrent("/", "/projects/"), false);
	assert.equal(
		placeAt([{ route: "/" }, { route: "/projects/" }], "/projects"),
		"/projects/",
	);
});

test("a trail's ends are its last place and the places above it", () => {
	assert.deepEqual(trailEnds(["a", "b", "c"]), {
		above: ["a", "b"],
		here: "c",
	});
	assert.deepEqual(trailEnds(["a"]), { above: [], here: "a" });
	assert.deepEqual(trailEnds([]), { above: [], here: undefined });
});
