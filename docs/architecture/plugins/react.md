# plugin-react

`@fcalell/plugin-react` is React on Vite for the web app: it owns every fragment of the web
bootstrap (the entry, the providers composition, the HTML shell and the router's type registration),
runs TanStack Router's file routes and the React Compiler, and keeps React's runtime a singleton.
Peer plugins contribute into its list slots, and its derived `*Source` slots compose them into the
files emitted under `.stack/`. This page holds how that bootstrap is built; the consumer's options
and route conventions are the guide (`plugins/react/guide/`), and the slots are in the
[slot catalog](../slot-catalog.md#reactslots-plugin-react).

## Generated files

| File | Slot | Content |
|------|------|---------|
| `.stack/entry.tsx` | `react.slots.entrySource` | `createRouter({ routeTree })` mounted as `<StrictMode><Providers><RouterProvider /></Providers></StrictMode>` |
| `.stack/index.html` | `react.slots.htmlSource` | The shell with the `<head>` injections and the entry script |
| `.stack/virtual-providers.tsx` | `react.slots.providersSource` | The contributed providers, served as `virtual:stack-providers` |
| `.stack/routes.d.ts` | `react.slots.routesDtsSource` | The router's `Register` declaration |
| `.stack/routeTree.gen.ts` | `cliSlots.postWrite` | TanStack Router's route tree |

`.stack/vite.config.ts` gains `tanstackRouter()`, `react()` and `babel()` with the React Compiler ([React Compiler](#react-compiler)),
`refreshPolicyPlugin(react.preambleCode)` ([Dev CSP and React Refresh](#dev-csp-and-react-refresh))
and `resolve.dedupe` for the singleton runtimes ([Singleton runtimes](#singleton-runtimes)).

`.stack/routes.d.ts` registers the app's router with TanStack Router, so `Link`, `useNavigate` and
`useParams` are typed by the route tree. It is the file the consumer's type-check loads; the entry,
which builds the router itself, never enters that program, since its providers module is Vite-only.

`routes: false` turns file routing off: no route tree, no `routes.d.ts`, and no mount until a peer
contributes one to `react.slots.mountExpression`.

## Bootstrap and mount

- **Mount.** `react.slots.mountExpression` is the root mount: verbatim statements with the imports
  they need. It is a value slot, so a peer plugin can replace the mount, and `override: true` lets the
  default cede cleanly. `null` means no mount, and `entry.tsx` is skipped. The default mount renders
  the file routes; with routing off there is nothing to mount until a peer contributes one.
- **Router bindings.** `react.slots.routerBindings` lists functions a peer needs to call with the
  router instance (`named` imports only); each is called as `<name>(router)` right after
  `createRouter`. They are sorted by source, so the emitted calls are independent of plugin
  iteration order. Only the default mount calls them: a peer's own mount owns its router.
  react-ui's two bindings are [Router bindings](./react-ui.md#router-bindings).

## Providers module

`.stack/virtual-providers.tsx` composes the providers, which arrive sorted ascending by `order`
(lower is outer) through `react.slots.providers`. That list slot's stable sort keeps contribution
order among equal orders, and a second sort in codegen would lose that tiebreak. Siblings render as
additional children of the wrapper, after the wrapped subtree, so they share the wrapper's context.
With no provider the module is null, and the resolver serves a pass-through stub
([Preset](./vite.md#preset)).

## HTML shell

HTML allows at most one `<title>` and one of each `<html>` attribute, so two `react.slots.htmlHead`
contributions of either fail at generate time instead of producing a malformed document. Other kinds
opt out of that check by returning `undefined`.

`react.slots.icon` is the app's icon, from the `icon` option: the favicon links read it, and a UI plugin that draws the app's lockup reads the same value, with the app's drawn
lockup (`logo`) when it gave one ([App lockup](./react-ui.md#app-lockup)). It is null when the app has no
icon.

## Router plugin

`react.slots.routerOptions` holds the router plugin's options as data: the app's config runs the
plugin on them as they are, and a host that draws the screens reads them to run it with one changed.
`react.slots.routerPlugin` is the router plugin's call (TanStack's route-tree generator, on the app's
route files) with the imports it needs, rendered from those options; a host that runs the plugin on
options of its own renders the same call. Both are null when routing is off.

The router plugin is the app's own: it reaches the app's config through `vite.slots.appPlugins`
([App-only plugin calls](./vite.md#app-only-plugin-calls)), which keeps it ahead of `react()`. A host
that draws components (Storybook's roster) renders no route, so it leaves the slot unread.

## Reserved top-level segments

`react.slots.topLevelRoutes` holds the static first segments of the app's URLs (`login`,
`settings`), for a peer that hands out top-level addresses (an organization's slug) and must not
shadow a route ([Organization routes](./react-ui.md#organization-routes)). It is empty when routing
is off.

## Dev CSP and React Refresh

`@vitejs/plugin-react` puts React Refresh's preamble on the dev server's page as an inline script. A
policy that restricts scripts blocks it, and every component module then throws "can't detect
preamble", so the dev server's policy also allows the preamble by hash. `preambleCode` is the
installed plugin's own (`react.preambleCode`, with `__BASE__` standing for the config's `base`), so
the hash follows an upgrade. A build serves no preamble and keeps the policy as it is.

`refreshPolicyPlugin` is an app-only plugin call: the app's own dev server alone carries the client's
policy (a host drops `clientHeaders`), so the app's config alone allows the preamble in it. The policy
itself is [Content-Security-Policy](./vite.md#content-security-policy).

## Singleton runtimes

React's runtime must be a singleton: a workspace-linked stack checkout resolving its own copy would
ship two, and hooks throw. TanStack Query and Router hold their client and router in React context,
so a second copy of either reads no provider. The plugin contributes `react`, `react-dom`,
`@tanstack/react-query` and `@tanstack/react-router` to `vite.slots.resolveDedupe`
([Singletons and the optimizer](./vite.md#singletons-and-the-optimizer)).

## React Compiler

The compiler is `babel-plugin-react-compiler`, the one the phone runs, through `@vitejs/plugin-react`'s
`reactCompilerPreset` on `@rolldown/plugin-babel`: `babel()` sits beside `react()` in
`.stack/vite.config.ts`, and `react()` itself only sets up JSX and React Refresh for Oxc.
`@babel/core` is on the 7 line, the one Expo's Babel plugins peer on: in stack's workspace a Babel 8
becomes the `@babel/core` that React Native's tree resolves, and Expo's plugins refuse it.

Stack's UI packages ship TypeScript source that a consumer installs under `node_modules` (pnpm nests
them as `.pnpm/@fcalell+<pkg>@.../node_modules/@fcalell/<pkg>`). Three filters keep them out of the
compiler's and React Refresh's reach by default, and `OTHER_DEPENDENCY` and `COMPILED_SOURCE`
(`@fcalell/cli/compiled-source`) widen each to let `@fcalell` packages through while every other
dependency stays out:

- `react()` leaves every `/node_modules/` path out of React Refresh (`exclude`).
- `babel()` leaves every `/node_modules/` path out of Babel (`exclude`, which also keeps Rolldown's
  runtime helper module out, as the plugin's default `exclude` does).
- The compiler skips any filename holding `node_modules` (`sources`, a positive test, so it is the
  same pattern wrapped in a negative lookahead).

plugin-react's Vite config and plugin-expo's `babel.config.cjs` both read it, so the web and the
phone compile the same code ([Config files are .cjs](./expo.md#config-files-are-cjs)). It is
internal, not a documented surface.

## In the code

- `plugins/react/src/index.ts`: the plugin, its slots and contributions.
- `plugins/react/src/node/codegen.ts`: the providers module and the router plugin call.
- `plugins/react/src/node/routes.ts`: `.stack/routes.d.ts` and the route segments.
- `plugins/react/src/node/refresh.ts`: `refreshPolicyPlugin`.
- `packages/cli/src/lib/compiled-source.ts`: `COMPILED_SOURCE`, the React Compiler's filters.
