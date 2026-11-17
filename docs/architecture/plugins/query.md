# plugin-query

`@fcalell/plugin-query` is the TanStack Query binding of the api's procedures: the query client and
its provider, the read builder over oRPC's query utils, the binding half of acts, the scope merge,
cache invalidation and the org-rules ability. The model it binds (`Read`, `Selection`, the hooks,
the run and save logic) is `@fcalell/ui-core`'s ([reads](../ui-core/reads.md),
[acts](../ui-core/acts.md)). How an app uses it is the plugin's guide (`plugins/query/guide/`).

## Contributions

`query()` requires `api` and owns no slot. Its contributions to react and vite are inert in an app
without either.

| Slot | Contribution |
|------|--------------|
| `react.slots.providers` | `<QueryProvider hold={paintWait}>` (`paintWait` from `@fcalell/ui-core/paint`) around the web app (`order: 2`) |
| `vite.slots.optimizeExclude` | `@fcalell/plugin-query/tanstack-query`, which imports `virtual:stack-schema` |
| `cliSlots.initDeps` | `@orpc/tanstack-query` |

On the phone, `plugin-native-ui` contributes the `QueryProvider` to `plugin-expo.slots.providers`,
with `listen` from `./net`. `QueryProvider` builds a stable default client lazily when none is
supplied, so a bare consumer gets working behaviour with no config, and it holds the port the read
hooks run on over that client.

## Source shipping

`./tanstack-query.tsx` ships as source for the bundler, while its siblings, plugin-api's client and
ui-core ship compiled from `dist`. So it imports its siblings by package name, never relatively: a
relative import would load a second copy of the registered client, the entity registry and the
model's state. `virtual:stack-schema` is `.stack/schema.ts`, which `stack generate` writes and the
bundler serves.

## Reads

`read.ts` is the TanStack half of a read: the query options a read carries, built from a procedure
of oRPC's utils, the first-load hold, the window's page loads and the dev check over the query cache.

Every procedure's utils carry `.read(input)` beside `.queryOptions`: the same input (`skipToken`
included), the output typed, as a `Read` handle. A procedure whose output is stack's paginated
envelope also gets `.pages(input)` (no `cursor`), a read of the flat list that pages in. One whose
output is the window envelope gets `.window(input)` (no `offset`), a read of the rows loaded from the
start that a collection under a scroller sizes to the total. Both carry the query they answer: the
input less its paging and sort.

A stream is not a load: its first write is the channel's own to hold. Its query carries
`meta.stream`, the one marker of a read that stays fetching while it is subscribed
(`isStreamQuery`).

**`watchUnheld`** names a read that fails with no data while a leaf paints it and no frame holds it.
`QueryProvider` runs it in dev, over the query cache. It is level-triggered: the cache's error event
says it, and so do its observer events over a read already failed (a painter arriving, a holder
leaving), judged against the query's own observers one tick later so the holders that mount in the
same commit count. A failure is named once. An ambient read (`meta: { ambient: true }`, the org
rules) has no frame by design: its failure leaves what it gates painted and inert.

### Preload

`preload(client, ...selections)` warms the cache for a route before its components mount, in the
client the caller hands it: the web router carries the client as its context and the phone's press
takes it from its provider, so no client is shared module-wide. It starts each distinct read of the
selections and never waits for one, so a route's `loader` returns at once and navigation is never
held. TanStack's own `staleTime` makes a fresh read a no-op. A failed prefetch is swallowed: the leaf
that mounts later retries and draws the failure. A stream is never started, since it never settles
with no observer to abort it, and neither is an idle read, which has no function to run.

## Scope

