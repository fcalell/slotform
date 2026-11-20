# Slot graph

The **slot graph** is the framework's only coordination mechanism: every cross-plugin value
travels through a typed slot, and the engine resolves the graph topologically, memoized once per
command. This page covers the semantics: the four slot kinds, contributing and deriving, slot
identity, and why execution order falls out of the data. How to declare, contribute and derive in a
plugin is in [plugin authoring](./plugin-authoring.md#contributing-to-a-slot); every first-party
slot and spec type is in the [slot catalog](./slot-catalog.md).

## The four slot kinds

A slot is declared with `slot.list`, `slot.map`, `slot.value` or `slot.derived`, each taking
`{ source, name }`, where `source` is the owning plugin's name (`cli` for the CLI's own slots).

```ts
slot.list<TItem>({ source, name, sortBy?, uniqueBy? })  // many contributions, concatenated
slot.map<TValue>({ source, name, keyOf?, merge? })      // many contributions, keys merged
slot.value<T>({ source, name, seed?, override? })       // one contribution, or the last under override
slot.derived<T, I>({ source, name, inputs, compute })   // computed from other slots
```

- **`list`**: many contributions concatenated. `sortBy` gives a deterministic order. `uniqueBy`
  extracts a per-item key and makes it unique across the list: a duplicate key throws
  `SlotConflictError`, as a map does, and an item whose key is `undefined` opts out of the check,
  so one list can mix items unique by kind with free-form items.
- **`map`**: many contributions merged by key; a duplicate key throws `SlotConflictError`. A slot
  that owns a key it can combine declares `merge: (a, b, key) => value`: a duplicate key then folds
  pairwise in contribution order into one entry. `merge` returning `undefined` declines, and that
  key still throws, so one slot can combine some keys and refuse the rest. `keyOf: (key) =>
  identity` widens what counts as the same key (HTTP header names fold to lower case): the
  first-seen spelling is the key of the result, and `merge` receives the identity. A merge rule
  belongs to the slot owner, is declared where the slot is, and is associative, so the result does
  not depend on how contributions group (`vite.slots.clientHeaders` merges
  `Content-Security-Policy`).
- **`value`**: one contribution, which takes the place of the seed. `seed` supplies the value when
  no contribution lands; with neither, the resolve throws `SLOT_UNSEEDED`. Several contributions
  throw `SlotConflictError` unless the slot declares `override: true`, under which the last
  contribution wins (`api.slots.rbacStatements`, which the `auth` plugin fills from its access
  control).
- **`derived`**: computed from other slots. Every input is fully resolved before `compute` runs, a
  derived slot takes no contribution (`SLOT_DERIVED_CONTRIBUTION`), and a cycle among inputs fails
  when the graph is built.

## Contributing and deriving

**Contributing** pushes a value into another plugin's slot and returns a `Contribution<T>`:

```ts
api.slots.cors.contribute(async (ctx) => `http://localhost:${await ctx.resolve(self.slots.devServerPort)}`)
cloudflare.slots.bindings.contribute(() => ({ kind: "d1", binding: "DB_MAIN", databaseId: "..." }))
```

A contribution that returns `undefined` is skipped, which is the pattern for a conditional
contribution (`if (!ctx.fileExists(...)) return undefined;`).

**Deriving** reads other slots as inputs:

```ts
slot.derived({
  inputs: { cors: api.slots.cors },
  compute: (inp, ctx) => ({ trustedOrigins: inp.cors }),
})
```

### A slot whose plugin is absent

A slot that is contributed to, derived from or resolved while its plugin is absent from the
consumer's config is still a valid slot, owned by its `source` and resolving to its empty
composition: `[]` for a list, `{}` for a map, the seed for a value. Contributing to it does
nothing; deriving from it reads that empty value. This is how a plugin reads a peer the consumer
left out: `db` and `auth` run on `node` while contributing to `cloudflare.slots.bindings`, and
`cloudflare` runs without `api` while deriving from `api.slots.env`.

### Slot identity

A slot is matched by identity: the slot object a declaration creates, which carries its own `id`.
`source:name` only names it. Two installed copies of a package therefore hold two slots under one
`source:name`, and a contribution to one copy never reaches a resolve of the other, so it would
vanish without a word. The graph refuses a second slot under a name it already holds
(`SLOT_DUPLICATE_COPY`) instead of dropping it; the rule that keeps one copy of each Slotform package
installed is in [releasing](./releasing.md#peers-one-copy-of-each-slotform-package). For the same
reason `slotform init` runs its scaffold in the app's own `@slotform/cli`, the copy the installed
plugins import, which is the running one whenever the app's `slotform` runs init.

## Ordering by data

The graph derives execution order from data dependencies. A derived slot waits for its `inputs`; a
list slot waits for all its contributions. A `cliSlots.artifactFiles` contribution that resolves
`api.slots.workerSource` waits for every contribution to `workerImports`, `pluginRuntimes`,
`callbacks` and `cors` to resolve first, peer plugins' contributions included. There is no event
lifecycle, no `after:` field, no plugin firing order and no barrier event. A plugin that needs to
run after plugin X did Y declares a derived slot whose inputs include the value Y produced.

Discovery returns the plugins in `config.plugins` order and applies no sort, so code that walks
the plugin list does only order-independent lookups (find by name, map to its CLI half).

### `requires`

`requires` on a plugin definition declares a sibling plugin that must be in the config, and is
presence only. Each entry is a name (`"db"`) or a one-of that exactly one of its plugins meets
(`{ oneOf: ["cloudflare", "node"] }`); the first `oneOf` entry is the default `slotform init` and
`slotform add` pick when the selection has none. A function of the plugin's resolved options stands
for a requirement that holds in one mode of the plugin only: api serving a worker needs a deploy
target, api naming another app's `server` does not.

`requires` drives two things: an actionable error naming the choices when a sibling is missing from
the consumer's config or a one-of is met twice, in place of a cryptic slot-lookup failure, and the
auto-pull of `slotform init` and `slotform add` ([commands](./commands.md#installing-the-requires-closure)).
It never influences ordering: a plugin that reads `otherPlugin.slots.foo` as a derived input is
ordered after it by that edge alone.

## In the code

- `packages/cli/src/lib/slots.ts`: the slot kinds, `Contribution`, `ContributionCtx` and the slot errors.
- `packages/cli/src/lib/graph.ts`: `buildGraph`, slot registration and identity, cycle detection, the memoized resolve.
- `packages/cli/src/lib/build-graph.ts`: the discovered plugins handed to the graph, in config order.
- `packages/cli/src/lib/create-plugin.ts`: the `requires` declaration, a name, a one-of or a function of options.
- `packages/cli/src/lib/discovery.ts`: the `requires` presence check.
- `packages/cli/src/commands/init.ts`: init's scaffold running in the app's own CLI copy.
