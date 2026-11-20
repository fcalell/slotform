# Runtime architecture

How the generated worker runs: the `.slotform/worker.ts` chain `slotform generate` writes, the
`RuntimePlugin` protocol each plugin's runtime implements, the context every procedure and job
receives, the consumer's middleware and background handlers, the MCP endpoint, and the
`virtual:slotform-procedure` module that types a route handler's `context`.

## The generated worker

`slotform.config.ts` is never imported by the worker. The slot graph reads config at generate time and
inlines plugin options as JS literals into the file `api.slots.workerSource` produces.

`.slotform/worker.ts` is composed from the contributions to `api.slots.workerImports`,
`pluginRuntimes`, `callbacks` and `cors`, and is emitted only when the worker has something to run:
at least one plugin runtime or one consumer route.

```ts
import * as schema from "../src/schema/index.ts";
import * as routes from "../src/worker/routes/index.ts";
import createWorker from "@slotform/api/runtime";
import authRuntime from "@slotform/auth/runtime";
import dbRuntime from "@slotform/db/runtime";
import authCallbacks from "../src/worker/plugins/auth.ts";

const worker = createWorker<Env>({
  prefix: "/rpc",
  cors: ["https://example.com", "https://app.example.com"],
  devCors: ["http://localhost:8081", "http://localhost:8787"],
  envChecks: [{ name: "AUTH_SECRET", minLength: 32 }, { name: "APP_URL", url: true, devLocalhost: true }],
})
  .use(authRuntime({ trustedOrigins: ["https://example.com", "https://app.example.com"], callbacks: authCallbacks /* , … */ }))
  .use(dbRuntime({ binding: "DB_MAIN", schema }))
  .handler(routes);

export type AppRouter = typeof worker._router;
export type { Entity } from "./procedure.ts";
export default worker;
```

