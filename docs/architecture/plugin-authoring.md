# Plugin authoring

How a plugin is written: the rules it follows, the `plugin()` contract, its options, callbacks,
contributions and derivations, templates, how the CLI finds it, and the checklist before it ships.
The slot kinds and their semantics are in [slot graph](./slot-graph.md); every slot a plugin can
use is in [slot catalog](./slot-catalog.md).

## Design paradigm

A plugin takes a domain (db, auth, UI) and makes it invisible to the consumer.

- **Automate by default.** If the plugin can generate, infer, default or auto-wire a value, it does,
  and exposes no option. The target is zero hand-written glue in the consumer's repo. A new
  consumer-facing option is the last resort, and every option has a sensible default.
- **Contribute, don't coordinate.** A plugin talks to the slot graph, never to other plugins. To
  hand a value to plugin B, it contributes to one of B's slots (`B.slots.foo.contribute(fn)`). To
  read a value from plugin B, it declares a derived slot with `inputs: { foo: B.slots.foo }`. It
  never imports another plugin's internals at runtime and never calls into another plugin's
  functions to coordinate timing.
- **Speak the shared contract.** `plugin()`, `slot.*`, `ContributionCtx`, typed payloads and AST
  specs are the only surface. No sibling mechanism (custom file formats, plugin-to-plugin hooks,
  globals). A third-party plugin shipped outside this repo does everything a first-party plugin
  does with the same interface.
