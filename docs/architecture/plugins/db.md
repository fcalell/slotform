# plugin-db

`@fcalell/plugin-db` wraps Drizzle ORM over Cloudflare D1 or a SQLite file. This page holds what the
plugin owns and contributes, its two runtimes, how its declarations keep one copy of drizzle, the
local dev push, the `drizzle-kit` driver and its traps, the migration lock, the deploy checks, the
full-text indexes and the seed. How a consumer writes a schema, a seed or a migration is the
plugin's guide (`plugins/db/guide/`).

## Slots and contributions

Built with `plugin` from `@fcalell/cli`; `requires: ["api"]`. It owns one slot, `schemaModules`
([slot catalog](../slot-catalog.md#dbslots-plugin-db)): the modules whose tables the scaffolded
`src/schema/index.ts` re-exports. It writes `drizzle-orm` into the consumer's `dependencies` and
`drizzle-kit` into its `devDependencies`, gitignores `.db-kit`, and adds the commands `push`,
`generate`, `apply`, `reset`, `create`, `check` and `seed` under `stack db`.

| Target slot | Behaviour |
| --- | --- |
| `cloudflare.slots.bindings` | The D1 binding with its `migrationsDir`, for the d1 dialect and only when `databaseId` is set. `migrationsDir` is required: without it `wrangler d1 migrations apply` does nothing at deploy time and reports no error |
| `api.slots.env` | `{ name: fileVar, devDefault: path }` (sqlite only) |
| `node.slots.bundleEntries` | sqlite only: `db-migrate`, whose boot task `migrateSqlite` applies the committed migrations before the bundled server listens, with the `.sql` files and `meta/_journal.json` copied into `migrations/` beside the bundle, so the box needs no CLI |
| `api.slots.pluginRuntimes` | `dbRuntime({ binding, schema })` from `./runtime` (d1), `dbRuntime({ fileVar, schema })` from `./runtime/sqlite` (sqlite) |
| `api.slots.workerImports` | The schema namespace import ([Schema import](#schema-import)), gated on `src/schema` existing, as the runtime's `schema` option is |
| `api.slots.entities` | The schema's value-export names ([Entity vocabulary](#entity-vocabulary)) |
| `screens.slots.serveSteps` | The scratch database of a `stack screens serve` run ([Seed](#seed)) |

| `cliSlots` slot | Behaviour |
| --- | --- |
| `initPrompts` | Asks for the dialect, then the D1 database ID (default the placeholder, [Deploy checks](#deploy-checks)) or the SQLite path (default `./data/app.sqlite`) |
| `initScaffolds` | Writes `src/schema/index.ts` from `templates/schema.ts`, with an `export *` of each `schemaModules` entry |
| `devReadySetup` | Pushes the schema into the local database ([Local dev push](#local-dev-push)), then seeds |
| `devWatchers` | Re-push on `src/schema/**` (both dialects); re-seed on `src/schema/seed.ts` (300 ms debounce) |
| `deployChecks` | d1: a real `databaseId`, the destructive-migration check, the full-text trigger check, a migration that fails on an empty database, the drift check, the committed-migrations confirm, and, when `seed.ts` exists, the seeded tables with what the remote seed does to rows outside them |
| `deploySteps` | d1: `applyMigrationsRemote`, then the seed when `seed.ts` exists, both phase `pre` |
| `removeFiles` | `src/schema/` and the `migrations` directory |
| `lintIgnore` | The migrations `drizzle-kit` writes (snapshots, journal), so Biome skips them |

## Runtime

One module per dialect, so a Workers bundle never pulls in the native driver: `./runtime` is the D1
`RuntimePlugin` for the worker builder chain ([runtime plugin protocol](../runtime.md#runtime-plugin-protocol)),
`dbRuntime({ binding: "DB_MAIN", schema })`, and `./runtime/sqlite` (`src/server/`) is the sqlite
one for the node target, `dbRuntime({ fileVar: "DB_FILE", schema })`. Both return `{ db }` to
downstream plugins through the builder's context accumulation, so a procedure is the same code on
both dialects. The clients behind them (`./d1`, `./sqlite`) are cached per binding and per file
path.

### Database on the node target

`db({ dialect: "sqlite" })` drives `better-sqlite3` through plugin-db's own `createClient`;
`better-sqlite3` is a plain dependency of the plugin, because `drizzle-orm` 0.45 ships no
`node:sqlite` driver. The installation decides where the file lives: the runtime opens the file
the `fileVar` env var names (default `DB_FILE`), once per process, and `path` is only that var's
`devDefault`. Both `validateEnv` and `context` refuse a missing var by name: better-sqlite3 opens an
anonymous temporary database for an undefined path and would serve an empty database without a
word.

`createClient` sets the connection's pragmas as defaults, with no option: each is safe for every
app, and none has a value an app would pick differently.

| Pragma | Why |
| --- | --- |
| `journal_mode = WAL` | Readers never block the writer and the writer never blocks readers; writes append to a log. Persists in the file |
| `synchronous = NORMAL` | With WAL, durable across an application crash and, at worst, loses the last commits on power loss, never corrupts. `FULL` fsyncs every commit for a guarantee WAL does not need |
| `busy_timeout = 5000` | A writer waits up to 5 s for the lock instead of failing with `SQLITE_BUSY` while a second process (a migration, a seed) holds it. Every connection to the file sets this one value |
| `foreign_keys = ON` | SQLite ignores foreign keys unless asked, per connection |
| `cache_size = -65536` | 64 MiB of page cache against the 2 MiB default |
| `mmap_size = 268435456` | 256 MiB: reads come from the OS page cache, skipping a copy per page. Address space only |
| `temp_store = MEMORY` | Sorts, `GROUP BY` and temporary indexes stay off the disk |
| `journal_size_limit = 67108864` | The WAL file shrinks back to 64 MiB after a checkpoint |

`PRAGMA optimize` runs on open (every table checked, stale ones analysed from a bounded sample),
every 2 hours on an unref'd timer, and at process exit, so the query-planner statistics follow the
data.

The other connections to the file take the pragmas they need from `src/sqlite/pragmas.ts`.
`migrateSqlite` sets WAL and the busy timeout and leaves foreign keys off: drizzle's migrator runs
every migration in one transaction, where a migration's own `PRAGMA foreign_keys=OFF` is a no-op,
so a table copy that drops a referenced table would fail or cascade. The sqlite seed sets the busy
timeout and foreign keys, since its prune relies on the schema's `ON DELETE` actions, and runs in
one transaction.

`stack db push` and the sqlite local migrate create the file's directory before `drizzle-kit`
runs: `drizzle-kit` neither creates it nor fails without it, and reports success while writing
nothing.

## Schema import

The worker and the test entry import the consumer's schema as
`import * as schema from "../src/schema/index.ts"` on both dialects. Node's ESM resolver refuses a
directory import, and the worker runs under node on the node target and in the test entry; esbuild
resolves the file form as well. The rule for the consumer's own files is on the
[node page](node.md#runtime).

## Entity vocabulary

`api.slots.entities` ([api's entities](api.md#entities)) takes the consumer's Drizzle schema export
names on both dialects: the vocabulary describes the schema, not the runtime. `extractSchemaEntities`
reads `src/schema/index.ts` and returns its exported value names, sorted, by a regex sweep over the
export syntax Drizzle schema files use, with no TypeScript compiler dependency, as plugin-api's
route barrel reads the file layout without type-checking it.

- Matches `export const foo`, `export function foo`, `export class Foo`, `export { foo, bar }` and
  `export { foo, bar } from "./other"`. An alias `export { foo as bar }` counts as `bar`, the name
  `reads` and `writes` reference.
- Skips `export type`, `export interface`, type-only specifiers (`export type { Foo }`,
  `export { type Foo, bar }`), `export default` and `export * from "..."`: resolving a namespace
  re-export means following the module graph.
- Does not read a comma-separated multi-declaration (`export const a = 1, b = 2`) or a destructuring
  export: a Drizzle schema declares one table per `const`.

No `src/schema` directory, or a schema file with no value exports, contributes nothing, and
`.stack/procedure.ts`'s `Entity` falls back to what other plugins contribute (or `string`). A
consumer's schema file only `export *`s auth's tables, which this sweep cannot see, so plugin-auth
contributes its own table names to the same list. That is what makes `reads: ["member"]` and
`writes: ["member"]` type-check and take part in cache invalidation, and the two contributions never
overlap.

## Type resolution

The consumer's root `drizzle-orm` is the one copy every emitted declaration resolves to. The
declarations the consumer's worker project emits name drizzle types as `import("drizzle-orm/...")`,
and the consumer's type-check resolves those from the consumer root: with no root copy every schema
table types as `any`, and with a second physical copy beside the plugin's, TypeScript treats the two
`Column` classes as distinct and `app.db.select().from(table)` fails. So the root copy is the one the
plugin resolves. A consumer that links the stack checkout (`link:../stack/plugins/db`) links
`../stack/plugins/db/node_modules/drizzle-orm` too, so the schema and `app.db` share one copy.

A plugin with tables (plugin-auth) depends on plugin-db, never on drizzle, so its declarations name
drizzle types through `@fcalell/plugin-db/orm`, which re-exports the table, relation and row types a
plugin's typed surface names. A type missing there is emitted as a `drizzle-orm` import that
resolves to nothing in a consumer, and every row read through it is `any`. A plugin schema file
imports the types its declarations spell from plugin-db for the same reason.

## Local dev push

Local dev is push-based for both dialects: `drizzle-kit` pushes the schema straight into the local
database, sqlite's file or the miniflare D1 `wrangler dev` reads
([cloudflare's local state](cloudflare.md#local-state)), so a schema save is live without a
migration or a restart. Migrations are the remote deploy path; `stack db apply` applies committed
ones locally for journal parity when wanted.

The setup task and the schema watcher push through one coalescing latch per cwd: at most one push
in flight and one queued, a call while one is queued joining it, and the queued push starting once
the one in flight settles, whether it succeeded or failed. Exclusion is the
[migration lock](#migration-lock)'s; the latch only keeps a busy editing session from queueing a
backlog of pushes when only the latest schema matters. The map that holds the latches is scoped to
the graph: `contributes` runs once per graph build, so each command gets a fresh map, and a stale
watcher from an earlier graph cannot starve the current one.

The sqlite file a `stack db` command works on is the one the node server would open: the `fileVar`
env var names it and `path` is its dev default, relative to the project root, so a command run with
`DB_FILE=./scratch.sqlite` touches the scratch copy and never the dev database. A `stack screens
serve` run's own file takes the place of both.

Push leaves two things out of `drizzle-kit`'s view, since the schema declares neither and push would
offer to drop them behind a data-loss prompt nothing answers: wrangler's migrations table, where
`stack db apply` records into the same database, and the full-text virtual tables with their shadow
tables, which are applied after push ([Full-text indexes](#full-text-indexes)).

## drizzle-kit

`drizzle-kit` is the plugin's optional peer, the app's devDependency
([database config](../../../plugins/db/guide/config.md#rules)), so an install that only runs the app
holds none of it. The plugin runs it as a child process and works around how it fails.

- **Locating it.** Its `exports` lists `.` and `./api` only, so `drizzle-kit/bin.cjs` is not
  resolvable: the plugin resolves the package entry and takes the bin beside it, as a realpath, so
  the probes below resolve from where `drizzle-kit` itself will.
- **drizzle-orm.** `drizzle-kit` declares no `drizzle-orm` and `import()`s it from its own location;
  without one it prints an install hint and exits 1. The plugin resolves it the same way first,
  executing nothing.
- **The sqlite driver.** `drizzle-kit` exits 0 even when its sqlite driver fails to load, so a broken
  push or migrate would report success. The plugin loads the driver from `drizzle-kit`'s location up
  front and fails with the fix. `drizzle-kit` declares no `better-sqlite3` and loads whichever copy
  pnpm hoists: plugin-db's 13, which ships prebuilt binaries, or better-auth's 12 peer, built by its
  install script.
- **Errors on exit 0.** `drizzle-kit` reports most failures as an `Error:` on stderr and exits 0, so
  a failed generate would pass for "no changes". The plugin treats that text as the failure.
- **Rename prompts.** For each table or column the schema creates while another is dropped,
  `drizzle-kit` asks whether it is a rename. The prompt needs a TTY, which a child with piped output
  never has, so it fails and still exits 0. The answer is always the first choice, "create": a
  rename is an add and a drop, because the worker live during a deploy still reads the old name, and
  the drop is then behind the [marker](#the-marker). A preload makes the child's streams look like a
  terminal and presses Enter as each prompt starts listening; a run with no ambiguity never prompts.
- **Its config.** The config file is a plain object with no import line: `drizzle-kit` loads it with
  `require` and takes `default ?? module`, and an import of its `defineConfig` would resolve from the
  consumer, which holds no `drizzle-kit`. `schema` and every `out` stay relative to cwd, since
  `drizzle-kit` 0.31 mangles an absolute `out`; `dbCredentials.url` is absolute.
- **Table copies.** `drizzle-kit` alters a SQLite table it cannot alter in place (a dropped default,
  a changed constraint) by copying it: `CREATE TABLE __new_t`, `INSERT INTO __new_t(...) SELECT ...
  FROM t`, `DROP TABLE t`, rename. When the same change adds a column, its copy names the new column
  in the `SELECT`, which the old table lacks, and the migration fails where it applies
  (`no such column`). The plugin rewrites the copy to read only the columns the table had before; the
  added one takes its default, or null.
- **Expression indexes.** `drizzle-kit` writes an expression index (``index().on(sql`${t.title}
  collate nocase`)``) as it is when it creates the table, and quotes the whole expression as a column
  name when it rebuilds the table, which SQLite reads as a missing column. The plugin unquotes each
  item of an index's list that names no column of its table in the newest snapshot.

## Migration lock

`drizzle-kit generate` writes timestamp-prefixed SQL files into `src/migrations/`. Two writers at once
(a manual `stack db generate` while `stack dev`'s watcher pushes) leak each other's output into the
directory-snapshot diff or produce duplicate-timestamp files. Every migration-writing operation
takes two locks before it touches the migrations directory:

- **Cross-process:** a lock file opened with `fs.openSync(path, "wx")` (`O_EXCL`), atomic on POSIX; a
  second writer fails with `EEXIST`. A lock is stale, and the next writer reclaims it, when its PID is dead, when it is empty and older than 5 seconds (a writer killed between creating the file and writing its PID), or when it is older than the system boot (a recycled PID may belong to an unrelated live process). Two writers can find the same stale lock, so a reclaimer renames it aside under a name of its own (atomic) and discards it only while what it moved is still stale; a fresh lock it moved, which the other reclaimer had just created, is linked back. The link refuses to overwrite a lock a third writer took in that window, which then holds beside it: the one race left, two renames and a create wide.
- **In-process:** a `Map<lockPath, Promise>` keyed on the lock path, sequencing code in the same
  process; two different cwds never queue against each other.

Release and the exit handler (on `exit`, which an uncaught exception also emits, and on `SIGINT` and
`SIGTERM`) delete a lock file only while it still holds this process's PID, so a lock another process took after the file was deleted by hand stays. The lock lives in `plugins/db/src/node/` because it is plugin-internal:
`@fcalell/cli` stays domain-agnostic.

## Deploy checks

The d1 dialect's `deployChecks` run during deploy planning, before the build or any migration
touches the cloud. The consumer's view of them is the guide's
[on deploy](../../../plugins/db/guide/commands.md#on-deploy) and
[migration safety](../../../plugins/db/guide/migration-safety.md).

- **Database ID.** `stack init` seeds `databaseId` with the sentinel `YOUR_D1_DATABASE_ID` when the
  consumer has no D1 database yet; one constant serves the prompt and the guard. A deploy whose
  `databaseId` is that placeholder, or is not a UUID, would push migrations against a database that
  does not exist and fail opaquely inside wrangler, so the guard throws an actionable error first.
- **Destructive migration.** The check diffs the drizzle meta snapshot of the newest schema change
  against its predecessor's: the newest migration whose snapshot differs from the one before it, since
  a custom migration (a full-text index, a backfill) copies its predecessor's snapshot and would hide
  a drop written by the same `generate` run. Older schema changes are shipped history and never
  flagged again. A drop of a table, column or view without the marker aborts the deploy before any
  remote migration runs, because a drop breaks the live worker mid-rollout (old code still reads the
  dropped shape). `stack db check` and the deploy run the same checks, the deploy failing with the
  first one's explainer.
- **Drift.** The check copies the committed migrations into a throwaway, gitignored directory under
  `.db-kit` and runs `drizzle-kit generate` with `--out` there against the live schema. A newly
  emitted `.sql` means the schema changed without `stack db generate`, and the deploy aborts before
  any step. The real migrations directory is never touched. Deploy never generates migrations: only
  committed SQL applies, so the destructive check evaluates only committed files.

### The marker

A migration acknowledged as an intentional, reviewed drop carries `-- stack:allow-destructive`
anywhere in its `.sql`, as a plain comment line. It is a bare token with no value, so it reads
naturally in a SQL file.

## Full-text indexes

`ftsTable` (exported from `./orm`) declares full-text search over a regular table: an FTS5 virtual
table in external-content mode (the index holds tokens only; the text stays in the content table),
three triggers that keep it in sync, and a typed handle that `match` and `bm25` query. The consumer's
half is the guide's [full-text search](../../../plugins/db/guide/fts.md).

- **The handle.** Drizzle does not model virtual tables, so the handle is an `.existing()` view:
  `drizzle-kit` ignores it (no `CREATE`, no diff, no `DROP`), while the query builder reads it like any
  selectable. The DDL is plain SQL computed in `src/fts.ts` and carried on the handle under a
  `Symbol.for` key, so `stack db` reads it from the consumer's schema without sharing a module
  instance. The module is pure (no node imports): the schema file loads it in the Workers bundle too.
- **The content table** needs an integer primary key, or an integer unique column named by the
  `rowid` option: the index addresses rows by that integer, and SQLite renumbers the implicit rowid of
  a table without one on `VACUUM`.
- **Reading the declarations.** `stack db` reads the declared indexes in a fresh node process: the
  schema is user code that a long-running `stack dev` sees again after each save, which a cached
  in-process import would not. One index exported under two names is one declaration; two indexes
  of one name are refused.
- **Push.** After `drizzle-kit` pushes the tables, the database's indexes are brought to the declared
  ones: a missing index is created and filled, a changed one replaced, one that lost its triggers (a
  pushed table copy drops them) gets them back and is rebuilt. An index in the database that the schema
  does not declare stays (it may be hand-written SQL); its drop migration removes it. The step is idempotent.
- **Generate.** `stack db generate` writes the DDL as a migration
  ([how it migrates](../../../plugins/db/guide/fts.md#how-it-migrates)). A migration that recreates
  the content table (SQLite's copy, drop and rename) takes the triggers with the old table and may
  give the rows new rowids, which is why the resync (the triggers again and a `rebuild`) is appended.
- **The trigger check.** A migration rebuilds the content table where it holds a `DROP TABLE` of it;
  the triggers count as created when the index's insert trigger is, after that point or in a later
  migration.

## Seed

The consumer's half (what a seed holds, `prune`) is the guide's
[seed data](../../../plugins/db/guide/seed.md#when-it-runs).

- **The SQL.** A pure builder turns the whole seed into idempotent statements, testable without a
  database; what each table's statements do with and without `prune` is the guide's. The prune is a
  `DELETE ... NOT IN` the seeded keys, so foreign-key links to surviving rows are untouched, and rows
  it deletes rely on the schema's `ON DELETE SET NULL` to spare user data. A seed row's `undefined`
  value is an omitted column, as drizzle's insert reads it, so the column's SQL default applies.
- **Where it applies.** d1 goes through `wrangler d1 execute --file`: locally into the miniflare D1
  `wrangler dev` reads, remotely into the deployed database. sqlite executes against the file, with
  foreign keys on and in one transaction.
- **Loading it.** `src/schema/seed.ts` is imported under a fresh URL each time, since Node's ESM cache
  would hand a long-running `stack dev` the file as it was at the first load; the modules it imports
  (the schema) stay cached.
- **Dev.** The seed runs at Ready, after the schema push (`readySetup` tasks run in contribution
  order, [command steps](../commands.md#command-steps)), and again on each save of
  `src/schema/seed.ts`. Without that file it does nothing.
- **Deploy.** The seed step runs after the migrations, in the same `pre` phase and later in
  contribution order, and only when the consumer authored a seed. It is idempotent, so running it on
  every deploy is safe.
- **Screens serve.** A `stack screens serve` run gets a scratch database built the way a deploy builds
  one, from the committed migrations, then seeded: the run's own sqlite file under `DB_FILE`, or the
  run's own d1 miniflare state directory. Without a scratch target the dev database is the target.
  The run itself is [screens' serve](screens.md#serve).

## In the code

- `plugins/db/src/index.ts`: the plugin, its slot, commands and every contribution.
- `plugins/db/src/worker/index.ts`: the D1 runtime plugin (`./runtime`).
- `plugins/db/src/server/index.ts`: the sqlite runtime plugin and `migrateSqlite` (`./runtime/sqlite`).
- `plugins/db/src/sqlite/client.ts`: the sqlite client, its pragmas and the optimize timer.
- `plugins/db/src/sqlite/pragmas.ts`: the pragmas every connection to the file shares.
- `plugins/db/src/d1/client.ts`: the D1 client.
- `plugins/db/src/orm.ts`: the Drizzle surface and the types plugin declarations name.
- `plugins/db/src/fts.ts`: `ftsTable`, its DDL and the query helpers.
- `plugins/db/src/node/drizzle-kit.ts`: locating and running `drizzle-kit`, its config, the prompt preload.
- `plugins/db/src/node/recreate.ts`: the table-copy rewrite and the expression-index fix.
- `plugins/db/src/node/layout.ts`: the `.db-kit` workspace, the migrations directory and drizzle's journal and snapshots.
- `plugins/db/src/node/push.ts`: the local push, the sqlite file, local migrate and generate.
- `plugins/db/src/node/fts.ts`: reading, pushing and checking full-text indexes.
- `plugins/db/src/node/entities.ts`: the entity vocabulary extraction.
- `plugins/db/src/node/lock.ts`: the migration lock.
- `plugins/db/src/node/migration-safety.ts`: the checks `stack db check` and the deploy run, the marker.
- `plugins/db/src/node/d1.ts`: the placeholder database ID and its deploy guard.
- `plugins/db/src/node/seed.ts`: the seed SQL and where it applies.
- `plugins/auth/src/schema/devices.ts`: a plugin schema naming drizzle types through plugin-db.
