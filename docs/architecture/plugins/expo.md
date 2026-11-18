# plugin-expo

`@fcalell/plugin-expo` is the Expo and React Native target: it generates the Metro config, the Expo
app config and the expo-router entry, and mounts a native app on the same worker `plugin-api`
generates for the web. This page holds what the plugin owns and contributes, the files it generates
and why they are CommonJS, how Metro resolves stack's virtual modules, the typed routes and the
unmatched-address page, the dependencies it pins, the scaffolded API client and the version gate.
How a consumer builds the phone app is the plugin's guide (`plugins/expo/guide/`).

## Slots and contributions

Every owned slot is listed in the [slot catalog](../slot-catalog.md#exposlots-plugin-expo). Two
of them carry an ordering rule:

- `expoConfigPlugins`, the entries for the app config's `plugins` array (config plugins like
  `"expo-router"` or `["expo-build-properties", { … }]`), is sorted by name, so the emitted array is
  independent of plugin iteration order.
- `providers`, wrapped around the expo-router root in `.stack/entry.tsx`, is sorted ascending by
  `order`, so a lower-order provider is an outer wrapper. native-ui contributes its words, the query
  provider and auth here ([native-ui's provider order](native-ui.md#provider-order)).

`routesPagesDir` drives the entry's `require.context` path and the expo-router config plugin, so its
`null` turns expo-router wiring off.

| Target slot | Behaviour |
| --- | --- |
| `api.slots.nativeScheme` | The deep-link scheme: the `scheme` option, else the app name's slug, the one `.stack/app.config.cjs` registers |
| `api.slots.devCorsOrigins` | The Metro dev server's `http://localhost:<port>` (default 8081), under the rule of [local and dev origins](api.md#local-and-dev-origins) |
| `api.slots.middlewareEntries` | The version gate ([Version gate](#version-gate)) |
| `cloudflare.slots.bindings` | The gate's analytics-engine dataset ([Version gate](#version-gate)) |
| `cliSlots.artifactFiles` | The generated files ([Generated files](#generated-files)) |
| `cliSlots.devWatchers` | Rewrites `.stack/routes.d.ts` when a route file is added or removed (300 ms debounce) |
| `expoConfigPlugins` (its own) | The consumer's `configPlugins` option ([Dependencies](#dependencies)) |
| `cliSlots.initDeps` | The npm dependencies of the consumer's `configPlugins` |
| `cliSlots.packageJsonFields` | `main: ".stack/entry.tsx"`, write-once, unless routing is off |
| `cliSlots.initScaffolds` | `metro.config.js`, `app.config.ts`, `babel.config.cjs`, `eas.json`, `src/lib/api.ts` |
| `cliSlots.removeFiles` | The same five files |

The commands `dev`, `prebuild`, `build` and `update` under `stack expo` run `expo start`,
`expo prebuild`, `eas build` and `eas update` ([builds](../../../plugins/expo/guide/builds.md)).

## Generated files

| File | Source |
| --- | --- |
| `.stack/metro.config.cjs` | `expo.slots.metroConfig` |
| `.stack/app.config.cjs` | `expo.slots.expoConfig` |
| `.stack/entry.tsx` | `expo.slots.entrySource`; null with routing off |
| `.stack/routes.d.ts` | `expo.slots.routesDtsSource` ([Routes](#routes)); null with routing off |
| `.stack/expo-env.d.ts` | A static `/// <reference types="expo/types" />`, as Expo's own tooling writes at a project root, so `tsconfig.app.json` includes Expo's ambient types with no hand-managed file |
| `<routes dir>/+not-found.tsx` | `expo.slots.notFoundFile` ([Routes](#routes)) |

The consumer's `package.json` `main` points at `.stack/entry.tsx`, so expo-router mounts it and the
provider stack. Without it expo-router falls back to its default entry and every contributed provider
is dead. The field is written once, and not at all with `routes: false`: a bare React Native consumer
owns its own entry, and no `.stack/entry.tsx` exists to point at.

`.stack/metro.config.cjs` sets Metro's `projectRoot` to the consumer root, one level above `.stack/`:
Metro resolves modules and the entry's `require.context("../src/app")` from `projectRoot`, so
`../src/app` would otherwise sit outside the project and not bundle. uniwind's `cssEntryFile` and
`dtsFile` are relative to `projectRoot` too and point back into `.stack/`. The Metro config is built
as a string from structured specs (`metroConfigImports`, `metroPluginCalls`), because the
`renderTsSourceFile` printer emits ESM only.

The root files are the consumer's: the `metro.config.js` and `app.config.ts` shims re-export from
`.stack/`, and `babel.config.cjs` and `eas.json` are real consumer-edited files
([the root files](../../../plugins/expo/guide/options.md#the-root-files)).

### Config files are .cjs

The consumer is always `type: module` (the scaffold sets it), and every config file here is loaded
through Node's `require`:

- **app.config.** Expo's config loader (`@expo/require-utils`) transpiles only the root
  `app.config.ts` shim, then `require()`s what it re-exports through Node. A `.js` would parse as ESM
  and its `module.exports` would throw, and a `.ts` cannot be `require()`d at all. A JSDoc `@type`
  keeps the `ExpoConfig` shape the `.ts` annotation carried.
- **metro.config.** The root `metro.config.js` shim `require()`s `.stack/metro.config.cjs` through
  Node, so a `.js` would parse as ESM and its `require` and `module.exports` would throw.
- **babel.config.** Babel's own loader `require()`s it through Node, so a `module.exports` in a `.js`
  would parse as ESM and throw. Babel discovers `.cjs` by itself.

`.cjs` is CommonJS whatever `package.json` says, the one extension that loads in all three places.

## Metro resolution

plugin-api writes generated modules into `.stack/` that a bundler resolves by their `virtual:` name
([virtual:stack-procedure](../runtime.md#virtualstack-procedure)); the web does it through
plugin-vite, and the native `Form` reads `virtual:stack-schema`. Metro resolves a name no package
holds through `resolveRequest`, so the generated config maps each virtual name to its file and chains
to any wrapper's `resolveRequest` after it.

## Routes

`.stack/routes.d.ts` is expo-router's own typed-routes declaration, made by the generator the app's
Expo CLI runs (`@expo/router-server`, reached through the app's `expo` and `@expo/cli`), over the
route files the app's expo-router would mount. It augments `ExpoRouter.__routes`, which expo-router's
`Href` reads, so an `href` to a path no route file serves fails the type-check
([navigating](../../../plugins/expo/guide/routes.md#navigating)).

The generator has no public entry. `src/node/routes.ts` reaches three private paths, the ones
`@expo/router-server`'s own watcher reads: `@expo/router-server`'s
`build/typed-routes/generate.js` (`getTypedRoutesDeclarationFile`), and expo-router's
`internal/testing` (`requireContext`) and `_ctx-shared` (`EXPO_ROUTER_CTX_IGNORE`). A minor of
either package can move them, so the app's expo-router is the SDK's `~58.0.x`, written from the
SDK's table ([Dependencies](#dependencies)).

expo-router reads the route for an address nothing serves from a `+not-found` file at the root of the
routes directory, whatever its extension; without one it draws its own "Unmatched Route". It reads no
other place, so a page stack draws is a file in the app's routes directory, unlike every `.stack/`
file. `notFoundRoute` names the module whose default export is that page, contributed by a design
system (native-ui's). With one, generate writes `<routes dir>/+not-found.tsx` re-exporting it, once,
and only while no `+not-found.*` sits at the routes directory's root, so a route of the app's own is
never overwritten ([an address no route serves](../../../plugins/expo/guide/routes.md#an-address-no-route-serves)).

## Dependencies

The plugin depends on `expo` to read the SDK's version table (`expo/bundledNativeModules.json`),
which names the version of each native module the SDK is built against, and writes `expo` and those
versions of `expo-router`, `react-native-screens`, `react`, `react-dom`, `react-native`,
`expo-application`, `expo-system-ui` and `expo-status-bar` into the consumer's `dependencies`. Its
`react` is the version react-native's renderer accepts: any other React fails at startup with
"Incompatible React versions". `react-dom` is an optional peer of `expo` and `expo-router` that
names no version, so an install would take the newest, which wants a newer `react` than that one.
`react-native-screens` is a required peer of `expo-router`. `sdkVersions(names)` is the table's
reader, exported so native-ui takes its native modules from the same SDK.
`expo-application` is required for every generated `src/lib/api.ts`, with or without a
`minNativeBuild` floor ([API client](#api-client)).

The `configPlugins` option is the path for native modules (apple-authentication, google-signin,
camera, notifications) to reach the generated app: its entries go to `expoConfigPlugins`, their npm
`dependencies` to `cliSlots.initDeps` ([options](../../../plugins/expo/guide/options.md#options)).

## API client

`stack init` scaffolds `src/lib/api.ts` from `templates/lib-api.ts`: a typed oRPC client whose
`fetch` is `createVersionGatedFetch()`, stamping the version-gate headers on every request. It is
copy-once, an editable starter, as native-ui's `lib-query.ts` and `lib-auth.ts` are
([native clients in src/lib](native-ui.md#native-clients-in-srclib)). The consumer's half, the type-only
router import among it, is the guide's [API client](../../../plugins/expo/guide/api-client.md).

## Version gate

The gate walls native builds below the `minNativeBuild` floor with 426 Upgrade Required. The
consumer's half is the guide's [version gate](../../../plugins/expo/guide/version-gate.md).

- **The wire contract.** `@fcalell/plugin-expo/client` stamps two headers on every request, the
  build number and the platform; `CLIENT_BUILD_HEADER` and `CLIENT_PLATFORM_HEADER` live in
  `src/version-gate-shared.ts`, outside both `src/worker/` and `src/client/`, which may not import
  each other ([plugin folder structure](../conventions.md#plugin-folder-structure)).
- **The build number.** The client reads `Application.nativeBuildVersion` from
  `expo-application`: the compiled binary's build number (iOS `CFBundleVersion`, Android
  `versionCode`), straight off the native module at run time. `expo-constants`' `expoConfig` reflects
  the app config the JS bundle shipped with and can drift from the store build. The value is `null` on
  web and whenever the native module cannot resolve it (Expo Go on some platforms).
- **Fail open.** The wall is a UX nudge, not a security control. The client stamps no header it
  cannot read and never throws over one, and the middleware lets through anything it cannot read as a
  stale native client ([what it walls](../../../plugins/expo/guide/version-gate.md#what-it-walls)). An
  undetectable build degrades to unwalled rather than breaking every request. The client only carries the signal: `onUpdateRequired` lets the app draw an
  update wall.
- **Dormant.** Without a floor above 0 the plugin contributes neither the middleware nor the binding,
  so the gate is absent from the emitted worker.
- **Order.** The middleware is `after-cors`, `order: 0`, so it runs before any other middleware, a
  rate-limit guard in particular: a walled client's retry storm sees 426, never a 429
  ([api's rate limiting](api.md#rate-limiting)).
- **Scope.** Only paths inside the worker's own prefixes (`api.slots.routePrefixes`, baked in at
  codegen) are walled. A consumer's raw route is the consumer's surface, and walling it would answer a
  stale client with a 426 on an endpoint that never spoke the version contract. Liveness (`/`) falls
  outside every prefix and is never gated.
- **Telemetry.** While the gate is active the plugin binds an analytics-engine dataset,
  `VERSION_GATE_METRICS`, named after the app. The runtime probes `env[VERSION_GATE_METRICS]` and
  stays silent when the binding is absent (the node target, local dev without the section), so the
  binding and the write fail open independently of each other and of the wall.

## In the code

- `plugins/expo/src/index.ts`: the plugin, its slots, commands, pinned dependencies and every contribution.
- `plugins/expo/src/types.ts`: the options and the Metro config specs.
- `plugins/expo/src/node/codegen.ts`: the Metro config, the app config and the entry.
- `plugins/expo/src/node/routes.ts`: `.stack/routes.d.ts`.
- `plugins/expo/src/node/not-found.ts`: the `+not-found` route file.
- `plugins/expo/src/version-gate-shared.ts`: the gate's header names and binding name.
- `plugins/expo/src/worker/version-gate.ts`: the gate middleware.
- `plugins/expo/src/client/index.ts`: `createVersionGatedFetch()`, `onUpdateRequired()`.
- `plugins/expo/src/node/names.ts`: the slug, the deep-link scheme, the bundle id and the gate's dataset name.
- `plugins/expo/templates/lib-api.ts`: the scaffolded API client.
- `apps/phone/app.config.ts`: a consumer's root app-config shim.
- `apps/phone/src/lib/api.ts`: a consumer's API client.
