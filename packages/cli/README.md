# @fcalell/cli

Plugin-driven CLI and configuration system for the `@fcalell/stack` framework. Provides `defineConfig()`, `plugin()`, the slot graph engine, codegen, and the `stack` binary that scaffolds projects, manages plugins, generates code, and orchestrates dev, build and deploy.

**Binary:** `stack`

How it is built: [docs/architecture.md](../../docs/architecture.md).

## Install

```bash
pnpm add -D @fcalell/cli
```

## Guide

How to build an app on stack lives in `guide/`, and each plugin ships its own pages beside it. The CLI's pages are [`provided.md`](./guide/provided.md), [`config.md`](./guide/config.md), [`commands.md`](./guide/commands.md) and [`shortfall.md`](./guide/shortfall.md).

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/cli` | `defineConfig()`, `plugin()`, `slot`, `callback()`, `getPlugin()`, `stackSpec()`, `StackConfig`, `AppConfig`, `PluginConfig`, `ContributionCtx`, `CommandContext`, `CommandDefinition`, `Slot`, `Contribution` |
| `@fcalell/cli/cli-slots` | `cliSlots`, the CLI-owned lifecycle slots (`artifactFiles`, `devProcesses`, `buildSteps`, …), and `emitArtifact` |
| `@fcalell/cli/slots` | `slot.*` builders and the `Slot`, `Contribution`, `ContributionCtx` types (also on the main entry) |
| `@fcalell/cli/graph` | `buildGraph(plugins, ctxFactory)`, the low-level graph engine |
| `@fcalell/cli/build-graph` | `buildGraphFromConfig({ config, cwd })`, `buildGraphFromDiscovered()`: validate, discover, collect, then `buildGraph` with the CLI's own contributions. `init`, `add` and `remove` build from the plugins they loaded, every other command from the config |
| `@fcalell/cli/css` | CSS escape and validation primitives: `cssString`, `cssUrl`, `cssIdent`, `isCssIdent`, `cssVarName`, `cssTokenValue`, `cssSupportsExpression`, `isCssSupportsExpression`. The shared render boundary both UI plugins wrap with their own label |
| `@fcalell/cli/specs` | Spec types: `GeneratedFile`, `ProcessSpec`, `WatcherSpec`, `BuildStep`, `DeployStep`, `DeployCheck`, `PromptSpec`, `DevReadyTask` |
| `@fcalell/cli/ast` | TS, TOML and HTML spec types, their printers, `literalToProps` and `dedupeImports` |
| `@fcalell/cli/write-artifact` | `writeArtifact`, the atomic, skip-unchanged write `generate` uses |
| `@fcalell/cli/discovery` | `discoverPlugins()`, `loadInstalledPlugins(names)`, `resolveRequiresClosure()`, `validateDependencies()` |
| `@fcalell/cli/runtime` | `RuntimePlugin<TName, TDeps, TProvides, TRoutes>` |
| `@fcalell/cli/errors` | `StackError` and its subclasses: `ConfigLoadError`, `ConfigValidationError`, `StepFailedError`, `MissingPluginError` |
| `@fcalell/cli/compiled-source` | Internal: the React Compiler source filter plugin-react and plugin-expo share |

## License

MIT
