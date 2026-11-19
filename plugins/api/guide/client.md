# Calling the API

`createClient` from `@fcalell/plugin-api/client` builds the typed client, on the web and the
phone alike, from the generated worker's `AppRouter`, imported type-only, so the app holds none of
the worker's source.

```ts
// src/app/lib/api.ts
import { createClient } from "@fcalell/plugin-api/client";
import { createApiQueryUtils } from "@fcalell/plugin-query/tanstack-query";
import type { AppRouter } from "../../../.stack/worker";

export const api = createClient<AppRouter>(); // url "/rpc", credentials "include"
export const orpc = createApiQueryUtils(api);
```

A query made through `orpc.*.queryOptions` travels as `GET` (its input in the URL) and a mutation as `POST`. Build the utils with `createApiQueryUtils` (the query plugin, `query()`): oRPC's own `createTanstackQueryUtils` sends queries as `POST`.

On the phone, pass an absolute `url` (`process.env.EXPO_PUBLIC_API_URL`). `headers` takes an
object, or a function returning one or a promise of one, read on every request (a key the device's
secure store answers later). `url` takes a function too, for a server chosen while the app runs (a
phone told its server's address at sign-in); clear the query cache when it changes, since the data
held is the old server's. A machine with no browser sends its device key there:
`headers: { authorization: "Bearer " + key }` (see the auth plugin's devices page).

## Queries

`@fcalell/plugin-query/tanstack-query` pairs the client with TanStack Query 5 and re-exports its
hooks (`useQuery`, `useMutation`, `useInfiniteQuery`, `useSuspenseQuery`, `useQueryClient`). Drawing a query on a screen is
`node_modules/@fcalell/plugin-query/guide/reads.md`.

```tsx
const { data } = useQuery(orpc.projects.list.queryOptions({ input: { organizationId } }));
const create = useMutation(orpc.projects.create.mutationOptions());
```

## Scope

A procedure with a `scope` takes the scope's id in its input (`organizationId`, `projectId`), and
the route's boundary supplies it: `ScopeBoundary` from `@fcalell/ui-core/react/scope` registers
the ids the layout resolved from the URL slug, and every call under it whose procedure names that
key gets the id (an explicit id wins). The query key carries the id, so two organizations'
`projects.list` never share a cache entry, and a screen under the boundary writes no id.

```tsx
<ScopeBoundary ids={{ organizationId: organization.id }}>
  <Outlet />
</ScopeBoundary>

useQuery(orpc.projects.list.queryOptions());
```

A boundary under another extends the outer ids (a project's `{ projectId }` joins the
organization's `{ organizationId }`). A call that names another scope passes its id.

A route `loader` runs before the boundary renders, so it names the ids it resolved, in the input or
once with `scoped(orpc, { organizationId })` from `@fcalell/plugin-query/tanstack-query`. A call
of a scoped procedure with no registered scope and no id throws before any request, naming the
procedure and the key; a procedure added since the last `stack generate` is not scoped until
generate runs.

## Not found

A procedure that throws `ApiError("NOT_FOUND")` reaches the screen as a failed query.
`isNotFound(error)` from `@fcalell/plugin-api/client` tells that error from any other, so the
screen draws its not-found state for it and its error state for the rest. A read's not found
travels as a 200 carrying `x-stack-not-found`, so a client of `/rpc` that is not stack's sees the
200.

```tsx
const project = useQuery(orpc.projects.get.queryOptions({ input: { projectId } }));
if (project.isError) return isNotFound(project.error) ? <ProjectNotFound /> : <ProjectError />;
```

## Cache invalidation

Write no invalidation code. A successful mutation invalidates every cached query whose `reads`
meet its `writes`, so the procedures declare both and the screens declare nothing.

- A query that never declared `reads` never invalidates on its own.
- A mutation that owns every cache it changes opts out with `meta: { skipAutoInvalidation: true }`.
- A query outside the API declares its reads on its options, `meta: { reads: ["member"] }`, and
  then refetches on those writes like an API query.
- A write the API never answered (a socket frame, a webhook) calls
  `invalidateForWrites(queryClient, ["member"])` from `@fcalell/plugin-api/query-invalidation`.
- The names in `meta.reads` and `invalidateForWrites` are the app's `Entity` (the union in
  `.stack/procedure.ts`, also exported from `.stack/worker`), so a typo fails `tsc` on web and
  phone. Stack registers TanStack Query's `queryMeta`; the app adds its own meta keys to a query
  directly and never registers `queryMeta` itself.
- A custom `mutationCache` passed to `createQueryClient` turns auto-invalidation off: the app
  owns invalidation then.

**Check:** `pnpm check` passes, and the screen shows the data under `pnpm dev`.
