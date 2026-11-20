# @slotform/db

Database plugin for the `slotform` framework. Wraps Drizzle ORM over Cloudflare D1 or a
SQLite file: the worker's `db` client, the `slotform db` commands, the local dev push, the deploy's
migration checks and steps.

How it is built: [docs/architecture/plugins/db.md](../../docs/architecture/plugins/db.md).

## Install

```bash
slotform add db
```

`slotform init` and `slotform add db` write `@slotform/db` and `drizzle-orm` into the
consumer's `dependencies` and `drizzle-kit` into its `devDependencies`; which copy of each the
plugin runs is in [`config.md`](./guide/config.md#rules).

## Guide

Configuring the dialect, writing the schema and the seed, the `slotform db` commands and migration
safety live in `guide/`, indexed into a consumer's `.slotform/guide.md`:
[`change-a-table.md`](./guide/change-a-table.md),
[`destructive-change.md`](./guide/destructive-change.md), [`schema.md`](./guide/schema.md),
[`fts.md`](./guide/fts.md), [`seed.md`](./guide/seed.md), [`commands.md`](./guide/commands.md),
[`migration-safety.md`](./guide/migration-safety.md) and [`config.md`](./guide/config.md).

## Exports

| Subpath | Purpose |
|---------|---------|
| `@slotform/db` | `db()`, `DbOptions` |
| `@slotform/db/orm` | Drizzle table/column builders, table constraints, operators, `alias`, the `SQL` type, relations, aggregates, table and view introspection, `sqliteView`, row types, `defineSeed`/`seedTable`, and full-text search: `ftsTable`, `match`, `bm25`, `highlight`, `ftsQuery` |
| `@slotform/db/d1` | `createClient()` for Cloudflare D1 |
| `@slotform/db/sqlite` | `createClient()` for SQLite, over the plugin's own `better-sqlite3` |
| `@slotform/db/runtime` | `dbRuntime()`, the D1 runtime plugin factory |
| `@slotform/db/runtime/sqlite` | `dbRuntime()`, the SQLite runtime plugin factory (node target), and `migrateSqlite()`, the production bundle's migrate task |

## License

MIT
