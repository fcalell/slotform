# Slot catalog and spec types

The **slot catalog** is the registry of every first-party slot and the payload shapes they carry:
one table per owning plugin, one row per slot, each slot usable as a contribution target and as a
derivation input, then the spec types. What the kinds `list`, `map`, `value` and `derived` mean is in
the [slot graph](./slot-graph.md#the-four-slot-kinds). A slot added, renamed, removed or reshaped
updates its row here in the same commit.

## CLI lifecycle slots (`cliSlots`)

`cliSlots`, from `@fcalell/cli/cli-slots`, are the cross-cutting sinks the core `stack` CLI reads:
every value the CLI takes from plugins flows through one of them. The lifecycle is fixed: each
command resolves a known set of these slots and acts on the values. Plugins contribute files,
processes and lifecycle hooks here and rarely read them. A slot no plugin owns takes
`source: "cli"`. The phase-sorted lists (`buildSteps`, `deploySteps`) carry `phase` on
each spec, and the slot's `sortBy` orders them at resolution; equal phases keep contribution order.

| Slot | Kind | Purpose |
|------|------|---------|
| `cliSlots.initPrompts` | `list<PromptSpec>` | Init and add interactive prompts |
| `cliSlots.initScaffolds` | `list<ScaffoldSpec>` (`uniqueBy: target`) | Files written once into the consumer repo, from a template or composed content; two plugins claiming one target fail at compose time |
| `cliSlots.initDeps` | `map<string, string>` | npm `dependencies` to add (auto-wired from `plugin({ dependencies })`) |
| `cliSlots.initDevDeps` | `map<string, string>` | npm `devDependencies` to add (auto-wired from `plugin({ devDependencies })`) |
| `cliSlots.packageJsonFields` | `map<unknown>` | Top-level `package.json` fields (Expo's `main`). Written if absent at init and add, so a consumer-set value is never clobbered; a key two plugins set throws, since two plugins claiming `main` is a real conflict, not a merge |
| `cliSlots.gitignore` | `list<string>` | `.gitignore` entries (auto-wired from `plugin({ gitignore })`) |
| `cliSlots.guide` | `list<GuideEntry>` (sorted by domain) | The guide's pages, auto-wired from `plugin({ guide })` under the plugin's name and package; the CLI adds its own (`provided`, `config`, `commands`, `shortfall`), and react-ui and native-ui each add ui-core's. Rendered by the CLI into `.stack/guide.md`, independent of config order; a page two plugins list is written once |
| `cliSlots.artifactFiles` | `list<GeneratedFile>` | `{ path, content }` files written under `.stack/` (or anywhere in cwd) |
| `cliSlots.lintPlugins` | `list<LintPlugin>` (`{ path, includes }`, `uniqueBy: path`) | The Biome GritQL rules a package ships for the app's own sources: `path` is the `.grit` file inside the package (`@fcalell/plugin-react-ui/lint/no-img.grit`), `includes` the globs, relative to the app's root, it runs on. Rendered by the CLI into `.stack/biome.json`, written for every app (empty when no plugin contributes), which the app's `biome.json` extends |
| `cliSlots.lintIgnore` | `list<string>` (unique) | Generated sources the app's Biome skips, as globs relative to the app's root (plugin-db contributes its `migrations` directory: drizzle-kit writes it in its own format). Rendered into `.stack/biome.json` as an override turning the linter, formatter and import sorting off for them (a `files.includes` exclusion would replace, not merge with, the include list of the config it extends, and a lone `["!src/migrations"]` checks 0 files) |
| `cliSlots.postWrite` | `list<() => Promise<void>>` | Hooks run after artifact files land (`wrangler types`, TanStack Router's route tree) |
| `cliSlots.devProcesses` | `list<ProcessSpec>` (`uniqueBy: name`) | Long-running dev processes spawned in parallel. A name is the supervisor's log prefix and its shutdown and restart target, so two processes never share one |
| `cliSlots.devWatchers` | `list<WatcherSpec>` (`uniqueBy: name`) | Recursive `fs.watch` watchers attached during `stack dev`, each debounced on its own |
| `cliSlots.devReadySetup` | `list<DevReadyTask>` (`uniqueBy: name`) | One-shot tasks run after processes report ready |
| `cliSlots.buildSteps` | `list<BuildStep>` (`uniqueBy: name`, phase-sorted) | Build steps in phase order (`pre`, `main`, `post`) |
| `cliSlots.deployChecks` | `list<DeployCheck>` | Pre-deploy checks: shown, confirmed in a terminal, then each `action` runs ([commands](./commands.md#command-steps)) |
| `cliSlots.deploySteps` | `list<DeployStep>` (`uniqueBy: name`, phase-sorted) | Deploy steps in phase order |
| `cliSlots.removeFiles` | `list<string>` | Paths removed on `stack remove <plugin>` |
| `cliSlots.removeDeps` | `list<string>` | npm dependencies removed (auto-wired from `plugin({ dependencies })`) |
| `cliSlots.removeDevDeps` | `list<string>` | npm devDependencies removed (auto-wired from `plugin({ devDependencies })`) |
| `cliSlots.tsconfigPaths` | `map<string, string[]>` | Consumer tsconfig `compilerOptions.paths` entries a plugin's generated code needs resolved (api's `virtual:stack-procedure` alias to `.stack/procedure.ts`). Read once, by `stack init`'s tsconfig template: the tsconfig is scaffolded, never regenerated by `stack generate` |
| `cliSlots.tsconfigTypes` | `list<string>` | Consumer tsconfig `compilerOptions.types` entries a plugin's runtime needs globally in scope (native-ui's `uniwind/types` className augmentation). Read where `tsconfigPaths` is |
| `cliSlots.workerTsconfig` | `value<string>` (seed `tsconfig.json`) | The consumer tsconfig (root-relative) holding the worker's `paths`: `tsconfig.worker.json` under the split, else `tsconfig.json`. Contributed by the CLI from the layout `stack init`'s template writes; cloudflare passes it to every bundling wrangler command |

`stack init` resolves `tsconfigPaths` and `tsconfigTypes` off the graph built before its prompts
run, when no plugin's options are known yet. That holds because a contribution to either never
reads `ctx.options`: a plugin's presence in the graph is the gate. The tsconfig template only
decides where the contributed entries land (the single config, or the split's app and worker
projects), never what they contain.

For the pattern "resolve a `*Source` slot, write it under `.stack/`, skip on `null`", use the
`emitArtifact` helper exported beside `cliSlots`:

```ts
import { emitArtifact } from "@fcalell/cli/cli-slots";

contributes: (self) => [
  emitArtifact(".stack/worker.ts", self.slots.workerSource),
],
```

It expands to a `cliSlots.artifactFiles.contribute` that resolves the source slot and returns
`{ path, content }`, or skips when the source resolves to `null` (the upstream derivation chose to
emit nothing). The raw `cliSlots.artifactFiles.contribute(...)` form is for a contribution that
needs more, such as consulting `ctx.fileExists` before writing.

## `api.slots.*` (plugin-api)

| Slot | Kind | Purpose |
|------|------|---------|
| `workerImports` | `list<TsImportSpec>` | Imports for `.stack/worker.ts` |
| `pluginRuntimes` | `list<PluginRuntimeEntry>` | Runtime entries that become `.use(xRuntime({...}))` calls |
| `middlewareEntries` | `list<MiddlewareSpec>` | Hono middleware (phase-ordered); the `after-context` phase mounts after the worker injects its plugin context, every other phase before |
| `middlewareCalls` | `derived<MiddlewareCall[]>` | Sorted calls derived from `middlewareEntries`, each with the builder method that mounts it (`use` / `useAfterContext`) |
| `middlewareImports` | `derived<TsImportSpec[]>` | Deduplicated imports for middleware |
| `routesHandler` | `value<{ identifier } \| null>` | Routes namespace identifier (seeded from `src/worker/routes` existence) |
| `mcpAuth` | `value<boolean>` (`override`, seed false) | Whether the worker holds an OAuth provider for MCP clients; auth contributes true under `mcp` (api never imports auth) |
| `serverAuth` | `value<boolean, ApiOptions>` (seed: false, or the `auth` of the server's manifest under `server`) | Whether the server this app talks to has `auth()`. auth contributes true in the app that owns the worker (api never imports auth); a client app has no auth in its config, so api seeds it from `.stack/server.json`, which the server app's own `generate` writes beside its `.stack/schema.ts` as `{ "auth": boolean }`. native-ui reads it to stand the Auth provider |
| `serverSchemaSource` | `derived<string \| null>` | `.stack/schema.ts` of a client app (`api({ server })`, web or native): the server app's own, copied verbatim so `virtual:stack-schema` describes the server's procedures (Metro bundles only what sits under the app's root). Null without `server`, when api writes its own after the barrel. `generate` fails naming the server when its `.stack/server.json`, `.stack/schema.ts` or router declaration (`.stack/types/.stack/worker.d.ts`) is missing, and when the app has routable files under `src/worker/routes`; `stack dev` copies it again when the server's changes |
| `serverTypesSource` | `derived<string \| null>` | `.stack/server.ts` of a client app: a type-only re-export of the server's `AppRouter` from the declaration its `tsc -b` emits under `.stack/types/.stack/worker`; null without `server` |
| `mcpMount` | `derived<{ identifier, name } \| null>` | The MCP endpoint's mount: null without `src/worker/mcp.ts`; with it, generate refuses unless `mcpAuth` is true and routable files exist, and when `api({ prefix })` is `/mcp`. `workerSource` passes the file's default export and the app name to `.handler(routes, { mcp, name })`, `routePrefixes` gains `/mcp`, and `procedureSource` leaves the import out (the file types itself against routes that import the procedure entry) |
| `queueHandler` | `derived<{ identifier } \| null>` | The queue consumer's mount: null without `src/worker/queue.ts`; with it, generate refuses when the app has no worker (no routable file and no plugin runtime), naming the file, and plugin-node refuses it on the node target. `workerSource` imports the file's default export and passes it to `.handler(routes, { …, queue })`, and `procedureSource` leaves the import out (the file imports `defineQueue` from the procedure entry) |
| `scheduledHandler` | `derived<{ identifier } \| null>` | The cron handler's mount: null without `src/worker/scheduled.ts`; the same refusals and wiring as `queueHandler`, passed as `scheduled` |
| `corsOrigins` | `list<string>` | Extra production CORS origins |
| `devCorsOrigins` | `list<string>` (sorted) | Frontend dev origins: each frontend dev server's (vite, metro) localhost when `app.origins` is absent, else the local origins api partitions out of it; emitted with `devTargetOrigins` after it as `createWorker({ devCors })` and honoured only when the worker runs with `STACK_DEV`, so a deploy never trusts localhost |
| `devTargetOrigins` | `list<string>` (sorted) | Deploy-target dev origins: each deploy target's dev process's (node server, wrangler) localhost when `app.origins` is absent; same dev-only gating, always after `devCorsOrigins` in every dev list |
| `routePrefixes` | `list<string>` | URL prefixes the worker owns (api contributes its `prefix` and, with `src/worker/mcp.ts`, `/mcp`; auth its `/api/auth` and, with `mcp`, `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource`); deploy targets read this to mount/forward worker paths, and plugin-expo's version gate walls only paths inside one |
| `rpcPrefix` | `value<string>` | The oRPC endpoint's prefix (`api({ prefix })`, `/rpc` by default): the one of `routePrefixes` a client's procedure calls go to; `stack screens serve` calls its seed's client there |
| `nativeScheme` | `value<string \| null>` | The native app's deep-link scheme, a trusted client origin no CORS list can carry; seeded null, contributed by expo (`options.scheme` ?? app-name slug, the scheme its app config registers). Read by auth's `runtimeOptions` and native-ui's `nativeAuthSource`, so the worker's trusted origins and the client match the app config |
| `localOrigins` | `value<"dev" \| "deployed">` | Where the local origins of `app.origins` belong; seeded `dev`, set to `deployed` by a deploy target that is local itself (node bound to loopback) |
| `cors` | `derived<string[]>` | Final production CORS list ([the production list](./plugins/api.md#the-production-list)) |
| `callbacks` | `map<string, CallbackSpec>` | Plugin name to callback identifier; spliced onto the matching runtime's options |
| `env` | `list<EnvSpec>` (`uniqueBy: name`) | Env vars the worker reads: `{ name, devDefault, validate? }`, declared once by the plugin that reads it (auth: `AUTH_SECRET`, `APP_URL`, OAuth client pairs; api: the consumer's own vars from its `env` option). `validate` hints (`minLength` / `url` / `devLocalhost`) feed the worker's once-per-isolate env assertion. Deploy targets render it: cloudflare into `.dev.vars` (each var deploys as a secret, never a `[vars]` entry), node into the dev process env for each var the shell leaves unset. A `devDefault` must satisfy its own hints or a fresh project refuses to serve; a duplicate name is an error |
| `envType` | `value<TsTypeRef \| null>` (`override`) | The type of the worker's `env`, contributed by the deploy target that declares one (cloudflare: the global `Env` from `wrangler types`); seeded `null`, which leaves `env` `unknown` (node contributes nothing) |
| `workerBase` | `derived<TsExpression>` | The `createWorker({...})` call expression; reads `env` to bake `envChecks` on both deploy targets, and `envType` to bake `createWorker`'s type argument |
| `workerSource` | `derived<string \| null>` | Final `.stack/worker.ts` source; null when no worker is emitted ([runtime](./runtime.md#the-generated-worker)) |
| `rbacStatements` | `value<Record<string, readonly string[]> \| null>` (`override`) | RBAC action statements (plain JSON, resource to allowed actions) for `procedure({ rbac })` / `procedure({ can })`'s type-level autocomplete; `auth` contributes them when organization access control is on (see below) |
| `entities` | `list<string>` (sorted, `uniqueBy`) | Entity vocabulary for `procedure({ reads, writes })`'s type-level autocomplete, also typing the client's `invalidateForWrites` and `meta.reads` through `.stack/procedure.ts`'s `Entity`: the union across every contributing plugin; `db` contributes the consumer's Drizzle schema export names, `auth` contributes its own runtime-owned table names (`account`, `session`, `user` and `verification` always; `passkey` with `passkey`, `apikey` with `devices`, the organization tables with `organization`, the OAuth tables with `mcp`), and `api` contributes the consumer's `entities` option (state outside any plugin's tables: a repo, files, a remote) |
| `procedureSource` | `derived<string \| null>` | Final `.stack/procedure.ts` source (`virtual:stack-procedure`'s target); rebuilds the same runtime + middleware `.use()` chain as `workerSource` so `WorkerContext` matches the real request context; null when `workerSource` is |
| `routeBarrelSource` | `derived<string \| null>` | The `src/worker/routes/index.ts` barrel, written through `emitArtifact`; null when the routes directory is absent or holds no routable file, so no header-only stub lands in the app. It reads the routes directory under `ctx.cwd`, not a slot |

The plugin also contributes a `cliSlots.postWrite` hook that writes `.stack/schema.ts` (`virtual:stack-schema`'s target) once the barrel and `.stack/procedure.ts` are on disk: it loads `.stack/worker.ts` in a child node process and walks `worker._router` (the runtime plugins' routes and the consumer's, the whole `AppRouter`), so a long-lived `stack dev` never writes a stale schema, and writes each procedure's input as JSON Schema, its kind and its scope key; none without routes.

`rbacStatements` is `override: true` because one plugin's statements are authoritative, and `auth`
is the one first-party contributor. Auth contributes only when organization access control is on
(`organization` absent or `false` leaves the seed): a custom `organization.ac` (a better-auth
`createAccessControl(...)` result) wins when supplied, else auth's own default statements
(`defaultOrgStatements` in `plugins/auth/src/access.ts`, the universe its `defaultOrgRoles` are
built from with `newRole`). That default is exactly what `hasPermission` checks at runtime, since
better-auth authorizes off each role's own `.statements`, never a separate `ac.statements` lookup.
Codegen renders the record as an inline type literal (resource to a readonly tuple of action
names), so `.stack/procedure.ts` does not depend on where the consumer's access control lives.
The `null` seed, or an empty record, renders `Record<never, never>`, which resolves `Rbac<...>` and
`Can<...>` to `never`: with no organization plugin there is no `hasPermission` to check against, so
`rbac` and `can` cannot be set at all, where a permissive `Record<string, readonly string[]>` would
accept any string and fail at request time.

## `auth.slots.*` (plugin-auth)

| Slot | Kind | Purpose |
|------|------|---------|
| `runtimeOptions` | `derived<Record<string, TsExpression>>` | Better Auth runtime options; reads `api.slots.cors` for `trustedOrigins` and the default passkey `origin`, and `api.slots.devCorsOrigins` then `api.slots.devTargetOrigins` for `devTrustedOrigins` and passkey `devOrigin` (both dev-gated by the runtime), `auth.slots.reservedSlugs` for `reservedSlugs`, and `api.slots.nativeScheme` for the native `trustedOrigins` under `expo: true` (or the scheme `expo: { scheme }` names, which needs no `expo()`; refusing to generate when neither exists); bakes passkey `rpID`/`rpName` from `app`. Generate fails when the CORS list is empty, since Better Auth needs at least one trusted origin for CSRF protection. How the runtime adjusts per listener is in [passkeys](./plugins/auth.md#passkeys) |
| `appUrlDevDefault` | `derived<string>` | Canonical dev URL for `APP_URL`'s dev default, in the order [APP_URL default](./plugins/auth.md#app_url-default) states |
| `callbackFile` | `value<string>` | Consumer callback-file path (default `src/worker/plugins/auth.ts`); override for a restructured worker layout, within the rule [callbacks](./plugins/auth.md#callbacks) states |
| `cookiePrefix` | `value<string>` | Resolved session-cookie prefix (`cookies.prefix` ?? better-auth's `"better-auth"` default); read by native-ui's generated auth-client constants |
| `clientFlags` | `value<AuthClientFlags \| null>` | The web client's `{ passkey, emailOtp, magicLink, organization, mcp }`, from the options, `organization` carrying the access control's statements and role grants as the worker gets them; seeded null and filled by auth's own contribution, so a reader without auth in the config sees null |
| `reservedSlugs` | `list<string>` | The first segments of the app's top-level routes, from a frontend plugin, and `mcp` from auth itself with `mcp` on; with organizations on, `runtimeOptions` bakes them beside plugin-api's `RESERVED_SLUGS` ([reserved slugs](./plugins/auth.md#reserved-slugs)) |

Auth's contributions to other plugins' slots are on its page ([slot contributions](./plugins/auth.md#slot-contributions)).

## `cloudflare.slots.*` (plugin-cloudflare)

| Slot | Kind | Purpose |
|------|------|---------|
| `bindings` | `list<WranglerBindingSpec>` | D1 / KV / R2 / queue / analytics_engine / rate_limiter / var bindings; cloudflare's own (`RATE_LIMITER_RPC`, the queue) are on its page ([slots and contributions](./plugins/cloudflare.md#slots-and-contributions)) |
| `compatibilityDate` | `value<string>` | Defaults to `2025-01-01` (plugin-cloudflare's `DEFAULT_COMPATIBILITY_DATE`); a consumer sets `compatibility_date` in the root `wrangler.toml`, which wins |
| `compatibilityFlags` | `list<string>` | Wrangler `compatibility_flags`; deduped + sorted, omitted when empty (e.g. auth contributes `nodejs_compat`) |
| `wranglerToml` | `derived<string>` | Final `.stack/wrangler.toml` source; reads `api.slots.env` so a consumer `[vars]` key naming a declared var fails generate, and `vite.slots.outDir` with `api.slots.routePrefixes` for the framework-managed `[assets]` table (the client build as a single-page app, `run_worker_first` each prefix bare and with `/*`, since `/mcp/*` alone misses `/mcp`; none without vite, and a consumer `[assets]` fails generate). Cloudflare also contributes a `cliSlots.buildSteps` step (`client-headers`, phase `post`, none without vite or with `clientHeaders` empty) that writes `<outDir>/_headers`, one `/*` rule with `vite.slots.clientHeaders`, and fails the build when a `public/_headers` already sits there. Generate's `postWrite` creates the assets directory when missing, which `wrangler dev` refuses to start without, and runs `wrangler types` |
| `serveWranglerToml` | `derived<(serve: ServeConfig) => string>` | `wranglerToml`'s inputs as a function of a `stack screens serve` run's own entry (`main`) and client build (`clientDir`, absolute, or null without a web client, which renders no `[assets]`): the same config with that `main`, that `[assets]` directory, and `/fixture` among the paths the worker answers first. Cloudflare contributes the serve target that writes it into the run's directory |

## `db.slots.*` (plugin-db)

| Slot | Kind | Purpose |
|------|------|---------|
| `schemaModules` | `list<string>` | Modules whose tables the scaffolded `src/schema/index.ts` re-exports (`export *`), so they migrate with the app's own; auth contributes its [schema tables](./plugins/auth.md#schema-tables) |

db's contributions to other plugins' slots are on its page ([slots and contributions](./plugins/db.md#slots-and-contributions)).

## `expo.slots.*` (plugin-expo)

| Slot | Kind | Purpose |
|------|------|---------|
| `metroConfigImports` | `list<MetroRequireSpec>` | Requires for the generated `.stack/metro.config.cjs` |
| `metroPluginCalls` | `list<MetroWrapperSpec>` | Wrapper calls composed around the Metro config (order-sorted) |
| `expoConfigPlugins` | `list<ExpoConfigPlugin>` | Expo config plugins baked into `.stack/app.config.cjs`'s `plugins` array, each rendered as `"name"` or `["name", { …options }]`. An entry is an object, not a `[name, options]` tuple, so one contribution is one item: the list compositor would spread a tuple into two |
| `providers` | `list<ProviderSpec>` | JSX providers composed around `<ExpoRoot>` in `.stack/entry.tsx`, ordered as [plugin-expo](plugins/expo.md#slots-and-contributions) states |
| `entryImports` | `list<TsImportSpec>` | Extra imports for `.stack/entry.tsx` |
| `devServerPort` | `value<number>` | Metro dev-server port (`options.port` ?? default); also drives the localhost CORS origin contributed to plugin-api |
| `routesPagesDir` | `derived<string \| null>` | expo-router pages dir; null when `routes: false` |
| `notFoundRoute` | `value<string \| null>` (`override`) | The module whose default export is the page for an address no route serves; null seeded, contributed by a design system (native-ui: `@fcalell/plugin-native-ui/lib/not-found`) |
| `notFoundFile` | `derived<GeneratedFile \| null>` | The route file for an address no route serves ([plugin-expo, Routes](plugins/expo.md#routes)); expo contributes it to `cliSlots.artifactFiles` |
| `easBuildProfiles` | `value<string[]>` | EAS build profile names the `expo build` command validates against |
| `easUpdateChannel` | `value<string>` | Default EAS Update channel |
| `metroConfig` | `derived<string \| null>` | Final `.stack/metro.config.cjs` source; it also resolves plugin-api's `virtual:stack-procedure` and `virtual:stack-schema` to their files under `.stack/` through Metro's `resolveRequest`, chained after any wrapper's |
| `expoConfig` | `derived<string \| null>` | Final `.stack/app.config.cjs` source (name, slug, scheme, bundle ids, store URLs, config plugins) |
| `entrySource` | `derived<string \| null>` | Final `.stack/entry.tsx` source (imports + providers around `<ExpoRoot>`) |
| `routesDtsSource` | `derived<string \| null>` | `.stack/routes.d.ts`: expo-router's typed-routes declaration over the routes directory, from the generator the app's Expo CLI runs; null when routing is off |

expo's contributions to other plugins' slots are on its page
([slots and contributions](./plugins/expo.md#slots-and-contributions)).

## `nativeUi.slots.*` (plugin-native-ui)

| Slot | Kind | Purpose |
|------|------|---------|
| `resolvedTheme` | `derived<ResolvedTheme>` | The `theme` option run through `@fcalell/ui-core`'s `deriveTheme`, resolved once |
| `fonts` | `derived<NativeFontEntry[]>` | Resolved font files (`{ family, source }`, consumer option or none); each `source` is embedded through expo-font. The families are the theme's `fonts` knob |
| `appCssSource` | `derived<string>` | Final `.stack/global.css`: `@theme` from ui-core's records (namespace resets first), the elevation utilities (`shadow-<elevation>`) and `tabular-nums` as `@utility` blocks, and `@variant light` / `@variant dark` color blocks under `@layer theme` |
| `nativeAuthSource` | `derived<string>` | `.stack/native-auth.ts` source: the `scheme` (`api.slots.nativeScheme`) and `cookiePrefix` (`auth.slots.cookiePrefix`) constants the scaffolded `src/lib/auth.ts` imports, so the native client can never drift from the app config or the worker's cookie prefix |
| `nativeThemeSource` | `derived<string \| null>` | `.stack/native-theme.ts` source: `Uniwind.setTheme(defaultMode)`, `setLoading` for the scrambled loading regions and `setRoomKnobs` for a non-default `radius` or `size`, imported for its side effect by the expo entry; null (no file, no import) when none of the three applies, so uniwind follows the system |

native-ui also contributes to another plugin's slots: the Auth provider to `expo.slots.providers` only when `auth.slots.clientFlags` is not null (`auth()` is in the config) or `authClientModule` is given, or `api.slots.serverAuth` is true (the app is a client of a server with `auth()`) and `src/lib/auth.ts` exists, so a client of a server without auth carries none. Its `QueryProvider` (`@fcalell/plugin-query/tanstack-query`, with the `queryClientModule` client, `hold={paintWait}` and `listen` from `@fcalell/plugin-query/net`, `order: 26`) goes to `expo.slots.providers` too, and so does `UpdateWall` (`@fcalell/plugin-native-ui/lib/update-wall`, `order: 28`), always ([update wall](plugins/native-ui.md#update-wall)). It requires `expo`, `api` and `query` (whose modules that provider imports); `auth` stays optional, since a client app has no `auth()` of its own and `auth.slots.cookiePrefix` and `clientFlags` are seeded without it.

## `node.slots.*` (plugin-node)

| Slot | Kind | Purpose |
|------|------|---------|
| `serverPort` | `value<number>` | Node server port (defaults to options.port ?? 8788); its run-time override is in the [server guide](../../plugins/node/guide/server.md#production) |
| `serverHost` | `value<string \| null>` | The address the server binds (options.host); null binds every interface; its run-time override is in the [server guide](../../plugins/node/guide/server.md#production) |
| `serverListeners` | `value<Record<string, { port, host?, originVar }>>` | The further listeners by name (options.listeners): each a port answering the one origin its `originVar` env var holds at request time, its requests reaching the worker with `STACK_LISTENER` and `STACK_ORIGIN` over the env |
| `serverBounds` | `value<{ body, frame }>` | The request-body and WebSocket-frame limits (options.bounds) |
| `services` | `list<ServiceEntry>` (`uniqueBy: name`) | Codegen entries (`{ name, imports, expression }`) for the generated server's `services` array; each expression evaluates to a ServiceSpec or ServiceSpec[]; the consumer barrel lands here as one entry |
| `consumerServices` | `value<{ identifier } \| null>` | Consumer services barrel identifier (seeded from `src/server/services` contents) |
| `bundleEntries` | `list<BundleEntry>` (`uniqueBy: name`, sorted) | What a plugin adds to the production bundle: `boot`, an expression evaluating to a `() => void \| Promise<void>` the bundled server runs before it listens, `imports` for it, and `copy` (`{ from, to, only? }`, `from` relative to the project root, `to` to the bundle's directory; a `from` that does not exist copies nothing) files the build copies beside `server.mjs`. db contributes its migrations (`migrateSqlite`, the `.sql` files and `meta/_journal.json` into `migrations/`) on the sqlite dialect. Dev reads none of it |
| `serviceBarrelSource` | `derived<string \| null>` | Rendered `src/server/services/index.ts` barrel; null when no service modules exist |
| `serverSource` | `derived<string \| null>` | Final `.stack/server.ts` source; reads `api.slots.workerSource` + `routePrefixes`, `api.slots.cors` as the main listener's `origins` (the Host rule's allow-list), `serverListeners`, and `vite.slots.outDir` as the static root (null mounts no static files or SPA fallback) with `vite.slots.clientHeaders` as the `clientHeaders` the static files and the fallback carry (rendered only with a static root); null when there is no worker and no services |
| `serverBundleSource` | `derived<string \| null>` | The production bundle's entry, `.stack/server.bundle.ts`, which the `node-bundle` build step (`cliSlots.buildSteps`, phase `post`) writes and bundles with esbuild into `server/server.mjs` beside `vite.slots.outDir`: `serverSource`'s inputs plus `bundleEntries`, with the worker and the consumer's services imported, not loaded by URL, the client found beside the bundle (`staticDir`) and the entries' `boot` tasks passed as `boot`. What the bundle holds and rewrites is in [plugin-node](plugins/node.md#build-and-bundle). Null where `serverSource` is |

## `react.slots.*` (plugin-react)

| Slot | Kind | Purpose |
|------|------|---------|
| `providers` | `list<ProviderSpec>` | JSX wrappers / siblings for `.stack/virtual-providers.tsx` (sorted by `order`, lower = outer), served as `virtual:stack-providers` |
| `entryImports` | `list<TsImportSpec>` | Extra imports for `.stack/entry.tsx` |
| `routerBindings` | `list<TsImportSpec>` (sorted by source) | A named import of a function that takes the router instance; the default mount calls each as `<name>(router);` right after `createRouter`, before render. The generic seam for a peer that needs the router (react-ui contributes `bindRouter`, its routing module, and `bindNotFound`, which calls `router.update({ defaultNotFoundComponent })` with its page for an unknown address, when routing is on; an app's catch-all route or a route's `notFoundComponent` wins over it); a peer's own `mountExpression` owns its router and calls none |
| `mountExpression` | `value<Mount \| null>` (`override`) | The root mount: verbatim statements plus their imports. react seeds the TanStack router inside `<StrictMode><Providers>` when routing is on; a peer overrides it for a custom mount. Null skips `entry.tsx` and its script tag |
| `htmlShell` | `value<URL \| null>` (`override`) | HTML shell template URL |
| `htmlHead` | `list<HtmlInjection>` (one `title`, one of each `html-attr`) | `<head>` injections (title, meta, link, script, html-attr); react contributes `lang`, the title (`title` ?? `app.name`), `description`, `themeColor`, the icon link or pair (`data:,` with none) |
| `htmlBodyEnd` | `list<HtmlInjection>` | End-of-body injections; react adds the `/entry.tsx` module script when there is an entry |
| `icon` | `derived<AppIcon \| null>` | The app's icon from the `icon` option: `{ light, dark? }` (a string option is `{ light }`, a `{ light, dark }` option is both), null with none. The `<head>` icon links read it (one link, or two under `media="(prefers-color-scheme: …)"` with `type="image/svg+xml"` inferred from `.svg`); react-ui reads the same value for the `LockupProvider` it contributes, so the favicon and the Shell's and Gate's lockup are one asset. `logo?: { light, dark? }` carries the `logo` option (the app's drawn lockup) when given, beside an icon; the favicon links never read it, and with it absent the value carries no `logo` |
| `routesDir` | `derived<string \| null>` | The routes directory relative to the project root (`routes.dir` ?? `src/app/routes`); null when `routes: false` |
| `routerOptions` | `derived<RouterOptions \| null>` | The router plugin's options as data: `{ autoCodeSplitting: true, routesDirectory, generatedRouteTree }`, the last two expressions anchored on `.stack/vite.config.ts`; null when routing is off. A host that draws routes (`screens.viteConfig`) reads them, changes `autoCodeSplitting` and renders its own call with `routerPluginFor` from `@fcalell/plugin-react/codegen`, so no expression is edited by name |
| `routerPlugin` | `derived<AppPlugin \| null>` | TanStack's router plugin as `{ call, imports }`: `routerPluginFor(routerOptions)`, which is `tanstackRouter({ target, autoCodeSplitting, routesDirectory, generatedRouteTree })` with its import and `fileURLToPath`'s; null when routing is off. react contributes it to `vite.slots.appPlugins`, so the app's config runs it; a host that draws no route (Storybook's roster) never reads it |
| `entrySource` | `derived<string \| null>` | Final `.stack/entry.tsx` |
| `htmlSource` | `derived<string \| null>` | Final `.stack/index.html` |
| `providersSource` | `derived<string \| null>` | Final `.stack/virtual-providers.tsx`; null leaves plugin-vite's pass-through stub |
| `routesDtsSource` | `derived<string \| null>` | Final `.stack/routes.d.ts`: the router's `Register` over `.stack/routeTree.gen.ts`, which pulls the tree into the consumer's type-check; null when routing is off |
| `topLevelRoutes` | `derived<string[]>` | The static first segments of the routes' URLs under TanStack's file convention (through pathless layouts and groups, never a param), sorted; empty when routing is off. react-ui hands them to `auth.slots.reservedSlugs` |
| `homeScaffold` | `value<ScaffoldSpec \| null>` (`override`) | Scaffold for `<routesDir>/index.tsx`; null when routing is off; a design-system plugin overrides it with its own home |

plugin-query owns no slot; its contributions are on its page ([contributions](./plugins/query.md#contributions)).

## `reactUi.slots.*` (plugin-react-ui)

The four `appCss*` lists are the inputs of `.stack/app.css`, which `aggregateAppCss` renders into
`appCssSource`.

| Slot | Kind | Purpose |
|------|------|---------|
| `appCssImports` | `list<CssImport>` | CSS `@import`s aggregated into `.stack/app.css`: a URL, or `{ url, layer?, supports?, source? }`. react-ui imports `tailwindcss` with `source: "none"`, so Tailwind scans only the sheet's `@source` declarations (the consumer's `src`, the plugin's `src/ui` and ui-core), never the generated files in `.stack/`. The structured form carries `layer(...)`, `supports(...)` and `source(none)` without escaping them inside the URL string. Each part passes the [CSS escape boundary](./codegen.md#css-escape-boundary) when `aggregateAppCss` renders it |
| `appCssSources` | `list<CssSourceInline>` | Class patterns Tailwind generates whether or not a scanned file spells them, each rendered as `@source inline("…")` after the sheet's `@source "../src"`: class characters and Tailwind's brace expansion (`bg-{canvas,surface}`). react-ui contributes the token classes (`tokenSources`) |
| `appCssBlocks` | `list<CssBlock>` | Top-level `@theme` / `@utility` / `@custom-variant` blocks, rendered after `@source` and before the layers. None of the three at-rules may sit inside a `@layer`, which is why they don't ride `appCssLayers`. The `theme` and `utility` bodies are declaration records rendered property by property through the CSS render boundary; a `variant` body is rules holding `@slot`, built by the contributing plugin from its own constants, as a layer's content is. react-ui's own `touch:` variant rides here, over the density layer's condition |
| `appCssLayers` | `list<{ name, content }>` | CSS `@layer` blocks. Dark mode and density ride this slot as `@layer base`: `@theme` compiles into `@layer theme` and Tailwind sorts `base` after it, so a layered `.dark { … }` or `:root[data-density="desktop"] { … }` overrides the seeded values |
| `fonts` | `derived<FontEntry[]>` | Resolved font files ([fonts](./plugins/react-ui.md#fonts)) |
| `resolvedTheme` | `derived<ResolvedTheme>` | The `theme` option run through `@fcalell/ui-core`'s `deriveTheme`, resolved once so every block contribution reads one value |
| `appCssSource` | `derived<string \| null>` | Final `.stack/app.css`; null when nothing landed |

## `screens.slots.*` (plugin-screens)

| Slot | Kind | Purpose |
|------|------|---------|
| `handlerModules` | `list<string>` (sorted) | Module specifiers of endpoints a plugin owns outside the app's router: each default-exports an array of MSW request handlers, imported by the screens host's virtual module and answered beside the app's procedures in every story. plugin-auth contributes `@fcalell/plugin-auth/screens`: a signed-in session (better-auth's `Session` and `User`, fixed values) answering `GET */api/auth/get-session`, the one call `useSession()` makes, at the `AUTH_PREFIX` the worker mounts auth under. Its other endpoints fall to the host's `no fixture` answer, since `/api/auth` is one of `routePrefixes`. plugin-node contributes `@fcalell/plugin-node/screens`: an MSW `ws.link("*/ws")` handler answering each channel subscribe with the snapshot frame the app's `channels` fixtures give for the story on screen. A config without `screens` leaves the contribution unread |
| `fixtureModules` | `list<string>` (sorted) | Module specifiers of the oRPC procedures a plugin owns: each default-exports a fixtures tree (the shape of `src/app/fixtures.ts`'s `procedures`), imported by the screens host's virtual module as `pluginFixtures`. A procedure is answered from the app's fixtures first, then from each plugin's tree in specifier order, so the app overrides a plugin's answer per procedure. plugin-auth contributes `@fcalell/plugin-auth/screens-fixtures`: `auth.session` answering the same signed-in user and session as the `get-session` handler (both read `screens-session.ts`), and `auth.devices.list` (three keys: in use, never used, expired), `create` (a key, shown once) and `revoke`, inert when `devices` is off. A config without `screens` leaves the contribution unread |
| `previewGlobals` | `list<PreviewGlobal>` (sorted by name) | Toolbar globals a plugin pins on the document root before a story paints, as data so the host knows no design system: `{ name, title, values, default, checked?, apply }`, where `checked` is the values `stack screens test` checks every screen in (only `default` when absent) and `apply` is `{ attribute }` (the value is set as that attribute) or `{ classes }` (a map from a value to the class it adds; the other classes of the map are removed). The host renders each as a Storybook toolbar select (`globalTypes`, `initialGlobals`) and applies them in its decorator, reading the list from its virtual module. react-ui contributes `mode` (`light`, `dark`; `{ classes: { dark: "dark" } }`; opening on the theme's `defaultMode`, else `light`) and `density` (`desktop`, `touch`; `{ attribute: "data-density" }`); `mode` is checked in `light` and `dark`, `density` at its default alone (density moves sizes, not names, roles or states) |
| `viteConfig` | `derived<string \| null>` | Final `.stack/screens.vite.config.ts` source: `renderViteConfig` over vite's input slots, with `clientHeaders: {}`, no `serverProxy` and no port, the screens package's own location in `fsAllow`, and one host-only plugin call, `screensPlugin({ stackDir, fixtures, routesDir, entryImports, routerBindings, prefixes, handlerModules, fixtureModules, previewGlobals })`. It reads `react.slots.routesDir`, the side-effect imports of `react.slots.entryImports` (the stylesheet) and the named imports of `react.slots.routerBindings` (what the entry calls with its router), `api.slots.routePrefixes` (the prefixes MSW answers), `handlerModules`, `fixtureModules` and `previewGlobals`; the app's own `vite.slots.*` never receive a host-only call. It reads `react.slots.routerOptions` and runs the router plugin ahead of the app's `pluginCalls`, as the app's config does, with `autoCodeSplitting: false`: Vitest's `--changed` walk drops a split module (`?tsr-split=component`, an id that fails `existsSync`), so a component's edit would reach no screen. Null when `vite.slots.outDir`, `react.slots.routesDir` or `react.slots.routerOptions` is null |
| `storybookMain` | `derived<string \| null>` | Final `.stack/screens/main.ts`, Storybook's config directory: one `screensMain({ checks: false, root })` call, `root` the project root two levels above the file; null when `routesDir` is |
| `testMain` | `derived<string \| null>` | Final `.stack/screens-test/main.ts`: `screensMain({ checks: true, root })`, which also loads `@fcalell/plugin-screens/checks`; only the test run reads this directory; null when `routesDir` is |
| `vitestConfig` | `derived<string \| null>` | Final `.stack/screens.vitest.config.ts`: `viteConfig`'s file spread into a Vitest config with one browser project (the Storybook test plugin on `.stack/screens-test/`, the `chrome()` provider of `@fcalell/plugin-screens/browser` on the shared Chrome, headless, 1280x800, `maxWorkers: 2`, `testTimeout: 120_000`) and `forceRerunTriggers` set to Vitest's defaults plus `workspaceTriggers(<app dir>)` from `@fcalell/plugin-screens/node`; null when `viteConfig` is |
| `serveSteps` | `list<ServeStep>` (`uniqueBy: name`, sorted) | What makes the scratch state of `stack screens serve`: `{ name, run(serve) }`, run in order before the server starts, with the run's directory, state directory, client build, port, url and `env` (which a step adds to). db contributes `database`: the scratch database built from the committed migrations, then seeded from `src/schema/seed.ts` (sqlite: a file under `DB_FILE`; d1: miniflare state in the run's state directory) |
| `serveEnv` | `list<(serve: { url }) => Record<string, string>>` | Env a plugin adds to the served server's, from the url the run is served at. auth contributes its app URL var as that url and, with email codes, the fixture member's address and fixed code (`STACK_SERVE_EMAIL`, `STACK_SERVE_CODE`), which its runtime honours only under `STACK_DEV` |
| `serveControls` | `list<string>` | Module specifiers whose default export is an `ExtraControls` (`(request, { env, ctx, app }) => Response \| undefined`) of the served worker: a plugin that owns a `/fixture/*` path contributes its module. The `ServeRun` given to a target carries them as `controls`, and the target writes the serve worker as `fixtureControls(worker, c0, …)`, each control asked in turn before `delay` and `fail`. `/fixture/link` that no control answers is a 404. auth contributes `@fcalell/plugin-auth/serve` (the link, signing the fixture member in through the email-code routes) when `emailOtp !== false` |
| `serveTargets` | `list<ServeTarget>` (`uniqueBy: name`) | A deploy target's server for `stack screens serve`: `{ name, start(serve) }` starts it on `serve.port` with the fixture controls (`serveControls`) wrapped round the worker, resolves once it answers, and gives back what stops it. node contributes `.stack/serve-<id>.server.ts` and `.worker.ts` (written for the run, removed with it) with the `fixtureSockets` service; cloudflare `wrangler dev` on a config of its own. The first contribution starts |

The plugin also contributes a `cliSlots.postWrite` hook that writes one CSF file per screen into `stack-screens/` at the app root (`gitignore`d and removed with the plugin; no dot directory, which Storybook's watcher ignores): created for a new route, rewritten when its content changed, removed for a deleted one. A file is the route's id and the imports of its graph (the root route, each layout route, the route, its lazy sibling, the fixtures), as side effects so the transform keeps every edge; it exports each state's dev story and, for every combination of the globals' `checked` values other than the defaults, a `!dev` story named for it (`Data, dark`) with story-level `globals`, which only the test run lists. While `stack screens dev` runs `screensPlugin` syncs the folder on the routes directory's add, change and unlink events.

plugin-auth, plugin-cloudflare and plugin-db depend on `@fcalell/plugin-screens` only for these slots; its Storybook and MSW packages are optional peers `stack add screens` installs. Auth's `./screens` subpath is the one place auth touches MSW, through `@fcalell/plugin-screens/msw` (a re-export of the app's copy, so the host runs one).

## `vite.slots.*` (plugin-vite)

| Slot | Kind | Purpose |
|------|------|---------|
| `configImports` | `list<TsImportSpec>` | Imports for `.stack/vite.config.ts` |
| `pluginCalls` | `list<TsExpression>` (sorted by callee name) | Vite plugin call expressions every Vite config of the app runs, the app's own and a host's (Storybook's); a plugin whose Vite plugins must run in a set order contributes them as one array expression (Vite flattens it). A call only the app's own config runs goes to `appPlugins` |
| `appPlugins` | `list<AppPlugin>` (`{ call: TsExpression, imports: TsImportSpec[] }`) | A plugin call only the app's own config runs, with the imports it needs. `viteConfig` is the one reader: it renders these calls ahead of `pluginCalls` and merges their imports into `configImports`, so a host that draws components in its own Vite config reads `pluginCalls` and `configImports` alone and holds none of them, with no name to match. plugin-react contributes the router plugin here (`react.slots.routerPlugin`), which therefore runs ahead of `react()` and every other call, and then `refreshPolicyPlugin(react.preambleCode)` (`@fcalell/plugin-react/node/refresh`), which only the app's dev server needs because only it carries `clientHeaders`. A host that draws routes reads the owning slot instead (`screens.viteConfig` reads `react.slots.routerOptions`) |
| `resolveAliases` | `list<{ find, replacement }>` | `resolve.alias` entries |
| `resolveDedupe` | `list<string>` | Bare specifiers rendered into `resolve.dedupe` (de-duplicated); plugins whose runtime must stay a singleton contribute here so workspace-linked checkouts can't ship a second copy in the production bundle. plugin-react contributes `react`, `react-dom`, `@tanstack/react-query` and `@tanstack/react-router`, whose client and router live in React context |
| `optimizeExclude` | `list<string>` | Package names rendered into `optimizeDeps.exclude` (de-duplicated): a package installed under `node_modules` that imports a virtual module a plugin of the config serves, which the dev optimizer's own Rolldown cannot resolve. plugin-query contributes `@fcalell/plugin-query/tanstack-query` (`virtual:stack-schema`; a subpath, so the package's other subpaths stay optimizable); the screens host adds `@fcalell/plugin-screens` (`virtual:stack-screens`) in its own render. The optimizer's scan stops at an excluded package, so what it imports would be found when a page first loads it and reload the page (a screens run fails on "Vite unexpectedly reloaded a test"): the preset's `excludedImportsPlugin` adds those imports to `optimizeDeps.include`, read from the raw source of each excluded entry (a package's `./src/*` exports, or one subpath) through the files it imports: `package > specifier` for another package's, and a package's own other subpath as it is (type-only imports, builtins, virtual modules, the app's `resolve.dedupe` names and packages that do not resolve are left out); the screens plugin adds the modules its virtual module imports (route bindings, handler and fixture modules) |
| `devServerPort` | `value<number>` | Dev server port (defaults to options.port ?? 3000) |
| `outDir` | `value<string \| null>` | The client build's output directory relative to the project root (`dist/client`), rendered as the config's `build.outDir`; seeded null and filled by vite's own contribution, so a reader without vite in the config sees null. cloudflare serves it as `[assets]`, node as its static root |
| `serverProxy` | `list<ServerProxyEntry>` (`uniqueBy: path`) | Dev-server proxy rules (`{ path, target, ws? }`) rendered into `server.proxy`; deploy targets contribute worker-owned paths so dev stays same-origin like prod |
| `fsAllow` | `list<TsExpression>` | Extra `server.fs.allow` path expressions; plugins serving assets from their own package contribute their real location so a workspace-linked stack still serves them in dev. Any entry makes the rendered list explicit, prefixed with the consumer's workspace root |
| `watchIgnored` | `list<string>` (sorted) | Globs rendered into `server.watch.ignored`, added to Vite's own defaults; a plugin whose tool writes scratch files under Vite's root contributes their glob so the writes never reach hot-update handling. plugin-cloudflare contributes `**/.wrangler/**` (wrangler's dev bundle in `.stack/.wrangler/tmp/`) |
| `clientHeaders` | `map<string>` (`keyOf`: lower-cased name, `merge`: `Content-Security-Policy` only) | Headers every response of the web client's host carries, owned by vite because they belong to the web client; vite contributes `Content-Security-Policy: frame-ancestors 'none'` and `X-Frame-Options: DENY`, so no stack app is framed and no option allows it; react-ui contributes `Content-Security-Policy: script-src 'self' 'sha256-<hash>'`, the hash of a built page's one inline script (the mode script `themeModePlugin` injects, rendered by the same `modeScript` the hash is taken from) and no `style-src`, which is the consumer's. Header names are compared case-insensitively. Several `Content-Security-Policy` contributions merge per directive ([vite](./plugins/vite.md#content-security-policy)). Any other header two plugins set throws. The value reaches the readers as one header string, unchanged. Three readers: vite renders it into `server.headers` (dev; Vite sends them on documents, the SPA fallback and modules, never on a proxied worker path), where plugin-react's `refreshPolicyPlugin` adds the hash of React Refresh's inline preamble, the one inline script only the dev server serves, to the directive that decides a `<script>` element (`allowScript`, `@fcalell/plugin-vite/csp`: the first named of `script-src-elem`, `script-src` and `default-src`, none when the policy names none or that directive holds `'unsafe-inline'` with no hash or nonce). Vite answers a revalidation of an unchanged page with a bare 304, before it sets `server.headers`, so a browser keeps the headers it cached: a changed dev policy reaches an open tab after a hard reload. Cloudflare writes it to `<outDir>/_headers` in a `post` build step, node passes it to its static server; resolves `{}` without vite |
| `viteConfig` | `derived<string \| null>` | Final `.stack/vite.config.ts` source; null when nothing to emit |

`@fcalell/plugin-vite/node` exports `renderViteConfig(values: ViteConfigValues)`, the pure renderer `viteConfig` calls. `ViteConfigValues` has one field per slot `viteConfig` hands it, under the slot's own name (the app-only calls already merged into `pluginCalls` and `configImports`), so a host that builds its own graph (`buildGraphFromConfig`, then `graph.resolve(vite.slots.<name>)`) passes the resolved values through, changes the ones it needs (`clientHeaders: {}`, extra `pluginCalls` of its own that never reach the app's config) and renders its own variant.

A path a contribution hands a Vite plugin is an expression anchored on the config file (`fileURLToPath(new URL("../src/app/routes", import.meta.url))`), so it holds when a host moves Vite's `root`, and no absolute path of the machine is written into the config. plugin-react hands TanStack's router plugin `routesDirectory` and `generatedRouteTree` this way. A contribution declares every import its expression uses through `configImports` (`{ source: "node:url", named: ["fileURLToPath"] }` for these paths); the renderer imports only what its own output uses and merges all imports by source, dropping repeated names, so two contributions declaring the same import are one line.

## Spec types

The shapes carried by slot payloads. Most are exported from `@fcalell/cli/ast` (TS / TOML / HTML
specs) or `@fcalell/cli/specs` (lifecycle specs); a payload that only one plugin's own slots carry
lives with that plugin.

- `ScaffoldSpec`: `{ target: string; plugin: string }` plus either `source: URL` (a template on
  disk, built with `ctx.scaffold(name, target)`) or `content: string` (text the plugin composed
  from the graph, as db's schema scaffold does).
- `TsImportSpec`: four shapes:
  ```ts
  { source: "@fcalell/plugin-db/runtime", default: "dbRuntime" }
  { source: "@cloudflare/workers-types", named: ["D1Database"], typeOnly: true }
  { source: "../src/schema", namespace: "schema" }
  { source: "tailwindcss", sideEffect: true }
  ```
- `TsExpression`: structured AST node (`call`, `identifier`, `string`, `array`, `object`, `jsx`,
  `arrow`, `member`, `as`, …). Pattern:
  ```ts
  // dbRuntime({ binding: "DB_MAIN", schema })
  {
    kind: "call",
    callee: { kind: "identifier", name: "dbRuntime" },
    args: [{
      kind: "object",
      properties: [
        { key: "binding", value: { kind: "string", value: "DB_MAIN" } },
        { key: "schema",  value: { kind: "identifier", name: "schema" }, shorthand: true },
      ],
    }],
  }

  // <Toaster />
  { kind: "jsx", tag: "Toaster", props: [], children: [] }
  ```
- `EnvSpec`: `api.slots.env`'s payload, declared in `plugins/api/src/types.ts` (exported on
  `@fcalell/plugin-api/types`): `{ name, devDefault, validate?: EnvValidation }`.
- `WranglerBindingSpec`: `d1` / `kv` / `r2` / `queue` / `analytics_engine` / `rate_limiter` / `var` shapes (`queue`: `{ binding, queue, consumer?: { maxBatchSize, maxBatchTimeout, maxRetries } }`,
  rendered as `[[queues.producers]]` and, with `consumer`, `[[queues.consumers]]`). Aggregator catches duplicate `binding` names and fails fast.
- `HtmlInjection`: `title` / `meta` / `link` (with `as`, `crossorigin`, `media`, `type`) / `script` / `html-attr`.
- `ProviderSpec`: `{ imports, wrap: { identifier, props? }, siblings?, order }` for JSX provider
  composition, lower `order` the outer wrapper. `siblings` are JSX elements rendered as further
  children of the wrapper after the wrapped subtree: siblings of the wrapped tree, not of the
  wrapper, so they read the wrapper's context (`<Toaster />` inside a `<ToastProvider />`). Only
  JSX-shaped expressions (`TsJsxExpression`) are valid there, since a string or number literal
  would render as `<MetaProvider>{props.children}"hi"</MetaProvider>`.
- `MiddlewareSpec`: `{ imports, call, phase: "before-cors" | "after-cors" | "before-routes" | "after-routes" | "after-context", order }`,
  `call` a call expression. Every phase but `after-context` mounts before the worker injects its
  plugin context; `after-context` mounts after it and is the only phase whose middleware can read
  `db` or `auth`.
- `PluginRuntimeEntry`: `{ plugin, import, identifier, options? }` describing a `.use(xRuntime(opts))` call.
- `GuideEntry`: `{ domain, package, page, trigger }`, one index line: `trigger` says when to open
  the page (never what it holds), the page is `node_modules/<package>/guide/<page>.md`, and entries
  group under `domain`.
- `ProcessSpec`, `WatcherSpec`, `BuildStep`, `DeployStep`, `DeployCheck`, `PromptSpec`,
  `DevReadyTask`, `GeneratedFile`: exported from `@fcalell/cli/specs`. `ProcessSpec.env` merges
  extra environment variables over the parent env at spawn (per-process dev signals like
  `STACK_DEV=1` on targets without `.dev.vars`; node's dev process also carries the
  `devDefault` of each `api.slots.env` var the shell leaves unset).

## In the code

- `packages/cli/src/lib/cli-slots.ts`: `cliSlots` and `emitArtifact`.
- `packages/cli/src/commands/init.ts`: the pre-prompt resolve of `tsconfigPaths` and `tsconfigTypes`.
- `packages/cli/src/templates/tsconfig.ts`: where the contributed tsconfig entries land.
- `packages/cli/src/ast/specs.ts`: `ProviderSpec`, `MiddlewareSpec` and the other AST-carried specs.
- `plugins/api/src/index.ts`: `api.slots.*`.
- `plugins/api/src/node/procedure-codegen.ts`: the RBAC statements rendered into `.stack/procedure.ts`.
- `plugins/auth/src/index.ts`: `auth.slots.*` and auth's contributions, `rbacStatements` among them.
- `plugins/auth/src/access.ts`: the default organization statements.
- `plugins/expo/src/types.ts`: the Expo config-plugin entry shape.
- `plugins/react-ui/src/types.ts`: the `appCss*` payloads (`CssImport`, `CssSourceInline`, `CssBlock`).
- `plugins/screens/src/index.ts`: `screens.slots.*`.
- `plugins/screens/src/types.ts`: `PreviewGlobal`.
- `plugins/screens/src/ui/answer.ts`: a procedure's fixture, the app's tree before each plugin's.
- `plugins/vite/src/index.ts`: `vite.slots.*`, `clientHeaders` among them.
