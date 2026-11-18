import type { ContributionCtx } from "@fcalell/cli";
import { plugin, slot } from "@fcalell/cli";
import {
	type HtmlInjection,
	type ProviderSpec,
	renderHtml,
	type ScaffoldSpec,
	type TsExpression,
	type TsImportSpec,
} from "@fcalell/cli/ast";
import { cliSlots, emitArtifact } from "@fcalell/cli/cli-slots";
import {
	COMPILED_SOURCE,
	OTHER_DEPENDENCY,
} from "@fcalell/cli/compiled-source";
import { type AppPlugin, vite } from "@fcalell/plugin-vite";
import { aggregateEntry, aggregateProviders } from "./node/codegen.ts";
import { routerPluginFor } from "./node/router-plugin.ts";
import {
	generateRouteTree,
	ROUTES_DTS,
	routerPaths,
	topLevelSegments,
} from "./node/routes.ts";
import {
	type AppIcon,
	type Mount,
	type ReactOptions,
	type RouterOptions,
	reactOptionsSchema,
} from "./types.ts";

const SOURCE = "react";

function regExp(source: string): TsExpression {
	return {
		kind: "new",
		callee: { kind: "identifier", name: "RegExp" },
		args: [{ kind: "string", value: source }],
	};
}

// Rolldown's runtime helper module, which `@rolldown/plugin-babel`'s default
// `exclude` skips and an `exclude` of its own must skip again; the plugin does
// not export its default.
const ROLLDOWN_RUNTIME = "^\\x00rolldown/runtime\\.js$";

// ── Slot declarations ──────────────────────────────────────────────
// What the slots compose: docs/architecture/plugins/react.md, "plugin-react".

// Sorted by `order` ascending so lower-order providers become outer wrappers.
const providers = slot.list<ProviderSpec>({
	source: SOURCE,
	name: "providers",
	sortBy: (a, b) => a.order - b.order,
});

// Sort by source so the emitted entry.tsx import order is independent of
// plugin iteration order.
const entryImports = slot.list<TsImportSpec>({
	source: SOURCE,
	name: "entryImports",
	sortBy: (a, b) => a.source.localeCompare(b.source),
});

// Router bindings: docs/architecture/plugins/react.md, "Bootstrap and mount".
const routerBindings = slot.list<TsImportSpec>({
	source: SOURCE,
	name: "routerBindings",
	sortBy: (a, b) => a.source.localeCompare(b.source),
});

// The root mount: docs/architecture/plugins/react.md, "Bootstrap and mount".
const mountExpression = slot.value<Mount | null>({
	source: SOURCE,
	name: "mountExpression",
	override: true,
	seed: () => null,
});

const htmlShell = slot.value<URL | null>({
	source: SOURCE,
	name: "htmlShell",
	override: true,
	seed: () => null,
});

const htmlHead = slot.list<HtmlInjection>({
	source: SOURCE,
	name: "htmlHead",
	// One `<title>` and one of each `<html>` attribute: docs/architecture/plugins/react.md, "HTML shell".
	uniqueBy: (item) => {
		if (item.kind === "title") return "title";
		if (item.kind === "html-attr") return `html-attr:${item.name}`;
		return undefined;
	},
});

const htmlBodyEnd = slot.list<HtmlInjection>({
	source: SOURCE,
	name: "htmlBodyEnd",
});

// The app's icon: docs/architecture/plugins/react.md, "HTML shell".
const icon = slot.derived({
	source: SOURCE,
	name: "icon",
	compute: (_inputs, ctx: ContributionCtx<ReactOptions>): AppIcon | null => {
		const given = ctx.options.icon;
		if (given === undefined) return null;
		const icon = typeof given === "string" ? { light: given } : given;
		const logo = ctx.options.logo;
		if (logo === undefined) return icon;
		return { ...icon, logo: typeof logo === "string" ? { light: logo } : logo };
	},
});

// Resolved routes directory, relative to the project root. `null` means
// file-based routing is off (`routes: false`).
const routesDir = slot.derived({
	source: SOURCE,
	name: "routesDir",
	compute: (_inputs, ctx: ContributionCtx<ReactOptions>): string | null => {
		const routes = ctx.options.routes;
		if (routes === false) return null;
		return routes?.dir ?? "src/app/routes";
	},
});

