# plugin-vite

`@fcalell/plugin-vite` owns the Vite lifecycle, framework-agnostic: it renders
`.stack/vite.config.ts` from what other plugins contribute, runs the consumer's own `vite` for dev and
build, serves the `virtual:stack-providers` and `virtual:stack-schema` modules, and owns the headers
every response of the web client's host carries. This page holds how the config is rendered, the dev
server's proxy, file access and watching, the Content-Security-Policy merge, singletons and the dev
optimizer. The consumer-facing options are plugin-react's guide
([`vite()` options](../../../plugins/react/guide/web-app.md#vite-options)); the slots are in the
[slot catalog](../slot-catalog.md#viteslots-plugin-vite).

## How it works

`vite.slots.configImports` and `vite.slots.pluginCalls` are the contribution surfaces: a framework
plugin injects its Vite plugins by contributing into them, and `vite.slots.viteConfig`, a derived
slot, aggregates everything into `.stack/vite.config.ts`. It is null with no plugin call and no
import, so a config without Vite never writes an empty file. plugin-vite then contributes a
`vite dev` process and a `vite build` step ([Lifecycle contributions](#lifecycle-contributions)).

Contributions are typed AST specs, `TsImportSpec` for imports and `TsExpression` for plugin calls
([Spec types](../slot-catalog.md#spec-types)), so a plugin author never concatenates source strings:

```ts
import { vite } from "@fcalell/plugin-vite";
import type { TsExpression, TsImportSpec } from "@fcalell/cli/ast";

contributes: [
  vite.slots.configImports.contribute(
    (): TsImportSpec => ({ source: "framework-plugin", default: "frameworkPlugin" }),
  ),
  vite.slots.pluginCalls.contribute(
    (): TsExpression => ({
      kind: "call",
      callee: { kind: "identifier", name: "frameworkPlugin" },
      args: [],
    }),
  ),
],
```

plugin-vite contributes its own plugin calls the same way: `providersPlugin()`, `schemaPlugin()` and
`excludedImportsPlugin()` from `@fcalell/plugin-vite/preset`. The order of plugin calls does not
matter for the plugins contributed (the framework, Tailwind, the theme fonts, the providers), so
`pluginCalls` sorts by callee identifier name and the emitted array is deterministic.

`renderViteConfig` (`src/node/codegen.ts`) renders a Vite config module from the resolved values of
`vite.slots.*`. `.stack/vite.config.ts` is its output for the app's own slot values; a host that
needs another variant (no `clientHeaders`, extra plugin calls) resolves the slots itself, adjusts the
values and renders them there. The renderer imports what its own output uses (`defineConfig`,
`fileURLToPath` for `root`, `searchForWorkspaceRoot` for `fsAllow`); a contribution declares every
import its expression needs, and the renderer merges them by source
([Import merge](../codegen.md#import-merge)).

The consumer declares `vite` (the plugin's `devDependencies`) and its generated config imports it,
so the one Vite that runs is the consumer's, resolved from its own directory: no PATH or registry
lookup stands in. The bin is not an exported subpath, so it is read from the package's manifest.

## App-only plugin calls

`vite.slots.appPlugins` holds a plugin call only the app's own config runs, with the imports it
needs. A host that draws the app's components in its own Vite (Storybook's roster) renders
`pluginCalls` alone, so a call the app needs and such a host must not run (the route-tree generator,
React Refresh's policy) goes here. It is rendered ahead of `pluginCalls`, which is how the router
plugin runs before `react()` ([Router plugin](./react.md#router-plugin)). Only `viteConfig` reads it;
a host that draws routes reads the slot that owns the call.

## Lifecycle contributions

| `cliSlots` slot | Behavior |
|-----------------|----------|
| `artifactFiles` | Writes `.stack/vite.config.ts` from `vite.slots.viteConfig` |
| `devProcesses` | Spawns the consumer's `vite dev --config .stack/vite.config.ts`; the port is the generated config's `server.port` |
| `buildSteps` | `vite build --config .stack/vite.config.ts` (`main` phase), into the config's `build.outDir`, `dist/client` |

`vite.slots.outDir` is the client build's output directory, relative to the project root. It is
seeded null and filled by vite's own contribution, so a reader without vite in the config sees null.
The build step passes no `--outDir`: the generated config's `build.outDir` is the one source, and a
relative CLI flag would resolve against `config.root` (`.stack`) and move the output to
`.stack/dist/client`.

plugin-vite also contributes its dev server's localhost origin to `api.slots.devCorsOrigins`, so the
auth and worker CORS allow-list picks up the dev server without consumer config
([local and dev origins](./api.md#local-and-dev-origins)).

### Dev server port

The generated `.stack/vite.config.ts` is the one source of the dev port: a `--port` on the dev
process would let the CLI flag shadow the codegen value. The dev process passes `defaultPort` for the
supervisor to introspect (logging, the `EADDRINUSE` classification fallback) and an `onExit` hook
that prints a next step on a port collision ([Command steps](../commands.md#command-steps)).

## Dev server proxy, file access and watching

- **Proxy.** `vite.slots.serverProxy` holds the dev server's proxy rules, rendered into
  `server.proxy`. A deploy target contributes its worker-owned paths: cloudflare proxies them to
  `wrangler dev` and node to its own server, so the RPC and auth clients keep their relative URLs in
  dev exactly as in production and the session cookie is first-party. Each target's rule is inert
  without vite in the config.
- **File access.** `vite.slots.fsAllow` holds extra `server.fs.allow` path expressions. A plugin that
  serves assets out of its own package (fonts, icons) contributes the expression resolving its real
  location, so a workspace-linked stack checkout still serves them in dev: Vite answers 403 for paths
  outside the consumer's workspace root.
- **Watching.** `vite.slots.watchIgnored` holds globs the dev server's watcher skips, rendered into
  `server.watch.ignored`. A plugin whose tool writes scratch files under Vite's root (`.stack/`)
  contributes their glob, so those writes never reach Vite's hot-update handling, where a plugin hook
  may answer an unknown file with a full reload.

## Content-Security-Policy

`vite()` has no CSP option. A consumer's own plugin, in `stack.config.ts`, contributes a policy to
`vite.slots.clientHeaders`, and it is merged with vite's default `frame-ancestors 'none'`:

```ts
import { defineConfig, plugin } from "@fcalell/cli";
import { vite } from "@fcalell/plugin-vite";

// `package` points the CLI at this file, which exports the plugin as `csp`.
export const csp = plugin("csp", {
  label: "Content-Security-Policy",
  package: "./stack.config.ts",
  contributes: [
    vite.slots.clientHeaders.contribute(() => ({
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; img-src 'self' data: https:",
    })),
  ],
});

export default defineConfig({
  app: { name: "my-app", domain: "my-app.example" },
  plugins: [vite(), csp() /* , the rest */],
});
```

Two contributions of one header combine only for `Content-Security-Policy`, per directive: every
directive any of them names is kept, in first-seen order, and the sources of a directive several name
are unioned in first-seen order. `'none'` survives only where every contribution says `'none'`
(beside real sources it drops), so the policy above still carries `frame-ancestors 'none'`. Any other
header two plugins set throws. The policy reaches the dev server, cloudflare's `_headers` and node's
static server as one string. `src/node/csp.ts` holds the merge and, beside it, what a plugin allows
its inline script with; it is pure, so the rules are tested without a graph. The two inline scripts
allowed by hash are [Mode script and CSP](./react-ui.md#mode-script-and-csp) and
[Dev CSP and React Refresh](./react.md#dev-csp-and-react-refresh).

## Preset

The `./preset` subpath exports the node-side Vite plugins the generated config runs:

- `providersPlugin(opts?)` resolves `virtual:stack-providers` to the generated
  `.stack/virtual-providers.tsx` when plugins have contributed providers, or to a pass-through stub
  otherwise. plugin-vite is framework-agnostic, so the stub imports no framework runtime: the
  consumer's JSX transform compiles `props.children` with whatever pragma is active (React,
  Preact).
- `schemaPlugin(opts?)` resolves `virtual:stack-schema` to the generated `.stack/schema.ts`: each
  procedure's input as JSON Schema, written by `stack generate`, which a `Form` derives its fields
  from ([Schema](./api.md#schema)). Before the first generate, or without plugin-api, it is an empty
  record.
- `excludedImportsPlugin()` ([Singletons and the optimizer](#singletons-and-the-optimizer)).

## Singletons and the optimizer

- **Dedupe.** `vite.slots.resolveDedupe` holds bare specifiers rendered into `resolve.dedupe`. A
  plugin whose runtime must be a singleton (a framework runtime) contributes its specifiers, so every
  importer, the consumer's own code and workspace-linked plugin checkouts alike, resolves the one copy
  under the consumer's root, and no second copy reaches the production bundle. Two plugins naming the
  same specifier is harmless (the codegen de-duplicates), so the slot has no `uniqueBy`.
- **Exclude.** `vite.slots.optimizeExclude` holds package names rendered into
  `optimizeDeps.exclude`. A package installed under `node_modules` (by git or npm, not `link:`) that
  imports a virtual module a Vite plugin of this config serves is pre-bundled by the dev optimizer,
  which runs Rolldown without those plugins and fails to resolve the import, so the plugin serving the
  module contributes the importer here.
- **Include.** The optimizer's scan stops at a package in `optimizeDeps.exclude`, so what that
  package imports is found when a page first loads it, bundled then, and the page reloads (a screens
  run fails on "Vite unexpectedly reloaded a test"). `excludedImportsPlugin` adds those imports to
  `optimizeDeps.include` by reading the packages: from each one's raw source exports (`./src/*.ts(x)`,
  the reason it is served raw), through the files they import, to the bare specifiers they reach, so
  the list cannot go stale.
- **UI source.** Stack's UI subpaths export `.tsx` source, and Vite's dev optimizer pre-bundles only
  `.js` and `.ts` entries: unbundled, their CJS dependencies (`use-sync-external-store/shim` under
  `@base-ui/react`) reach the browser raw and the page renders blank, so the rendered config sets
  `optimizeDeps.extensions` to `[".tsx"]`.

## In the code

- `plugins/vite/src/index.ts`: the plugin, its slots, its plugin calls and its lifecycle contributions.
- `plugins/vite/src/types.ts`: `ViteOptions`, `AppPlugin`, `ServerProxyEntry` and the rendered values.
- `plugins/vite/src/node/codegen.ts`: `renderViteConfig`.
- `plugins/vite/src/node/csp.ts`: the `clientHeaders` merge.
- `plugins/vite/src/node/preset.ts`: `providersPlugin`, `schemaPlugin`.
- `plugins/vite/src/node/excluded.ts`: `excludedImportsPlugin`.
- `plugins/node/src/index.ts`, `plugins/cloudflare/src/index.ts`: each target's proxy rule.