`./scope` sets the route's scope on oRPC's query utils: every call of a scoped procedure takes the
registered ids (`@fcalell/ui-core/scope`) in its input before the query key is built, so the id stays
in the key and two scopes never share a cache entry ([scope](./api.md#scope)). `withScope` covers
`queryOptions`, `infiniteOptions`, the keys, `call` and the `mutationFn` of `mutationOptions`. The
merge precedes the key, which carries the id. A procedure the schema does not name, or names with no
scope, is left as it is. The schema is a parameter because `virtual:stack-schema` resolves only in
the bundler, which builds `./tanstack-query.tsx` and not `./scope`.

## Cache invalidation

`createQueryClient` invalidates on every mutation success through the entity registry
([cache invalidation](./api.md#cache-invalidation)), unless the caller supplied its own
`mutationCache` (it owns invalidation then, and calls `guardReach` in its `onMutate`) or the mutation
opts out with `meta: { skipAutoInvalidation: true }`. A read's answer updates in place when a
mutation that declares `writes` on its entities succeeds: the mutations own the cache they change.

## Acts

`acts.ts` is the binding's half of an act: the sentence an oRPC refusal reads as, whether a failure
is worth running again, and the dev checks and the reach guard over TanStack's caches. The run and
save logic the hooks wrap is `@fcalell/ui-core/acts`.

- **`guardReach`** is the mutation cache's `onMutate`: nothing queues for a connection that is not
  there. While the browser is offline, or a cached read's `meta.reach` says the server is out (a
  socket lost), the mutation fails before any fetch with `Unreached`, so it never pauses and never
  fires later. `createQueryClient` runs it; a caller-supplied `mutationCache` must call it too.
- **`retries`** says whether a failed act is worth running again as it stands. A server that
  answered with a refusal (a 4xx: the input, the record's state, sign-in or permission) answers the
  same way to the same act, so its toast offers no Retry. A timeout (408), a rate limit (429), a
  fault on the server (5xx) or a request that never got an answer may go through the next time. A
  connection known to be out (`Unreached`) is the offline banner's to say, so it is no retry.
- **`refusal`** is a refusal the server worded for the viewer: a 4xx whose message the procedure
  chose, or, for an input its schema refused, the schema's first issue (its other issues are
  `issues`, each for its field). It answers nothing for 401, 403, 404 and 429: sign-in, permission, a
  missing record and a rate limit have their own screens or words. It answers nothing for a code's
  stock text either, which says nothing the act's own sentence does not.

## Abilities

`useAbility` and `ability()` compose the caller's org rules with an optional record layer into one
CASL `MongoAbility`. The org rules arrive as CASL's packed-rules arrays, opaque JSON at this layer
([ability wire format](./auth.md#ability-wire-format)).

- **Org rules.** `fetchOrgRules(organizationId)` reads the caller's rules in one organization: their
  role there, never the session's active organization. `orgRules` caches them per organization with
  `staleTime: Infinity`, so a missing client throws rather than caching a false deny-all forever; the
  query's error state (retries, deny-all meanwhile) surfaces it. `NOT_FOUND` means no org layer (the
  route exists only with organizations on) or no membership of the organization: both deny
  everything and neither is a real failure, so it answers `[]`. Every other error propagates, so a
  real outage surfaces through the query's error state and never as a silent deny-all. With no
  organization yet, `orgRules` answers `[]` at once (deny-all, no request), so what it gates never
  stays painted. The read is ambient: no frame holds it, so a failure leaves what it gates painted and
  inert, never a false yes.
- **Key.** `orgRulesQueryKey(id)` is shaped like `@orpc/tanstack-query`'s operation keys
  (`[path, { input }]`), so the entity registry (`@fcalell/plugin-api/query-invalidation`), which
  matches on the path, recognizes it: `auth.orgRules` declares `reads: ["member"]`, so a mutation that
  declares `writes` on an org subject (a role change writing `member`) invalidates every
  organization's rules, as for any other oRPC-backed query. `member` is a legal entity because auth
  contributes it to `api.slots.entities` ([entities](./api.md#entities)). The bare path,
  `ORG_RULES_QUERY_KEY`, is the prefix for explicit invalidation of all of them:
  `queryClient.invalidateQueries({ queryKey: ORG_RULES_QUERY_KEY })`.
- **Compose.** `composeAbility` is deny-all when both layers are absent (rules not loaded, no record
  layer); otherwise it concatenates org and record rules into one ability. The concatenation is safe
  because the subject namespaces cannot collide: org subjects are framework-owned lowercase resource
  names (`organization`, `member`, `invitation`), record subjects are consumer domain types. It is
  memoized by the array identity of the org and record rules. `useAbility` composes on every call,
  and a fresh `MongoAbility` class instance never `===` the last one, which would defeat structural
  sharing; identical array references always produce the identical ability.
- **Cache.** Only the plain packed-rules array is cached. The composed ability is a class instance,
  so it is never selected out of a query cache. Over the placeholder the composed ability stays the
  placeholder, so an act gated on it (`ability.at(a => a.can(...) ? act : { ...act, blocked })`)
  paints inert while the rules load and is never blocked.

## In the code

- `plugins/query/src/index.ts`: the plugin, its dependencies, guide pages and contributions
- `plugins/query/src/tanstack-query.tsx`: `QueryProvider`, `createQueryClient`, the query utils with `.read`, `.pages`, `.window`
- `plugins/query/src/read.ts`: the TanStack half of a read, streams, `watchUnheld`
- `plugins/query/src/preload.ts`: `preload`
- `plugins/query/src/scope.ts`: `withScope`, the scope merged into the utils' inputs
- `plugins/query/src/acts.ts`: `guardReach`, `retries`, `refusal`, `issues`
- `plugins/query/src/ability-client.ts`: the org rules read, its key and `composeAbility`