// Router plugin options: docs/architecture/plugins/react.md, "Router plugin".
const routerOptions = slot.derived({
	source: SOURCE,
	name: "routerOptions",
	inputs: { dir: routesDir },
	compute: (inp): RouterOptions | null =>
		inp.dir === null
			? null
			: { autoCodeSplitting: true, ...routerPaths(inp.dir) },
});

// Router plugin call: docs/architecture/plugins/react.md, "Router plugin".
const routerPlugin = slot.derived({
	source: SOURCE,
	name: "routerPlugin",
	inputs: { options: routerOptions },
	compute: (inp): AppPlugin | null =>
		inp.options === null ? null : routerPluginFor(inp.options),
});

const entrySource = slot.derived({
	source: SOURCE,
	name: "entrySource",
	inputs: { imports: entryImports, mount: mountExpression },
	compute: (inp): string | null => aggregateEntry(inp),
});

const htmlSource = slot.derived({
	source: SOURCE,
	name: "htmlSource",
	inputs: { shell: htmlShell, head: htmlHead, bodyEnd: htmlBodyEnd },
	// Null when no plugin claims a shell.
	compute: async (inp): Promise<string | null> =>
		inp.shell === null
			? null
			: renderHtml({
					shellSource: inp.shell,
					head: inp.head,
					bodyEnd: inp.bodyEnd,
				}),
});

const providersSource = slot.derived({
	source: SOURCE,
	name: "providersSource",
	inputs: { providers },
	compute: (inp): string | null => aggregateProviders(inp.providers),
});

const routesDtsSource = slot.derived({
	source: SOURCE,
	name: "routesDtsSource",
	inputs: { dir: routesDir },
	compute: (inp): string | null => (inp.dir === null ? null : ROUTES_DTS),
});

// Reserved top-level segments: docs/architecture/plugins/react.md, "Reserved top-level segments".
const topLevelRoutes = slot.derived({
	source: SOURCE,
	name: "topLevelRoutes",
	inputs: { dir: routesDir },
	compute: (inp, ctx): string[] =>
		inp.dir === null ? [] : topLevelSegments(ctx.cwd, inp.dir),
});

// The home route's scaffold; `override: true` lets a design-system plugin
// scaffold its own. Null when routing is off.
const homeScaffold = slot.value<ScaffoldSpec | null>({
	source: SOURCE,
	name: "homeScaffold",
	override: true,
	seed: async (ctx) => {
		const dir = await ctx.resolve(routesDir);
		return dir === null ? null : ctx.scaffold("home.tsx", `${dir}/index.tsx`);
	},
});

