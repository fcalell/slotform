# @fcalell/plugin-api

API plugin for the `@fcalell/stack` framework. Wraps Hono, oRPC and Zod so consumers only define
procedures. Provides the builder chain, the procedure factory, the typed RPC client and the
slot-driven worker codegen.

**Stack:** Hono, oRPC and Zod, all internal: consumers import none of them.

How it is built: [docs/architecture/plugins/api.md](../../docs/architecture/plugins/api.md).

## Install

```bash
stack add api
```

## Guide

Writing procedures, worker middleware, the client, options, pagination and slugs lives in
`guide/`, indexed into a consumer's `.stack/guide.md`:
[`add-a-procedure.md`](./guide/add-a-procedure.md), [`procedures.md`](./guide/procedures.md),
[`middleware.md`](./guide/middleware.md), [`client.md`](./guide/client.md),
[`mcp.md`](./guide/mcp.md), [`background.md`](./guide/background.md), [`config.md`](./guide/config.md) and
[`utilities.md`](./guide/utilities.md). Drawing the client's reads, acts and abilities is the query
plugin's (`@fcalell/plugin-query`).

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-api` | `api()`, `ApiOptions`, `ApiError`, `Middleware`, `InferRouter`, `CallbackSpec`, `PluginRuntimeEntry` |
| `@fcalell/plugin-api/runtime` | `createWorker()`, `AppBuilder`, `WorkerExport`, `ApiWorkerOptions`, `stackContext()`, `isForbiddenOrigin()` |
| `@fcalell/plugin-api/mcp` | `defineMcp()`, `McpDefinition`, `ProcedurePath`: what `src/worker/mcp.ts` default-exports |
| `@fcalell/plugin-api/procedure` | `createProcedure()`, `createJobs()`, `noSuch()` (a scope's `NOT_FOUND` refusal, "No such <scope>"), `JobBatch`, `JobMessage`, `JobScheduledEvent`, `Middleware`, `ProcedureConfig`, `STACK_READS_HEADER`, `STACK_WRITES_HEADER`: what the generated `.stack/procedure.ts` (`virtual:stack-procedure`) imports |
| `@fcalell/plugin-api/error` | `ApiError`, worker-safe (no Node-only deps): import this from route files |
| `@fcalell/plugin-api/client` | `createClient()`, `RouterClient`, `ClientConfig`, `isNotFound()`, `registerApiClient()`, `getRegisteredApiClient()` (the client `useAbility()` fetches the org rules through), `registerOperationContext()` |
| `@fcalell/plugin-api/wire` | the import-free wire constants: `STACK_READS_HEADER`, `STACK_WRITES_HEADER`, `STACK_NOT_FOUND_HEADER`, `STACK_EXPOSED_HEADERS`, `ENTITY_NAME_RE`, `ORG_RULES_PATH`, `SCOPE_ROUTES_PATH`, `LISTENER_ENV`, `ORIGIN_ENV`, `listenerOrigin()` |
| `@fcalell/plugin-api/query-invalidation` | `captureEntityHeaders()`, `invalidateForWrites()`, `handleMutationSuccess()`, `createEntityRegistry()`, `EntityName`: the framework-agnostic auto-invalidation core; `invalidateForWrites` takes the app's `Entity` names (type-only) |
| `@fcalell/plugin-api/types` | `Procedure`, `Router`, `RouterClient`, `ScopedRouterClient`, `InferRouter`, `EnvSpec`, `EnvValidation`: the types of the client and the worker |
| `@fcalell/plugin-api/schema` | `z` (Zod re-export), `ZodObject`, `ZodType`, `ZodRawShape`, `selector()` / `Selector` (rows a mutation acts on: ids, or a read's query less the unticked ids), `inputJsonSchema()` (a procedure's input as JSON Schema, also the MCP tool's), `routerSchema()` (every procedure of a router, the worker's `_router`: what `stack generate` writes to `.stack/schema.ts`) |
| `@fcalell/plugin-api/lib/cursor` | `encodeCursor`, `decodeCursor`, `paginate` (keyset over one or more order columns), `clampLimit`, constants |
| `@fcalell/plugin-api/lib/window` | `paginateWindow`: a `paginated: "window"` procedure's page at an offset with the filter's total, ordered by columns or SQL expressions over an optional join |
| `@fcalell/plugin-api/lib/selection` | `chosenWhere`, `chosenIds`: a `selector()` (from `/schema`) resolved to a where clause or ids |
| `@fcalell/plugin-api/lib/slugify` | `slugify`, `isReservedSlug`, `createSlugify`, `RESERVED_SLUGS` |
| `@fcalell/plugin-api/local-origin` | `isLocalOrigin()`: whether an origin's hostname is a local-dev one |

`RuntimePlugin`, the contract a runtime plugin implements, is `@fcalell/cli/runtime`'s.

## License

MIT
