# @slotform/vite

Framework-agnostic Vite lifecycle plugin for the `slotform` framework. Renders `.slotform/vite.config.ts` from what other plugins contribute, runs the consumer's Vite for dev and build, and provides the `virtual:slotform-providers` module used by the generated app entry and the `virtual:slotform-schema` module a `Form` derives its fields from. Required by any framework plugin that runs a Vite dev/build pipeline; list it explicitly alongside the framework plugin in your `slotform.config.ts`.

**Stack:** Vite (internal -- consumers don't import it)

How it is built: [docs/architecture/plugins/vite.md](../../docs/architecture/plugins/vite.md).

## Install

```bash
slotform add vite
```

The consumer declares `vite` itself (an optional peer of the plugin, and its `devDependencies`, which `slotform init` writes): the generated config imports it, and the dev process and the build step run the consumer's own bin, resolved from its directory, so no PATH or registry lookup stands in.

## Guide

The consumer-facing options (`port`, `restart`, `maxRestarts`), the dev server and its API proxy
live in the `react` plugin's [`web-app.md`](../react/guide/web-app.md), indexed into a consumer's
`.slotform/guide.md`: `react()` is the one plugin that runs on Vite, so a consumer meets `vite()`
there.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@slotform/vite` | `vite()`, `ViteOptions`, `AppPlugin`, `ServerProxyEntry` |
| `@slotform/vite/preset` | `providersPlugin()`, `schemaPlugin()`, `excludedImportsPlugin()` |
| `@slotform/vite/node` | `renderViteConfig()`, `ViteConfigValues`, `ServerProxyEntry` |
| `@slotform/vite/csp` | `scriptHash()`, `allowScript()`, `mergeCsp()`, `mergeClientHeader()`, `headerKey()` |

## License

MIT
