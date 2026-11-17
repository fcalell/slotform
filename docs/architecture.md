# Architecture

`@fcalell/stack` is a pnpm monorepo: `packages/` (the core CLI, the design contract and two shared
configs), `plugins/` (one self-contained feature unit per domain) and `apps/` (`showcase`, a private
consumer that renders the roster's Storybook and the foundations and layout pages, and `phone`, a
private native consumer). The CLI owns orchestration and the slot graph; every feature lives in the
plugin that owns its domain ([philosophy](./product.md)). The per-change gate is `pnpm check`
([conventions](./architecture/conventions.md#build-and-exports)). This page lists the packages and
plugins, how they depend on each other, and every architecture page.

## Packages

| Package | Purpose |
|---------|---------|
| [`@fcalell/cli`](../packages/cli) | `defineConfig()`, `plugin()`, `slot.*`, the `stack` CLI, the slot graph engine, codegen |
| [`@fcalell/ui-core`](../packages/ui-core) | The design contract both UI plugins render from: the knob-derived token records, `deriveTheme`, the emit helpers, `words`, `cn()`, the platform-invariant variant matrices and the component roster. Framework-free build-time data |
| [`@fcalell/typescript-config`](../packages/typescript-config) | `tsconfig` presets (`base`, `node-tsx`, `web-vite`) and the `build` emit overlay |
| [`@fcalell/biome-config`](../packages/biome-config) | The shared Biome formatter and linter config |

## Plugins

A **plugin** is a self-contained feature unit built with `plugin()`. Each declares a config schema,
owned slots, slot contributions, optional commands, optional callbacks, and an optional worker
runtime export ([plugin authoring](./architecture/plugin-authoring.md)).

| Plugin | Purpose | Factory |
|--------|---------|---------|
| [`@fcalell/plugin-cloudflare`](../plugins/cloudflare) | The Cloudflare Workers target: renders the wrangler config from what other plugins contribute, runs `wrangler` for dev, types and deploy | `cloudflare()` |
| [`@fcalell/plugin-node`](../plugins/node) | A long-running Node server target: one process serves the API, the built web client and background services, with a typed WebSocket surface | `node()` |
| [`@fcalell/plugin-db`](../plugins/db) | Drizzle ORM clients and runtimes (D1 on cloudflare, SQLite on node), schema tooling, migrations | `db()` |
| [`@fcalell/plugin-auth`](../plugins/auth) | Better Auth integration (email OTP, magic links, OAuth, passkeys, an OAuth authorization server for MCP clients with grant verification and revocation, device keys for headless machines, consumer plugins), RBAC, access control, web and native clients | `auth()` |
| [`@fcalell/plugin-api`](../plugins/api) | The wire: Hono + oRPC, the procedure builder, the worker runtime, the typed client, schema and errors, with no React | `api()` |
| [`@fcalell/plugin-query`](../plugins/query) | The client side of the api: TanStack Query reads and acts over the typed client, the query provider, the org-rules ability, and the port ui-core's read hooks run on | `query()` |
| [`@fcalell/plugin-vite`](../plugins/vite) | The framework-agnostic Vite lifecycle (the providers virtual module) | `vite()` |
| [`@fcalell/plugin-react`](../plugins/react) | React on the web: Vite + React Compiler, TanStack Router file routes, the app entry, providers, and the HTML shell with its `<head>` metadata | `react()` |
| [`@fcalell/plugin-react-ui`](../plugins/react-ui) | The design system on the web: `.stack/app.css` from the ui-core contract on Tailwind v4, fonts, the mode script, words, and the roster components over Base UI | `reactUi()` |
| [`@fcalell/plugin-expo`](../plugins/expo) | Expo and React Native: Metro, the app config, the expo-router entry, the React Compiler in `babel.config.cjs` (the filter is `@fcalell/cli/compiled-source`, shared with plugin-react), EAS commands | `expo()` |
| [`@fcalell/plugin-screens`](../plugins/screens) | The screens workbench: Storybook on the app's own Vite config serves every route in each query state from typed fixtures, answered by MSW in oRPC's wire format, with no backend | `screens()` |
| [`@fcalell/plugin-native-ui`](../plugins/native-ui) | The design system on the phone: the ui-core roster in React Native + Expo + uniwind, the phone layout at every width, fonts, words, native providers | `nativeUi()` |

Each plugin's README holds its config options, commands and runtime exports; its architecture page
below holds how it is built.

## Dependency graph

Cross-plugin dataflow is typed slot imports: plugin A imports `pluginB.slots.foo` and either
contributes to it or derives from it, so A depends on B's package. The graph engine resolves the
topology from those edges ([slot graph](./architecture/slot-graph.md#ordering-by-data)). `requires`
only declares presence, by name or as a one-of, for clearer error messages and for the auto-pull of
`stack init` and `stack add` ([slot graph](./architecture/slot-graph.md#requires)); ordering never
comes from it. Which slots each plugin owns and contributes to is in the
[slot catalog](./architecture/slot-catalog.md).

`@fcalell/cli` and `@fcalell/ui-core` depend on no stack package. Every plugin depends on
`@fcalell/cli`.

| Plugin | `requires` | Other stack packages it depends on |
|--------|------------|------------------------------------|
| `plugin-api` | exactly one of `cloudflare` or `node` (default `cloudflare`); none with `server`, a client of another app's server | none; it never imports a deploy target |
| `plugin-cloudflare` | none | `plugin-api`, `plugin-screens`, `plugin-vite` |
| `plugin-node` | `api` | `plugin-api`, `plugin-query`, `plugin-screens`, `plugin-vite`, `ui-core` |
| `plugin-db` | `api` | `plugin-api`, `plugin-cloudflare`, `plugin-node`, `plugin-screens` |
| `plugin-auth` | `api`, `db` | `plugin-api`, `plugin-cloudflare`, `plugin-db`, `plugin-screens` |
| `plugin-query` | `api` | `plugin-api`, `plugin-react`, `plugin-vite`, `ui-core` |
| `plugin-vite` | none | `plugin-api` |
| `plugin-react` | `vite` | `plugin-vite` |
| `plugin-react-ui` | `react`, `vite` | `plugin-auth`, `plugin-react`, `plugin-screens`, `plugin-vite`, `ui-core` |
| `plugin-screens` | `react`, `api` | `plugin-api`, `plugin-query`, `plugin-react`, `plugin-vite`, `ui-core` |
| `plugin-expo` | none | `plugin-api`, `plugin-cloudflare`, `ui-core` |
| `plugin-native-ui` | `expo`, `api`, `query` (auth is optional) | `plugin-api`, `plugin-auth`, `plugin-expo`, `ui-core` |

A stack package depends on another, never peers on it
([releasing](./architecture/releasing.md#peers-one-copy-of-each-stack-package)).

## Pages

How the CLI works:

- [Slot graph](./architecture/slot-graph.md): how plugins coordinate.
- [Slot catalog](./architecture/slot-catalog.md): the shape of every slot.
- [Plugin authoring](./architecture/plugin-authoring.md): how a plugin is written.
- [Codegen](./architecture/codegen.md): how generated source is built and emitted.
- [Commands](./architecture/commands.md): what each command does, step by step.
- [Consumer project](./architecture/consumer-project.md): the repo a consumer has.
- [Runtime](./architecture/runtime.md): the worker the consumer deploys.

How the repo is kept:

- [Conventions](./architecture/conventions.md): where code goes and how it is named.
- [Releasing](./architecture/releasing.md): what is published and how it is versioned.

The design contract:

- [ui-core](./architecture/ui-core.md): the contract both design systems share.
- [Tokens](./architecture/ui-core/tokens.md): how the theme becomes values.
- [Motion](./architecture/ui-core/motion.md): what moves, and how.
- [Words](./architecture/ui-core/words.md): the words a screen says.
- [Roster](./architecture/ui-core/roster.md): the components and their closed props.
- [Layout](./architecture/ui-core/layout.md): how a screen is laid out.
- [Reads](./architecture/ui-core/reads.md): how a screen reads and waits.
- [Acts](./architecture/ui-core/acts.md): how a screen changes data.
- [Collections and content components](./architecture/ui-core/components.md): the components that hold a collection or a piece of content.
- [Sound](./architecture/ui-core/sound.md): playing audio.
- [Drag](./architecture/ui-core/drag.md): moving things by pointer.
- [Showcase](./architecture/ui-core/showcase.md): where the contract is drawn and enforced.

One page per plugin, what it owns and contributes, its runtime, its generated files and its limits:
[api](./architecture/plugins/api.md), [auth](./architecture/plugins/auth.md),
[cloudflare](./architecture/plugins/cloudflare.md), [db](./architecture/plugins/db.md),
[expo](./architecture/plugins/expo.md), [native-ui](./architecture/plugins/native-ui.md),
[node](./architecture/plugins/node.md), [query](./architecture/plugins/query.md),
[react](./architecture/plugins/react.md), [react-ui](./architecture/plugins/react-ui.md),
[screens](./architecture/plugins/screens.md), [vite](./architecture/plugins/vite.md).
