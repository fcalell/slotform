import { existsSync } from "node:fs";
import {
	mkdir,
	readdir,
	readFile,
	rm,
	rmdir,
	writeFile,
} from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import type { PreviewGlobal } from "../types.ts";
import { globalTag, SCREEN_STATES, screenTitle, stateTag } from "./screens.ts";

// The folder at the app root holding one story file per screen. It is no dot
// directory: Storybook's watcher ignores those.
export const STORIES_DIR = "stack-screens";

const STORY_FILE = ".stories.ts";
const ROUTE_FILE = /\.(tsx|ts|jsx|js)$/;
// TanStack's root route file is named `__root`.
const ROOT_ROUTE = /^__root\./;

const FILE_ROUTE = /\bcreateFileRoute\(\s*(["'`])([^"'`]+)\1/;
const LAZY_ROUTE = /\bcreateLazyFileRoute\(\s*(["'`])([^"'`]+)\1/;

// The route id a route file declares, `createFileRoute("/projects/$id")`: the
// string TanStack's generator writes and checks against the file's place, so
// it is the file's id without redoing the generator's naming rules. Null for
// a file that declares none (the root route, a file the router ignores).
function fileRouteId(source: string): string | null {
	return FILE_ROUTE.exec(source)?.[2] ?? null;
}

// The id a lazy route file completes, `createLazyFileRoute("/projects")`: the
// id of the route that imports it.
function lazyRouteId(source: string): string | null {
	return LAZY_ROUTE.exec(source)?.[2] ?? null;
}

// Whether a route is a screen: a pathless layout (`/_app`) has no URL of its
// own and draws only around the routes it holds, which are screens.
function isScreen(routeId: string): boolean {
	return !routeId.slice(routeId.lastIndexOf("/") + 1).startsWith("_");
}

// The ids of the routes a route draws inside: its path's prefixes, each a
// layout where a file declares it (`/_app/deploys/$id/` is inside
// `/_app/deploys/$id`, `/_app/deploys` and `/_app`).
function ancestorIds(routeId: string): string[] {
	const segments = routeId.split("/");
	return segments
		.slice(2)
		.map((_, index) => segments.slice(0, index + 2).join("/"));
}

// One extra story per screen state: a combination of the globals' checked
// values other than the one every story opens with (the dev story covers it).
interface CheckVariant {
	// Every global's value in the combination.
	globals: Record<string, string>;
	// The values that differ from the defaults, which name the story.
	label: string[];
}

function checkVariants(globals: PreviewGlobal[]): CheckVariant[] {
	let combinations: Array<Record<string, string>> = [{}];
	for (const global of globals) {
		combinations = combinations.flatMap((combination) =>
			(global.checked ?? [global.default]).map((value) => ({
				...combination,
				[global.name]: value,
			})),
		);
	}
	return combinations.flatMap((combination) => {
		const label = globals.flatMap((global) => {
			const value = combination[global.name];
			return value === undefined || value === global.default ? [] : [value];
		});
		return label.length === 0 ? [] : [{ globals: combination, label }];
	});
}

const posix = (path: string): string => path.split(sep).join("/");

interface RouteFiles {
	// The root route's files.
	root: string[];
	// The files of each route id: the route's own, and its lazy sibling's.
	byId: Map<string, string[]>;
	// The ids of the routes that are screens.
	screens: string[];
}

// Reads the routes directory: which file declares which route.
async function scanRoutes(routes: string): Promise<RouteFiles> {
	const found: RouteFiles = { root: [], byId: new Map(), screens: [] };
	if (!existsSync(routes)) return found;
	for (const file of (await readdir(routes, { recursive: true })).sort()) {
		if (!ROUTE_FILE.test(file)) continue;
		const path = join(routes, file);
		if (ROOT_ROUTE.test(file)) {
			found.root.push(path);
			continue;
		}
		const source = await readFile(path, "utf8");
		const id = fileRouteId(source);
		const routeId = id ?? lazyRouteId(source);
		if (routeId === null) continue;
		found.byId.set(routeId, [...(found.byId.get(routeId) ?? []), path]);
		if (id !== null && isScreen(id)) found.screens.push(id);
	}
	return found;
}

// A route id's story file, mirroring the id: `/projects/$id` is
// `projects/$id.stories.ts`, an index route (`/projects/`) `projects/index`.
export function storyPath(routeId: string): string {
	const path = routeId.slice(1);
	return `${path === "" || path.endsWith("/") ? `${path}index` : path}${STORY_FILE}`;
}

const pascal = (value: string): string =>
	value
		.split(/[^A-Za-z0-9]+/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join("");

// The ids of the app's screens, in route order.
export async function listScreens(routes: string): Promise<string[]> {
	return (await scanRoutes(routes)).screens;
}

// One route's CSF file: docs/architecture/plugins/screens.md, "Story generation".
function renderStoryFile(
	routeId: string,
	imports: string[],
	globals: PreviewGlobal[],
): string {
	const call = (state: string, chosen?: Record<string, string>): string =>
		`screenStory(${[routeId, state].map((v) => JSON.stringify(v)).join(", ")}${chosen ? `, ${JSON.stringify(chosen)}` : ""})`;
	const variants = checkVariants(globals);
	const tags = (state: string, chosen: Record<string, string>, hide: boolean) =>
		JSON.stringify([
			...(hide ? ["!dev"] : []),
			stateTag(state),
			...globals
				.filter((g) => g.checked)
				.map((g) => globalTag(g.name, chosen[g.name] ?? g.default)),
		]);
	return [
		"// Generated by `stack screens`, never edited. The imports are this screen's import graph:",
		"// `vitest --changed` follows them to rerun the screen when a file in it changes.",
		'import { screenStory } from "@fcalell/plugin-screens/stories";',
		...imports.map((specifier) => `import ${JSON.stringify(specifier)};`),
		"",
		`export default { title: ${JSON.stringify(screenTitle(routeId))} };`,
		"",
		...SCREEN_STATES.flatMap(({ state, exportName, name }) => [
			`export const ${exportName} = { ...${call(state)}, name: ${JSON.stringify(name)}, tags: ${tags(state, {}, false)} };`,
			...variants.map(
				({ globals: chosen, label }) =>
					`export const ${exportName}${label.map(pascal).join("")} = { ...${call(state, chosen)}, name: ${JSON.stringify(`${name}, ${label.join(", ")}`)}, tags: ${tags(state, chosen, true)} };`,
			),
		]),
		"",
	].join("\n");
}

interface SyncOptions {
	// The app root, where the stories folder lives.
	root: string;
	// The routes directory, absolute.
	routes: string;
	// The app's fixtures module, absolute; imported once it exists.
	fixtures: string;
	// The toolbar globals the plugins contribute.
	previewGlobals: PreviewGlobal[];
}

// The stories folder's upkeep: docs/architecture/plugins/screens.md, "Story generation".
export async function syncStories(options: SyncOptions): Promise<void> {
	const dir = join(options.root, STORIES_DIR);
	const found = await scanRoutes(options.routes);
	const wanted = new Map<string, string>();
	for (const routeId of found.screens) {
		const file = storyPath(routeId);
		const from = dirname(join(dir, file));
		const imports = [
			...found.root,
			...ancestorIds(routeId).flatMap((id) => found.byId.get(id) ?? []),
			...(found.byId.get(routeId) ?? []),
			...(existsSync(options.fixtures) ? [options.fixtures] : []),
		].map((path) => posix(relative(from, path)));
		wanted.set(file, renderStoryFile(routeId, imports, options.previewGlobals));
	}

	const present = existsSync(dir)
		? (await readdir(dir, { recursive: true }))
				.map(posix)
				.filter((file) => file.endsWith(STORY_FILE))
		: [];
	for (const [file, content] of wanted) {
		const path = join(dir, file);
		if (present.includes(file) && (await readFile(path, "utf8")) === content)
			continue;
		await mkdir(dirname(path), { recursive: true });
		await writeFile(path, content);
	}
	for (const file of present.filter((file) => !wanted.has(file))) {
		await rm(join(dir, file));
		// The folders a route's removal left empty go with it.
		for (let parent = dirname(join(dir, file)); parent !== dir; ) {
			if ((await readdir(parent)).length > 0) break;
			await rmdir(parent);
			parent = dirname(parent);
		}
	}
}
