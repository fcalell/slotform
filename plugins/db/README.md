# @fcalell/plugin-db

Database plugin for the `@fcalell/stack` framework. Wraps Drizzle ORM over Cloudflare D1 or a
SQLite file: the worker's `db` client, the `stack db` commands, the local dev push, the deploy's
migration checks and steps.

How it is built: [docs/architecture/plugins/db.md](../../docs/architecture/plugins/db.md).

## Install

```bash
stack add db
```

`stack init` and `stack add db` write `@fcalell/plugin-db` and `drizzle-orm` into the
consumer's `dependencies` and `drizzle-kit` into its `devDependencies`; which copy of each the
plugin runs is in [`config.md`](./guide/config.md#rules).

## Guide

Configuring the dialect, writing the schema and the seed, the `stack db` commands and migration
safety live in `guide/`, indexed into a consumer's `.stack/guide.md`:
[`change-a-table.md`](./guide/change-a-table.md),
[`destructive-change.md`](./guide/destructive-change.md), [`schema.md`](./guide/schema.md),
[`fts.md`](./guide/fts.md), [`seed.md`](./guide/seed.md), [`commands.md`](./guide/commands.md),
[`migration-safety.md`](./guide/migration-safety.md) and [`config.md`](./guide/config.md).

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-db` | `db()`, `DbOptions` |
| `@fcalell/plugin-db/orm` | Drizzle table/column builders, table constraints, operators, `alias`, the `SQL` type, relations, aggregates, table and view introspection, `sqliteView`, row types, `defineSeed`/`seedTable`, and full-text search: `ftsTable`, `match`, `bm25`, `highlight`, `ftsQuery` |
| `@fcalell/plugin-db/d1` | `createClient()` for Cloudflare D1 |
| `@fcalell/plugin-db/sqlite` | `createClient()` for SQLite, over the plugin's own `better-sqlite3` |
| `@fcalell/plugin-db/runtime` | `dbRuntime()`, the D1 runtime plugin factory |
| `@fcalell/plugin-db/runtime/sqlite` | `dbRuntime()`, the SQLite runtime plugin factory (node target), and `migrateSqlite()`, the production bundle's migrate task |

## License

MIT