// One icon link per colour scheme, its type inferred from an `.svg` file.
function iconLink(href: string, scheme: "light" | "dark"): HtmlInjection {
	const link: HtmlInjection = {
		kind: "link",
		rel: "icon",
		href,
		media: `(prefers-color-scheme: ${scheme})`,
	};
	if (/\.svg(?:[?#].*)?$/i.test(href)) link.type = "image/svg+xml";
	return link;
}

export const react = plugin("react", {
	label: "React",

	schema: reactOptionsSchema,

	guide: [
		{
			page: "web-app",
			trigger:
				"Setting the page's title, icon or language, the dev server's port, serving a static file, or reasoning about the web dev server and its API proxy",
		},
		{
			page: "routes",
			trigger:
				"Writing, moving or linking a web route file in `src/app/routes/`, or reading its params",
		},
		{ page: "add-a-route", trigger: "Adding a page or URL to the web app" },
	],

	requires: ["vite"],

	dependencies: {
		"@tanstack/react-query": "^5.107.1",
		"@tanstack/react-router": "^1.170.46",
	},
	// The generated vite config imports them from the consumer, and the React
	// Compiler's Babel preset resolves the compiler plugin from there.
	devDependencies: {
		"@babel/core": "^7.29.13",
		"@rolldown/plugin-babel": "^0.3.1",
		// `stack generate` writes the route tree with it: an optional peer of the plugin.
		"@tanstack/router-generator": "^1.168.0",
		"@tanstack/router-plugin": "^1.169.0",
		"@vitejs/plugin-react": "^6.3.0",
		"babel-plugin-react-compiler": "^1.0.0",
	},

	slots: {
		providers,
		entryImports,
		routerBindings,
		mountExpression,
		htmlShell,
		htmlHead,
		htmlBodyEnd,
		icon,
		routesDir,
		routerOptions,
		routerPlugin,
		entrySource,
		htmlSource,
		providersSource,
		routesDtsSource,
		topLevelRoutes,
		homeScaffold,
	},

	contributes: (self) => [
		// ── Vite integration ────────────────────────────────────────────
		vite.slots.configImports.contribute((): TsImportSpec[] => [
			{ source: "@vitejs/plugin-react", default: "react" },
			{ source: "@vitejs/plugin-react", named: ["reactCompilerPreset"] },
			{ source: "@rolldown/plugin-babel", default: "babel" },
		]),
		// The router plugin is the app's own: docs/architecture/plugins/vite.md, "App-only plugin calls".
		vite.slots.appPlugins.contribute(
			async (ctx): Promise<AppPlugin | undefined> =>
				(await ctx.resolve(self.slots.routerPlugin)) ?? undefined,
		),
		// React Refresh's preamble in the dev policy: docs/architecture/plugins/react.md, "Dev CSP and React Refresh".
		vite.slots.appPlugins.contribute(
			(): AppPlugin => ({
				call: {
					kind: "call",
					callee: { kind: "identifier", name: "refreshPolicyPlugin" },
					args: [
						{
							kind: "member",
							object: { kind: "identifier", name: "react" },
							property: "preambleCode",
						},
					],
				},
				imports: [
					{
						source: "@fcalell/plugin-react/node/refresh",
						named: ["refreshPolicyPlugin"],
					},
				],
			}),
		),
		// React and the React Compiler over the app and stack's packages: docs/architecture/plugins/react.md, "React Compiler".
		vite.slots.pluginCalls.contribute((): TsExpression[] => [
			{
				kind: "call",
				callee: { kind: "identifier", name: "react" },
				args: [
					{
						kind: "object",
						properties: [{ key: "exclude", value: regExp(OTHER_DEPENDENCY) }],
					},
				],
			},
			{
				kind: "call",
				callee: { kind: "identifier", name: "babel" },
				args: [
					{
						kind: "object",
						properties: [
							{
								key: "exclude",
								value: {
									kind: "array",
									items: [regExp(OTHER_DEPENDENCY), regExp(ROLLDOWN_RUNTIME)],
								},
							},
							{
								key: "presets",
								value: {
									kind: "array",
									items: [
										{
											kind: "call",
											callee: {
												kind: "identifier",
												name: "reactCompilerPreset",
											},
											args: [
												{
													kind: "object",
													properties: [
														{
															key: "sources",
															value: {
																kind: "arrow",
																params: [{ name: "filename" }],
																body: {
																	kind: "call",
																	callee: {
																		kind: "member",
																		object: regExp(COMPILED_SOURCE),
																		property: "test",
																	},
																	args: [
																		{ kind: "identifier", name: "filename" },
																	],
																},
															},
														},
													],
												},
											],
										},
									],
								},
							},
						],
					},
				],
			},
		]),

		// Singleton runtimes: docs/architecture/plugins/react.md, "Singleton runtimes".
		vite.slots.resolveDedupe.contribute(() => [
			"react",
			"react-dom",
			"@tanstack/react-query",
			"@tanstack/react-router",
		]),

		// ── Entry ───────────────────────────────────────────────────────
		// The default mount renders the file routes; with routing off there
		// is nothing to mount until a peer contributes one.
		self.slots.mountExpression.contribute(
			async (ctx): Promise<Mount | undefined> => {
				if ((await ctx.resolve(self.slots.routesDir)) === null)
					return undefined;
				const bindings = await ctx.resolve(self.slots.routerBindings);
				const calls = bindings.flatMap((spec) =>
					"named" in spec
						? spec.named.map(
								(n) => `${typeof n === "string" ? n : n.alias}(router);`,
							)
						: [],
				);
				return {
					imports: [
						...bindings,
						{ source: "react", named: ["StrictMode"] },
						{ source: "react-dom/client", named: ["createRoot"] },
						{ source: "@tanstack/react-query", named: ["useQueryClient"] },
						{
							source: "@tanstack/react-router",
							named: ["createRouter", "RouterProvider"],
						},
						{ source: "./routeTree.gen.ts", named: ["routeTree"] },
						{ source: "virtual:stack-providers", default: "Providers" },
					],
					body: [
						// The query client is made inside `Providers`, so the router is built
						// with a stand-in and `App` hands it the real one as its context.
						"const router = createRouter({",
						"\trouteTree,",
						"\tdefaultPreloadStaleTime: 0,",
						"\tcontext: { queryClient: undefined as never },",
						"});",
						...calls,
						"",
						"function App() {",
						"\tconst queryClient = useQueryClient();",
						"\treturn <RouterProvider router={router} context={{ queryClient }} />;",
						"}",
						"",
						// getElementById types the shell's `#app` as nullable; the shell always has it.
						'createRoot(document.getElementById("app") as HTMLElement).render(',
						"\t<StrictMode>",
						"\t\t<Providers>",
						"\t\t\t<App />",
						"\t\t</Providers>",
						"\t</StrictMode>,",
						");",
					].join("\n"),
				};
			},
		),

		// ── HTML ─────────────────────────────────────────────────────────
		self.slots.htmlShell.contribute((ctx): URL => ctx.template("shell.html")),

		self.slots.htmlHead.contribute(
			(): HtmlInjection => ({
				kind: "html-attr",
				name: "lang",
				value: self.options.lang ?? "en",
			}),
		),
		self.slots.htmlHead.contribute(
			(ctx): HtmlInjection => ({
				kind: "title",
				value: self.options.title ?? ctx.app.name,
			}),
		),
		self.slots.htmlHead.contribute((): HtmlInjection | undefined => {
			const { description } = self.options;
			if (!description) return undefined;
			return { kind: "meta", name: "description", content: description };
		}),
		self.slots.htmlHead.contribute((): HtmlInjection | undefined => {
			const { themeColor } = self.options;
			if (!themeColor) return undefined;
			return { kind: "meta", name: "theme-color", content: themeColor };
		}),
		self.slots.htmlHead.contribute(async (ctx): Promise<HtmlInjection[]> => {
			// With no icon the browser asks for `/favicon.ico` by itself; an
			// empty data URL makes it request nothing.
			const icon = await ctx.resolve(self.slots.icon);
			if (icon === null) return [{ kind: "link", rel: "icon", href: "data:," }];
			if (icon.dark === undefined) {
				return [{ kind: "link", rel: "icon", href: icon.light }];
			}
			return [iconLink(icon.light, "light"), iconLink(icon.dark, "dark")];
		}),
		self.slots.htmlBodyEnd.contribute(
			async (ctx): Promise<HtmlInjection | undefined> => {
				if ((await ctx.resolve(self.slots.entrySource)) === null) {
					return undefined;
				}
				return { kind: "script", type: "module", src: "/entry.tsx" };
			},
		),

		// ── Artifact files ──────────────────────────────────────────────
		emitArtifact(".stack/entry.tsx", self.slots.entrySource),
		emitArtifact(".stack/index.html", self.slots.htmlSource),
		emitArtifact(".stack/virtual-providers.tsx", self.slots.providersSource),
		emitArtifact(".stack/routes.d.ts", self.slots.routesDtsSource),

		// The route tree, from TanStack's own generator, so the typed routes
		// exist before Vite first runs.
		cliSlots.postWrite.contribute(async (ctx) => {
			const dir = await ctx.resolve(self.slots.routesDir);
			if (dir === null) return undefined;
			return () => generateRouteTree(ctx.cwd, dir);
		}),

		// ── Scaffolds ───────────────────────────────────────────────────
		cliSlots.initScaffolds.contribute(async (ctx) => {
			const dir = await ctx.resolve(self.slots.routesDir);
			if (dir === null) return undefined;
			return ctx.scaffold("root.tsx", `${dir}/__root.tsx`);
		}),
		cliSlots.initScaffolds.contribute(async (ctx) => {
			return (await ctx.resolve(self.slots.homeScaffold)) ?? undefined;
		}),

		// Remove cleans up consumer-owned src/app/.
		cliSlots.removeFiles.contribute(() => "src/app/"),
	],
});

export type { Mount, RouterOptions } from "./types.ts";
