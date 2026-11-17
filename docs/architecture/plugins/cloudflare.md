# plugin-cloudflare

`@fcalell/plugin-cloudflare` is the Cloudflare Workers target, the alternative to
[plugin-node](node.md) for the same worker. This page holds what the plugin owns and contributes, how
`.stack/wrangler.toml` is derived and merged with the consumer's root file, the env namespace, the
pinned compatibility date, rate-limiter ids, how every wrangler command is invoked, `.dev.vars`, the
local miniflare state, the client's `_headers` and the screens serve target. How a consumer edits the
root `wrangler.toml` and deploys is the plugin's guide (`plugins/cloudflare/guide/`).

## Slots and contributions

Plugins that need bindings or vars contribute into cloudflare's list and map slots; `wranglerToml`
is a derived slot that composes them, with the worker's `api.slots.env` declarations, into the final
`.stack/wrangler.toml` source. It is a pure derivation with no ordering between contributions: the
aggregator reads every input slot at once ([slot graph](../slot-graph.md#contributing-and-deriving)).
With vite in the config it serves the web client's build as the worker's static assets. Every owned
slot, `serveWranglerToml` included, is listed in the
[slot catalog](../slot-catalog.md#cloudflareslots-plugin-cloudflare). The plugin writes `wrangler`
into the consumer's `devDependencies` and gitignores `.wrangler` and `.dev.vars`.

| Target slot | Behaviour |
| --- | --- |
| `cliSlots.artifactFiles` | `.stack/wrangler.toml`, from `wranglerToml`; `.dev.vars` and its mirror `.stack/.dev.vars` ([.dev.vars](#devvars)) |
| `cloudflare.slots.bindings` | `RATE_LIMITER_RPC`, 1000 requests per 60 s per IP, when any worker path exists ([api's rate limiting](api.md#rate-limiting)); the queue `QUEUE` when `api.slots.queueHandler` is set ([merge contract](#wranglertoml-merge-contract)) |
| `api.slots.envType` | The global `Env` `wrangler types` declares, so a procedure's `context.env` is typed on Cloudflare |
| `api.slots.devTargetOrigins` | `http://localhost:8787`, unless `app.origins` is set |
| `vite.slots.serverProxy` | Every `api.slots.routePrefixes` path to the wrangler dev port |
| `vite.slots.watchIgnored` | `**/.wrangler/**` ([Dev and Vite root](#dev-and-vite-root)) |
| `cliSlots.devProcesses` | `wrangler dev` on port 8787 with `--persist-to .wrangler/state`, ready on `Ready on` |
| `screens.slots.serveTargets` | The cloudflare serve target ([Screens serve](#screens-serve)) |
| `cliSlots.buildSteps` | `client-headers`, phase `post` ([Client headers](#client-headers)) |
| `cliSlots.deploySteps` | `wrangler deploy`, phase `main` |
| `cliSlots.postWrite` | Creates the assets directory when missing (`wrangler dev` refuses to start without it, and it is missing until the first `stack build`); runs `wrangler types` ([Wrangler invocation](#wrangler-invocation)) |

## wrangler.toml merge contract

`aggregateWrangler` merges the framework's contributions onto the consumer's root `wrangler.toml`
key by key. The consumer's half is the guide's
[root wrangler.toml](../../../plugins/cloudflare/guide/wrangler.md#the-root-wranglertoml).

1. **Framework-managed** (`d1_databases`, `kv_namespaces`, `analytics_engine_datasets`, `unsafe`,
   `compatibility_flags`, `assets`): the consumer cannot set them, and one present in the root file
   throws with an actionable message. Plugin contributions to `cloudflare.slots.bindings` and
   `compatibilityFlags`, and vite's client build for `[assets]`, drive them.
2. **Framework-defaulted scalars** (`name`, `compatibility_date`, `main`): the consumer wins when
   present; otherwise the framework supplies a default.
3. **Consumer-merged lists** (`[[routes]]`, `[[r2_buckets]]`, and the `[queues]` tables `producers`
   and `consumers`): consumer entries merge next to framework contributions, and a collision (route
   pattern, r2 or queue binding name, consumed queue) is a hard error, so a future contributor never
   shadows a consumer entry.
4. **`[triggers]` and `[browser]`** pass through verbatim, but `crons` is checked against
   `src/worker/scheduled.ts` and a consumer queue consumer against `src/worker/queue.ts`. A schedule
   with no handler fires into nothing and a handler with no schedule never runs, so the two come
   together. Schedules stay in the root file because a cron cannot be inferred.
5. **Everything else** is consumer-only and passes through verbatim (`account_id`, `dev`, `build`,
   `observability`).

`[vars]` is a hybrid: consumer keys pass through, framework keys (vars from contributions,
var-bindings) overlay, and a collision across consumer and framework or across plugin contributions
throws. A secret never lands in `[vars]`, though a consumer var of its name still collides.

The app has one queue, and `src/worker/queue.ts` is its switch: a producer `QUEUE` and the consumer of
the queue named after the app, with a fixed batch shape (batch 10, timeout 5 s, 3 retries). The app
multiplexes its job types on it. The queue is created once before the first deploy
([deploy](../../../plugins/cloudflare/guide/deploy.md)).

## Env namespace

Every identifier that lands at the top of `env.*` shares one flat namespace: d1, kv and r2 bindings,
rate-limiter binding names, `kind: "var"` names, `extraVars` keys and `secrets[].name`, consumer-merged
r2 bindings included. `env.DB` is ambiguous if `DB` is both a D1 binding and a `[vars]` key, or two
plugins both register `AUTH_SECRET`, so generate checks the whole namespace in one pass before
rendering any TOML and reports both shapes that clashed ([api's env vars](api.md#env-vars)).

A declared env var becomes a `.dev.vars` key, a `wrangler secret put` name and a member of the
worker's `Env`; all three read it as a shell-style identifier (`^[A-Za-z_][A-Za-z0-9_]*$`), and any
other name fails generate.

## wrangler.toml determinism

Generated output is byte-identical however the consumer orders `plugins:`. List-slot contributions
arrive in config plugin-array order, so each kind-grouped section is sorted by name; names are unique
(the namespace check runs first), so the sort is total ([artifact emit](../codegen.md#artifact-emit)).

## Compatibility date

The default Workers compatibility date is a constant in the plugin source,
`DEFAULT_COMPATIBILITY_DATE` (`2025-01-01`), which seeds `cloudflare.slots.compatibilityDate`, so
`wrangler.toml` is a function of the config and the plugin version alone. Reading the wall clock at
generate time would make the file depend on the day `stack generate` runs: `wrangler types` output
would drift between runs across midnight and CI caches would invalidate for no reason. A compatibility
date is a stability contract, not a feature flag, so the trade is reproducibility over automatic
bumps. The constant moves with plugin releases; a consumer who wants a newer date contributes a
`cloudflare.slots.compatibilityDate` value with `override: true`.

## Rate limiters

Rate-limit namespace ids are account-global: two workers sharing an id share one counter bucket. The
id is derived from the worker name and the binding name, FNV-1a 32-bit folded into wrangler's
positive-integer range, so it is deterministic across generates and apps in the same account never
share a counter. The binding is emitted in the unsafe-binding form wrangler documents and miniflare
enforces, `namespace_id` plus a nested `simple` table; the flat `limit`/`period` shape fails both
`wrangler dev` and deploy validation.

## Wrangler invocation

Every bundling wrangler command (`dev`, `deploy`) passes `--config .stack/wrangler.toml`, since the
consumer root has no wrangler config, and `--tsconfig` with the absolute path of
`cliSlots.workerTsconfig`, the tsconfig holding `virtual:stack-procedure`'s `paths`
([TypeScript projects](../consumer-project.md#typescript-projects)). esbuild otherwise reads the tsconfig
nearest each file, which is the solution `tsconfig.json` with no `paths`, and
`virtual:stack-procedure` would not resolve. The path is absolute because wrangler hands it to
esbuild, which resolves a relative one against the config's directory, `.stack/`; the config file's
own `tsconfig` key fails the same way.

Once `.stack/wrangler.toml` is on disk, `postWrite` runs `wrangler types` into
`.stack/worker-configuration.d.ts`. A missing binary or a wrangler crash downgrades to a warning with
next steps, and the rest of `stack generate` completes. On every failure path the existing
`.stack/worker-configuration.d.ts` is deleted: a stale file would let the consumer's type-check pass
against the last run's bindings while the real `env.*` shape drifted, and without it the type-check
fails at once with `Cannot find name 'Env'`, pointing at the failed regeneration.

## .dev.vars

Generate writes `.dev.vars` unless the consumer has one. An existing file is topped up with
`STACK_DEV` and every declared var it lacks, at its dev default, so a var declared after the file was
written still reaches the dev worker, and `wrangler types` types it as a `string`: no declared var is
in `[vars]`. `STACK_DEV` never goes through `api.slots.env`, so it never becomes a
`wrangler secret put` deploy prompt. On the node target the same two signals arrive through the dev
process's env ([node's dev](node.md#dev)).

wrangler resolves `.dev.vars` relative to its config file, and the dev process runs
`--config .stack/wrangler.toml`, so the consumer's root file is invisible to it. The root file is the
consumer's editing surface; every generate mirrors it into `.stack/.dev.vars` for wrangler to read.
The consumer's half is the guide's [.dev.vars](../../../plugins/cloudflare/guide/wrangler.md#devvars).

## Local state

Miniflare keeps the local worker's state (D1, KV, caches, traces) in wrangler's own `.wrangler/state`
at the consumer root, exported as `LOCAL_PERSIST`. It stays outside `.stack/`, which is Vite's root:
every request writes it, and each write Vite sees is a full reload. Every local wrangler invocation
(`wrangler dev`, plugin-db's `migrations apply` and `d1 execute`) passes the same `--config` and
`--persist-to` (plugin-db's `localD1Flags()`), so schema pushes, seeds and the running worker share
one miniflare D1. The consumer's half is the guide's
[local state](../../../plugins/cloudflare/guide/wrangler.md#local-state).

plugin-db's d1 push writes into the exact miniflare sqlite the running `wrangler dev` reads, so a
schema change is live without a restart ([db's local dev push](db.md#local-dev-push)). Migrations
stay the remote deploy path, and the local database is disposable (`stack db reset`). Miniflare
persists one sqlite file per database id under `--persist-to`, named by its deterministic
durable-object id (`durableObjectNamespaceIdFromName`): HMAC-SHA256 keyed on
`sha256("miniflare-D1DatabaseObject")`, the first 16 bytes over the database id, then 16 bytes over
that digest. plugin-db derives that exact filename instead of globbing the directory, which stays
correct when the persisted state holds databases from an earlier `databaseId`.

## Dev and Vite root

wrangler keeps its scratch `.wrangler/` beside its config, so the dev bundle it rewrites on every
worker edit lands in `.stack/.wrangler/tmp/`, inside Vite's root. Tailwind's automatic source
detection scans that bundle and answers a change to a file it scanned, but no module imports, with a
full page reload, and Vite's watcher never sees the directory. The plugin contributes
`**/.wrangler/**` to `vite.slots.watchIgnored`
([vite's dev server](vite.md#dev-server-proxy-file-access-and-watching)).

## Client headers

The `client-headers` build step (phase `post`) writes `<outDir>/_headers` with one `/*` rule holding
`vite.slots.clientHeaders`, names sorted ([content security policy](vite.md#content-security-policy)).
Cloudflare reads a `_headers` file from the assets directory, never serves it, and applies its rules
to asset responses only, so the worker's paths keep the worker's headers with no exclusion. The step
runs after vite's build has emptied and filled the directory. A `public/_headers` Vite copied there
fails the build: Cloudflare joins a header two rules set with a comma (`DENY, SAMEORIGIN` is
invalid), so merging is not safe. There is no step without vite or with the slot empty.

## Screens serve

A `stack screens serve` run ([screens' serve](screens.md#serve)) on this target runs `wrangler dev`
on the run's port and state with a config of its own (`serveWranglerToml`), its entry wrapping the
worker in the fixture controls and its `.dev.vars` the generated mirror with the run's env on top.
All of it lives in the run's scratch directory.

## In the code

- `plugins/cloudflare/src/index.ts`: the plugin, its slots, the compatibility date, `LOCAL_PERSIST`, the wrangler arguments and every contribution.
- `plugins/cloudflare/src/node/codegen.ts`: `aggregateWrangler`, the merge contract, the namespace check, canonical order, rate-limiter ids.
- `plugins/cloudflare/src/node/dev-vars.ts`: `.dev.vars`, its top-up and the env-name rule.
- `plugins/db/src/node/push.ts`: the miniflare D1 filename and the local d1 push.
- `plugins/db/src/node/wrangler.ts`: `localD1Flags()`, the shared `--config` and `--persist-to`.
