# Consumer project and config

What a generated consumer repo holds and how `stack.config.ts` drives it: the config surface, the
file layout and its TypeScript projects, the three ways an app installs stack, the generated lint
and guide index, and how a consumer designs its screens within stack.

## Config

`defineConfig` in `stack.config.ts` is the one entry point for project configuration
(`packages/cli/guide/config.md`). It takes a required top-level `app` field with cross-cutting
identity, plus the `plugins` array. **`app`** holds only values more than one plugin consumes;
anything that matters to one plugin's domain (HTML metadata, typography) lives on that plugin's
options.

```ts
// stack.config.ts
import { defineConfig } from "@fcalell/cli";
import { db } from "@fcalell/plugin-db";
import { auth } from "@fcalell/plugin-auth";
import { api } from "@fcalell/plugin-api";
import { expo } from "@fcalell/plugin-expo";
import { nativeUi } from "@fcalell/plugin-native-ui";

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
  icon: "/icon.svg",          // <link rel="icon"> and the mark of the Gate; or { light, dark }
  logo: "/logo.svg",          // the app's drawn lockup (symbol and name), drawn in the mark's place; or { light, dark }
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
  fonts: [plexSans],   // the files to load; default IBM Plex Sans (wght) + IBM Plex Mono 400/500/600
}),
```

