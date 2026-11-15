import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve, sep } from "node:path";
import type { Plugin, ViteDevServer } from "vite";
import type { PreviewGlobal } from "../types.ts";
import { syncStories } from "./stories.ts";

export interface ScreensModuleOptions {
	// The generated `.stack` directory, absolute.
	stackDir: string;
	// The app's fixtures module, relative to `stackDir`; absent files are fine.
	fixtures: string;
	// The entry's side-effect imports (the stylesheet), as the entry writes them.
	entryImports: string[];
	// The functions the entry calls with its router.
	routerBindings: Array<{ source: string; name: string }>;
	// The URL prefixes the worker owns: each is answered from the fixtures.
	prefixes: string[];
	// Modules whose default export is the handlers of endpoints a plugin owns.
	handlerModules: string[];
	// Modules whose default export is a fixtures tree for the procedures a
	// plugin owns, answered after the app's.
	fixtureModules: string[];
	// The toolbar globals the plugins contribute.
	previewGlobals: PreviewGlobal[];
}

// The route tree the router plugin writes, beside the generated config.
const ROUTE_TREE = "routeTree.gen.ts";

// A specifier the entry wrote relative to `.stack/` as an absolute path, any
// other as it is.
function fromStack(stackDir: string, specifier: string): string {
	return specifier.startsWith(".") ? join(stackDir, specifier) : specifier;
}

// `virtual:stack-screens`: what the entry holds that a story renders with,
// the app's route tree, its fixtures and the handlers of the endpoints its
// plugins own.
function screensModule(options: ScreensModuleOptions): string {
	const { stackDir } = options;
	const fixtures = join(stackDir, options.fixtures);
	const bindings = options.routerBindings.map(
		(binding, index) =>
			`import { ${binding.name} as bind${index} } from ${JSON.stringify(fromStack(stackDir, binding.source))};`,
	);
	const modules = options.handlerModules.map(
		(source, index) =>
			`import handlers${index} from ${JSON.stringify(fromStack(stackDir, source))};`,
	);
	const trees = options.fixtureModules.map(
		(source, index) =>
			`import tree${index} from ${JSON.stringify(fromStack(stackDir, source))};`,
	);
	return [
		...options.entryImports.map(
			(source) => `import ${JSON.stringify(fromStack(stackDir, source))};`,
		),
		...bindings,
		...modules,
		...trees,
		`import { routeTree } from ${JSON.stringify(join(stackDir, ROUTE_TREE))};`,
		existsSync(fixtures)
			? `import fixtures from ${JSON.stringify(fixtures)};`
			: "const fixtures = undefined;",
		"",
		"export { fixtures, routeTree };",
		`export const prefixes = ${JSON.stringify(options.prefixes)};`,
		`export const previewGlobals = ${JSON.stringify(options.previewGlobals)};`,
		`export const pluginFixtures = [${options.fixtureModules.map((_, index) => `tree${index}`).join(", ")}];`,
		`export const handlers = [${options.handlerModules.map((_, index) => `...handlers${index}`).join(", ")}];`,
		`export function bindRouter(router) { ${options.routerBindings.map((_, index) => `bind${index}(router);`).join(" ")} }`,
		"",
	].join("\n");
}

export interface ScreensPluginOptions extends ScreensModuleOptions {
	// The routes directory, relative to `stackDir`.
	routesDir: string;
}

const SCREENS = "virtual:stack-screens";
const WORKER = "/mockServiceWorker.js";

// Storybook runs Vite in middleware mode and never calls `server.listen()`,
// the call that starts Vite's dependency optimizer: without it `optimizeDeps`
// never scans or pre-bundles, a CJS dependency behind a `node_modules` import
// (`react-dom/client` through Storybook's dom shim) is served raw ("require is
// not defined"), and each dependency found late reloads the page.
function startOptimizer(server: ViteDevServer): void {
	void server.environments.client.depsOptimizer?.init();
}

// A package installed under `node_modules` is pre-bundled; one linked from a
// checkout is served as source, so pre-bundling a module of it would load a
// second copy beside the one the app's own imports load (react-ui's router
// binding would bind a copy no component reads). One that cannot be resolved
// is left to the optimizer.
function installed(specifier: string, root: string): boolean {
	try {
		const path = createRequire(join(root, "package.json")).resolve(specifier);
		return realpathSync(path).split(sep).includes("node_modules");
	} catch {
		return true;
	}
}

// The Vite plugin every Storybook host over the app's config runs: it starts
// the dependency optimizer. A host that draws routes runs `screensPlugin`
// instead, which does this too.
export function storybookHost(): Plugin {
	return { name: "stack:storybook-host", configureServer: startOptimizer };
}

// The Vite plugin only the screens host runs: it serves what a story needs
// (the app's route tree, fixtures and entry imports as one virtual module, MSW's
// worker from this package), keeps the story files in step with the routes and
// starts the dependency optimizer. It is added to the config `.stack/screens.vite.config.ts` only,
// never to the app's.
export function screensPlugin(options: ScreensPluginOptions): Plugin {
	// From this package, beside the `msw` the preview imports: the worker file
	// and the library are one copy.
	const worker = createRequire(import.meta.url).resolve(
		"msw/mockServiceWorker.js",
	);

	return {
		name: "stack:screens",
		// The optimizer's scan cannot see the virtual module's imports, so each
		// installed one would be found when the first page loads and reload it:
		// they are bundled at start.
		config: (config) => ({
			optimizeDeps: {
				include: [
					...options.routerBindings.map((binding) => binding.source),
					...options.handlerModules,
					...options.fixtureModules,
				].filter(
					(specifier) =>
						/^[@a-z]/.test(specifier) &&
						installed(specifier, config.root ?? process.cwd()),
				),
			},
		}),
		resolveId(id) {
			return id === SCREENS ? `\0${id}` : undefined;
		},
		load(id) {
			return id === `\0${SCREENS}` ? screensModule(options) : undefined;
		},
		configureServer(server) {
			startOptimizer(server);
			// Vite's root is `.stack/` and its watcher sees files under it and the
			// modules it loaded, so a route file added outside it would never reach
			// the router plugin, which regenerates the route tree on that event.
			const routes = resolve(options.stackDir, options.routesDir);
			server.watcher.add(routes);
			// A new route file is a story file, and a deleted one's goes. A file is
			// also read once it changes: the router plugin fills a new file in with
			// its `createFileRoute` after it appears. One sync at a time, so two
			// events never write the folder together.
			let syncing = Promise.resolve();
			const sync = (file: string) => {
				if (!file.startsWith(routes)) return;
				syncing = syncing
					.then(() =>
						syncStories({
							root: join(options.stackDir, ".."),
							routes,
							fixtures: resolve(options.stackDir, options.fixtures),
							previewGlobals: options.previewGlobals,
						}),
					)
					.catch((error) => server.config.logger.error(String(error)));
			};
			for (const event of ["add", "change", "unlink"]) {
				server.watcher.on(event, sync);
			}
			server.middlewares.use(WORKER, (_request, response) => {
				response.setHeader("Content-Type", "text/javascript");
				response.end(readFileSync(worker));
			});
		},
	};
}