- **Own the domain end to end.** Where a feature or option belongs, plugin or core, is decided by
  [conventions](./conventions.md#where-a-new-feature-or-config-surface-belongs).

## The `plugin()` contract

One factory, no register function:

```ts
import { plugin, slot, callback } from "@fcalell/cli";

export const auth = plugin("auth", {
  label: "Authentication",
  package: undefined,            // default: `@fcalell/plugin-${name}`. Override for third-party.

  schema: authOptionsSchema,     // Zod schema: validates options and pins TOptions

  requires: ["api", "db"],       // presence-only sibling plugins

  callbacks: {
    sendOTP: callback<{ email: string; code: string }>(),
    // Second type argument = the handler's return type. Defaults to
    // `void | Promise<void>`; declare it when the framework reads the value
    // synchronously instead of awaiting the call.
    generateOTP: callback.optional<{ email: string }, string | undefined>(),
  },

  commands: {
    push: { description: "Push schema", handler: async (ctx, flags) => { /* ... */ } },
  },

  dependencies: { "better-auth": "1.7.25" },                   // auto-wired into cliSlots.initDeps
  devDependencies: { /* ... */ },                            // auto-wired into cliSlots.initDevDeps
  gitignore: [".wrangler"],                                  // auto-wired into cliSlots.gitignore
  guide: [{ page: "sessions", trigger: "Reading the signed-in user" }], // auto-wired into cliSlots.guide

  slots: {
    runtimeOptions: /* slot.derived(...) */,
  },

  contributes: (self) => [
    /* ... Contribution<T>[] ... */
  ],
});
```

The returned `auth` is both a config factory (`auth({ cookies: { prefix: "myapp" } })`) and a
namespace with `.slots`, `.cli`, `.requires` and `.package`. The call is generic over its input
(`<const I extends TOptions>`): the entry it returns carries the validated `options` and, type-only,
the caller's literal input as `__input`, so a type derived from the config reads what was configured
(`InferSession<typeof config>` reads `organization: true`, not the resolved union). An option key
the schema does not declare fails type-checking. When `callbacks` is declared, the factory also
exposes `.defineCallbacks(impl)` ([typed callbacks](#typed-callbacks)).

Fields:

- `label`: the human label in the CLI picker.
- `package`: the npm package name ([plugin discovery](#plugin-discovery)).
- `schema`: the Zod schema for the plugin's options ([options via `schema`](#options-via-schema)).
- `requires`: presence-only sibling plugins, a list or a function of the plugin's resolved options.
  What an entry means is in [slot graph](./slot-graph.md#requires); how `stack init` and
  `stack add` pull what is missing is in
  [commands](./commands.md#installing-the-requires-closure).
- `slots`: the slots this plugin owns, exposed on the factory as `.slots` so other plugins can
  contribute or derive.
- `contributes`: an array, or `(self) => array`, of `Contribution`s built with
  `someSlot.contribute(fn)`. `self` carries the plugin's own slots and typed options, so the plugin
  references them with no forward reference and without stamping its name on every slot
  declaration.
- `commands`: subcommands routed as `stack <plugin> <command>`
  ([commands](./commands.md#plugin-subcommands)).
- `callbacks`: typed callback slots for consumer callback files.
- `dependencies`, `devDependencies`, `gitignore`: the plugin's footprint, auto-wired into
  `cliSlots.initDeps`, `cliSlots.initDevDeps` and `cliSlots.gitignore`, and into the matching
  `cliSlots.removeDeps` and `cliSlots.removeDevDeps` for cleanup. The CLI writes the plugin's own
  package; a first-party package the consumer needs beside it takes its spec from the CLI's table,
  `"@fcalell/ui-core": stackSpec("@fcalell/ui-core")` (`stackSpec` from `@fcalell/cli`).
- `guide`: the plugin's guide pages, each `guide/<page>.md` in its package (listed in its `files`)
  with a load trigger: when to open the page, never a summary of what it holds. Auto-wired into
  `cliSlots.guide` under the plugin's name as the domain and its package. The index the CLI writes
  from it is in [consumer project](./consumer-project.md#the-guide).

A guide page is directive prose of about 600 words at most, with code examples. A recipe's every
step names the page it needs and ends with its check. A page names roles, never a tool or a
mechanism. A fact lives on one page, and the README keeps install, a pointer to the guide and the
maintainer sections.

## Options via `schema`

A plugin declares its options as a Zod schema. `plugin()` parses the caller's options through it,
applies the defaults, and throws `StackError("PLUGIN_CONFIG_INVALID")` on invalid input. The
schema's input type (`z.input<typeof schema>`) is `TOptions`, the call signature; its output type
(`z.output<typeof schema>`, defaults applied) is `TResolvedOptions`, so every schema default is
present wherever the plugin reads its own options:

- command handlers through `ctx.options`;
- contribution functions through `self.options`, with no cast;
- a module-level `slot.derived` or `slot.value`, declared before `plugin()` where `self` is out of
  scope, by annotating its `compute` or `seed` ctx: `ctx: ContributionCtx<XOptions>`.

A plugin never redeclares either shape.

`ContributionCtx<TOptions>` defaults `TOptions` to `unknown`, and a raw contribution ctx keeps it:
a cross-plugin contribution runs with the contributing plugin's options, so no single type is
sound there. The CLI stamps each contribution with the plugin whose `contributes` declared it, so a
contribution from db to `cloudflare.slots.bindings` sees db's options, never cloudflare's. A
slot's own `seed` and `compute` always run with the owning plugin's options.

```ts
// plugins/<name>/src/types.ts
import { z } from "zod";
export const authOptionsSchema = z.object({
  cookies: z.object({ prefix: z.string().optional() }).optional(),
  secretVar: z.string().default("AUTH_SECRET"),
});
export type AuthOptions = z.input<typeof authOptionsSchema>;
```

A plugin with no options omits `schema`.

## Typed callbacks

A plugin declares callback shapes with `callback<T>()` or `callback.optional<T>()`, and its factory
provides `defineCallbacks()` for the consumer's callback file:

```ts
// Plugin definition
export const auth = plugin("auth", {
  callbacks: {
    sendOTP: callback<{ email: string; code: string }>(),
    sendInvitation: callback.optional<{ email: string; orgName: string }>(),
  },
  // ...
});

// Consumer file (src/worker/plugins/auth.ts)
import { auth } from "@fcalell/plugin-auth";
export default auth.defineCallbacks({
  sendOTP({ email, code }) { /* ... */ },
  sendInvitation({ email, orgName }) { /* ... */ },
});
```

When a plugin declares both `callbacks` and a `./runtime` subpath export, the CLI scaffolds
`src/worker/plugins/<name>.ts` from the plugin's `templates/callbacks.ts` on `stack init` and
`stack add`. That only puts the file on disk; plugin-api wires the callbacks into the worker chain
([runtime](./runtime.md)).

## Contributing to a slot

Every `Slot<T>` has a `.contribute(fn)` method. `fn` receives a `ContributionCtx` and returns a
value, or `undefined` to skip, which is how a contribution is made conditional.

```ts
import { api } from "@fcalell/plugin-api";
import { cloudflare } from "@fcalell/plugin-cloudflare";

contributes: (self) => [
  cloudflare.slots.bindings.contribute(() => {
    if (self.options.dialect !== "d1") return undefined;         // skip on sqlite
    return {
      kind: "d1",
      binding: self.options.binding ?? "DB_MAIN",
      databaseId: self.options.databaseId,
    };
  }),

  // A list slot also takes an array: several entries in one contribution.
  api.slots.env.contribute(() => [
    { name: "AUTH_SECRET", devDefault: "dev-secret" },
    { name: "APP_URL", devDefault: "http://localhost:3000" },
  ]),
],
```

A map slot's owner may declare a merge rule, so two plugins contributing one key combine instead of
throwing ([slot graph](./slot-graph.md#the-four-slot-kinds)). A rule is declared only for a key
whose combination has one obvious meaning, and the slot's catalog entry states it.

**`ContributionCtx`** is what every contribution and derivation receives:

```ts
interface ContributionCtx<TOptions = unknown> {
  app: AppConfig;                                   // { name, domain, origins? }
  options: TOptions;                                // see "Options via schema"
  cwd: string;                                      // the consumer's working directory
  fileExists(path: string): Promise<boolean>;       // relative to cwd
  readFile(path: string): Promise<string>;          // relative to cwd
  log: { info, warn, success, error };              // Clack-style logging
  template(name: string): URL;                      // a path inside this plugin's templates/
  scaffold(name: string, target: string): ScaffoldSpec;
  resolve<T>(slot: Slot<T>): Promise<T>;            // pull any slot value
}
```

`scaffold(name, target)` is `{ source: template(name), target, plugin: thisName }`. `resolve` is for
sparing use; a value the plugin structurally needs is a derived slot. A plugin that resolves a
`*Source` slot and writes it under `.stack/` uses `emitArtifact` from `@fcalell/cli/cli-slots`
([slot catalog](./slot-catalog.md)), never a raw `cliSlots.artifactFiles.contribute`.

## Deriving from other slots

A derived slot reads other slots as inputs. Its inputs are fully resolved before `compute` runs, so
a cross-plugin read is deterministic by construction. This is plugin-auth's `runtimeOptions`,
shortened:

```ts
import { slot, type ContributionCtx } from "@fcalell/cli";
import { api } from "@fcalell/plugin-api";

const runtimeOptions = slot.derived({
  source: "auth",
  name: "runtimeOptions",
  inputs: { cors: api.slots.cors, devCors: api.slots.devCorsOrigins, devTargets: api.slots.devTargetOrigins },
  compute: (inp, ctx: ContributionCtx<ResolvedAuthOptions>): Record<string, TsExpression> => {
    const props = literalToProps(ctx.options);
    props.trustedOrigins = { kind: "array", items: inp.cors.map((o) => ({ kind: "string", value: o })) };
    const devOrigins = [...inp.devCors, ...inp.devTargets];
    if (devOrigins.length > 0) {
      props.devTrustedOrigins = { kind: "array", items: devOrigins.map((o) => ({ kind: "string", value: o })) };
    }
    return props;
  },
});
```

A plugin never orders itself after another plugin. It declares what it reads, and the graph runs it
when those reads are ready ([slot graph](./slot-graph.md#ordering-by-data)).

## Templates

Templates live on disk under `plugins/<name>/templates/` as lintable source files, listed in the
package's `files` so they are published. `ctx.template(name)` resolves into the owning plugin's
`templates/`, never the consumer's `cwd`. A plugin pushes `ScaffoldSpec`s into
`cliSlots.initScaffolds`; the CLI copies each once, and checks every target before it writes any:
two plugins claiming one target is a programming error and fails. A slot-driven scaffold another
plugin may replace is a `slot.value({ override: true })`.

```ts
contributes: [
  cliSlots.initScaffolds.contribute((ctx) =>
    ctx.scaffold("schema.ts", "src/schema/index.ts")
  ),
],
```

The CLI's own base files (`package.json`, the tsconfigs, `biome.json`, `.gitignore`,
`stack.config.ts`) are strings it renders and writes when missing, outside
`cliSlots.initScaffolds`; plugin content always goes through a `ScaffoldSpec`.

## Plugin discovery

A plugin's npm package name is its `package` option, `@fcalell/plugin-<name>` when omitted. A
first-party plugin omits it; a third-party plugin published under another namespace sets it, so
discovery can import it. The consumer's config carries it on each entry as `__package`.

The CLI's first-party list (`FIRST_PARTY_PLUGINS`) serves only the commands that offer a picker
before any consumer config exists, `stack init` and `stack add`. A third-party plugin appears
through the consumer's `stack.config.ts` and its `__package`; discovery cannot enumerate it ahead
of config load.

Node caches a failed module resolution for the rest of the process, so a plugin probed before its
install stays unresolvable after it. A plugin imports its siblings before `stack init` installs
them, so a plugin looks up its package on first use, never on import, and discovery loads only the
named plugins already installed.

## Checklist before publishing a plugin

1. Templates live under `templates/` and are listed in `package.json` `files`, next to `dist` and
   `src` ([templates](#templates)).
2. `node/` and `worker/` are split, with no cross-imports
   ([conventions](./conventions.md#plugin-folder-structure)).
3. A runtime, if any, is exported from `./runtime` and takes plain options, not `PluginConfig`.
   Which entries export compiled `dist` and which source, and the package's `tsconfig.build.json`,
   `build` and `prepare`: [conventions](./conventions.md#build-and-exports).
4. Commands route as `stack <plugin> <command>`.
5. Cross-plugin dataflow is slot imports: `B.slots.foo.contribute(...)` to push,
   `slot.derived({ inputs: { foo: B.slots.foo }, ... })` to read. No `requires` for ordering.
6. A slot added, renamed or removed updates the [slot catalog](./slot-catalog.md) in the same
   commit.
7. Dependencies and peers follow
   [releasing](./releasing.md#peers-one-copy-of-each-stack-package).

## In the code

- `packages/cli/src/lib/create-plugin.ts`: `plugin()`, `callback()`, the `self` helper, option
  parsing, footprint and guide auto-wiring, the callback-file scaffold, `CommandContext`.
- `packages/cli/src/lib/slots.ts`: `slot.*`, `Slot`, `Contribution`, `ContributionCtx`.
- `packages/cli/src/lib/cli-slots.ts`: `cliSlots`, including `guide`, and `emitArtifact`.
- `packages/cli/src/specs.ts`: `GuideEntry` and the other spec types.
- `packages/cli/src/lib/scaffold.ts`: `writeScaffoldSpecs` and the base-file writer.
- `packages/cli/src/lib/discovery.ts`: `FIRST_PARTY_PLUGINS`, `loadInstalledPlugins`.
- `packages/cli/src/config.ts`: `defineConfig`, the config entry with `__package`.
