# plugin-api

`@fcalell/plugin-api` owns the worker: every fragment of `.stack/worker.ts` and `.stack/procedure.ts`,
the procedure factory route files call, the wire contract between the worker and its clients, the
typed RPC client and the client half of entity-based cache invalidation. This page covers how those
parts are built: the plugin's contributions, the generated files, the CORS and env derivations, the
worker's guards, the procedure factory, the wire, the client and the router schema. Writing
procedures and calling them is the consumer guide's ([procedures](../../../plugins/api/guide/procedures.md),
[client](../../../plugins/api/guide/client.md)); the slots themselves are
listed in the [slot catalog](../slot-catalog.md#apislots-plugin-api).

## Overview

The plugin is built with `plugin` from `@fcalell/cli`. Every worker fragment it owns is a slot; peer
plugins (`db`, `auth`, `vite` and the rest) contribute into them by importing `api.slots.*` and calling
`.contribute(fn)`. The final `.stack/worker.ts` comes out of the `workerSource` derivation, which
reads every other slot structurally, so no order between contributions needs reasoning about.

```ts
import { plugin } from "@fcalell/cli";
import { cliSlots, emitArtifact } from "@fcalell/cli/cli-slots";

export const api = plugin("api", {
  label: "API",
  schema: apiOptionsSchema,
  // One server target, cloudflare by default; a client of another app's server runs none.
  requires: (options) =>
    options.server === undefined ? [{ oneOf: ["cloudflare", "node"] }] : [],
  gitignore: [".stack"],
  slots: { workerImports, pluginRuntimes, /* ... */ workerSource },
  contributes: (self) => [
    emitArtifact(".stack/worker.ts", self.slots.workerSource),
    // procedure file, schema, route barrel, watchers, remove cleanup
  ],
});
```

The deploy target (cloudflare or node) runs the worker in dev and deploys it; api contributes no dev
process and no deploy step.

## Lifecycle contributions

| `cliSlots` slot | Behavior |
| --- | --- |
| `tsconfigPaths` | `virtual:stack-procedure` to `./.stack/procedure.ts`, read by `stack init`'s tsconfig template |
| `artifactFiles` | `.stack/worker.ts` and `.stack/procedure.ts` (when any runtime or route is present), the `src/worker/routes/index.ts` barrel, and in a client-only app `.stack/schema.ts` and `.stack/server.ts` |
| `postWrite` | `.stack/schema.ts` and `.stack/server.json`, once the barrel and `.stack/procedure.ts` are on disk ([Schema](#schema)) |
| `devWatchers` | `routes`: watches `src/worker/routes/**` and regenerates the barrel on add and unlink. `server-schema`: in a client-only app, copies the server's `.stack/schema.ts` when it changes |
| `removeFiles` | `src/worker/routes/` |

## Generated files

`.stack/worker.ts` is the rendered `workerSource`, pulled into `cli.slots.artifactFiles` by the
plugin's own contribution. It is written only when the worker has anything to run: at least one
plugin runtime or at least one consumer route. `.stack/procedure.ts` (`procedureSource`, the target of
`virtual:stack-procedure`) has the same gate. The chain the worker file holds is described under
[the generated worker](../runtime.md#the-generated-worker).

## Routes barrel

The barrel `src/worker/routes/index.ts` is rendered by `routeBarrelSource`, which is null when there
is nothing to barrel (no routes directory, or one with no routable files); `emitArtifact` skips the
write on null, so a worker-only or no-routes project never gets a header-only stub in its tree. The
derivation has no slot inputs: it reads `ctx.cwd` through `generateRouteBarrel` and
`hasRoutableFiles`, because the routes directory is the consumer's source tree, not slot data.
`routesHandler` shares the `hasRoutableFiles` predicate, so the import, the handler and the barrel
agree.

The layout rules:

- **Flat.** `src/worker/routes/<name>.ts(x)` is one oRPC procedure file per name. Subdirectories are
  ignored; a consumer who wants nested namespaces writes its own barrel and imports it.
- `index.ts` and `index.tsx` are the barrel and are excluded, so it never re-exports itself.
- `.test.ts(x)` files are excluded (a test poisons the runtime barrel) and so are `.d.ts` files (a
  declaration has no runtime export).
- A name present as both `.ts` and `.tsx` (`users.ts` and `users.tsx`) is ambiguous: TS module
  resolution picks one and `export * from "./users"` would swallow the other, so codegen throws.

The barrel re-exports each file with its full filename, and the barrel's import source in
`api.slots.workerImports` is the explicit `index.ts`: plain node (the plugin-node target) resolves
neither directory imports nor extensionless specifiers, and tsx, esbuild and Vite accept the explicit
form, so one form serves every target. That import source is one shared constant, which
`procedure-codegen.ts` also reads to leave the barrel out of `.stack/procedure.ts`'s imports: route
files import `virtual:stack-procedure`, so the procedure file importing the barrel back would be a
cycle.

The worker tracks which plugin runtime registered each top-level route key. A consumer route key that
collides with one throws naming the owner, where `{ ...pluginRoutes, ...consumerRoutes }` would let the
consumer clobber the plugin's route (a consumer barrel that exports `auth` shadowing plugin-auth's
`auth.orgRules`).

## Runtime

The `./runtime` export's default is `createWorker()`. It takes plain `ApiWorkerOptions` and depends on
no config: `cors` (the production allow-list), `devCors` (honoured only under `STACK_DEV`), `prefix`
and `envChecks`. The generated worker passes the origins derived from `app.domain` and `app.origins`.

```ts
import createWorker from "@fcalell/plugin-api/runtime";

createWorker({ cors: ["https://example.com"], prefix: "/rpc" });
```

The type of the worker's `env` comes from `api.slots.envType`, handed over by the deploy target that
declares one (cloudflare: the global `Env` that `wrangler types` writes). `workerBase` bakes it as
`createWorker`'s type argument, so every handler's `context.env` carries it. The seed `null` means no
target names one and `env` stays `unknown`. The slot is `override: true` because one target is
authoritative.

## Worker-owned URL prefixes

`api.slots.routePrefixes` lists the URL prefixes the worker owns. Deploy-target plugins read it to
route requests to the worker (a Node server mounts these paths on the worker's fetch handler, a proxy
forwards them) without reaching into api's options. api contributes its own `prefix`; a plugin that
mounts further worker-owned paths contributes them too (auth's `/api/auth`).

## Listener contract

A deploy target that serves further listeners sets two env vars on the env it hands the worker, from
the server and never from a request header: `STACK_LISTENER` names the listener and `STACK_ORIGIN` the
one origin it serves. Both are unset on the main listener. How node runs several listeners is under
[hosts and listeners](node.md#hosts-and-listeners).

## CORS and origins

### The production list

`api.slots.cors` is the final CORS list peer plugins read. The override contract: `app.origins`
present, even empty, is the list verbatim; absent, the list derives from `app.domain` and appends the
extras contributed to `api.slots.corsOrigins` (free-form origins frontend plugins add). The check is
`!== undefined` on purpose: `[]` is a valid override that the runtime catches as a misconfiguration,
and a truthiness test would treat it as present only by a JS coercion quirk. Mixing `"*"` with specific
origins has undefined semantics in the CORS spec and across browsers, so codegen refuses the mix.

`cors` is always emitted, an explicit `[]` included: the runtime throws on an empty list and applies a
non-empty one, and dropping the empty list in codegen would make the override a no-op. At runtime an
explicitly empty list throws (`app.origins: []` leaves browsers failing preflights with no diagnostic
otherwise), while `undefined` is allowed for a non-browser worker that needs no CORS.

### Local and dev origins

**Local origins** are the local-dev hostnames in `lib/local-origin.ts`. An origin matching one is a
dev origin wherever it appears: the `cors` derivation strips it from the baked production list and
`devCorsOrigins` picks it up. The match runs against `new URL(origin).hostname`, and `URL` keeps IPv6
brackets on `.hostname` (`[::1]`, not `::1`), so the bracketed form is listed too.

`api.slots.localOrigins` says where the local origins of `app.origins` belong. `dev`: they are dev
origins, stripped from the deployed list and re-admitted under `STACK_DEV`, so a deployed worker never
trusts localhost. `deployed`: the deploy target is itself local (the node server bound to loopback),
so they are the deployed list. The target contributes the value.

`api.slots.devCorsOrigins` holds dev-only origins: the localhost dev servers frontend plugins run
(vite, Metro) and the local origins the consumer listed in `app.origins`. They stay out of `cors`
because that list is baked into the deployed worker, and a production deploy that accepts credentialed
localhost origins is an open door. They are emitted apart from `cors` and omitted when empty, so a
worker with no dev origin carries no dev surface. vite and expo contribute their dev server's
localhost unless `app.origins` is set; the predicate is `!== undefined`, the same as the `cors`
derivation, so an `app.origins: []` lockdown stays locked and every reader of `app.origins` agrees.
vite reads its port from `vite.slots.devServerPort`, so the origin follows `options.port`.

`api.slots.devTargetOrigins` holds the dev origins of the deploy targets' own dev processes (the node
server, wrangler). The server's own origin is a dev origin: with no frontend plugin it is the only
one, so `APP_URL`'s dev default and the dev trusted origins derive from it. `app.origins` overrides
this dev list too, as it does for vite and expo. It stays apart from `devCorsOrigins` so a frontend's
origin always comes first: every dev list is `[...devCorsOrigins, ...devTargetOrigins]`, and
`APP_URL`'s dev default is a frontend's origin whenever there is one.

The two lists, frontends first, are emitted as `createWorker({ devCors })` and
`authRuntime({ devTrustedOrigins })`, apart from the production lists, and each runtime appends them
only when `STACK_DEV` is set, so the deployed worker refuses a credentialed localhost origin. What auth
does while they are live (its cookie `sameSite`) is under [origins and cookies](auth.md#origins-and-cookies),
and the `APP_URL` dev default under [APP_URL default](auth.md#app_url-default).

`api.slots.nativeScheme` is the deep-link scheme of the app's native client: a trusted client origin
no CORS list can carry, since `<scheme>://` is no HTTP origin. The native frontend contributes it;
null without one.

### At runtime

CORS mounts first, so preflights and error responses always carry CORS headers; mounted after the
logger or `secureHeaders`, it would leak non-CORS responses to the browser whenever an earlier layer
short-circuits. The effective allow-list is resolved per request, not at construction: the dev origins
apply only under `STACK_DEV`, the origin of the listener a request came in on (`STACK_ORIGIN`) is
always its own, and the same list backs `isForbiddenOrigin`.

`isForbiddenOrigin` is the CSRF guard for state-changing raw routes, which bypass the RPC tree's
JSON content-type check (a multipart R2 upload). It is true when the request carries a browser Origin
that is not on the effective allow-list. That list holds the dev origins only under `STACK_DEV`, and
it is empty on a worker configured without CORS, so there no browser Origin passes. A request with no
Origin passes: a browser cannot drive one cross-site, and the native client sends none.

## Env vars

`api.slots.env` lists the env vars the worker reads, each declared once by the plugin that reads it
(`{ name, devDefault, validate? }`), never by a deploy target. The consumer's `env` option declares
the vars its own worker code reads (an email provider key) the same way, so every deploy target and
the env assertion see them. Deploy targets render the list: cloudflare into `.dev.vars` and `[vars]`,
each var deploying as a secret; node sets each var the shell leaves unset to its `devDefault` in the
dev process. `workerBase` bakes the list into `envChecks` on both. A static-only cloudflare deploy (no
api) reads the slot as `[]`. A duplicate name is an error: two plugins
disagreeing on a `devDefault` is a misconfiguration. The list is unsorted, so `.dev.vars` keeps the
declaring plugin's order.

`envChecks` are the value assertions, baked at codegen from the list plus each entry's validation
hints and flattened (hints beside `name`) so the emitted literal stays small. Presence is always
checked; hints tighten it. `devLocalhost` refuses to serve when `STACK_DEV` is set but the value's
hostname is not local: dev settings (rate limits off, localhost trusted) must never reach a deploy
pointed at a real URL, and the check is the canary for a deploy that shipped them.

The worker export's `checkEnv(env)` throws one error naming every env var the app needs and the env lacks or
holds wrong (the baked checks and each runtime plugin's `validateEnv`). The Node server calls it before
it listens, so a missing `AUTH_SECRET` stops the boot. A Worker has no start, so its first request runs
the same checks, once per isolate: a failed run sets no flag, so a misconfigured isolate keeps failing.

## Rate limiting

The worker's whole `/rpc` tree has one blanket per-IP volume limiter on a dedicated wrangler
`rate_limiter` binding, `RATE_LIMITER_RPC`. The name is the contract with plugin-cloudflare, which
provisions the binding ([rate limiters](cloudflare.md#rate-limiters)). The binding is never shared
with the auth surface's `RATE_LIMITER_IP` and `RATE_LIMITER_EMAIL` or with a procedure's own
`rateLimit: "ip"` middleware: a shared binding would double-draw one budget (halving the limit for a
procedure that also declares `rateLimit: "ip"`) and let `/rpc` volume starve `/api/auth`'s budget.

It is a fixed ceiling, not a consumer option: 1000 requests per 60 s per IP, far above any legitimate
single client, low enough to catch a runaway retry loop or a scraper, and sized so a shared
carrier-NAT IP (a mobile network, a corporate proxy) never trips it. It runs in production only, and
skips when no `RATE_LIMITER_RPC` binding is present (a worker-only project that has not run
`wrangler types` or deployed the binding). A deploy with no api has no `/rpc` tree to limit.

## Auth refusals

A procedure's auth middleware reads the session through the auth layer's lookup. A session-store
outage (D1 down, a misconfigured binding) surfaces as a 500: folded into `UNAUTHORIZED`, it would read
to the client as "your session is invalid" and set off a sign-out storm across every client retrying
at once. Only an absent or incomplete session and a refusal of the credential itself are auth
failures.

The lookup's refusal is read structurally, since api never imports the auth library: an error that
carries an HTTP status of 401 or 403 (a revoked, disabled or expired key, or a bearer the lookup does
not accept) is `UNAUTHORIZED`, and 429 (a key over its rate limit) is `TOO_MANY_REQUESTS`. Any other
error is not the credential's fault and surfaces as a 500.

## Logging

The worker's request log prints the method and the pathname only. A query travels as
`GET <prefix>/…?data=<its input>`, so Hono's own `logger()`, which prints the path with its query
string, would put every read's input (an email, an id, a search term) in the worker's logs.

## Wire contract

`wire.ts` holds the constants the worker and the client bundles share: the entity headers, the
not-found header, the exposed-header list, the entity-name pattern, the framework-owned paths and the
listener env names. It is import-free by construction (like `plugins/expo/src/version-gate-shared.ts`),
so a client bundle that needs only these constants does not drag in `procedure.ts`, which pulls in
`@orpc/server`, zod and the procedure builder. `procedure.ts` re-exports them, so
`@fcalell/plugin-api/procedure` consumers (generated code, plugin-auth's worker) read them there.

### Reads travel as GET

The RPC route answers GET and POST. A query travels as GET, its input in `?data=` (oRPC's own
encoding); every other call (a mutation, a call outside TanStack Query) is a POST. `createClient`
sets the `RPCLink` `method` from the operation context oRPC's TanStack Query utils put on each call
([Client](#client)): `queryOptions`, `infiniteOptions` and the streamed and live forms are reads,
`mutationOptions` and a call outside the utils are not. The wire so carries the kind that otherwise
exists only in the worker, and a reader of the wire, such as the screens workbench's answerer, tells a
query from a mutation by the method, which is what lets the workbench force a state on queries alone.

A query is also the one kind that answers a GET: oRPC's `RPCHandler` refuses GET (`405`) on a
procedure whose route method is not GET (`StrictGetMethodPlugin`, on by default), and `stamp` in
`procedure.ts` gives only a query the GET method, so a cross-site navigation can only trigger a read,
and a mutation or a bare handler never runs from a link.

The trade-offs of GET reads:

- A query's input is in the URL, so it reaches access logs and the browser history ([Logging](#logging)
  keeps it out of the worker's own log).
- An input too long for the URL (oRPC's `maxUrlLength`, 2083 characters) falls back to POST on its
  own, which the worker still accepts for a query.
- A cross-origin GET is not preflighted, which is safe only because it reaches reads.
- The response carries no `Cache-Control` and no validator, so nothing caches it.

A request that is not a GET must carry `Content-Type: application/json`, checked before it reaches the
RPC handler. oRPC parses a request with a missing Content-Type as JSON, and `SameSite=None` (for the
native client) lets a browser send one cross-site without a CORS preflight. The media type is
lowercased first: RFC 9110 treats it case-insensitively (`Application/JSON` is valid JSON).

### Entity headers

A procedure's `reads` and `writes` ship as the `x-stack-reads` and `x-stack-writes` response headers
(`createEntityHeadersMiddleware`), for automatic cache invalidation. The headers are set only when the
handler succeeds: a thrown error propagates out of `next()` before either is set, so a failed request
never claims to have touched its entities. The middleware is installed only on a procedure that
declares at least one entity.

A browser hides a response header from a client on another origin unless
`Access-Control-Expose-Headers` names it, so the worker's `cors()` exposes `STACK_EXPOSED_HEADERS`,
every header the client reads off an answer; a header added to the wire joins that list.

### Not found

A read whose answer is "not found" is sent with a success status and the `x-stack-not-found` header,
because a browser prints every 404 fetch response as a console error before any code reads it. The
client puts the 404 back before oRPC decodes the body. A mutation's not found stays a 404.
`isNotFound(error)`, from `@fcalell/plugin-api/client`, tells whether a failed call answered that the
thing does not exist: stack's procedures throw `ApiError("NOT_FOUND")`, which the client decodes into
an `ORPCError` of code `NOT_FOUND`. plugin-api's own client reads it, and the screens host answers that
code for a not-found state ([answers](screens.md#answers)).

### Framework-owned paths

`ORG_RULES_PATH` (`["auth", "orgRules"]`) is the router path of the org-rules procedure. plugin-auth's
runtime registers it through `RuntimePlugin.routes()` when organization support is on, and the
`useAbility` client hook queries it. `SCOPE_ROUTES_PATH` (`["auth", "scope"]`) is the prefix of the
scope lookups: plugin-auth registers `[...SCOPE_ROUTES_PATH, <scope name>, "bySlug"]` for each scope
with a slug, and the web plugin's `ScopeBoundary` calls it. Both live in api, not plugin-auth, so the
dependency runs from auth to api.

## Procedure factory

`createProcedure()` builds the `procedure` factory `.stack/procedure.ts` exports.

- **`can: [action, resource]`** (action first) is the org-level gate, sugar over `rbac`
  (`[resource, actions[]]`, action last). It is the preferred spelling: the config gate, the handler's
  `assertCan` and the client's `ability.can()` all read as actions on subjects. Both may be set, and
  both middlewares run, checked against the caller's role in the scope's organization. `can` is a
  tuple of exactly two strings, so no third (conditions) element is expressible and the org layer stays
  unconditional by construction: statements have no conditions, which belong to the record-scoped
  ability layer. `rbac` takes a non-empty action list, and the tenancy's `can` refuses a request that
  names no resource or no action, so an empty list closes the gate and never opens it.
- **`paginated`**: `true` is a keyset page (`cursor`, `limit`), answering `{ data, nextCursor }`.
  `"window"` is a page at an offset (`offset`, `limit`), answering `{ data, total, offset }`, which a
  collection scrolls through by its total.
- **Input.** A `scope` or `paginated` procedure validates the consumer's object extended with the keys
  the config adds. `safeExtend` clones the object with its unknown-key policy (strict, strip, catchall)
  and its refinements, which a fresh `z.object` over the two shapes would drop. A consumer key the
  config also adds is refused: the scope middleware reads `<scope>Id` off the raw input before
  validation, so the consumer's schema could only weaken or contradict the config's.

## Cursor pages

A `paginated: true` page is a keyset: `paginate` (`lib/cursor.ts`) orders by the order columns and
then `id`, and continues strictly after the cursor's row. Every order column's term is
`<column> <direction> nulls last`, in `paginate` and `paginateWindow` alike (`orderSql`), so a
server-sorted `Table` orders as a locally sorted one does, an empty cell last either way
([components](../ui-core/components.md#sort)). The `id` tiebreak, a primary key, carries no suffix:
SQLite 3.54 serves `nulls last` from an ordinary index on the first term in both directions, and on
a later term ascending it sorts in a temp B-tree.

**Keyset segments.** The rows after a cursor are a sequence of keyset segments, each one statement.
Within a segment the predicate is the prefix expansion: for steps `c1..cn, id`,
`(c1 past v1) or (c1 = v1 and c2 past v2) or ... or (all equal and id past vid)`, `past` being `>`
ascending and `<` descending, and-ed with a bound on the segment's shallowest column, `ck >= vk`
(`<=` descending), which every branch implies. A value the cursor holds as null compares by `is null`, and nothing is
past it in its column, so its `past` term is dropped. A nullable column (drizzle's `notNull` is
false) whose cursor value is not null closes the segment: the rows of the same prefix whose column
is null follow as a segment of their own, then the shallower branches as the next. A not-null column
adds no segment, so a page over not-null keys is one statement. The page reads the segments in
order, each with the rows still missing of `limit + 1`, and stops once it has them; a page that does
not reach a null boundary reads one.

SQLite takes no range on the sort column from the prefix expansion's `or` alone: it walks the
scope's index entries from the first (`SEARCH ... (org=?)`). The bound gives it one, `(org=? AND
due>?)` (`due<?` descending; SQLite prints `>=` as `>`). The null rows are never ORed into a
segment: an `or c is null` term (or `c is ?` for the equality) turns the plan into a MULTI-INDEX OR
and a temp B-tree over every remaining match of the scope. A null segment seeks `(org=? AND due=?)`,
or `(org=? AND due=? AND id>?)` after a null cursor value. The `cursor.test.ts` plan test pages a
nullable `due` within one org over an `(org, due, id)` index, in both directions, and asserts that
each statement's plan is one row: `(org=?)` for the first page and one of those seeks for every
other statement, so no statement sorts in a temp B-tree or scans.

An order whose inner column is nullable (`points`, then a nullable `due`) pages
correctly, and SQLite sorts each of its statements in a temp B-tree: no index order puts the inner
nulls last within each outer value.

**Wire form.** A cursor is base64 of the UTF-8 JSON `[[v1, ..., vn], id]`; a value is a string,
number, boolean, `{ $date }` or `null`. Anything else answers `BAD_REQUEST` before any query.

## Scope

A tenancy tier, as the procedure factory sees it, is a structural descriptor: plugin-auth's scope
descriptors (`defineScope`, the root `organization`) satisfy it, and plugin-api never imports
plugin-auth, so the descriptor and its resolver (`TenancyContext`) are both structural. The factory
reads only the scope's `name`: the input key is `${name}Id`, and the phantom `__context` is what
resolving the chain adds to the request context (the chain's rows). It hands the descriptor to the
resolver the auth runtime puts on the request context; how the chain resolves is under
[scopes](auth.md#scopes).

A procedure with a `scope` takes the scope's id in its input (`organizationId`) and stamps the key on
its meta as `scope`. On the client, `TScope` is that input key (or `never`), and the client type makes
it optional, for the route's scope boundary to fill. The route's `ScopeBoundary`
(`@fcalell/ui-core/react/scope`) registers the ids its layout resolved from the URL slug, a nested
boundary extending the outer ones. The utils `createApiQueryUtils` (`@fcalell/plugin-query/tanstack-query`)
returns merge the registered id into the input of every call whose procedure names that scope key in
`.stack/schema.ts`, and only that key (an explicit id wins), before the query key is built, so the key
carries the id. A scoped call with no registered scope and no id throws before any request, naming the
procedure and the key. A route `loader` names its ids or uses `scoped(orpc, ids)`. The query side is
under [scope](query.md#scope); the consumer view is [client](../../../plugins/api/guide/client.md).

## Entities

`api.slots.entities` is the entity vocabulary for `procedure({ reads, writes })`'s type-level
autocomplete, a union across every contributor: the consumer's `entities` option names state outside
any plugin's tables (a repo, files, a remote), plugin-db contributes the consumer's Drizzle schema
table export names, and plugin-auth contributes its runtime-owned tables (`account`, `session`, `user`,
`verification`, plus `invitation`, `member` and `organization` with `organization` on), so
`procedure({ reads: ["member"] })` (auth's own `orgRules`) type-checks and joins cache invalidation
without the consumer declaring auth's tables. A table's name is already an entity, so a consumer name
that a plugin also declares is an error: `uniqueBy` fails on a collision between two contributors
rather than let one shadow the other, as `vite.slots.resolveAliases` does. With nothing contributed,
`.stack/procedure.ts` falls back to `Entity = string`, and `reads` and `writes` work without narrowing.

Entity names reach `Headers.set` comma-joined, and comma is also the client's split delimiter
(`splitHeaderValue`). `ENTITY_NAME_RE` (`^[A-Za-z0-9_.-]+$`) is the one pattern `procedure()` and the
`api({ entities })` config parse share. `procedure()` validates at construction (module init, loudly):
an illegal character reaching `Headers.set` at request time would throw after a mutation's handler had
already committed.

## Cache invalidation

`query-invalidation.ts` is the client half of entity-based cache invalidation, framework-agnostic (no
React or Node imports). `client.ts` is its capture point, and the query plugin's query client
(`createQueryClient`) invalidates on a mutation's success ([cache invalidation](query.md#cache-invalidation)).
Query and mutation keys have the `@orpc/tanstack-query` shape,
`[path: readonly string[], { input?, type?, fnOptions? }]`. The path segments joined with `/`
(`["todos", "list"]` is `todos/list`) are the same path key the server middleware derives its
procedure path from, so captured headers key on the string the client's query key produces.

An API query's reads come from its response headers. A query outside the API (a better-auth client
call) declares what it reads on its options as `meta: { reads: [...] }`: the names a procedure's
`reads` would use, the counterpart of a mutation's `writes`. The query plugin registers that shape, so
the names are typed over the app's entity names on web and phone alike; other meta keys stay open.

`EntityName` is an interface the generated `.stack/procedure.ts` merges `entity: Entity` into (the
union of `api.slots.entities`), so `invalidateForWrites` and a query's `meta.reads` take those names
and a typo fails `tsc`. Unmerged, a name is any string. It is type-only, so the client bundle carries
nothing. `worker.ts` re-exports `Entity`, so an app's program loads `.stack/procedure.ts` with the
router type: the import puts the module in the program, which an augmentation alone does not.

## Client

`createClient()` registers the client it builds as the default (`registerApiClient`) only when nothing
is registered yet, so the first client created wins; an explicit `registerApiClient` call always
overwrites, whatever the order. The registered client is what `useAbility()` fetches the org rules
through, so the hook needs no wiring in the common case of one client per app. The entity registry
`client.ts` and the query plugin's query client share by default is the same kind of module-level
singleton; a test that needs isolation from other tests' captured headers builds its own with
`createEntityRegistry()`.

Both singletons assume one client and one user for the lifetime of the JS isolate (CSR in a browser
tab, a native app's single runtime); neither is per request. An SSR target that reuses an isolate
across requests and users (Node, most non-Workers SSR runtimes) must not rely on them: user A's
captured entity headers could drive user B's cache invalidation, and a request from user A could read
user B's client. Such a consumer calls `registerApiClient` within each request's scope (or threads the
client explicitly) and builds a request-scoped registry with `createEntityRegistry()`.

oRPC's TanStack Query utils tag every call with an operation context (`queryOptions` is `query`,
`mutationOptions` is `mutation`) under a symbol `@orpc/tanstack-query` exports. That package is the
query plugin's peer, which the client entry must not import, so the query plugin's
`createApiQueryUtils` hands the symbol over (`registerOperationContext`) before its calls are made.

## Schema

A `cliSlots.postWrite` contribution writes `.stack/schema.ts` (the target of `virtual:stack-schema`):
every procedure of `AppRouter` (the `.stack/worker.ts` default export's `_router`: the runtime plugins'
routes, `auth.*` among them, and `src/worker/routes`) with its input as JSON Schema, its `kind` and its
`scope` key (`null` when none). It reads the router, so it is written once the barrel and
`.stack/procedure.ts` are on disk; without routes it writes nothing. `.stack/server.json` beside it
tells a client app of this server what the schema does not ([Client-only apps](#client-only-apps)).
plugin-vite serves the module to the web and plugin-expo's Metro config to the phone; the client reads
it for scope ids and a `Form` for its fields.

The router loads in a child node process, so a long-lived `stack dev` never writes a stale schema. The
child loads `.stack/worker.ts` in plain node and walks `worker._router`, the router the worker serves.
Node cannot resolve `virtual:stack-procedure` (a tsconfig path), so a hook maps it to the generated
file before the worker is imported. The child prints the schema as JSON; a failure prints to stderr and
exits 1. `routerSchema()` in `schema.ts` reads a built procedure's definition under `~orpc` by shape,
so the module, which route files import for `z`, pulls nothing of the server into a client bundle.

## Client-only apps

A web or native app that owns no worker names the stack app it talks to with `api({ server })`, a path
from its own root (`"../server"`). Everything it needs of that app is a file its own `stack generate`
writes under `.stack/`: `.stack/schema.ts` is the server's, verbatim (a copy, not a re-export, because
Metro bundles only what sits under the app's root), and `.stack/server.ts` is its `AppRouter` type. The
server's address stays the app's to give its client. In an app that owns its worker, the copy source is
null and the `postWrite` hook writes the schema after the barrel.

`.stack/server.json` is what the server app tells its clients beyond its procedures. `auth` is whether
the server has `auth()`, which decides whether a client app stands the sign-in provider. auth
contributes true in the app that owns the worker (api never imports auth); a client app has no auth in
its config, so it reads the flag from the manifest its server wrote.

## Callbacks

`api.slots.callbacks` maps a peer plugin's name to a callback file it wants wired into its runtime
entry. The key must match `PluginRuntimeEntry.plugin`. The worker derivation attaches a matching entry
to `pluginRuntimes`: it splices `callbacks: <identifier>` into that runtime's options object and adds
the import, structurally, with no ordering dependency.

## MCP

`src/worker/mcp.ts` default-exports `defineMcp<typeof routes>({ instructions, tools })`, typed against
the routes barrel. `defineMcp` checks nothing at runtime; the worker refuses a tool it cannot serve when
the worker is built. What `generate` checks is in [mcp](../../../plugins/api/guide/mcp.md).

## In the code

- `plugins/api/src/index.ts`: the plugin, its slots, the CORS, env and entity derivations, the
  generated-file contributions.
- `plugins/api/src/node/types.ts`: the routes barrel import source and the callback attachment types.
- `plugins/api/src/node/barrel.ts`: the route barrel's layout rules and rendering.
- `plugins/api/src/node/procedure-codegen.ts`: `.stack/procedure.ts`, the `Entity` type.
- `plugins/api/src/node/schema-child.ts`: the child process that reads the router's schema.
- `plugins/api/src/node/server-client.ts`: a client-only app's copies of its server's files.
- `plugins/api/src/worker/index.ts`: `createWorker`, CORS at runtime, `isForbiddenOrigin`, the
  content-type check, the `/rpc` limiter, env checks, route-key collisions.
- `plugins/api/src/worker/request-log.ts`: the request log without query strings.
- `plugins/api/src/procedure.ts`: the procedure factory, auth refusals, the entity headers middleware.
- `plugins/api/src/wire.ts`: the import-free wire contract.
- `plugins/api/src/types.ts`: client and worker types, env validation hints.
- `plugins/api/src/schema.ts`: `z`, `selector()`, `inputJsonSchema()`, `routerSchema()`.
- `plugins/api/src/client.ts`: `createClient`, the registered client, the operation context.
- `plugins/api/src/query-invalidation.ts`: header capture, `EntityName`, the entity registry.
- `plugins/api/src/not-found.ts`: `isNotFound()`.
- `plugins/api/src/mcp.ts`: `defineMcp()`.
- `plugins/api/src/lib/local-origin.ts`: the local-dev hostnames.
- `plugins/api/src/lib/cursor.ts`: `paginate`, the keyset segments, the cursor wire form, `orderSql`.
- `plugins/api/src/lib/window.ts`: `paginateWindow`, the id sort and the read by id.