The icon set is Lucide, fixed by the framework: every `icon` prop is an `IconName` from
`@fcalell/ui-core/descriptors`, a Lucide PascalCase name, so the consumer declares no icon map.
The web `<head>` belongs to `plugin-react`: its options render into `.stack/index.html` through
`react.slots.htmlHead` ([HTML shell](./plugins/react.md#html-shell)).

`app.name` flows into the generated `wrangler.toml`. `app.domain` seeds `api.slots.cors` with
`https://${domain}` and `https://app.${domain}`, and auth's derived `trustedOrigins`. `app.origins`
replaces the derived allow-list entirely; where its local origins and the dev servers' origins go is
under [CORS and origins](./plugins/api.md#cors-and-origins).

Every plugin the consumer depends on is listed explicitly; there is no implicit-resolution layer.
Which plugin requires which is the [dependency graph](../architecture.md#dependency-graph);
`stack init` adds the missing dependency when the interactive picker picks a plugin that needs one.

`defineConfig()` returns a `StackConfig<T>` whose `.validate()` checks `app` and duplicate
plugins; `requires` is checked when the config's plugins load
([the `plugin()` contract](./plugin-authoring.md#the-plugin-contract)). `getPlugin(config, "db")`
extracts one plugin's entry, its `options` typed as that plugin's (`DbOptions`).

`stack` loads `stack.config.ts` and `src/schema/seed.ts` with a plain `import()` under Node's type
stripping, so both stay erasable-only syntax and name the file of every relative import.

## Project structure

```
my-app/
  package.json
  tsconfig.json              # a solution over the two projects below when the app has a worker,
                             # else one project (see "TypeScript projects")
  tsconfig.app.json          # the app's project (DOM or react-native globals)
  tsconfig.worker.json       # the worker's project (workerd or Node globals), composite
  biome.json                 # extends @fcalell/biome-config and ./.stack/biome.json; $schema from the installed biome
  .editorconfig              # the shared style: biome and shfmt read it
  CLAUDE.md                  # imports `@.stack/guide.md`; the rest is the consumer's
  stack.config.ts            # defineConfig({ app, plugins: [db(...), auth(), api(), expo(), nativeUi()] })
  wrangler.toml              # consumer-owned base; .stack/wrangler.toml merges it (consumer [[routes]]/[[r2_buckets]]/[[queues.producers]]/[[queues.consumers]] merge next to plugin contributions, collision = hard error; [triggers] and [browser] are copied, crons checked against src/worker/scheduled.ts; d1/kv/analytics_engine/unsafe/compatibility_flags stay framework-only)
  src/
    schema/                  # Drizzle tables (business logic); index.ts re-exports auth's tables:
                             # @fcalell/plugin-auth/schema always, /schema/organization and
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
      middleware.context.ts  # optional Hono middleware, after it; reaches db/auth via stackContext(c)
    server/                  # node target only; checked with the worker project, under Node's types
      services/              # background services (barrel generated to index.ts);
                             # each module default-exports a defineService(...)
    app/
      routes/                # the web app's TanStack Router file routes (business logic):
                             # `__root.tsx` wraps every route, `index.tsx`, `$param`, a folder's
                             # `route.tsx` wraps its folder, `_layout` nests without a URL
                             # segment, `(group)` scopes without one; `react({ routes: { dir } })`
                             # moves it. The phone's expo-router files sit in `src/app` itself
                             # (`expo({ routes: { appDir } })`), where `stack generate` writes
                             # `+not-found.tsx` while no `+not-found.*` sits at its root: a
                             # re-export of native-ui's page for an unmatched address, then the app's
                             # to replace (expo-router reads that route from no other place; the web
                             # needs no file, its not-found page is set in the entry)
      fixtures.ts            # with screens: `defineFixtures<AppRouter>(procedures, params, channels, search)`, the
                             # answers of the procedures and an example value per route `$param`
  .stack/                    # generated, gitignored
    biome.json               # the plugins' lint rules and the generated sources Biome skips (see "Lint")
    guide.md                 # the guide's index (see "The guide")
    worker-configuration.d.ts # Env interface generated by `wrangler types`
    worker.ts                # virtual worker entry from api.slots.workerSource
    procedure.ts             # virtual:stack-procedure target from api.slots.procedureSource
    schema.ts                # virtual:stack-schema target: each procedure's input as JSON Schema, its kind and its scope key,
                             # written by plugin-api's `postWrite` from the router loaded in a child node process;
                             # a `Form` derives its fields from it and the client fills scope ids by it. Absent without routes
    types/                   # the worker project's declarations and build info, written by `tsc -b`
    wrangler.toml            # merged wrangler config from cloudflare.slots.wranglerToml
    .dev.vars                # generated mirror of the root .dev.vars (wrangler resolves it against the config dir)
    vite.config.ts           # Vite config from vite.slots.viteConfig
    screens.vite.config.ts   # the same slot values rendered for the screens workbench's host, from
                             # screens.slots.viteConfig (with screens)
    screens/main.ts          # Storybook's config directory for `stack screens dev`, from
                             # screens.slots.storybookMain (with screens)
    screens-test/main.ts     # the same with the floors, for `stack screens test`, from
                             # screens.slots.testMain (with screens)
    screens.vitest.config.ts # `stack screens test`'s Vitest config, from screens.slots.vitestConfig
                             # (with screens)
    storybook.vite.config.ts # the same slot values rendered for a Storybook that draws components
                             # and no route (no router plugin), written by `writeStorybookConfig`
                             # from `@fcalell/plugin-screens/node` when such a Storybook starts, never
                             # by `generate`
    entry.tsx                # app bootstrap from react.slots.entrySource (the router inside the
                             # providers under StrictMode) or expo.slots.entrySource
    index.html               # web HTML shell with the <head> metadata from react.slots.htmlSource
    app.css                  # web stylesheet from reactUi.slots.appCssSource: Tailwind v4, the web
                             # sheet, the ui-core `@theme` tokens, the dark and density layers
    virtual-providers.tsx    # web providers composition, served as virtual:stack-providers
    routeTree.gen.ts         # TanStack Router's route tree, written by its generator on
                             # `stack generate` and by its Vite plugin in dev and build
    routes.d.ts              # typed routes: the web router's `Register` over the route tree
                             # (react.slots.routesDtsSource), or the phone's expo-router `__routes`
                             # augmentation over its route files, which `Href` reads
                             # (expo.slots.routesDtsSource, from the generator the app's Expo CLI
                             # runs; `stack dev` rewrites it as a route file comes or goes)
    server.ts                # node target entry from node.slots.serverSource (run with `node .stack/server.ts`)
  .wrangler/state/           # the dev worker's local state (D1, KV, caches, traces): `wrangler dev
                             # --persist-to`, and every local D1 command's. Gitignored, and outside
                             # `.stack/`, Vite's root, where each request's write would be a full reload
  .db-kit/                   # plugin-db's dev files (drizzle-kit configs, the migration lock, the seed
                             # and drift snapshots); gitignored, outside Vite's root for the same reason
```

On the node target (`node()` in place of `cloudflare()`), `wrangler.toml`,
`worker-configuration.d.ts` and `.stack/wrangler.toml` do not exist; `.stack/server.ts` serves the
worker, the built client (`dist/client`, with vite) and the consumer's background services from one
long-running process. Its database is `db({ dialect: "sqlite", path })`: the running process opens
the file the `DB_FILE` env var names (`fileVar` renames the var), `path` is that var's dev default,
and the deployed installation sets `DB_FILE` itself. Env vars the worker declares come from the
process environment, with no `.dev.vars`; `stack dev` fills each unset one with its dev default.

## TypeScript projects

Which environments a consumer spans is decided once, from its plugin names, and drives both the
files `stack init` writes and the tsconfig the worker's bundler reads. `node` is the node target:
its server runs under Node, with no Workers globals, and holds the consumer's services under
`src/server`.

A consumer with both an app and a worker spans two environments that cannot share one program: the
app (DOM, or react-native) and the worker (workerd globals from the generated
`worker-configuration.d.ts`, or Node's on the node target; never the DOM). One program merges both
sets of globals and they collide: the Workers runtime declares HTMLRewriter's `Element` as a global
interface, so DOM's `Element.append` takes only `string | ReadableStream | Response`. The two are
split into projects under a solution `tsconfig.json`, so `tsc -b` checks both and editors pick the
right environment per file; `tsc --noEmit` on the solution checks nothing. Every other consumer
keeps a single config over `["src", ".stack/*.d.ts"]`.

- **`tsconfig.worker.json`** holds the worker's sources, the schema, `src/shared`, the generated
  worker files and the `Env` declarations, with no ambient package types; on the node target it
  loads `@types/node` in place of the Workers' generated declarations, which do not exist there,
  and holds `src/server`. A referenced project lists every file its program loads, so `src/shared`
  (which the schema and routes import) is its own. It is composite and emits declarations only,
  into `.stack/types/`, with `declarationMap` so an editor jumps from the app to a procedure's
  source. The build info sits with the declarations, so removing `.stack/` rebuilds them rather
  than leaving `tsc -b` to call a project with no output current.
- **`tsconfig.app.json`** holds everything but the server's trees (`src/worker`, and on the node
  target `src/server`), plus the web's `.stack/routes.d.ts` or the phone's `.stack/entry.tsx`,
  `.stack/routes.d.ts` and `.stack/expo-env.d.ts`. The app still needs the worker's types: the
  typed API client takes the router type (`.stack/worker`'s `AppRouter`), whose procedure inputs
  and outputs are inferred from worker sources that only type-check under the Workers globals. It
  references the worker project, `tsc -b` builds the worker first, and an app import of a worker
  file resolves to its declaration, so no worker source enters the app's program. The declarations
  carry the procedures' plain input and output types, never the request context. The app never
  emits, so its own declaration diagnostics are off. Editors follow a project reference to its
  sources by default, which would type those sources under the app's globals; the redirect is off
  so they read the declarations, as `tsc -b` does, current as of the last build. `tsc -b` writes
  the build info even under `noEmit`; it lands in `node_modules/.tmp`, ignored already.

Of the generated files, only the declarations at the `.stack/` root (`Env`, typed routes) are
loaded by the consumer's type-check; the rest are bundler inputs that reach `tsc` only through an
import (`virtual:stack-procedure`, `worker-configuration.d.ts`'s `import("./worker")`). A bare
`.stack` include matches nothing: `tsc` reads an include whose last segment holds a `.` as a file
name, not a directory.

The tsconfig that compiles the worker's sources holds the `virtual:stack-procedure` `paths` alias
([`virtual:stack-procedure`](./runtime.md#virtualstack-procedure)): the worker project under the
split, else the single root config. esbuild reads the tsconfig nearest each file, which under the
split is the solution config with no `paths`, so the CLI names that file to the bundler as
`cliSlots.workerTsconfig`, relative to the app's root, from the same layout the tsconfig template
writes; wrangler takes it as `--tsconfig`.

Plugin-contributed global type augmentations (native-ui's uniwind `className` variants) load
wherever the consumer's `.tsx` is type-checked, through an ambient package `types` entry: some
plugins ship source, not declarations, so that entry is the only build-independent way to pull the
augmentation in. It is empty when no plugin contributes one (`expo()` without `nativeUi()`).

## Installing stack

`stack init` and `stack add` write each named plugin's own package as a dependency, every
contribution to `cliSlots.initDeps` (including those a plugin's options derive, as expo's config
plugins) as a dependency, and every contribution to `cliSlots.initDevDeps` as a devDependency. Every
install the CLI runs first brings the app's specs in line with the stack packages its
`package.json` names, by where the app sits:

| App | Each stack package's spec | Who installs |
| --- | --- | --- |
| Inside the pnpm workspace this CLI belongs to | `workspace:*` | the workspace root |
| `@fcalell/cli` is `link:` | `link:` into the same checkout | the app |
| Elsewhere, published CLI | an npm caret range | the app |
| Elsewhere, unpublished CLI (version `0.0.0`) | a subdirectory of stack's repository on GitHub | the app |

The `pnpm-workspace.yaml` the CLI writes and the install belong to the app's own pnpm workspace
when the app is a project of one (a consumer monorepo), else to the app. The CLI writes only the
entries the yaml lacks. Which entries ship compiled in `dist/` and which resolve to source:
[build and exports](./conventions.md#build-and-exports).

### From npm

A consumer takes each package from the npm registry as a caret range of the CLI's own version,
since every package is published together at one version
([the version rule](./releasing.md#the-version-rule)):

```json
"@fcalell/plugin-db": "^0.1.0"
```

The consumer's `pnpm-lock.yaml` is the pin: pnpm resolves the range once and installs that version
until `pnpm update "@fcalell/*"` moves every stack package to the latest together. The CLI's table
(`packages/cli/src/lib/stack-packages.ts`) maps each first-party package to its directory in
stack's repository and lists its first-party `dependencies`; `stack init` and `stack add` write
every `@fcalell/*` spec from it, and a plugin's own `dependencies` take a stack package's spec
through `stackSpec` from `@fcalell/cli`. `stackSpec` reads the version off the CLI's own
`package.json`, so the specs a consumer gets are those of the CLI that wrote them.

A package only a plugin's own host loads is not that plugin's dependency: `@fcalell/plugin-screens`
keeps Storybook, its addons, MSW, Vitest and `@vitest/browser` as optional peers of its package
(oRPC's client and server are its own dependencies) and lists the same ranges as its
`devDependencies`, which `stack add screens` writes into the app's `package.json`. An app with auth
or react-ui, which depend on the package for its slots, installs none of them: they are optional
because pnpm auto-installs a missing peer that is not. The host resolves each from the app's root,
and the list matches the manifest's `peerDependencies`.

The same holds for every build-time tool, so an install that only runs the app (a server that
ships its pages built) holds none of them. These are optional peers, and the plugin's
`devDependencies` (or the CLI's scaffold) write each into the app:

| Optional peer | Of | Written by | Used by |
|---------------|----|------------|---------|
| `ts-morph` | `@fcalell/cli` | `stack init`'s base `devDependencies` | `stack generate`, which prints the TypeScript |
| `vite` | `plugin-vite` | `vite()` | `stack dev` and `stack build` |
| `@tanstack/router-generator` | `plugin-react` | `react()` | `stack generate`, the route tree |
| `drizzle-kit` | `plugin-db` | `db()` | the `stack db` commands |
| `tailwindcss`, `@tailwindcss/vite` | `plugin-react-ui` | `reactUi()` | the web build (the app's `app.css` and Vite config import them) |
| `esbuild` | `plugin-node` | `node()` | `stack build`'s self-contained node bundle |

An app that has run `stack init` or `stack add` with these plugins has them; an app without one
adds the missing line to its `devDependencies`. `@fcalell/ui-core` ships no Lucide (`IconName` is
the glyph names written out; `pnpm --filter @fcalell/ui-core icon-name` regenerates them and its
test holds them to Lucide), so an install of auth or node, which reach it through
`plugin-screens`, brings none.

A published package ships its built `dist/`, and its `@fcalell/*` dependencies are ordinary ranges
npm resolves. No install runs a stack `prepare`, so stack needs no `overrides`, no
`blockExoticSubdeps`, no concurrency settings and no `allowBuilds` key of its own. The consumer's
`pnpm-workspace.yaml` carries only the build-script verdicts of the third-party packages the
install brings:

```yaml
allowBuilds:
  esbuild: true
  workerd: true
```

pnpm 11 refuses an install that meets a build script `allowBuilds` gives no verdict
(`strictDepBuilds`). Each verdict is a stack package's own data, its `builds` in the CLI's table
(plugin-auth's `better-sqlite3: true`, the CLI's `esbuild` and `workerd` for the wrangler its
template writes), so the yaml written with the first install already carries every verdict of the
packages that install brings, before any plugin loads. The verdicts cover the closure over
`dependencies`, not `requires`. Inside stack's workspace the checkout's root `pnpm-workspace.yaml`
carries the same verdicts by hand. pnpm is the recommended package manager (the scaffold pins it
in `packageManager`), and a missing `pnpm` fails the install with the command that provides it
(`corepack enable`), not a bare exit signal.

### From a checkout

A consumer that works against a stack checkout links it with `link:`. The checkout resolves its
`dist/`, so it is built first and rebuilt after a source change: `pnpm install` there runs every
`prepare`, and `pnpm turbo run build` rebuilds.

The app's `@fcalell/cli` spec names the mode: when it is `link:<path>`, `stack add` (and every
install the CLI runs) rewrites each stack package's spec to `link:` from the same checkout, its
path relative to the app (`link:../stack/plugins/screens`). The app's `pnpm-workspace.yaml` takes
only the third-party build verdicts in `allowBuilds`, as from npm.

The registry holds a version only once the [publish](../procedures/publishing.md) has run; before
it, and for a fix that is not released, a consumer takes the checkout. `link:` is the route a review
round uses. The git route is the other: a CLI whose version is `0.0.0` (a checkout that is not a
release) writes each spec as a subdirectory of the repository,
`github:fcalell/stack#path:/plugins/db`. When the consumer's specs pin a commit, every spec takes
it (`#<sha>&path:/plugins/db`), so one install never holds two commits of a stack package;
ref-less, the consumer's lockfile pins the commit. A git tarball keeps the `workspace:*` ranges
between stack packages and runs the package's `prepare` to build `dist/`, so the yaml also:

- overrides every stack package the app's `dependencies` reach to its spec;
- sets `blockExoticSubdeps: false`, since the git packages depend on one another by git spec;
- approves each package's `prepare` by `"<name>@git+https://github.com/fcalell/stack.git": true`
  (pnpm 11.15 or later; the bare name and the `github:` spec are refused);
- sets `childConcurrency: 1` and `networkConcurrency: 2`, since each prepare is a full workspace
  install and several at once can exhaust the machine's memory.

The first `stack init` over git therefore takes about eight minutes, one prepare at a time. The
mode follows the CLI's version alone: a published CLI never writes these. A consumer that pinned a
commit moves to a version by [the consumer version move](../procedures/consumer-version-move.md).

### Inside stack's workspace

An app in stack's own checkout (a directory the root `pnpm-workspace.yaml` globs name, such as
`apps/<name>`) is a workspace project and takes each stack package as `workspace:*`, the way
`apps/showcase` does. `stack init` and `stack add` tell this from an npm install by pnpm's own
rule: the nearest `pnpm-workspace.yaml` above the app is its workspace, and when its `packages`
globs name both the app and the running `@fcalell/cli`, the CLI rewrites every `@fcalell/*` spec
in the app's `package.json` to `workspace:*`, writes no `pnpm-workspace.yaml` in the app, and
installs at the workspace root. The app resolves the checkout's `dist/`, as a `link:` consumer
does, so the checkout is built (`pnpm turbo run build`) before the app runs. The app is an importer
in the checkout's `pnpm-lock.yaml`. Anywhere else, including a directory under the checkout that no
glob names, the app installs from npm.

Such an app lints and formats under the checkout's root configs, since Biome refuses a second root
config below the checkout's. `stack init` writes it a `biome.json` that extends the checkout's root
config by path (from the app to it) and `./.stack/biome.json`, so only the generated lint plugins
are the app's. A nested config inherits nothing of the root's unless it extends it, and Biome 2.4
takes `//` only as a lone `extends` string (see [Limits](#limits)). It writes no `.editorconfig`,
no `@biomejs/biome` or `@fcalell/biome-config` devDependency, no `lint` or `check` script and no
`packageManager`, so the app runs the root's pnpm as `apps/showcase` does.

`stack plugin init` applies the same rule to the plugin it scaffolds (`plugins/<name>` by default):
inside the workspace its manifest takes each stack package as `workspace:*` and no
`packageManager`, and it writes no `pnpm-workspace.yaml`; elsewhere it writes the npm specs and its
own `pnpm-workspace.yaml`.

## Lint

The web rules' "never" list fails the consumer's `pnpm check`: react-ui ships each as a Biome
GritQL rule under `lint/` and contributes it through `cliSlots.lintPlugins`, so a consumer
configures nothing. A lint plugin is a `path` to the `.grit` file inside its package
(`@fcalell/plugin-react-ui/lint/no-img.grit`) and `includes`, the globs relative to the consumer's
root of the sources it runs on (for react-ui, the routes directory's parent). A rule is a regex
over an attribute's text, so it reads a literal class string and not a class a function builds;
the rules page's table lists what each rule leaves to a reviewer.

`.stack/biome.json` renders the slot, and the consumer's `biome.json` extends it. It is written for
every app, so that `extends` always resolves. Biome 2.4 reads no `includes` on a plugin entry and
resolves a plugin path against the directory of the config that is root (the app's, or its nested
config), never the extending file, failing a package specifier. The file therefore carries each
rule as `node_modules/<package>/lint/<rule>.grit` in an override whose `includes` names the app's
source, paths that resolve from the app's root in a consumer and in the showcase alike (its nested
`biome.json` is that root). A file named `biome.json` under `.stack/` is also a nested config to
Biome's discovery, so it carries `root: false`, which keeps Biome from reading it as a second root
config where the consumer's `files.includes` does not skip `.stack`.

`cliSlots.lintIgnore` lists the generated sources Biome skips, as globs relative to the app's root
(a directory is a path: db's `src/migrations`), since a plugin's output follows its tool's
formatting, not the consumer's. They render as an override that turns the linter, formatter and
import sorting off for them, never a `files.includes` exclusion: an `includes` list in an extending
config replaces the one before it (a lone `["!src/migrations"]` leaves nothing to check,
`biome check .` processing 0 files), where overrides accumulate and leave the shared preset's list
in force.

## The guide

"How to build on stack" ships as markdown inside each package, `guide/<page>.md`, so a consumer
reads the pages of the version it installs, never newer ones. A plugin lists its pages with
`plugin({ guide })`, each with a load trigger: when a step should open the page, never what the
page holds. `plugin({ guide })` feeds `cliSlots.guide`, with the plugin's name as the domain.
`stack generate` writes `.stack/guide.md`, an index of every page of every plugin in the config plus
the CLI's own (what stack provides, config, commands, what a gap is): each line a trigger and the
page's path from the consumer's root, grouped by domain in the slot's order. `stack init` makes the
consumer's `CLAUDE.md` import it (`@.stack/guide.md`): a missing `CLAUDE.md` becomes the import
alone, an existing one gains it at the end unless a line already is it. Every session in the repo
carries the index and opens only the page its step needs. Claude Code imports an `@` only at a line
start or after whitespace, and a scoped package's `@` follows `node_modules/`, so no page loads
until a session opens it. The pages are plain files with no frontmatter, so a headless job that
loads no Claude Code settings reads the same ones by path.

- Every plugin ships pages except vite: a web app is always vite with react (react requires vite),
  so vite's options and its dev server live in react's `web-app` page, the page a step on the web
  app opens.
- ui-core is no plugin, so its pages (the screen recipe, the voice, the structure rules) are listed
  by `@fcalell/ui-core/manifest` and contributed by both UI plugins; the index writes a page two
  plugins list once. Every listed page exists and every page under `guide/` is listed.
- A page links a page of its own package relatively (`./client.md`) and another package's by the
  path the index uses, `node_modules/@fcalell/<pkg>/guide/<page>.md`, so every link resolves from
  the consumer's root.
- A README keeps install, a pointer to the guide, and the maintainer sections (the plugin's
  implementation, its owned slots); every consumer-facing fact lives on one page.

## Designing screens

A consumer's screens are its own: stack composes no product screen. ui-core's screen recipe
(`packages/ui-core/guide/screen.md`) designs each in code: compose from the contract and roster
installed at the consumer's version (`node_modules/@fcalell/ui-core/DESIGN.md` and `src/roster.ts`,
each entry in `src/roster/<component>.ts`), open the anchor screen the voice page
(`packages/ui-core/guide/voice.md`) pins, draw every state the spec names, then stand the render
beside the anchor screen and ask which looks better; rework until the answer is "ours" or "the
same", and fcalell signs off on the render. There are no artboards.

A consumer works within stack's constraints: a part stack has no exact shape for takes the nearest
one it provides, named as a known limit, never a local workaround that rebuilds stack. Only a bug or
a missing feature the consumer cannot ship without is a gap, so the gap list stays a list of what
matters rather than every polish a render could take. When stack's latest release already has it,
the fix is moving the consumer's version; otherwise the consumer opens an issue on the stack
repository (the CLI's `gap.md`), and only the work that cannot ship without it waits.

## Limits

- The guide index lists a page by its path under the consumer's root `node_modules`, so a package
  whose pages are listed is a direct dependency there: the UI plugins add `@fcalell/ui-core` to the
  consumer's `dependencies` for ui-core's pages.
- Biome 2.4 takes no per-plugin `includes`, no package specifier for a plugin and no `//` in an
  `extends` array. The trigger is a Biome that does (2.5 has the object form of `plugins`): then
  `.stack/biome.json` names `@scope/pkg/file.grit` with its `includes` on the entry, and an app in
  stack's workspace extends `["//", "./.stack/biome.json"]`.
- plugin-react installs `@vitejs/plugin-react` at `^5.2`: 6.x requires vite 8 and
  `@rolldown/plugin-babel`, and plugin-vite is on vite 7. The trigger is moving plugin-vite to
  vite 8.

## In the code

- `packages/cli/src/config.ts`: `defineConfig`, `AppConfig`, `validate`, `getPlugin`.
- `packages/cli/src/lib/install.ts`: the spec kinds by app location, and the install.
- `packages/cli/src/lib/plugin-dependencies.ts`: the dependencies `stack init` and `stack add` write.
- `packages/cli/src/lib/stack-packages.ts`: the first-party package table, its build verdicts, `stackSpec` and the npm or git mode.
- `packages/cli/src/templates/pnpm-workspace.ts`: the merge of stack's install settings into `pnpm-workspace.yaml`.
- `packages/cli/src/commands/init.ts`: the scaffold, including an app inside stack's workspace.
- `packages/cli/src/templates/biome.ts`: the app's `biome.json` and `.stack/biome.json`.
- `packages/cli/src/specs.ts`: the lint plugin spec.
- `packages/cli/src/lib/cli-slots.ts`: `guide`, `lintPlugins`, `lintIgnore`, `workerTsconfig`.
- `packages/cli/src/lib/guide.ts`: `.stack/guide.md`.
- `packages/cli/src/templates/claude-md.ts`: the consumer's `CLAUDE.md` import.
- `packages/cli/src/templates/tsconfig.ts`: the environments a consumer spans and its tsconfig projects.
