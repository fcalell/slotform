# @slotform/api

API plugin for the `slotform` framework. Wraps Hono, oRPC and Zod so consumers only define
procedures. Provides the builder chain, the procedure factory, the typed RPC client and the
slot-driven worker codegen.

**Stack:** Hono, oRPC and Zod, all internal: consumers import none of them.

How it is built: [docs/architecture/plugins/api.md](../../docs/architecture/plugins/api.md).

## Install

```bash
slotform add api
```

## Guide

Writing procedures, worker middleware, the client, options, pagination and slugs lives in
`guide/`, indexed into a consumer's `.slotform/guide.md`:
[`add-a-procedure.md`](./guide/add-a-procedure.md), [`procedures.md`](./guide/procedures.md),
[`middleware.md`](./guide/middleware.md), [`client.md`](./guide/client.md),
[`mcp.md`](./guide/mcp.md), [`background.md`](./guide/background.md), [`config.md`](./guide/config.md) and
[`utilities.md`](./guide/utilities.md). Drawing the client's reads, acts and abilities is the query
plugin's (`@slotform/query`).

## Exports

| Subpath | Purpose |
|---------|---------|
| `@slotform/api` | `api()`, `ApiOptions`, `ApiError`, `Middleware`, `CallbackSpec`, `PluginRuntimeEntry` |
| `@slotform/api/runtime` | `createWorker()`, `AppBuilder`, `WorkerExport`, `ApiWorkerOptions`, `BaseContext`, `EnvCheckSpec`, `HandlerMount`, `slotformContext()`, `isForbiddenOrigin()`, `RATE_LIMITER_RPC` |
| `@slotform/api/mcp` | `defineMcp()`, `McpDefinition`, `ProcedurePath`: what `src/worker/mcp.ts` default-exports |
| `@slotform/api/procedure` | `createProcedure()`, `createJobs()`, `noSuch()` (a scope's `NOT_FOUND` refusal, "No such <scope>"), `extractIp()`, `JobBatch`, `JobMessage`, `JobScheduledEvent`, `Middleware`, `ProcedureBuilder`, `ProcedureConfig`, `ProcedureFactory`, `RateLimitBinding`, `RateLimitKind`, `ScopeLike`, `SLOTFORM_READS_HEADER`, `SLOTFORM_WRITES_HEADER`, `ORG_RULES_PATH`, `SCOPE_ROUTES_PATH`: what the generated `.slotform/procedure.ts` (`virtual:slotform-procedure`) imports |
| `@slotform/api/error` | `ApiError`, worker-safe (no Node-only deps): import this from route files |
| `@slotform/api/client` | `createClient()`, `RouterClient`, `ClientConfig`, `isNotFound()`, `registerApiClient()`, `getRegisteredApiClient()` (the client `useAbility()` fetches the org rules through), `registerOperationContext()` |
| `@slotform/api/wire` | the import-free wire constants: `SLOTFORM_READS_HEADER`, `SLOTFORM_WRITES_HEADER`, `SLOTFORM_NOT_FOUND_HEADER`, `SLOTFORM_EXPOSED_HEADERS`, `ENTITY_NAME_RE`, `ORG_RULES_PATH`, `SCOPE_ROUTES_PATH`, `LISTENER_ENV`, `ORIGIN_ENV`, `listenerOrigin()` |
| `@slotform/api/query-invalidation` | `captureEntityHeaders()`, `invalidateForWrites()`, `handleMutationSuccess()`, `EntityName`, `InvalidatableQueryClient`, `Register`: the framework-agnostic auto-invalidation core; `invalidateForWrites` takes the app's `Entity` names (type-only) |
| `@slotform/api/types` | `Procedure`, `Router`, `RouterClient`, `ScopedRouterClient`, `EnvSpec`, `EnvValidation`: the types of the client and the worker |
| `@slotform/api/schema` | `z` (Zod re-export), `ZodObject`, `ZodType`, `ZodRawShape`, `selector()` / `Selector` (rows a mutation acts on: ids, or a read's query less the unticked ids), `inputJsonSchema()` (a procedure's input as JSON Schema, also the MCP tool's), `routerSchema()` (every procedure of a router, the worker's `_router`: what `slotform generate` writes to `.slotform/schema.ts`) |
| `@slotform/api/lib/cursor` | `encodeCursor`, `decodeCursor`, `paginate` (keyset over one or more order columns), `clampLimit`, constants |
| `@slotform/api/lib/window` | `paginateWindow`: a `paginated: "window"` procedure's page at an offset with the filter's total, ordered by columns or SQL expressions over an optional join |
| `@slotform/api/lib/chosen` | `chosenWhere`: a `selector()` (from `/schema`) resolved to a where clause |
| `@slotform/api/lib/slugify` | `slugify`, `isReservedSlug`, `RESERVED_SLUGS` |
| `@slotform/api/local-origin` | `isLocalOrigin()`: whether an origin's hostname is a local-dev one |

`RuntimePlugin`, the contract a runtime plugin implements, is `@slotform/cli/runtime`'s.

## License

MIT
