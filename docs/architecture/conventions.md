# Coding conventions

The rules every package in the repo follows: where a feature belongs, how a package is shaped, built
and exported, the TypeScript and Biome presets, a plugin's folder layout, and the one word per
meaning that names a component's props.

## Where a new feature or config surface belongs

Before any option, type or file is added, its domain's owner is decided. The default answer is **a
plugin, not core**; the rationale is in [philosophy](../product.md).

- **`@fcalell/cli` (core) and `app`.** Core is domain-agnostic and `app` takes only cross-cutting
  identity (`name`, `domain`); the rule, its examples and the quick test are in
  [philosophy](../product.md#features-live-in-the-plugin-that-owns-the-domain-core-stays-domain-agnostic).
- **Plugin options** are the home for domain config. Typography → `reactUi({ fonts })`. API prefix
  → `api({ prefix })`. Drizzle dialect → `db({ dialect })`. The types for those options live in the
  plugin's `src/types.ts`, or beside the plugin that renders them at build time.
- **Runtime data types** (`FontEntry`, design tokens) belong to the plugin that renders or emits
  them at build time; a downstream plugin imports them through its subpath export and re-exports
  them from its own `types.ts` for consumers.
- **Cross-plugin coordination** goes through the slot graph, never through shared core state. If
  plugin A feeds a value into plugin B's codegen, A imports `B.slots.foo` and contributes typed
  payloads. If A reads B's value, A declares a derived slot with `inputs: { foo: B.slots.foo }`.
  Plugins never call into each other's internals at runtime.

Quick test: if removing the feature would require changes to `@fcalell/cli`, the feature is in the
wrong place.

## Package conventions

Each package is small, single-purpose and independently consumable.

A package exports its public API through subpath exports in `package.json`, never a barrel index
that re-exports everything. Code Node runs imports its own modules by relative path with the `.ts`
extension: the build rewrites relative specifiers only, so a `#` import would reach the consumer as
a `.ts` path. `#` hash imports stay in bundler-compiled code (`src/ui/`).

A package depends on a sibling `@fcalell/*` package with `workspace:^`
([releasing](./releasing.md#the-version-rule)); an app uses `workspace:*`.

A TypeScript config extends `@fcalell/typescript-config` and never defines compiler options of its
own.

## Build and exports

A package ships JavaScript for everything Node runs, because Node refuses to strip types under
`node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`) and has no flag for it. Its
`tsconfig.build.json` extends its own `tsconfig.json` plus `@fcalell/typescript-config/build.json`
([TypeScript presets](#typescript-presets)). Its scripts:

- `"build": "tsc -p tsconfig.build.json"`;
- `"prepare": "node ../../scripts/prepare.ts"`, which builds a checkout's install
  ([releasing](./releasing.md#prepare-script));
- `clear`, which removes `dist`.

Its `files` lists `dist` and `src`, and the `guide`, `templates` or `lint` the package ships, never
a test or a `tsconfig` ([releasing](./releasing.md#what-is-published)).

Each `exports` entry a bundler compiles (`.tsx`, `.css`, anything under `src/ui/`) points at source;
every other entry is `{ "types": "./dist/<path>.d.ts", "default": "./dist/<path>.js" }`. A source
entry reaches a sibling module that also ships compiled through the package's own name, never a
relative path, or the bundle holds two copies of that module. An entry's target is one string, never
an array: a bundler takes an array's first target whether or not the file exists, where tsc tries
each, so an array type-checks and fails the consumer's build. A source entry names one module
(`"./lib/toast": "./src/ui/lib/toast.ts"`), never a pattern. Vite's dev optimizer skips a `.tsx`
entry unless told otherwise, so plugin-vite's generated config adds `.tsx` to
`optimizeDeps.extensions`.

A sibling `@fcalell/*` import resolves through its `exports`, so type-checking needs the
dependencies' `dist`: turbo runs `^build` before `check-types`, and the package's own `build` before
its `check-types` (a source entry's self-name import). Root `pnpm check` is `turbo run check-types`,
`turbo run test`, then `biome check`; it is read-only, and `pnpm lint` writes the fixes. A package
has no `check` or `lint` script of its own: the root runs both. An app's `check-types` depends on
its `generate` (the `.stack/` files), not its `build`, so the gate never runs a production bundle;
`pnpm build` does. The showcase's `generate` also writes the roster's stories, so the gate
type-checks the stories the roster names.

Each turbo task declares only what it writes. An app's `tsc -b` emits the worker's declarations into
`.stack/types/`, so `generate` and `build` exclude that folder from their `.stack/**` output and
`check-types` declares it: a cached `generate` that archived it would restore old declarations over
new ones.

## TypeScript presets

`@fcalell/typescript-config` ships four files. A package or app extends one preset in its
`tsconfig.json`, and a package layers `build.json` on it for its emit:

```json
{
  "extends": "@fcalell/typescript-config/node-tsx.json",
  "include": ["src"]
}
```

```json
// tsconfig.build.json
{
  "extends": ["./tsconfig.json", "@fcalell/typescript-config/build.json"]
}
```

- **`base.json`**, the foundation every other preset extends: `strict`, `isolatedModules`,
  `skipLibCheck`, `target: ES2022`, `module: node18`, `moduleResolution: node16`,
  `noUncheckedIndexedAccess`, and `incremental` with its build info under
  `node_modules/.cache/tsc/`, so a re-check reads only what changed.
- **`node-tsx.json`**, type-checking for Node packages and consumers: `base.json` plus
  `module: esnext`, `moduleResolution: bundler`, `noEmit`, `allowImportingTsExtensions`.
- **`web-vite.json`**, type-checking for a web app Vite bundles (the consumer app `stack init`
  writes when `vite` is in the config): `base.json` plus `lib: ESNext, DOM, DOM.Iterable`,
  `module: esnext`, `moduleResolution: bundler`, `jsx: react-jsx`, `noEmit`,
  `allowImportingTsExtensions`.
- **`build.json`**, the emit overlay a package's `tsconfig.build.json` layers on its own
  `tsconfig.json`. It extends nothing, so the package keeps its `lib` and `jsx`.
  - `rootDir: src`, `outDir: dist`, `include: src`; `src/ui`, `.tsx`, test files and `__fixtures__`
    stay out (bundlers compile the first two from source).
  - `module: nodenext`, `moduleResolution: nodenext`: an extensionless relative import fails the
    build.
  - `rewriteRelativeImportExtensions`: sources import with `.ts`, output imports `.js`.
  - `declaration`, `declarationMap`, `sourceMap`, `verbatimModuleSyntax`, `isolatedModules`.
  - `incremental: false`: a build always emits, so a removed `dist` comes back whatever the build
    info says.

## Biome preset

`@fcalell/biome-config` ships `shared.json`, which a `biome.json` extends:

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": ["@fcalell/biome-config/shared.json"]
}
```

The `$schema` path is the installed Biome's own, so it never lags the version. Biome also reads the
repo's `.editorconfig`, which `stack init` writes. A stack app's `biome.json` also extends
`./.stack/biome.json`, which `stack generate` writes with the lint rules the app's plugins ship
(`@fcalell/plugin-react-ui`'s web rules); the preset ships no rule of its own, because a rule
belongs to the domain it enforces ([consumer project](./consumer-project.md#lint)).

What `shared.json` configures:

- **Formatter:** on, tab indentation; the CSS formatter on.
- **Linter:** on with the default rules, `noThenProperty` off, and `useValidAriaRole` an error that
  skips non-DOM components (`ignoreNonDom`), so React Native's `role` props pass.
- **Plugins:** none. Biome resolves a plugin path against the root config's directory, not the
  extending file, so a shared preset cannot carry one; the plugins ride `.stack/biome.json`.
- **CSS:** Tailwind directives parse.
- **Imports:** organized by the `organizeImports` assist.
- **VCS:** git, so every `.gitignore` entry is excluded.
- **Excluded paths:** `dist`, `build`, `node_modules`, `.turbo`, `.wrangler`, `.output`, `.stack`,
  `.claude/worktrees`, `storybook-static`, `coverage`, `routeTree.gen.ts`, `*.d.ts`.

A `files.includes` of the extending config's own overrides that list, so it restates `**` and
`!**/*.d.ts` beside its own exclusions; `.stack/biome.json` skips generated sources with an
override, never an `includes`, so it needs none.

An app below the root config that extends it (`"extends": ["../../biome.json"]`) loses
`useValidAriaRole`'s `ignoreNonDom`, because Biome drops a rule's options through the second hop,
so a component prop named `role` is flagged there. Stack's components name that prop otherwise
(`Text kind`).

## Plugin folder structure

Each plugin lives in `plugins/<name>/` and is published as `@fcalell/plugin-<name>`.

```
plugins/<name>/
  src/
    index.ts              ← plugin() result (main export ".")
    types.ts              ← shared option types
    node/                 ← Node.js only: codegen aggregators, CLI helpers
    worker/               ← Cloudflare Workers only: runtime (exported as "./runtime")
  templates/              ← lintable on-disk templates (scaffolded by ScaffoldSpec contributions)
```

`worker/` files never import from `node/`, and `node/` files never import from `worker/`.

A plugin whose runtime is a consumer-run Node server (plugin-node) splits the same way with
`server/` (the Node runtime, exported as `./server`), `client/` (browser code) and `ws/` (the
isomorphic shared contract): `node/` (codegen) and `server/` never import each other, and `client/`
and `server/` share only `ws/`.

A runtime, if any, is exported from the `./runtime` subpath; the CLI discovers it by checking the
package's `exports`. A runtime factory takes plain options, not `PluginConfig`.

The config factory's name matches the plugin's name: `db()`, `auth()`, `api()`, `react()`,
`expo()`, `nativeUi()`. A third-party plugin published outside the `@fcalell/plugin-*` namespace
passes an explicit `package` option; a first-party plugin omits it
([plugin authoring](./plugin-authoring.md#plugin-discovery)).

`stack plugin init` scaffolds this shape for a third-party author, publishable as-is: subpath
exports for `.` and `./runtime`, no barrel index. Inside stack's own workspace it takes each stack
package from the workspace, as `stack init` does for an app
([commands](./commands.md#plugin-subcommands)).

## Naming a component's props

One word per meaning across both UI plugins and every ui-core descriptor, so a screen reads the same
whichever component it fills. A new prop or descriptor field takes the word its meaning already has
here, and a meaning without a word here gets one in this list in the same change. No prop is called
`meta`: five meanings (a row's facts, a message's provenance, a stat's sentence, a canvas node's
line and a type role) each have their own word. A text role keeps `meta` (the type scale's name,
`text({ role: "meta" })`); a prop never does.

| Word | Names | Type |
| --- | --- | --- |
| `facts` | A list of typed facts, in the order given, each one fact: a row's, a message detail row's, a record head's | `readonly Fact[]` on a row and a message detail row; `readonly Datum<RecordFact>[]` on a record head. The platform widens a row's list, and each fact in it, to a `Datum` |
| `line` | The one text under a name: a canvas node's, a stat's, a picker option's, a picker `option` slot, and a row's sentence (a remedy, a schedule, an error: a sentence is a row's `line`, never a fact) | `string`; `Run \| Runs` on a row and a message detail row, whose text holds code or strong runs. The platform widens a row's to a `Datum` |
| `overline` | The text over a name: a canvas node's, a record head's parts | `string`; `readonly Datum<Run>[]` on a record head |
| `from` | Where a message came from, a text line before its time | `Runs` |
| `warning` | What is wrong. A fact `{ warning }`, a canvas node's, a table row slot's | `string` |
| `blocked` | Why it cannot be done: an act's, a link's, an option's, a tick's, a table row's, a confirmation's | `string` |
| `lock`, `locked` | Why it cannot change here: a row's `lock`, a field's `locked`, a table's `locked` columns | `string \| Lock` on a row; `string` on a field |
| `missing` | The sentence a Pane says when its read answers not found | `string` |
| `selected` | What is open beside it: a row's (the open record), a chart bar's | `boolean`; on a bar, `(item) => boolean` |
| `partial` | A chart bar whose period is not over | `(item) => boolean` |
| `leading`, `trailing` | The start and the end slot of a row. A picker option has the start slot too | `RowLeading`, `RowTrailing`; `OptionLeading` (the kinds a picker draws) on an option |
| `status` | A work state: its tone's mark and its word | `StatusMark`, `{ tone, label? }` everywhere: a fact, a row's title and leading, a table cell, a canvas node |
| `chip` | A data value's tag | `ChipMark`, `{ family, label }` |
| `acts` | A list of acts: an action bar's, a form's, a gate's, a pane's bar's (its first stands, the rest fold into `more`) | `Act[]`; `readonly Datum<IconAct \| IconLinkAct>[]` on a pane |
| `label` | The words of a mark or an act; the accessible name where only a glyph draws | `string` |
| `description` | A paragraph that explains: a field's, a section's, a sheet's, a gate's | `string`, or `Runs` on a gate |

A list of facts holds the base `Fact` (words, a status, a chip, `{ warning }`, a boolean mark
`RowMark`); a record head's `RecordFact` is the base plus what only a head acts on (words that open
or go, a pick, a count beside its word). The kinds are told apart by their keys, never a tag, and
`splitFacts` (`@fcalell/ui-core/list-state`) is the one reading of a list for a component's
drawing. A string is one fact whatever it holds: a middle dot inside it is text, so a list that
wants two facts gives two elements. A fact is a badge cut with an ellipsis where its line is out of
room, which touch cannot read, so it is short; a sentence is the row's `line`. Whatever changes what
a row does (`lock`, `href`, `act`) is a prop, not a fact.

## In the code

- `packages/typescript-config/`: `base.json`, `node-tsx.json`, `web-vite.json`, `build.json`.
- `packages/biome-config/shared.json`: the Biome preset.
- `turbo.json`, `apps/*/turbo.json`: the task graph and each task's outputs.
- `scripts/prepare.ts`: the packages' `prepare`.
- `packages/cli/src/commands/plugin.ts`: the third-party plugin scaffold.
