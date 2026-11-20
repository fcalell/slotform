# Consumer project and config

What a generated consumer repo holds and how `slotform.config.ts` drives it: the config surface, the
file layout and its TypeScript projects, the three ways an app installs Slotform, the generated lint
and guide index, and how a consumer designs its screens within Slotform.

## Config

`defineConfig` in `slotform.config.ts` is the one entry point for project configuration
(`packages/cli/guide/config.md`). It takes a required top-level `app` field with cross-cutting
identity, plus the `plugins` array; what `app` holds is in
[product](../product.md#features-live-in-the-plugin-that-owns-the-domain-core-stays-domain-agnostic).

```ts
// slotform.config.ts
import { defineConfig } from "@slotform/cli";
import { db } from "@slotform/db";
import { auth } from "@slotform/auth";
import { api } from "@slotform/api";
import { expo } from "@slotform/expo";
import { nativeUi } from "@slotform/native-ui";

export default defineConfig({
  app: {
    name: "my-app",           // required: wrangler worker name, default auth cookie prefix, fallback <title>
    domain: "example.com",    // required: drives CORS, trustedOrigins, app URL construction
    origins: [                // optional: overrides the derived CORS allow-list
      "https://example.com",
      "https://app.example.com",
      "http://localhost:3000",
    ],
  },
  plugins: [
    db({ dialect: "d1", databaseId: "..." }),
    auth({ cookies: { prefix: "myapp" }, organization: true }),
    api(),
    expo(),
    nativeUi({
      theme: {                          // optional: the ui-core design contract
        hue: { accent: 120, cast: 70 }, //   the knobs: hue (accent; cast, the neutrals' hue,
        radius: 6,                      //   the accent's unless set), radius, fonts, defaultMode, loading
                                        //   (loading: { figure: "scramble" } paints that kind's wait by the scramble)
      },
      words: { ...ENGLISH, back: "Zurück" },  // optional: every key required, English default
    }),
  ],
});
```

A web app lists `vite()` and `react()` in place of `expo()` and `nativeUi()`:

```ts
vite(),
react({
  title: "My App",            // <title>; defaults to app.name
  description: "…",           // <meta name="description">
  icon: "/icon.svg",          // <link rel="icon"> and the lockup of the Gate; or { light, dark }
  logo: "/logo.svg",          // the app's drawn lockup (symbol and name), drawn in the icon's place; or { light, dark }
  themeColor: "#0b0b0f",      // <meta name="theme-color">
  lang: "en",                 // <html lang>; defaults to "en"
  routes: { dir: "src/app/routes" }, // the default; `false` turns file routing off
}),
```

The web design system is `reactUi()` beside them, with the same `theme` and `words` as
`nativeUi()` and the web's font files:

```ts
reactUi({
  theme: { hue: { accent: 120 }, defaultMode: "dark" },  // the ui-core contract; fonts default to IBM Plex Sans and IBM Plex Mono
  words: { ...ENGLISH, back: "Zurück" },
  fonts: defaultFonts, // the files to load; default IBM Plex Sans (wght) + IBM Plex Mono 400/500/600
}),
```

The icon set is Lucide, fixed by the framework: every `icon` prop is an `IconName` from
`@slotform/ui-core/descriptors`, a Lucide PascalCase name, so the consumer declares no icon map.
The web `<head>` belongs to the `react` plugin: its options render into `.slotform/index.html` through
`react.slots.htmlHead` ([HTML shell](./plugins/react.md#html-shell)).

`app.name` flows into the generated `wrangler.toml`. `app.domain` seeds `api.slots.cors` with
`https://${domain}` and `https://app.${domain}`, and auth's derived `trustedOrigins`. `app.origins`
replaces the derived allow-list entirely; where its local origins and the dev servers' origins go is
under [CORS and origins](./plugins/api.md#cors-and-origins).

Every plugin the consumer depends on is listed explicitly; there is no implicit-resolution layer.
Which plugin requires which is the [dependency graph](../architecture.md#dependency-graph);
`slotform init` adds the missing dependency when the interactive picker picks a plugin that needs one.

`defineConfig()` returns a `SlotformConfig<T>` whose `.validate()` checks `app` and duplicate
plugins; `requires` is checked when the config's plugins load
([the `plugin()` contract](./plugin-authoring.md#the-plugin-contract)). `getPlugin(config, "db")`
extracts one plugin's entry, its `options` typed as that plugin's (`DbOptions`).

`slotform` loads `slotform.config.ts` and `src/schema/seed.ts` with a plain `import()` under Node's type
stripping, which takes erasable syntax only; the rule a consumer follows is on each file's guide page
([config](../../packages/cli/guide/config.md), [seed](../../plugins/db/guide/seed.md)).

## Project structure

```
my-app/
  package.json
  tsconfig.json              # a solution over the two projects below when the app has a worker,
                             # else one project (see "TypeScript projects")
  tsconfig.app.json          # the app's project (DOM or react-native globals)
  tsconfig.worker.json       # the worker's project (workerd or Node globals), composite
  biome.json                 # extends @slotform/biome-config and ./.slotform/biome.json; $schema from the installed biome
  .editorconfig              # the shared style: biome and shfmt read it
  CLAUDE.md                  # imports `@.slotform/guide.md`; the rest is the consumer's
  slotform.config.ts         # defineConfig({ app, plugins: [db(...), auth(), api(), expo(), nativeUi()] })
  wrangler.toml              # consumer-owned base; .slotform/wrangler.toml merges it (consumer [[routes]]/[[r2_buckets]]/[[queues.producers]]/[[queues.consumers]] merge next to plugin contributions, collision = hard error; [triggers] and [browser] are copied, crons checked against src/worker/scheduled.ts; d1/kv/analytics_engine/unsafe/compatibility_flags stay framework-only)
  src/
    schema/                  # Drizzle tables (business logic); index.ts re-exports auth's tables:
                             # @slotform/auth/schema always, /schema/organization and
                             # /schema/passkey, /schema/oauth (the OAuth grant tables and the
                             # signing keys) and /schema/devices (the device keys) only when that
                             # option is enabled
    migrations/              # generated by drizzle-kit
    shared/                  # isomorphic code the schema, routes and app import
    worker/
      plugins/
        auth.ts              # auth.defineCallbacks(): runtime callbacks + the consumer's own better-auth plugins
      routes/                # business logic (procedures; barrel generated to index.ts)
      mcp.ts                 # optional: `defineMcp({ instructions, tools })`, the procedures an MCP client may call; needs `auth({ mcp: true })` (wired into the worker's `.handler(routes, { mcp, name })`)
      queue.ts               # optional: `defineQueue(async (batch, context) => …)`, answers the app's queue batches with the plugin context; Cloudflare only (wired into `.handler(routes, { queue })`)
      scheduled.ts           # optional: `defineScheduled(async (event, context) => …)`, answers cron events (the schedules sit in the root `wrangler.toml` `[triggers]`); Cloudflare only (wired into `.handler(routes, { scheduled })`)
      middleware.ts          # optional Hono middleware, before context injection (wired via api.slots.middlewareEntries)
      middleware.context.ts  # optional Hono middleware, after it; reaches db/auth via slotformContext(c)
    server/                  # node target only; checked with the worker project, under Node's types
      services/              # background services (barrel generated to index.ts);
                             # each module default-exports a defineService(...)
    app/
      routes/                # the web app's TanStack Router file routes (business logic):
                             # `__root.tsx` wraps every route, `index.tsx`, `$param`, a folder's
                             # `route.tsx` wraps its folder, `_layout` nests without a URL
                             # segment, `(group)` scopes without one; `react({ routes: { dir } })`
                             # moves it. The phone's expo-router files sit in `src/app` itself
                             # (`expo({ routes: { appDir } })`), where `slotform generate` writes
                             # `+not-found.tsx` while no `+not-found.*` sits at its root: a
                             # re-export of native-ui's page for an unmatched address, then the app's
                             # to replace (expo-router reads that route from no other place; the web
                             # needs no file, its not-found page is set in the entry)
      fixtures.ts            # with screens: `defineFixtures<AppRouter>(procedures, params, channels, search)`, the
                             # answers of the procedures and an example value per route `$param`
  .slotform/                 # generated, gitignored
    biome.json               # the plugins' lint rules and the generated sources Biome skips (see "Lint")
    guide.md                 # the guide's index (see "The guide")
    worker-configuration.d.ts # Env interface generated by `wrangler types`
    worker.ts                # virtual worker entry from api.slots.workerSource
    procedure.ts             # virtual:slotform-procedure target from api.slots.procedureSource
    schema.ts                # virtual:slotform-schema target: each procedure's input as JSON Schema, its kind and its scope key,
                             # written by the `api` plugin's `postWrite` from the router loaded in a child node process;
                             # a `Form` derives its fields from it and the client fills scope ids by it. Absent without routes
    types/                   # the worker project's declarations and build info, written by `tsc -b`
    wrangler.toml            # merged wrangler config from cloudflare.slots.wranglerToml
    .dev.vars                # generated mirror of the root .dev.vars (wrangler resolves it against the config dir)
    vite.config.ts           # Vite config from vite.slots.viteConfig
    screens.vite.config.ts   # the same slot values rendered for the screens workbench's host, from
                             # screens.slots.viteConfig (with screens)
    screens/main.ts          # Storybook's config directory for `slotform screens dev`, from
                             # screens.slots.storybookMain (with screens)
    screens-test/main.ts     # the same with the checks, for `slotform screens test`, from
                             # screens.slots.testMain (with screens)
    screens.vitest.config.ts # `slotform screens test`'s Vitest config, from screens.slots.vitestConfig
                             # (with screens)
    storybook.vite.config.ts # the same slot values rendered for a Storybook that draws components
                             # and no route (no router plugin), written by `writeStorybookConfig`
                             # from `@slotform/screens/node` when such a Storybook starts, never
                             # by `generate`
    entry.tsx                # app bootstrap from react.slots.entrySource (the router inside the
                             # providers under StrictMode) or expo.slots.entrySource
    index.html               # web HTML shell with the <head> metadata from react.slots.htmlSource
    app.css                  # web stylesheet from reactUi.slots.appCssSource: Tailwind v4, the web
                             # sheet, the ui-core `@theme` tokens, the dark and density layers
    virtual-providers.tsx    # web providers composition, served as virtual:slotform-providers
    routeTree.gen.ts         # TanStack Router's route tree, written by its generator on
                             # `slotform generate` and by its Vite plugin in dev and build
    routes.d.ts              # typed routes: the web router's `Register` over the route tree
                             # (react.slots.routesDtsSource), or the phone's expo-router `__routes`
                             # augmentation over its route files, which `Href` reads
                             # (expo.slots.routesDtsSource, from the generator the app's Expo CLI
                             # runs; `slotform dev` rewrites it as a route file comes or goes)
    server.ts                # node target entry from node.slots.serverSource (run with `node .slotform/server.ts`)
  .wrangler/state/           # the dev worker's local state (D1, KV, caches, traces): `wrangler dev
                             # --persist-to`, and every local D1 command's. Gitignored, and outside
                             # `.slotform/`, Vite's root, where each request's write would be a full reload
  .db-kit/                   # the `db` plugin's dev files (drizzle-kit configs, the migration lock, the seed
                             # and drift snapshots); gitignored, outside Vite's root for the same reason
```

The generated folder's name is the constant `GENERATED_DIR`, exported by `@slotform/cli`.

On the node target (`node()` in place of `cloudflare()`), `wrangler.toml`,
`worker-configuration.d.ts` and `.slotform/wrangler.toml` do not exist; `.slotform/server.ts` serves the
worker, the built client (`dist/client`, with vite) and the consumer's background services from one
long-running process. Its database is `db({ dialect: "sqlite", path })`: the running process opens
the file the `DB_FILE` env var names (`fileVar` renames the var), `path` is that var's dev default,
and the deployed installation sets `DB_FILE` itself. Env vars the worker declares come from the
process environment, with no `.dev.vars`; `slotform dev` fills each unset one with its dev default.

## TypeScript projects

Which environments a consumer spans is decided once, from its plugin names, and drives both the
files `slotform init` writes and the tsconfig the worker's bundler reads. `node` is the node target:
its server runs under Node, with no Workers globals, and holds the consumer's services under
`src/server`.

The `typescript` and `@types/node` ranges `slotform init` and `slotform plugin init` write are the CLI's
own `devDependencies`, the compiler Slotform's sources are checked with, since an app's `tsc` reads
the `.tsx` sources the UI plugins ship. `@types/node` goes in wherever a project extends
`node-tsx.json`, which names it in `types`
([conventions](./conventions.md#typescript-presets)).

A consumer with both an app and a worker spans two environments that cannot share one program: the
app (DOM, or react-native) and the worker (workerd globals from the generated
`worker-configuration.d.ts`, or Node's on the node target; never the DOM). One program merges both
sets of globals and they collide: the Workers runtime declares HTMLRewriter's `Element` as a global
interface, so DOM's `Element.append` takes only `string | ReadableStream | Response`. The two are
split into projects under a solution `tsconfig.json`, so `tsc -b` checks both and editors pick the
right environment per file; `tsc --noEmit` on the solution checks nothing. Every other consumer
keeps a single config over `["src", ".slotform/*.d.ts"]`.

- **`tsconfig.worker.json`** holds the worker's sources, the schema, `src/shared`, the generated
  worker files and the `Env` declarations, with no ambient package types; on the node target it
  loads `@types/node` in place of the Workers' generated declarations, which do not exist there,
  and holds `src/server`. A referenced project lists every file its program loads, so `src/shared`
  (which the schema and routes import) is its own. It is composite and emits declarations only,
  into `.slotform/types/`, with `declarationMap` so an editor jumps from the app to a procedure's
  source. The build info sits with the declarations, so removing `.slotform/` rebuilds them rather
  than leaving `tsc -b` to call a project with no output current.
- **`tsconfig.app.json`** holds everything but the server's trees (`src/worker`, and on the node
  target `src/server`), plus the web's `.slotform/routes.d.ts` or the phone's `.slotform/entry.tsx`,
  `.slotform/routes.d.ts` and `.slotform/expo-env.d.ts`. The app still needs the worker's types: the
  typed API client takes the router type (`.slotform/worker`'s `AppRouter`), whose procedure inputs
  and outputs are inferred from worker sources that only type-check under the Workers globals. It
  references the worker project, `tsc -b` builds the worker first, and an app import of a worker
  file resolves to its declaration, so no worker source enters the app's program. The declarations
  carry the procedures' plain input and output types, never the request context. The app never
  emits, so its own declaration diagnostics are off. Editors follow a project reference to its
  sources by default, which would type those sources under the app's globals; the redirect is off
  so they read the declarations, as `tsc -b` does, current as of the last build. `tsc -b` writes
  the build info even under `noEmit`; it lands in `node_modules/.tmp`, ignored already.

Of the generated files, only the declarations at the `.slotform/` root (`Env`, typed routes) are
loaded by the consumer's type-check; the rest are bundler inputs that reach `tsc` only through an
import (`virtual:slotform-procedure`, `worker-configuration.d.ts`'s `import("./worker")`). A bare
`.slotform` include matches nothing: `tsc` reads an include whose last segment holds a `.` as a file
name, not a directory.

The tsconfig that compiles the worker's sources holds the `virtual:slotform-procedure` `paths` alias
([`virtual:slotform-procedure`](./runtime.md#virtualslotform-procedure)): the worker project under the
split, else the single root config. esbuild reads the tsconfig nearest each file, which under the
split is the solution config with no `paths`, so the CLI names that file to the bundler as
`cliSlots.workerTsconfig`, relative to the app's root, from the same layout the tsconfig template
writes; wrangler takes it as `--tsconfig`.

Plugin-contributed global type augmentations (native-ui's uniwind `className` variants) load
wherever the consumer's `.tsx` is type-checked, through an ambient package `types` entry: some
plugins ship source, not declarations, so that entry is the only build-independent way to pull the
augmentation in. It is empty when no plugin contributes one (`expo()` without `nativeUi()`).

## Installing Slotform

An app commits each Slotform package as a caret range of one release, and its lockfile is the pin
([the version rule](releasing.md#the-version-rule)). Every build and every CI run installs from it.
While developing against a Slotform checkout, `slotform link <checkout>` installs every Slotform package of
the app from that checkout: each is `file:` and `injected`, so each copy resolves its peers from
the app, and the app holds one copy of each library whose types cross into it. The command keeps
the app's `package.json`, `pnpm-workspace.yaml` and `pnpm-lock.yaml` as they were in
`.slotform/link/`. Running it again after a Slotform rebuild picks up the new `dist/`. `slotform unlink` puts
the three files back and installs from the lockfile ([a linked app](#a-linked-app)). An app inside Slotform's own workspace keeps `workspace:*`.

`slotform init` and `slotform add` write each named plugin's own package as a dependency, every
contribution to `cliSlots.initDeps` (including those a plugin's options derive, as expo's config
plugins) as a dependency, and every contribution to `cliSlots.initDevDeps` as a devDependency.
After the install they also write, as a dependency, each **required peer**: a third-party peer
that `peerDependenciesMeta` does not mark optional, of any Slotform package in the app's closure (the
Slotform packages its `package.json` names and every one their `dependencies` reach, ui-core
included), read off each manifest as installed. A package the closure reaches is not linked at the
app's root under pnpm, so it is found beside the real directory of the package that depends on it.
The app's own and generated code imports these libraries (`zod`, `drizzle-orm`, `hono`, `clsx`),
so the app names each. A contribution wins over a derived peer (expo's SDK `react` over the
peers' `^19.3.0`); an optional peer is written only by a contribution; a name either block of the
app's `package.json` already holds keeps its range. Where two manifests name a peer, their ranges
are one ([peers](./releasing.md#peers-one-copy-of-each-slotform-package)).

The `pnpm-workspace.yaml` the CLI writes and the install belong to the app's own pnpm workspace
when the app is a project of one (a consumer monorepo), else to the app. The CLI writes only the
entries the yaml lacks. Which entries ship compiled in `dist/` and which resolve to source:
[build and exports](./conventions.md#build-and-exports).

### From npm

A consumer takes each package from the npm registry as a caret range of the CLI's own version,
since every package is published together at one version
([the version rule](./releasing.md#the-version-rule)):

```json
"@slotform/db": "^0.1.0"
```

pnpm resolves the range once and installs that version until `pnpm update "@slotform/*"` moves every
Slotform package to the latest together. The CLI's table (`packages/cli/src/lib/slotform-packages.ts`)
maps each first-party package to its directory in Slotform's repository and lists its first-party
`dependencies`; `slotform init` and `slotform add` write every `@slotform/*` spec from it, and a plugin's
own `dependencies` take a Slotform package's spec through `slotformSpec` from `@slotform/cli`.
`slotformSpec` reads the version off the CLI's own `package.json`, so the specs a consumer gets are
those of the CLI that wrote them.
A package only a plugin's own host loads is not that plugin's dependency: `@slotform/screens`
keeps Storybook, its addons, MSW, Vitest and `@vitest/browser` as optional peers of its package
(oRPC's client and server are required peers) and lists the same ranges as its
`devDependencies`, which `slotform add screens` writes into the app's `package.json`. An app with auth
or react-ui, which depend on the package for its slots, installs none of them: they are optional
because pnpm auto-installs a missing peer that is not. The host resolves each from the app's root,
and the list matches the manifest's `peerDependencies`.

The same holds for every build-time tool, so an install that only runs the app (a server that
ships its pages built) holds none of them. These are optional peers, and the plugin's
`devDependencies` (or the CLI's scaffold) write each into the app:

| Optional peer | Of | Written by | Used by |
|---------------|----|------------|---------|
| `ts-morph` | `@slotform/cli` | `slotform init`'s base `devDependencies` | `slotform generate`, which prints the TypeScript |
| `vite` | `@slotform/vite` | `vite()` | `slotform dev` and `slotform build` |
| `@tanstack/router-generator` | `@slotform/react` | `react()` | `slotform generate`, the route tree |
| `drizzle-kit` | `@slotform/db` | `db()` | the `slotform db` commands |
| `tailwindcss`, `@tailwindcss/vite` | `@slotform/react-ui` | `reactUi()` | the web build (the app's `app.css` and Vite config import them) |
| `esbuild` | `@slotform/node` | `node()` | `slotform build`'s self-contained node bundle |

An app that has run `slotform init` or `slotform add` with these plugins has them; an app without one
adds the missing line to its `devDependencies`. `@slotform/ui-core` ships no Lucide (`IconName` is
the glyph names written out; `pnpm --filter @slotform/ui-core icon-name` regenerates them and its
test holds them to Lucide), so an install of auth or node, which reach it through
`@slotform/screens`, brings none.

A published package ships its built `dist/`, and its `@slotform/*` dependencies are ordinary ranges
npm resolves. No install runs a Slotform `prepare`, so the consumer's `pnpm-workspace.yaml` carries
only the build-script verdicts of the third-party packages the install brings:

```yaml
allowBuilds:
  esbuild: true
  workerd: true
```

pnpm 11 refuses an install that meets a build script `allowBuilds` gives no verdict
(`strictDepBuilds`). Each verdict is a Slotform package's own data, its `builds` in the CLI's table
(`@slotform/auth`'s `better-sqlite3: true`, the CLI's `esbuild` and `workerd` for the wrangler its
template writes), so the yaml written with the first install already carries every verdict of the
packages that install brings, before any plugin loads. The verdicts cover the closure over
`dependencies`, not `requires`. Inside Slotform's workspace the checkout's root `pnpm-workspace.yaml`
carries the same verdicts by hand. pnpm is the recommended package manager (the scaffold pins it
in `packageManager`), and a missing `pnpm` fails the install with the command that provides it
(`corepack enable`), not a bare exit signal.

### A linked app

A **linked app** is one `slotform link <checkout>` has installed from a Slotform checkout. The registry
holds a version only once the [publish](../procedures/publishing.md) has run, so a fix that is not
released reaches an app this way, and a review round runs on a linked app.

The command takes every Slotform package the app's `dependencies` and `devDependencies` name, with
each Slotform package those reach through the table's `dependencies`, from the checkout. Each package
of the checkout that ships `dist/` has one, or the command fails naming `pnpm turbo run build` in
the checkout. Then it:

1. copies the three files to `.slotform/link/` under the app, unless a backup is already there: a
   re-run keeps the first one, which holds the files as committed;
2. rewrites each named package's spec in the app's `package.json` to `file:` and its directory in
   the checkout, relative to the app (`file:../slotform/plugins/db`), and marks it
   `dependenciesMeta: { "<name>": { injected: true } }`;
3. sets an `overrides` entry in `pnpm-workspace.yaml` for every package it links, the reached ones
   included, relative to the yaml's directory;
4. runs `pnpm install` where the app's install runs.

A plain `link:` resolves a linked package's own dependencies from the checkout's `node_modules`, so
a library both sides import (drizzle-orm) is two copies and its classes' private members fail to
type-check across them (TS2345). An injected `file:` package is copied into the app's
`node_modules` and resolves its peers from the app, so the app holds one copy. The overrides are
what resolve a `file:` package's own `workspace:^` ranges on Slotform packages: without them pnpm
fails with "no package named @slotform/cli is present in the workspace". pnpm copies an injected
package at install, so a rebuilt checkout reaches the app by running `slotform link` again, which
reinstalls in about two seconds; pnpm's `syncInjectedDepsAfterScripts` does not cross into another
workspace.

In a consumer monorepo the yaml and the lockfile are the workspace root's and `package.json` is the
app's own. `slotform unlink` copies the three files back from `.slotform/link/`, removes the backup and
runs `pnpm install --frozen-lockfile`; on an app with no backup it fails saying the app is not
linked. Every install (`slotform init`, `slotform add`) and `slotform build`, and so `slotform deploy`, fail on
a linked app naming `slotform unlink`: the backup is the committed state, `slotform unlink` copies it over
any later change, and a build installs from the lockfile. `slotform link` fails inside Slotform's own
workspace, whose apps take the checkout as `workspace:*`.

### Inside Slotform's workspace

An app in Slotform's own checkout (a directory the root `pnpm-workspace.yaml` globs name, such as
`apps/<name>`) is a workspace project and takes each Slotform package as `workspace:*`, the way
`apps/showcase` does. `slotform init` and `slotform add` tell this from an npm install by pnpm's own
rule: the nearest `pnpm-workspace.yaml` above the app is its workspace, and when its `packages`
globs name both the app and the running `@slotform/cli`, the CLI rewrites every `@slotform/*` spec
in the app's `package.json` to `workspace:*`, writes no `pnpm-workspace.yaml` in the app, and
installs at the workspace root. The app resolves the checkout's `dist/`, as a linked app
does, so the checkout is built (`pnpm turbo run build`) before the app runs. The app is an importer
in the checkout's `pnpm-lock.yaml`. Anywhere else, including a directory under the checkout that no
glob names, the app installs from npm.

Such an app lints and formats under the checkout's root configs, since Biome refuses a second root
config below the checkout's. `slotform init` writes it a `biome.json` that extends the checkout's root
config by path (from the app to it) and `./.slotform/biome.json`, so only the generated lint plugins
are the app's. A nested config inherits nothing of the root's unless it extends it, and Biome takes `//` only as
a lone `extends` string (see [Limits](#limits)). It writes no `.editorconfig`,
no `@biomejs/biome` or `@slotform/biome-config` devDependency, no `lint` or `check` script and no
`packageManager`, so the app runs the root's pnpm as `apps/showcase` does.

`slotform plugin init` applies the same rule to the plugin it scaffolds (`plugins/<name>` by default):
inside the workspace its manifest takes each Slotform package as `workspace:*` and no
`packageManager`, and it writes no `pnpm-workspace.yaml`; elsewhere it writes the npm specs and its
own `pnpm-workspace.yaml`.

## Lint

The web rules' "never" list fails the consumer's `pnpm check`: react-ui ships each as a Biome
GritQL rule under `lint/` and contributes it through `cliSlots.lintPlugins`, so a consumer
configures nothing. A lint plugin is a `path` to the `.grit` file inside its package
(`@slotform/react-ui/lint/no-img.grit`) and `includes`, the globs relative to the consumer's
root of the sources it runs on (for react-ui, the routes directory's parent). A rule is a regex
over an attribute's text, so it reads a literal class string and not a class a function builds;
each rule's `.grit` header states what it forbids, and the rest of the rules page is a reviewer's.

`.slotform/biome.json` renders the slot, and the consumer's `biome.json` extends it. It is written for
every app, so that `extends` always resolves. The file carries each rule as a `plugins` entry,
`{ "path": "node_modules/<package>/lint/<rule>.grit", "includes": [...] }`, a path that resolves
from the app's root in a consumer and in the showcase alike (its nested `biome.json` is that root).
The path is spelled under `node_modules/` because Biome 2.6 reads a bare package name in a plugin
`path` as a Biome plugin package, which needs a `biome-manifest.json` the Slotform packages do not
ship. A file named `biome.json` under `.slotform/` is also a nested config to
Biome's discovery, so it carries `root: false`, which keeps Biome from reading it as a second root
config where the consumer's `files.includes` does not skip `.slotform`.

`cliSlots.lintIgnore` lists the generated sources Biome skips, as globs relative to the app's root
(a directory is a path: db's `src/migrations`), since a plugin's output follows its tool's
formatting, not the consumer's. They render as an override that turns the linter, formatter and
import sorting off for them, never a `files.includes` exclusion: an `includes` list in an extending
config replaces the one before it (a lone `["!src/migrations"]` leaves nothing to check,
`biome check .` processing 0 files), where overrides accumulate and leave the shared preset's list
in force.

## The guide

"How to build on Slotform" ships as markdown inside each package, `guide/<page>.md`, so a consumer
reads the pages of the version it installs, never newer ones. A plugin lists its pages with
`plugin({ guide })`, each with a load trigger: when a step should open the page, never what the
page holds. `plugin({ guide })` feeds `cliSlots.guide`, with the plugin's name as the domain.
`slotform generate` writes `.slotform/guide.md`, an index of every page of every plugin in the config plus
the CLI's own (what Slotform provides, config, commands, what a shortfall is): each line a trigger and the
page's path from the consumer's root, grouped by domain in the slot's order. `slotform init` makes the
consumer's `CLAUDE.md` import it (`@.slotform/guide.md`): a missing `CLAUDE.md` becomes the import
alone, an existing one gains it at the end unless a line already is it. Every session in the repo
carries the index and opens only the page its step needs. Claude Code imports an `@` only at a line
start or after whitespace, and a scoped package's `@` follows `node_modules/`, so no page loads
until a session opens it. The pages are plain files with no frontmatter, so a headless job that
loads no Claude Code settings reads the same ones by path.

- Every plugin ships pages except vite: a web app is always vite with react (react requires vite),
  so vite's options and its dev server live in react's `web-app` page, the page a step on the web
  app opens.
- ui-core is no plugin, so its pages (the screen recipe, the voice, the critic's checklist, the structure rules, the shared topic pages) are listed
  by `@slotform/ui-core/manifest` and contributed by both UI plugins; the index writes a page two
  plugins list once. Every listed page exists and every page under `guide/` is listed. `packages/repo-checks/src/guide.test.ts` holds the listing and the cap: a page holds at most 600 words of prose (code blocks, table rows and `##` headings are not counted).
- A page links a page of its own package relatively (`./client.md`) and another package's by the
  path the index uses, `node_modules/@slotform/<pkg>/guide/<page>.md`, so every link resolves from
  the consumer's root.
- A topic past the cap splits along its `##` sections into pages of its own, each listed with its
  trigger.
- A component's props live on its platform's topic page; a platform's `rules.md` holds the choosing
  rules and links there. A rule or shape both platforms share (a row, a place, a record's facts, an
  act) lives once in ui-core's guide, and each platform's page links there.
- A floor lives in ui-core's `voice.md`, "Floors"; [tokens](ui-core/tokens.md) says which token pair
  meets which floor and links there.
- A rule an app author follows lives in its guide page; the architecture pages keep the mechanism
  and link to the rule.
- A README keeps install, a pointer to the guide, and the maintainer sections (the plugin's
  implementation, its owned slots); every consumer-facing fact lives on one page.

## Designing screens

A consumer's screens are its own: Slotform composes no product screen. ui-core's screen recipe
(`packages/ui-core/guide/screen.md`) designs each in code: compose from the contract and roster
installed at the consumer's version (`node_modules/@slotform/ui-core/DESIGN.md` and `src/roster.ts`,
each entry in `src/roster/<component>.ts`), open the anchor screen the voice page
(`packages/ui-core/guide/voice.md`) pins, draw every state the spec names, then stand the render
beside the anchor screen and ask which looks better; rework until the answer is "ours" or "the
same", and fcalell signs off on the render. There are no artboards.

A consumer works within Slotform's constraints: a part Slotform has no exact shape for takes the nearest
one it provides, named as a known limit, never a local workaround that rebuilds Slotform. Only a bug or
a missing feature the consumer cannot ship without is a shortfall, so the shortfall list stays a list of what
matters rather than every polish a render could take. When Slotform's latest release already has it,
the fix is moving the consumer's version; otherwise the consumer opens an issue on the Slotform
repository (the CLI's `shortfall.md`), and only the work that cannot ship without it waits.

## Limits

- The guide index lists a page by its path under the consumer's root `node_modules`, so a package
  whose pages are listed is a direct dependency there: the UI plugins add `@slotform/ui-core` to the
  consumer's `dependencies` for ui-core's pages.
- Biome takes `//` only as a lone `extends` string, never in an array, so an app in Slotform's
  workspace extends the checkout's root config by path. The trigger is a Biome whose `extends`
  array takes `//`: then the app extends `["//", "./.slotform/biome.json"]`.

## In the code

- `packages/cli/src/config.ts`: `defineConfig`, `AppConfig`, `validate`, `getPlugin`.
- `packages/cli/src/lib/install.ts`: the install, the install root, the linked-app check and the `workspace:*` rewrite inside Slotform's workspace.
- `packages/cli/src/commands/link.ts`: `slotform link` and `slotform unlink`.
- `packages/cli/src/lib/plugin-dependencies.ts`: the dependencies `slotform init` and `slotform add` write, the required peers among them.
- `packages/cli/src/lib/slotform-packages.ts`: the first-party package table, its build verdicts, `slotformSpec` and the closure over `dependencies`.
- `packages/cli/src/templates/pnpm-workspace.ts`: the merge of Slotform's install settings into `pnpm-workspace.yaml`.
- `packages/cli/src/commands/init.ts`: the scaffold, including an app inside Slotform's workspace.
- `packages/cli/src/templates/biome.ts`: the app's `biome.json` and `.slotform/biome.json`.
- `packages/cli/src/specs.ts`: the lint plugin spec.
- `packages/cli/src/lib/cli-slots.ts`: `guide`, `lintPlugins`, `lintIgnore`, `workerTsconfig`.
- `packages/cli/src/lib/guide.ts`: `.slotform/guide.md`.
- `packages/cli/src/templates/claude-md.ts`: the consumer's `CLAUDE.md` import.
- `packages/cli/src/templates/tsconfig.ts`: the environments a consumer spans and its tsconfig projects.
