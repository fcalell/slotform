# @slotform/cli

Plugin-driven CLI and configuration system for the `slotform` framework. Provides `defineConfig()`, `plugin()`, the slot graph engine, codegen, and the `slotform` binary that scaffolds projects, manages plugins, generates code, and orchestrates dev, build and deploy.

**Binary:** `slotform`

How it is built: [docs/architecture.md](../../docs/architecture.md).

## Install

```bash
pnpm add -D @slotform/cli
```

## Guide

How to build an app on Slotform lives in `guide/`, and each plugin ships its own pages beside it. The CLI's pages are [`provided.md`](./guide/provided.md), [`config.md`](./guide/config.md), [`commands.md`](./guide/commands.md) and [`shortfall.md`](./guide/shortfall.md).

## Exports

| Subpath | Purpose |
|---------|---------|
| `@slotform/cli` | `defineConfig()`, `plugin()`, `slot`, `callback()`, `getPlugin()`, `slotformSpec()`, `SlotformConfig`, `AppConfig`, `PluginConfig`, `ContributionCtx`, `CommandContext`, `CommandDefinition`, `Slot`, `Contribution` |
| `@slotform/cli/cli-slots` | `cliSlots`, the CLI-owned lifecycle slots (`artifactFiles`, `devProcesses`, `buildSteps`, …), and `emitArtifact` |
| `@slotform/cli/slots` | `slot.*` builders and the `Slot`, `Contribution`, `ContributionCtx` types (also on the main entry) |
| `@slotform/cli/graph` | `buildGraph(plugins, ctxFactory)`, the low-level graph engine |
| `@slotform/cli/build-graph` | `buildGraphFromConfig({ config, cwd })`, `buildGraphFromDiscovered()`: validate, discover, collect, then `buildGraph` with the CLI's own contributions. `init`, `add` and `remove` build from the plugins they loaded, every other command from the config |
| `@slotform/cli/css` | CSS escape and validation primitives: `cssString`, `cssUrl`, `cssIdent`, `isCssIdent`, `cssVarName`, `cssTokenValue`, `cssSupportsExpression`, `isCssSupportsExpression`. The shared render boundary both UI plugins wrap with their own label |
| `@slotform/cli/specs` | Spec types: `GeneratedFile`, `ProcessSpec`, `WatcherSpec`, `BuildStep`, `DeployStep`, `DeployCheck`, `PromptSpec`, `DevReadyTask` |
| `@slotform/cli/ast` | TS, TOML and HTML spec types, their printers, `literalToProps` and `dedupeImports` |
| `@slotform/cli/write-artifact` | `writeArtifact`, the atomic, skip-unchanged write `generate` uses |
| `@slotform/cli/discovery` | `discoverPlugins(config, cwd)`, `loadInstalledPlugins(names, cwd)`, `resolveRequiresClosure()`, `validateDependencies()` |
| `@slotform/cli/runtime` | `RuntimePlugin<TName, TDeps, TProvides, TRoutes>` |
| `@slotform/cli/errors` | `SlotformError` and its subclasses: `ConfigLoadError`, `ConfigValidationError`, `StepFailedError`, `MissingPluginError` |
| `@slotform/cli/compiled-source` | Internal: the React Compiler source filter the `react` and `expo` plugins share |

## License

MIT