Runtime code lives in each plugin's `src/worker/`, published from the `./runtime` subpath
([plugin folder structure](./conventions.md#plugin-folder-structure)).

### Chain order

The chain is `createWorker(options)`, then the plugin runtimes (`.use`), then the consumer's
middleware (`.use`), then `.handler(routes)`. Plugin runtimes come first so composition middleware
sees the context they inject (`c.var.db`, `c.var.auth`). The runtimes are emitted apart from the
middleware so callbacks are spliced into their options without touching the expression tree.

The generated `.use(...)` runtimes are sorted by plugin name, so the worker source is the same
whatever the order of `config.plugins`. That order carries no meaning: each runtime attaches its
own `c.var.<plugin>`, and `.handler()` reorders by `dependsOn` (below) before anything runs.

The routes handler is a value slot that api seeds only when the consumer has at least one routable
file under `src/worker/routes`. The worker imports `../src/worker/routes`, which resolves to the
generated `index.ts` barrel, and the barrel is skipped with no routes, so the handler is gated on
the same predicate and handler, barrel and import are wired together or not at all. A plugin that
owns the root handler shape overrides the slot with `override: true`.

### Request order

`.handler()` builds a Hono app in this order:

1. The framework wrappers: CORS, the request logger, secure headers.
2. The liveness route, `GET /`, answering `{ ok: true }`. It is registered before the env and
   context middleware so it needs no bindings: Hono runs handlers in registration order, so the
   middleware below never runs for it.
3. The consumer's Hono middleware that runs before context injection, in contribution order.
4. Context injection: the plugin context of the invocation (below), then each runtime plugin's
   `fetch(request, env, ctx)`, in the `dependsOn`-sorted order. A plugin that owns a URL prefix
   (auth's `/api/auth`) claims the request by returning a `Response`, and passes with `null` or
   `undefined`. A claimed path returns inside this step and never reaches the steps after it.
5. The post-context middleware, mounted after injection and before any route, so it reads
   `__slotformCtx` through `slotformContext(c)`; everything above it runs with no context at all.
6. The oRPC handler at the configured `prefix` (`/rpc`). Its `GET` and `POST` wire is the
   [wire contract](./plugins/api.md#wire-contract).
7. `POST /mcp`, when `src/worker/mcp.ts` exists ([MCP endpoint](#mcp-endpoint)).

The plugin context of one invocation is shared by a request and a job: the env checks (value
validation once per isolate), each runtime's `validateEnv`, then every plugin's `context(env, ctx)`
and every context-injecting fn entry, in sorted order over the base context.

## Runtime plugin protocol

`RuntimePlugin` in `@slotform/cli` is the protocol every plugin that ships a worker runtime
implements. A runtime contributes typed context to the request chain and may register oRPC routes
or intercept HTTP requests (`fetch`, step 4 above).

A `RuntimePlugin` declares `dependsOn: readonly string[]` (other plugins' `name`s) when it reads
another plugin's `context()` output. `.handler()` stable-topologically sorts the plugin entries of
the `.use()` chain by `dependsOn` before running any `context()` or `fetch()`, so a dependency's
context always builds first whatever the registration order. Fn and middleware entries keep their
positions; the reordered plugins go back into the positions plugin entries already held, and
plugins with no `dependsOn` edge between them keep their relative order. That is what lets the
generated worker sort runtimes alphabetically for deterministic codegen while dependencies still
run first. A name that is not registered is ignored: presence is validated at config level by
`requires`. This is the runtime analog of a slot's `inputs`
([contributing and deriving](./slot-graph.md#contributing-and-deriving)). `authRuntime` declares
`dependsOn: ["db"]` since it reads `upstream.db`.

A `RuntimePlugin<TName, TDeps, TProvides, TRoutes>` may also register oRPC routes through
`routes(procedure)`. `@slotform/cli` keeps `procedure` as `unknown`; the plugin narrows it with one
cast to the `api` plugin's `ProcedureFactory`, and its return type is `TRoutes`. `AppBuilder<TContext,
TPluginRoutes>` accumulates each `.use(plugin)`'s `TRoutes`, and `.handler(routes)` returns
`WorkerExport<TPluginRoutes & TConsumerRoutes>`, so `AppRouter` (`typeof worker._router`) holds the
plugins' procedures beside the consumer's, and the typed client and `Fixtures<AppRouter>` reach
them. A plugin without `routes` contributes the empty type. Which `auth.*` procedures auth's
runtime adds, by option: [procedures](./plugins/auth.md#procedures).

## The context

The base context every procedure starts from is `env`, `httpRequest` (the raw HTTP `Request`),
`reqHeaders`, `resHeaders` (oRPC's header plugins), `executionCtx` and `_devMode`. `env` takes the
type the deploy target names through `api.slots.envType`: `BaseContext<TEnv>` and
`createWorker<TEnv>` carry it, and the generated worker and procedure entry render
`createWorker<Env>(…)` on Cloudflare, so `context.env.APP_URL` reads as `string` and an undeclared
var is a type error. Without a target that names one (node) `env` is `unknown`. The parameter is
type-only; `envChecks` stays the runtime guard.

The `db` plugin adds `db`; the `auth` plugin's runtime adds `auth`, `tenancy` and `_rateLimiter` (and `oauth`
with `mcp`), and its auth middleware `user` and `session`; the MCP endpoint adds `_caller`. A scoped
procedure then writes each resolved tier's row under its scope's name, `organization` and `member`
at the root. The raw request is `httpRequest`, not `request`, because a consumer's scope takes its
table's name and `request` is a common one. `defineScope` throws on a scope named after one of these
keys, since the row would overwrite it ([scopes' rules](../../plugins/auth/guide/scopes.md#rules));
its list checks the `api` plugin's `BaseContext` keys by type, so
a key added there fails to compile until it is listed.

### Dev mode

`SLOTFORM_DEV=1` reaches the worker only in local dev, from the deploy target: `.dev.vars` on Cloudflare
([.dev.vars](./plugins/cloudflare.md#devvars)), the dev process's env on Node
([node's dev](./plugins/node.md#dev)). `createWorker` derives `_devMode` from
`env.SLOTFORM_DEV === "1"`, the one dev predicate every gate reads, and threads it through the base
context, so `_devMode` is false in production. Rate limiting (the `api` plugin's `rateLimit` middleware, the `auth` plugin's `/api/auth/*`
limiter) is skipped whenever `_devMode` is true. The same flag admits the dev origins
([CORS and origins](./plugins/api.md#cors-and-origins)).

### Env checks

The worker asserts its env values once per isolate and `checkEnv(env)` runs every check at once;
both are the `api` plugin's ([env vars](./plugins/api.md#env-vars)). Binding presence is a per-request
`validateEnv` on the runtime plugin that owns the binding (db), and `checkEnv` runs those too.

## Middleware

The consumer's middleware is an implicit contribution through two convention files, each published
through `api.slots.middlewareEntries` so third-party plugins can interleave middleware around them:

- `src/worker/middleware.ts` runs before context injection, with no context.
- `src/worker/middleware.context.ts` runs after it, registered with `.useAfterContext()`, so it and
  the raw Hono routes it registers read `db` and `auth` through `slotformContext(c)`.

What belongs in each file is the guide's [worker middleware](../../plugins/api/guide/middleware.md).

An entry is a middleware call plus the builder method that mounts it: `use` before the worker
injects its plugin context, `useAfterContext` after (the only side that can read `db` and `auth`).
`worker.ts` and `procedure.ts` share that one type, so both rebuild the identical chain. Entries are
ordered by `phase` (`before-cors`, `after-cors`, `before-routes`, `after-routes`, `after-context`),
then by `order` ascending, stable within ties; the ordered calls feed `api.slots.middlewareCalls`
and their deduplicated imports `api.slots.middlewareImports`, which join `workerImports`.

`.use(fn)` dispatches on the function's arity: Hono middleware is `(c, next) => Promise<Response |
void>` (arity 2), a context-injecting fn is `(ctx) => extra` (arity 1). How a consumer exports middleware
is the guide's [rules](../../plugins/api/guide/middleware.md#rules).

## Background handlers

With `src/worker/queue.ts` and `src/worker/scheduled.ts`, `.handler(routes, { …, queue, scheduled })`
(each key only for a file that exists; a worker with plugins and no routes passes `{}` for the
routes) adds `queue(batch, env, ctx)` and `scheduled(controller, env, ctx)` to the exported worker,
present only when mounted, so Cloudflare's queue and cron events reach the same module its fetch
does. A mount is set when its convention file exists, and the file is refused unless the app has a
worker to mount it on (a routes directory or a plugin runtime). Writing the files is the guide's
[background work](../../plugins/api/guide/background.md).

Both build their context with the function the request path uses (the env checks, each runtime's
`validateEnv`, then every plugin's `context(env, ctx)` and every context-injecting `use(fn)` in
dependency order). The job context holds `env`, `executionCtx` (`waitUntil` only, a no-op when the
runtime gave no context), `_devMode` and what the plugins provide (`db`, `auth` runtime, `tenancy`);
it has no `httpRequest`, `reqHeaders` or `resHeaders`, no user or session, and no plugin `fetch` or
middleware runs for it. `.slotform/procedure.ts` exports `JobContext` (`WorkerContext` without those
three keys, as a mapped type: the base context's index signature would make `Omit` drop every named
key) and `defineQueue` / `defineScheduled`, from `createJobs` typed against it. Each returns its
handler as given; `defineQueue<Body>(run)` is the plain function, and the generated worker mounts
it. A handler's throw is rethrown: the queue redelivers the batch (messages the handler acked first
stay acked), a cron invocation is logged as failed. The `node` plugin refuses both files, since a Node
server never calls them.

## MCP endpoint

With `src/worker/mcp.ts`, `.handler(routes, { mcp, name })` also mounts `POST /mcp` after context
injection (any other method is `405`). Its order:

1. A forbidden `Origin` is `403`.
2. The context's `oauth.verify(request)` answers the verified agent or its challenge `Response`,
   returned unchanged ([MCP OAuth](./plugins/auth.md#mcp-oauth)). A `401` first draws the per-IP
   `RATE_LIMITER_RPC` budget, outside dev mode, since a forged `kid` costs a key refetch; an
   accepted token never does, as `verify` limits per grant.
3. The body is read to 4 MiB (`413`); invalid JSON is `400`, a batch `400`.

The MCP SDK serves it statelessly for both protocol eras, each request a fresh server. Each listed
procedure runs through oRPC in process with the Slotform context, the pinned `tenancy`,
`_caller: { user, session }` from `verify` (the auth gate takes it in place of `getSession`; `/rpc`
never sets it), `reqHeaders` without `cookie` and `authorization`, an `httpRequest` rebuilt from
them with no body, and a fresh `resHeaders`. The tools resolve against the consumer routes when
`.handler()` runs, so a tool the endpoint cannot serve fails the boot ([MCP](./plugins/api.md#mcp));
the SDK loads on the first `/mcp` request. `.query()` and `.mutation()` stamp oRPC meta `kind`, from
which a query tool carries `readOnlyHint`. An `ORPCError` is an `isError` result of
`{ code, message, data }`; any other throw is a masked `INTERNAL_SERVER_ERROR` result and is logged.

## `virtual:slotform-procedure`

`src/worker/routes/*.ts` files author procedures with
`import { procedure } from "virtual:slotform-procedure"`. The specifier resolves through a tsconfig
`paths` alias to `api.slots.procedureSource`'s generated `.slotform/procedure.ts`, not a bundler
virtual-module plugin, since the worker never runs through Vite. esbuild (`wrangler` dev and deploy
bundling) resolves tsconfig `paths` natively, and the node target maps the specifier with a
`registerHooks` resolve hook ([runtime](./plugins/node.md#runtime)); `paths` needs no `baseUrl` to
resolve relative to the tsconfig's own directory (TS 4.1+). Which tsconfig holds the alias and how
the bundler finds it: [TypeScript projects](./consumer-project.md#typescript-projects). The `api` plugin
declares the alias for `slotform init`'s tsconfig template only, never for `slotform generate`, since the
tsconfig is scaffolded once. Its own presence is the gate: an app with no runtimes has no
`.slotform/procedure.ts`, and the declared alias then never resolves, which is harmless.

`.slotform/procedure.ts` is gated the same way `workerSource` is: no runtimes and no routes, no
artifact. The slot's compute is the one place that gate is checked; the renderer itself renders a
runtimes-less chain.

```ts
// .slotform/procedure.ts (generated)
import createWorker from "@slotform/api/runtime";
import type { AppBuilder } from "@slotform/api/runtime";
import { createJobs, createProcedure } from "@slotform/api/procedure";
const __chain = createWorker<Env>({ prefix: "/rpc", cors: [/* … */] }).use(dbRuntime({ binding: "DB_MAIN", schema }));

type ContextOf<B> = B extends AppBuilder<infer C> ? C : never;
export type WorkerContext = ContextOf<typeof __chain>;
type RbacStatements = Record<never, never>; // or auth's contributed statements
export type Entity = string; // or a contributed "projects" | "tasks" union
// … JobContext, defineQueue, defineScheduled
export const procedure = createProcedure<WorkerContext, RbacStatements, Entity>();
```

### The rebuilt chain

`TContext`, the type argument to `createProcedure`, matches the request context `.slotform/worker.ts`
builds at runtime: the same runtime plugins, the same options, the same `.use()` order and the same
consumer middleware chain. A context-injecting middleware (arity 1) extends `TContext` as a runtime
plugin does, so leaving it out would compile `.slotform/procedure.ts` against a narrower context than
the worker builds and hide a key such as `requestId` a route handler should see. Rather than derive
each runtime factory's or middleware's generics by hand, the file rebuilds the identical chain as
real code that is never exported or called further, and TypeScript infers `TContext` from
`typeof __chain`, the way `.slotform/worker.ts` gives `AppRouter` (`typeof worker._router`). The
runtime factories and middleware are pure: constructing them without calling `.handler()` has no
observable effect. The chain mirrors the worker's loop (runtimes, then the middleware chain, the
same order), with `middlewareCalls` and `middlewareImports` beside `pluginRuntimes`, minus two
things: the callback splicing, since callbacks are an options passthrough for request-time behavior
and never change a `RuntimePlugin`'s declared `TProvides`, and the terminal `.handler(...)`, since
the chain is only typed.

The file takes the full `workerImports` list, since a runtime option value can reference an
identifier that needs its own import (db's `schema`, contributed beside the `pluginRuntimes` entry,
not on it), minus the route barrel: route files import `virtual:slotform-procedure`, so this file
importing the barrel back would be a cycle. The exclusion guards only the routes-to-`procedure.ts`
direction. `WorkerContext` is exported so post-context middleware types
`slotformContext<WorkerContext>(c)`. `procedure.ts` imports the middleware files, so a middleware file
that imports a route, or imports `WorkerContext` as a value, closes a cycle; the guide's
[rules](../../plugins/api/guide/middleware.md#rules) keep both out.

`TStatements` (the autocomplete of `procedure({ rbac })` and `procedure({ can })`) comes from
`api.slots.rbacStatements`, a plain-JSON handoff `auth` contributes; its source and the
`Record<never, never>` fallback are in the [slot catalog](./slot-catalog.md#apislots-the-api-plugin).

### Input and output types

The builder derives two types from one input schema: the caller's side is the config's additions
merged with `z.input`, the handler's side the additions' handler form merged with `z.output`. The
additions split the same way: a scope adds `<name>Id: string` to both, and `paginated: true` adds
an optional `limit` for the caller and `limit: number` for the handler, because the input defaults
it (`paginated: "window"` the same for `offset`; `sort` adds the typed `sort` field).
`.output(schema)` swaps the sides: the handler returns `z.input` and the caller receives
`z.output`. oRPC parses the input before the handler runs and sends the validated output, so the
split is types only; the runtime chain is the same. `Procedure<TInput, TOutput>` carries the
caller's side only, because every reader of a built procedure is a caller: `RouterClient`,
`createClient`, `createApiQueryUtils` and the emitted `.slotform/types` declarations, which inline the
brand. The handler's side is used only where the handler is written, so a third parameter would be
read by nothing and grow every emitted declaration.

## In the code

- `packages/cli/src/runtime.ts`: the `RuntimePlugin` protocol, `dependsOn`, `fetch`, `routes`.
- `plugins/api/src/worker/index.ts`: `createWorker`, the request order, the `dependsOn` sort, the invocation context, `checkEnv`, middleware dispatch, the MCP and job mounts.
- `plugins/api/src/node/codegen.ts`: the worker chain's emit order and the middleware ordering.
- `plugins/api/src/node/procedure-codegen.ts`: `.slotform/procedure.ts` and its rebuilt chain.
- `plugins/api/src/node/types.ts`: the middleware entry type both files share.
- `plugins/api/src/index.ts`: the runtime sort, the routes handler slot, the background mounts, the middleware convention files, the `virtual:slotform-procedure` alias and the procedure source slot.
- `plugins/api/src/procedure.ts`: the procedure builder and the background handler factories.
