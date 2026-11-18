# @fcalell/plugin-vite

Framework-agnostic Vite lifecycle plugin for the `@fcalell/stack` framework. Renders `.stack/vite.config.ts` from what other plugins contribute, runs the consumer's Vite for dev and build, and provides the `virtual:stack-providers` module used by the generated app entry and the `virtual:stack-schema` module a `Form` derives its fields from. Required by any framework plugin that runs a Vite dev/build pipeline; list it explicitly alongside the framework plugin in your `stack.config.ts`.

**Stack:** Vite (internal -- consumers don't import it)

How it is built: [docs/architecture/plugins/vite.md](../../docs/architecture/plugins/vite.md).

## Install

```bash
stack add vite
```

The consumer declares `vite` itself (an optional peer of the plugin, and its `devDependencies`, which `stack init` writes): the generated config imports it, and the dev process and the build step run the consumer's own bin, resolved from its directory, so no PATH or registry lookup stands in.

## Guide

The consumer-facing options (`port`, `restart`, `maxRestarts`), the dev server and its API proxy
live in plugin-react's [`web-app.md`](../react/guide/web-app.md), indexed into a consumer's
`.stack/guide.md`: `react()` is the one plugin that runs on Vite, so a consumer meets `vite()`
there.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-vite` | `vite()`, `ViteOptions`, `AppPlugin`, `ServerProxyEntry` |
| `@fcalell/plugin-vite/preset` | `providersPlugin()`, `schemaPlugin()`, `excludedImportsPlugin()` |
| `@fcalell/plugin-vite/node` | `renderViteConfig()`, `ViteConfigValues`, `ServerProxyEntry` |
| `@fcalell/plugin-vite/csp` | `scriptHash()`, `allowScript()`, `mergeCsp()`, `mergeClientHeader()`, `headerKey()` |

## License

MIT
