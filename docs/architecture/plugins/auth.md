# plugin-auth

`@fcalell/plugin-auth` wraps Better Auth: the options it bakes into the worker, the runtime that
builds Better Auth per request environment, the `auth.*` procedures, the web and native clients, the
session and its stand-ins (device keys, MCP access tokens), and the access model of organizations,
scopes and abilities. How an app uses it is the plugin's guide (`plugins/auth/guide/`); this page is
how it is built.

## Server options

### Plugin shape

The plugin is built with `plugin` from `@fcalell/cli` and requires `api` and `db`. Its codegen
seeds the runtime options with every consumer-supplied option (`secretVar`, `appUrlVar`, `cookies`,
`session`, `user`, `organization`) as a `Record<string, TsExpression>`, so derived keys splice in
without re-literalising the whole object. `callbacks` is never a runtime option: `api.slots.callbacks`
owns it and api's codegen splices it in, so a consumer passing it in options would collide.

### Runtime options

**`runtimeOptions`** is a derived slot over `api.slots.cors`, `api.slots.devCorsOrigins` and
`api.slots.devTargetOrigins`, so the [slot graph](../slot-graph.md) resolves every origin
contribution (vite's localhost included) before the derivation runs. There is no payload to mutate
and no handler order: the auth CORS ordering is dataflow. The worker runtime entry resolves
`runtimeOptions` inside its contribution, so the emitted `authRuntime(...)` call carries baked
`trustedOrigins` and `sameSite` values.

### Origins and cookies

`trustedOrigins` holds the web CORS origins, plus, with `expo` set, api's `nativeScheme` (the scheme
the native app registers) and its wildcard. A custom scheme is no valid HTTP CORS origin, so it flows
here directly and never through `api.slots.cors`; Better Auth's CSRF origin check rejects native
requests otherwise, ID-token sign-in included. Codegen refuses an empty origin list: Better Auth reads
an `undefined` `trustedOrigins` as "allow nothing" on some paths and "fall back to `baseURL`" on
others, so the error enumerates every way the consumer can supply origins. The baked list is exactly
what Better Auth sees at runtime.

Dev-server origins ride separately, and the runtime trusts them only under `STACK_DEV`: baked into
the list, they would let a production deploy trust `localhost`. Only under `STACK_DEV` do web cookies
take `sameSite=none`, since the vite origin and the worker are cross-origin in dev and a lax cookie
is dropped. A native client is always cross-site (custom scheme, no browser origin), so its cookies
take `sameSite=none` in production too; web consumers keep the browser default. The runtime pairs
`sameSite=none` with `secure=true`.

Better Auth is built on the listener's origin (`STACK_ORIGIN`, the origin of the Node listener the
request came in on), else the `appUrlVar` var (`worker/listener.ts`). Better Auth trusts its base
URL's origin and makes its cookies `Secure` (and `__Secure-` named) exactly when it is https, so
trust, cookie `Secure`-ness and the passkey's origin follow the listener.

### APP_URL default

`APP_URL`'s `devDefault` (the derived slot `auth.slots.appUrlDevDefault`) is the first frontend origin (`api.slots.devCorsOrigins`: vite, metro, or
the local entries of an explicit `app.origins`), else the first deploy-target origin
(`api.slots.devTargetOrigins`: the node server, wrangler). Only an explicit `app.origins` with no
local entry leaves both empty, and then the production domain is the value. Plugin-auth never imports
a frontend or a deploy target: the handoff is the shared slots.

### Cookie prefix

`auth.slots.cookiePrefix` is the resolved session-cookie prefix, defaulting to `"better-auth"`,
Better Auth's own default on both the server and the expo client, so an unset option still yields a
matching pair. Peer plugins (native-ui's generated auth-client constants) read the slot; a hardcoded
prefix that mismatches drops every session cookie. The native client's prefix must equal
`auth({ cookies: { prefix } })`, which `stack init` defaults to `app.name`. A mismatch is silent and
total: the client filters the server's `Set-Cookie` by the prefix, so every device drops a still-valid
session and the app reads as signed out ([native auth client](./native-ui.md#native-auth-client)).

### Social providers

The `socialProviders` option normalizes into resolved env-var references: `true` enables a provider
with conventional var names, an object overrides them, and a disabled or absent provider is omitted,
so the keys are exactly the enabled providers. The secrets contribution and the baked runtime config
both iterate this. Codegen bakes only the var names, never the raw `true` or object input, and drops
the key when no provider is set. The runtime reads each provider's credentials from env; Apple
optionally carries the app bundle id for native ID-token validation. The generated worker's
`envChecks` asserts each var is set, so the runtime's `as string` reads hold.

### Passkeys

`auth({ passkey })` adds `@better-auth/passkey`'s `passkey()` configured, not wrapped. Codegen bakes
every default, so the runtime never guesses: `rpID` from `app.domain` (a registrable suffix of the
derived origins, as WebAuthn requires of the relying-party id), `rpName` from `app.name`, `origin`
from the resolved production CORS list. A `localhost` ceremony matches neither production value, so
codegen also bakes `passkey.devOrigin` (the dev origins), and under `STACK_DEV` the runtime passes
`rpID: "localhost"` and those origins instead, as it does for `devTrustedOrigins`. A listener with an
origin of its own adjusts the baked values per instance (`passkeyFor`).

### Rate limiting

Codegen bakes only the binding names of the `rateLimiter` options object, so the runtime knows
which env keys to read; the limit and period are wrangler-binding config, enforced by the binding
itself and never read at request time. The schema defaults guarantee every binding is present:
`RATE_LIMITER_IP` (100 per 60 s), `RATE_LIMITER_EMAIL` (3 sends per 60 s, an OTP-send abuse gate that
still allows one quick resend) and, baked with `mcp` only, `RATE_LIMITER_AGENT` (120 per 60 s).
Cloudflare rate-limiter bindings accept a `period` of 10 or 60 seconds only
([Cloudflare docs](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)).
The runtime's binding type matches plugin-api's `RateLimitBinding` structurally, since plugin-api
exposes it on no public subpath; both sides rely only on its shape.

The `fetch` handler applies the per-email limit to the two emailing endpoints (the OTP send and
`/sign-in/magic-link`, one bucket, one `emailKey`). The `auth.signIn.sendOtp` and
`auth.signIn.magicLink` procedures draw on the same bucket and key and answer `TOO_MANY_REQUESTS`
when it refuses. The limit runs in production only and is skipped when no email limiter is bound.

### Reserved slugs

An organization is served at `/<slug>`, so its slug may not take plugin-api's `RESERVED_SLUGS` (the
addresses every stack app serves or a router reads as an act) nor a first segment of the app's own
top-level routes, which it would shadow. A frontend plugin contributes its routes' first segments to
`auth.slots.reservedSlugs`; auth never reads a frontend's routes. Codegen bakes the combined list with organizations on. A
refused slug answers a code and a field error: a form reads `fieldErrors` off the answer, as it reads
an API procedure's refusal, and shows it under the field that made the slug.

### Callbacks

**`AuthCallbackPayloads`** (`types.ts`) is the one source of the consumer callback file's shape. The
plugin declaration (`callback.optional<AuthCallbackPayloads[...]>()` in `index.ts`) and the worker
runtime's `AuthCallbacks` type (from `./runtime`) both derive their payloads from it, so
`defineCallbacks`'s inferred type and `AuthCallbacks` never drift apart. Every callback is optional in
the type, each gated on the option that turns its feature on; at runtime `sendOTP` is required while
`emailOtp` (on by default) is, and `sendMagicLink` while `magicLink` is, and the runtime refuses to
build Better Auth without them, naming the missing one. `emailOtp: false` without `magicLink`
requires neither. Every payload carries `env`, so a callback reaches per-request bindings (an email
send binding, a queue) instead of module scope; the consumer types it as its worker's `Env`
(`AuthCallbacks<Env>`). `AuthCallbacks` uses method syntax throughout, which keeps the payload
parameter bivariant, so a consumer who narrows the env still satisfies the `AuthCallbacks` the runtime
input declares. The framework is the only caller and always passes the real env.

The callback file lives at `src/worker/plugins/auth.ts`, exposed on **`auth.slots.callbackFile`**, a
value slot with that seed default, the one place that keeps path and existence checks in sync; a
consumer who restructures the repo overrides it with `override: true`. Codegen wires the file onto
the auth runtime entry whenever it exists. With `emailOtp` or `magicLink` on, a missing file throws at
generate: that beats a worker that refuses its first request. The import source strips the `src/`
prefix, since the generated worker sits at `.stack/worker.ts` and imports relative to itself, so an
overriding `callbackFile` must stay under `src/`, which codegen enforces.

`stack init` scaffolds the file from `templates/callbacks.ts`. Each stub logs its code in dev and
throws anywhere else, since a code in Workers Logs is a leaked sign-in, and carries a `// TODO` marker.
`sendOTP` stands uncommented (delete it with `emailOtp: false`), `sendMagicLink` commented out for
`magicLink: true`. `stack dev` sets `STACK_DEV`, which the worker's `Env` does not declare. A
`cliSlots.deployChecks` contribution (`callback-stubs.ts`) refuses `stack deploy` while a callback the
options require still carries its marker: the stub sends nothing outside dev, so the deploy would
ship an app nobody can sign in to. A missing file is `api.slots.callbacks`' error, not this check's.

The callback file is also the consumer's seam into Better Auth's own extension mechanism:
`AuthCallbacks.plugins` register after the framework's plugins.

### Schema tables

The plugin owns the identity tables, so they carry no consumer columns: data a consumer keeps per
user or per organization lives in its own table, keyed by that id. Each table set is the shape
Better Auth's generator emits for a sqlite drizzle adapter, ported; regenerate and diff after a
Better Auth bump or a table-bearing Better Auth plugin.

| Subpath | Tables | Migrated when |
| --- | --- | --- |
| `@fcalell/plugin-auth/schema` | `user`, `session`, `account`, `verification` | always |
| `@fcalell/plugin-auth/schema/organization` | `organization`, `member`, `invitation` | `organization: true` |
| `@fcalell/plugin-auth/schema/passkey` | `passkey` | `passkey` |
| `@fcalell/plugin-auth/schema/oauth` | `oauthClient`, `oauthResource`, `oauthClientResource`, `oauthRefreshToken`, `oauthAccessToken`, `oauthConsent`, `oauthClientAssertion`, `jwks` | `mcp: true` |
| `@fcalell/plugin-auth/schema/devices` | `apikey` | `devices: true` |

The Drizzle adapter never issues DDL: the tables exist in the database before any sign-in. Two seams
carry them there. The worker runtime passes them to `drizzleAdapter({ schema })`, and the consumer
re-exports each enabled subpath from `src/schema`, so drizzle-kit migrates them and the worker's
Drizzle instance registers them. A separate subpath per feature is what lets a consumer re-export,
and migrate, a table set only with its option on.

- **Identity.** The `@better-auth/cli generate` shape with OAuth social providers and email OTP off.
  `verification` is required even for OAuth-only sign-in: it stores the OAuth `state` and PKCE
  `codeVerifier` across the round-trip. `session.activeOrganizationId` is the one organization field
  here, a nullable column on the always-present table, so it cannot sit behind the organization
  subpath and is a no-op without organizations. `session.userId` and `account.userId` cascade.
- **Organization.** Derived from `getAuthTables()` (`better-auth/db`, the introspection the generator
  uses) for `organization({})` with no `teams` and no `dynamicAccessControl`, since `buildAuth` wires
  neither. None of Better Auth's field definitions for these tables sets `onDelete: "cascade"`, so
  the foreign keys carry none.
- **Passkey.** The generator's shape for `passkey()`, without the `userRelations.passkeys` inverse:
  `./index.ts` must not reference a table the consumer migrates only with passkeys on.
- **OAuth.** The generator's shape for `jwt()`, `mcp()` and `cimd()`. A foreign key carries
  `onDelete` exactly where Better Auth's field definition names one (the resource link's two
  cascades, a session's `set null`); the generator's cascade default is not ported, so a user with
  grants is undeletable, as one with memberships is. The `user` and `session` relation inverses are
  left out, as for passkeys. Two departures: JSON and string-list fields are plain `text`, since
  Better Auth's adapter already writes them as JSON text for sqlite and drizzle's json mode would
  encode them a second time (a list reads through `scopesOf`); and a unique index on the consent's
  client, user and reference makes a grant one row per client, member and organization however the
  authorization races.
- **Devices.** The `apikey` model `@better-auth/api-key` declares, plus a `referenceId` foreign key
  to `user`, so deleting a user deletes the keys they made (the plugin leaves the column
  unconstrained because it can also name an organization, which `auth({ devices })` never configures).
  The key is stored hashed; the plaintext exists once, in the answer of the call that made it.

Each schema module names the drizzle types its emitted declarations spell, so they are spelled
through plugin-db, the one package drizzle resolves from. Unnamed, `tsc` writes
`import("drizzle-orm/...")`, which a consumer cannot resolve from this package, and every table and
row read through it is `any`.

`drizzleAdapter`'s schema map starts from the drizzle client's full schema (the consumer's
`src/schema`) and then maps Better Auth's models to the framework's tables explicitly, so resolution
never depends on the consumer's export names. The organization, passkey, OAuth and `apikey` tables
enter the map only when their Better Auth plugin is registered, since the consumer migrates them only
then. The consumer's schema coming first lets a model a `callbacks.plugins` entry declares resolve to
the consumer's table of that name.

### Slot contributions

The auth surface is worker-owned but sits outside api's own prefix, so deploy targets (vite's dev
proxy, the node server's mount table) route it only once it is declared on `api.slots.routePrefixes`.
Better Auth needs `node:async_hooks`, which Workers expose only under `nodejs_compat`, so every
configuration contributes the flag.

| Target slot | Behaviour |
| --- | --- |
| `cloudflare.slots.compatibilityFlags` | `nodejs_compat` |
| `cloudflare.slots.bindings` | The IP and email rate limiters, and with `mcp` the agent one (`RATE_LIMITER_AGENT`, 120 per 60 s) |
| `api.slots.env` | `AUTH_SECRET` (`minLength: 32`), `APP_URL` (`url`, `devLocalhost`), and a client id and secret per OAuth provider |
| `api.slots.routePrefixes` | `/api/auth`, and with `mcp` the two `/.well-known/oauth-*` discovery prefixes |
| `api.slots.workerImports` | `src/shared/scopes.ts` as a namespace, with organizations on and the file present |
| `api.slots.pluginRuntimes` | `authRuntime(...)` from `runtimeOptions` |
| `api.slots.callbacks` | The callback file, whenever it exists; its absence throws while `emailOtp` or `magicLink` is on |
| `api.slots.rbacStatements` | `ac`'s statements, else the default organization statements |
| `api.slots.entities` | The auth tables' export names (`account`, `session`, `user`, `verification`), and the organization, passkey, OAuth (`mcp`) and device key (`apikey`, with `devices`) tables when enabled; the `auth.*` procedures declare their `reads` and `writes` over them |
| `screens.slots.handlerModules` | `@fcalell/plugin-auth/screens`: MSW handlers answering `GET */api/auth/get-session` with a signed-in session typed by Better Auth's `Session` and `User`; unread without `screens` in the config |
| `screens.slots.fixtureModules` | `@fcalell/plugin-auth/screens-fixtures`: a fixtures tree answering `auth.session` with the same user and session (`src/screens-session.ts` holds them once); unread without `screens` in the config |
| `cliSlots.initPrompts` | Cookie prefix and organization toggle |
| `cliSlots.deployChecks` | Refuses the deploy while a required callback in the callback file still holds its scaffold `// TODO` marker |
| `cliSlots.initScaffolds`, `cliSlots.removeFiles` (auto) | `src/worker/plugins/auth.ts` from `templates/callbacks.ts` |

## Runtime

### Worker runtime

`authRuntime(options)` from `@fcalell/plugin-auth/runtime` depends on `db`'s context and provides
`{ auth }`, plus `{ tenancy }` with organizations on and `{ oauth }` with `mcp` on. Its `context()`
reads `upstream.db` (the drizzle client `dbRuntime` provides), and it declares that edge, so
`createWorker` runs db's context first whatever the `.use()` order ([worker chain](../runtime.md)).
Env presence and value checks are the generated worker's `envChecks` assertion, fed by the plugin's
`api.slots.env` contribution, never a per-request check.

The runtime builds Better Auth once per `env` (a `WeakMap`), with `session.cookieCache` at 5 minutes
(off for a native consumer, see [native client](#native-client)) and `cf-connecting-ip` as the client IP
header. The signed session cache skips a D1 read on most authenticated `getSession` calls. Every
session row Better Auth deletes is announced ([session end](#session-end)), and a sign-up policy,
when there is one, refuses a user it does not admit before the row is written
([sign-up policy](#sign-up-policy)). The runtime's `fetch` hands `/api/auth/*`, and with `mcp` the
two `/.well-known/oauth-*` prefixes, to Better Auth behind the IP limiter.

`AuthInstance` is the structural surface of the Better Auth instance that the plugin's code and a
consumer's `procedure({ auth: true })` handlers (through `InferAuthContext`) touch: `handler`, the
fetch entrypoint, and the session lookup the auth middleware calls. Better Auth's own `Auth<Options>`
needs the literal `BetterAuthOptions` passed to `betterAuth(...)`, and `buildAuth` builds that object
from runtime conditionals, so no single literal parameterizes it. `$Infer.Session` derives from
`AuthRuntimeInput` through the same `SessionUser` and `SessionOf` types `@fcalell/plugin-auth/infer`
exposes for the client (organization adds `activeOrganizationId`): one derivation, two consumers.
`TOptions` is inferred from the inline object literal codegen passes to `authRuntime(...)` in
`.stack/procedure.ts` and `.stack/worker.ts`, so `organization: true` stays a literal and never
widens to `boolean`.

`./runtime` re-exports the Better Auth helpers a sign-in flow of the app's own needs (`APIError`,
`isAPIError`, `createAuthEndpoint`, `createAuthMiddleware`, `getSessionFromCtx`, `setSessionCookie`,
`customSession`, the `BetterAuthPlugin` type), so the app holds no second copy of `better-auth`: a
second `APIError` would not read as the router's own.

`routes(procedure)` receives plugin-api's procedure factory as `unknown`, because `RuntimePlugin` is
framework-agnostic (`packages/cli/src/runtime.ts`); `AuthProcedureFactory` (`worker/procedures.ts`)
is that factory over the context the `auth.*` procedures read.

### On the node target

`plugin-auth` requires `api` and `db` only. Its rate-limiter bindings and `nodejs_compat` flag are
cloudflare contributions that stay inert on node, where the limiter skips itself. Every value import
on its runtime path names its file, so `authRuntime` loads under plain node. How the node target
consumes auth's path and session end is [auth coupling](./node.md#auth-coupling).

`@better-auth/passkey`, `/expo`, `/mcp`, `/oauth-provider`, `/cimd`, `/api-key` and `/core` are
pinned to the exact `better-auth` version: each release peer-requires its own version of
`better-auth` and `@better-auth/core`.

### Procedures

A web app reads the session, signs in and out, and manages organizations, members and invitations
through `orpc.auth.*`, never through Better Auth's client. `routes()` registers them under the `auth`
router key, and `authRuntime` types them into the worker's `AppRouter`, following the options
exactly: naming a procedure of an option that is off is a type error. `auth.scope` has one key per
scope with a `slug`, so naming a scope without one is a type error.

Each procedure runs one Better Auth server endpoint with the request's headers, copies the
`set-cookie` headers it returns onto the response, and answers the endpoint's body. A Better Auth
refusal becomes an `ORPCError` of the matching code (`BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`,
`NOT_FOUND`, `TOO_MANY_REQUESTS`, else `INTERNAL_SERVER_ERROR`) with its message, and its `code` and
`fieldErrors` as the error's `data`. The input and output types are the endpoint's.

| Procedure | Option | Endpoint | Session | Declares |
| --- | --- | --- | --- | --- |
| `auth.session` (query) | always | `getSession` | no | reads `session` |
| `auth.signOut` | always | `signOut` | no | writes `session` |
| `auth.user.update` | always | `updateUser` | yes | writes `session`, `member` |
| `auth.signIn.sendOtp` | `emailOtp` (on by default) | `sendVerificationOTP`, type `sign-in` | no | |
| `auth.signIn.verifyOtp` | `emailOtp` | `signInEmailOTP` | no | writes `session` |
| `auth.signIn.magicLink` | `magicLink` | `signInMagicLink` | no | |
| `auth.organization.list` (query) | `organization` | `listOrganizations` | yes | reads `organization`, `member` |
| `auth.organization.create` | `organization` | `createOrganization` | yes | writes `organization`, `member`, `session` |
| `auth.organization.update` | `organization` | `updateOrganization` | yes | writes `organization` |
| `auth.organization.delete` | `organization` | `deleteOrganization` | yes | writes `organization`, `member`, `session` |
| `auth.organization.setActive` | `organization` | `setActiveOrganization` | yes | writes `session` |
| `auth.organization.activeMember` (query) | `organization` | `getActiveMember` | yes | reads `member`, `session` |
| `auth.organization.members.updateRole` | `organization` | `updateMemberRole` | yes | writes `member` |
| `auth.organization.members.remove` | `organization` | `removeMember` | yes | writes `member` |
| `auth.organization.invitations.create` | `organization` | `createInvitation` | yes | writes `invitation` |
| `auth.organization.invitations.cancel` | `organization` | `cancelInvitation` | yes | writes `invitation` |
| `auth.organization.invitations.accept` | `organization` | `acceptInvitation` | yes | writes `invitation`, `member`, `organization`, `session` |
| `auth.organization.invitations.reject` | `organization` | `rejectInvitation` | yes | writes `invitation` |
| `auth.devices.list` (query) | `devices` | `listApiKeys` | yes | reads `apikey` |
| `auth.devices.create` | `devices` | `createApiKey`, `{ name, expiresInDays? }`, 25 live keys at most; answers `{ device, key }`, the key once | yes | writes `apikey` |
| `auth.devices.revoke` | `devices` | `deleteApiKey`, `{ id }` | yes | writes `apikey` |
| `auth.oauth.client` (query) | `mcp` | `getOAuthClientPublic`, `{ clientId }` | yes | |
| `auth.oauth.consent` | `mcp` | `oauth2Consent`, `{ accept, scope?, oauthQuery? }` | yes | writes `oauthConsent` |
| `auth.oauth.grants.list` (query) | `mcp` | the caller's `oauthConsent` rows joined to their client's public fields, newest first, in every organization; `{ id, name, uri, organizationId, scopes, createdAt }` | yes | reads `oauthConsent`, `oauthClient` |
| `auth.oauth.grants.revoke` | `mcp` | `revokeGrant(id, userId)`, `{ id }`; a grant that is not the caller's answers `NOT_FOUND` as one that does not exist | yes | writes `oauthConsent` |
| `auth.orgRules` (query), `auth.scope.<name>.bySlug` (query) | `organization` | the tenancy | yes | reads `member` and the scope's tables |

The consumer's `AppRouter` is emitted as a declaration, and a type aliasing a third-party one is
emitted under that package's path and degrades to `any` where the package does not resolve. So the
outputs whose Better Auth types name a package a consumer does not install are written out
(`worker/outputs.ts`) and declared in `@fcalell/plugin-auth/runtime` (`OAuthClientPublic`,
`OAuthGrant`, `Invitation`, `InvitationStatus`, `AcceptedInvitation`, `RejectedInvitation`,
`ActiveOrganization`) and `@fcalell/plugin-auth/ability` (`PackedRuleSet`, the output of
`auth.orgRules`). The app's `AppRouter` types them without `better-auth`,
`@better-auth/oauth-provider` or `@casl/ability`. Each procedure declares its type as its output, so
the compiler checks the endpoint's value against it. The roles are the consumer's own, so `role` is a
`string`.

The emailed magic link is Better Auth's own GET endpoint, a browser navigation. The magic-link
procedures hold `callbackURL`, `newUserCallbackURL` and `errorCallbackURL` to an allowed target
(`worker/callback-url.ts`). Better Auth's `originCheckMiddleware` guards these, but the procedures
call the server API without a `request`, which skips it, so they check against the same trusted
origins the instance was built with. Allowed is a path on the app (`/dashboard`, never `//host` or
`/\host`) or an absolute URL whose origin a trusted origin names: an exact origin
(`https://app.example.com`), a host wildcard (`https://*.example.com`) or a scheme (`myapp://`,
`myapp://*`) for a native deep link.

With `mcp`, `signIn.verifyOtp`, `signIn.magicLink` and `organization.setActive` also take
`oauthQuery`, the authorization page's signed query, which they send as `oauth_query` (where Better
Auth's OAuth client plugin puts it), and answer `{ redirect: true, url }` beside their result.

### Sign-up policy

A refused sign-up answers the code `SIGN_UP_CLOSED` and one sentence on every way in. A client reads
the code (`data.code` of the `ORPCError`, `error.code` of Better Auth's client) and shows its own
words, or the sentence as it stands. The policy runs before the user row is written.

## Clients

### Web client

`@fcalell/plugin-auth/client` is Better Auth's React client, so `useSession()` is a hook. The
consumer calls it with the flags its `auth()` options set, so the client offers what the server
serves. **`auth.slots.clientFlags`** derives those flags from the options, so the client and the
server enable the same Better Auth plugins; seeded `null` and filled by auth's own contribution, it
reads `null` to a frontend whose config has no auth.

### Native client

The `expo` option makes the worker add Better Auth's server-side `expo()` plugin, required for a
native client's deep-link, cookie and origin handling; it contributes no database tables. The deep-link
scheme expo registers (`api.slots.nativeScheme`) joins `trustedOrigins`, because the CSRF origin check
runs even for native ID-token sign-in. A server that is no Expo app (a web or node server serving a
separate phone app) names the phone's scheme, `expo: { scheme: "acme" }`, which wins over an `expo()`
plugin's.

The signed session cache is off for native: it sets a second `session_data` cookie beside
`session_token`, and React Native reliably round-trips only one cookie, so the device would send
`session_data` without `session_token` and every authenticated request would resolve to no session.

`@fcalell/plugin-auth/expo` (`expo.tsx`, shipped as source):

- The secure-storage shape derives from `expoClient`'s own option, so it stays in lockstep with
  `@better-auth/expo` without importing `expo-secure-store`. The consumer passes the imported store
  module, so the layer stays storage-agnostic and never pulls native modules into an importer such
  as a Node test.
- The auth client provider exposes the configured client to the tree, read through `useAuthClient()`
  rather than a module singleton; `plugin-native-ui` contributes it to `plugin-expo.slots.providers`
  ([native auth client](./native-ui.md#native-auth-client)).
- The browser helpers open the system browser for the OAuth redirect and work in Expo Go. The two
  native ID-token helpers skip the browser: they drive the OS account sheet through the platform SDK
  and hand the ID token to the worker, which verifies it. They need build-time native modules, absent
  from Expo Go, so the modules are dynamically imported and importing the file (a Node test, a web
  consumer) never loads them. They are optional peers, which an app on the browser flow does not
  install. Because the app's `tsc` reads the source, the file names no type from them: it declares
  what it uses of each module and casts the import to it, and the ignore directive above each import
  silences only "cannot find module" where the app has not installed the package (Metro still bundles
  the literal specifier).
- The Google client id is the "Web application" OAuth client id. Google issues the native ID token to
  that audience, so it must equal the worker's `GOOGLE_CLIENT_ID` for the server to verify it.

### Screens

The screens workbench answers the session a signed-in screen reads, both as the `auth.session`
procedure and as Better Auth's `get-session`; without `screens` in the config the slots resolve to
nothing ([screens plugin](./screens.md)).

- `@fcalell/plugin-auth/screens` answers the endpoints auth owns outside the app's router: the
  signed-in session Better Auth's client reads (phone apps, and a web app still on that client) at
  `get-session` under the worker's auth prefix. It sits on its own subpath because it imports MSW
  through the screens package, which only the workbench's browser loads.
- `@fcalell/plugin-auth/screens-fixtures` answers the procedures auth owns: the signed-in session
  `orpc.auth.session` reads, so a screen behind the session guard draws its signed-in form; the
  device keys of `devices: true` (`auth.devices.list`, `create`, `revoke`); and the steps a shipped
  page calls: sign-in and sign-out, `user.update`, the organization list, create, delete,
  `setActive` and invitations, and with `mcp: true` the connect pages' `oauth.client`,
  `oauth.consent` and `organization.setActive` and the grants (`oauth.grants.list`, `revoke`). A
  procedure the app's auth config leaves off is never called, so its fixture is inert. The app
  overrides any of them in `src/app/fixtures.ts`, starting from this answer when it only adds to it.
  The tree keeps its own type (`satisfies`, not an annotation), so `fixtures.auth.session()` is the
  signed-in `{ session, user }` itself, with no optional or null in the way.
- `@fcalell/plugin-auth/serve` is the served app's `/fixture/link` for `stack screens serve`
  ([screens command](../commands.md#screens)). The app is served at the run's origin, which the app
  URL names. With email codes, `serveEnv` gives the run a fixture address and a fixed code
  (`STACK_SERVE_EMAIL`, `STACK_SERVE_CODE`, as long as the runtime's `OTP_LENGTH`); the link signs the
  browser in through the email-code routes and redirects with the session cookie. It runs inside the
  worker (Node or workerd), so it uses web APIs only. It is a control of `fixtureControls` in
  `@fcalell/plugin-screens/serve`; a hand-written serve entry passes it in:
  `fixtureControls(worker, link)`.

## Sessions

### Session end

Better Auth deletes a session row on a sign-out, a revoke, a deleted user or an expired session
found, and each deletion is published as `{ sessionId, userId }` on the `node:diagnostics_channel`
channel `stack:auth:session-ended` (`worker/session-ended.ts`). The Node target listens and closes
that session's WebSocket connections, whose session it read once at the upgrade; where nothing
listens (Workers, a worker under test) the message goes nowhere. The channel is named by string, not
imported: the Node target names the same channel, as it names auth's path.

### Devices

`auth({ devices: true })` is a bearer credential for a machine with no browser, built from
`@better-auth/api-key`'s `apiKey()` configured, not wrapped. A key is `stk_` plus 48 random letters,
stored as a SHA-256, made by a signed-in member through the `auth.devices.*` procedures and shown
once. The plugin's `customAPIKeyGetter` reads only an `Authorization: Bearer stk_…` header; any other
bearer (an expo session token, an OAuth access token) is never taken for a key.
`enableSessionForAPIKeys` makes the validated key stand in for the member's session on every call
that carries it, with `session.id` the key's id. One credential so reaches every door that asks
`auth.api.getSession`: a procedure's auth middleware, the `/ws` upgrade's `get-session` (which
forwards `Authorization`; a headless client sends no `Origin`), and a service route through
`http.session(request)`, the same lookup.

The plugin validates a key on every call that carries one, and each validation reads and writes its
row (the per-key limiter, `lastRequest`), so a revoked, disabled or expired key stops working on its
next request; revocation is immediate for requests and not for an open socket. The row-level limiter
is on and pinned at 600 per 60 s per key, so a procedure that also calls an auth endpoint spends two.

The `device-guard` plugin registers ahead of the key plugin, so it refuses before a key is spent. It
refuses a key at every auth endpoint outside a closed list with `FORBIDDEN`
`DEVICE_CREDENTIAL_REFUSED`. The list is the session lookup and the reads that say which
organizations the member belongs to: `/get-session`, `/organization/list`,
`/organization/get-full-organization`, `/organization/get-active-member`,
`/organization/list-members` and `/organization/has-permission`. Everything else (credentials,
accounts, sessions, sign-in, deletion, every organization write) needs a person's own session, so a
stolen key cannot mint another key, change the member's sign-in or outlive its revocation. Being a
closed list, an endpoint a later plugin adds is refused until it is named there. The app's
procedures are no auth routes and are bounded by their own checks.

`disabledPaths` takes the key plugin's HTTP routes off HTTP. The `auth.devices.*` procedures call
them on the server API, where the limits are enforced (a name, 25 live keys, an expiry of at most 365
days); over HTTP those limits would be bypassed. The procedures are made, listed and revoked by a
signed-in member and never by a device key, which the guard refuses at the key routes. How plugin-api
maps a refused or limited session lookup is [auth refusals](./api.md#auth-refusals).

## Access

### Access control

**`ac`** is the consumer's organization access control. It carries `newRole`, a function no literal
can hold, so only its statements reach generated code, beside each role's grants, as plain records a
generated file can hold (`client.ts`); the worker and the web client each rebuild the access control
and the roles from them. Without `ac`, the default organization statements go to
`api.slots.rbacStatements`.

The statements compile one way into CASL rules (`ability/index.ts`). Better Auth's statements model
(`resource -> actions`, no conditions) is a strict subset of CASL's rule model, so every grant becomes
an unconditional CASL rule. Statements stay the source of truth, since Better Auth's organization
endpoints consult them internally, and the compile never runs the other direction. It is pure and
uncached, the compile being trivial. CASL reserves the action `"manage"` and the subject `"all"` as
wildcards (`can("manage", "all")` grants everything), while Better Auth's model treats both as
literal names, so a statements record that uses either would compile into a rule that over-grants
every action or subject client-side; the compile refuses it.

`@fcalell/plugin-auth/ability` is a typed wrapper over CASL's `MongoAbility`. CASL is wrapped, never
exposed: consumers never install or import `@casl/ability`, the same rule as drizzle, hono and zod.
The module is isomorphic, with no `node:*` imports and nothing from the plugin's `node/` or `worker/`
code, so worker handlers and client bundles both import it.

### Ability wire format

The wire format is exactly CASL's `packRules` output (arrays), unwrapped. `PackedRules` is exported
type-only, so a client bundle types a query's output without pulling server code. `PackedRuleSet`
writes `PackedRules` out for a rule set of any subject, naming no CASL type, so the consumer's
emitted declaration needs no `@casl/ability`; `packAbility` of any ability is assignable to it. On
the client, the rules are opaque JSON: the dependency direction is auth to api, so the query plugin
cannot import `PackedRules<A>` and only unpacks the data generically
([abilities](./query.md#abilities)).

### Scopes

The consumer's scope descriptors (`defineScope`, from `src/shared/scopes.ts`) are isomorphic, so the
worker and the web import the same objects. With organizations on, the generated worker hands the
module namespace to the runtime when the file exists: every exported scope with a slug gets an
`auth.scope.<name>.bySlug` lookup, the one `ScopeBoundary` resolves a URL slug with, and the
membership predicate the module exports, if any, applies at every resolution. A lookup reads its
chain's tables and the caller's membership, so a mutation that declares `writes` on any of them (a
renamed project, a changed role) invalidates the scope it resolved.

**`tenancy`** is the request context's capability that plugin-api's `scope`, `can` and `rbac`
procedure options call ([scope](./api.md#scope)). Resolution is stateless: the chain comes from the
rows, the access from the caller's membership of the organization at its root, never from the
session. It answers the rows of a scope's chain for an id as context entries, plus the caller's
`member` row, typed by the scope (`ScopeContext<S>`). It answers `null` when any level is absent, the
caller is no member, or a consumer predicate fails (the membership one at the root, a scope's
visibility one at its level); plugin-api answers that `null` as `NOT_FOUND`, the same as a missing
row, so a guessed id never confirms that a row exists.

The membership predicate decides which `member` rows count as a membership at all: a fragment over
the `member` table, which the root lookup already has in its `FROM`, correlated to any consumer table
it needs. The scopes module exports at most one. A resolved level's row lands in the procedure
context under its scope's name, so a scope named after a key the context already carries would
overwrite it; `scope.ts` refuses such a name. The refused keys are plugin-api's base context, checked
against its type so a key it gains is refused too, and what the runtimes and middlewares add before a
scope resolves: plugin-api's dev flag, plugin-db's client, this plugin's runtime and auth middleware,
the MCP endpoint's caller, and the organization level.

### MCP OAuth

`auth({ mcp: true })`, refused without `organization`, makes the worker an OAuth authorization server
for MCP clients; codegen sets the runtime's `mcp` flag, which gives the request context its `oauth`
capability, and auth contributes the flag that authenticates `/mcp`
([MCP](./api.md#mcp)). The runtime adds `jwt()`, `mcp()` and `cimd()` (profile `mcp-2026-07-28`)
in that order, then a guards plugin. `disabledPaths` closes the session `/token` and the four
`/oauth2/*-consent(s)` paths, which answer raw rows and change a grant without ending its tokens;
`auth.oauth.grants.*` serve that need.

The authorization server's and the protected resource's discovery documents are what an MCP client
reads before it opens an authorization. Better Auth serves them at the issuer-inserted and
resource-inserted aliases below the two `/.well-known/oauth-*` prefixes, so each prefix is a worker
route. The protected resource a token is bound to and the pages the authorization sends the member
to are pinned, not options, since the screens that serve them are the app's, built to these
addresses. The pins: the login, organization-choice and consent pages (`/sign-in`,
`/connect/organization`, `/connect/consent`), the resource `${APP_URL}/mcp`, scopes `mcp` and
`offline_access`, the authorization-code and refresh grants only, a 600 s code, a 3600 s access JWT,
a 30-day refresh token reusable for 30 s, dynamic registration off, and `clientPrivileges` refusing
every action (clients come from metadata documents, never a session).

The guards force `prompt=consent` on every external authorization, since CIMD clients share a
`client_id`. They refuse a `set-active` carrying the authorization's signed query for an organization
the tenancy does not resolve (`ORGANIZATION_NOT_RESOLVED`), and mark the request that chose, which
lets the resumed authorization pass the organization step (a member of exactly one organization never
reaches it). They delete a client's older tokens when its consent is accepted and, with the
organization hooks, delete a member's grants when the member is removed, leaves, or the organization
is deleted. A grant is one `oauthConsent` row, unique by client, member and organization
(`referenceId`).

`context.oauth.verify(request)` reads only the `Authorization` header. It checks the signature
against the stored keys (never a fetch of the worker's own JWKS URL), the issuer, the exact audience,
`typ` `at+jwt`, expiry, scope `mcp` and the DPoP binding, then makes one read joining the consent
(client, member, `organization_id`), the user and the member under the membership predicate; a token
issued before the consent's `createdAt` is refused. It answers `{ user (with agent: true), session
(the grant's, no token), member, grant, tenancy }` or the `401`, `403` or `429` `Response` a client
reads. The per-grant limiter (`RATE_LIMITER_AGENT`) applies inside `verify`, skipped in dev. Its
`tenancy` is pinned to the grant's organization: every organization match is restricted to that id,
so a call made as an agent resolves its grant's organization and no other the member belongs to, and
anything else is absent, as a guessed id is. `revokeGrant(id, userId?)` ends a grant by its consent
id (with `userId`, only one of that member's) and `listGrants(userId)` lists a member's grants;
`auth.oauth.grants.list` and `revoke` are their procedures.

`worker/cimd-transport.ts` is the fetch transport `@better-auth/cimd` requires for a client's
metadata document, since Better Auth supplies one for Node only. It fetches public HTTPS hosts and
nothing else: `GET` and `HEAD` only, no IP literal or special-use name, the host resolved over DNS
over HTTPS and every answer required publicly routable, redirects returned unfollowed. Better Auth's
contract also asks for the connection pinned to the checked address, which a Worker cannot do: its
`fetch` dials by name, so a rebinding between the lookup and the fetch stays open. A Worker's egress
reaches the public internet only, never a private network of ours, which is why the window is
accepted.

## In the code

- `plugins/auth/src/index.ts`: the plugin, its slots (`runtimeOptions`, `appUrlDevDefault`, `reservedSlugs`, `callbackFile`, `cookiePrefix`, `clientFlags`) and contributions
- `plugins/auth/src/types.ts`: the options schema, `AuthCallbackPayloads`, rate-limit defaults, provider normalization, discovery prefixes
- `plugins/auth/src/callback-stubs.ts`: the deploy check over the scaffold's `// TODO` markers
- `plugins/auth/templates/callbacks.ts`: the scaffolded callback file
- `plugins/auth/src/client.ts`: the web client and the baked access control
- `plugins/auth/src/expo.tsx`: the native client, its provider and the ID-token helpers
- `plugins/auth/src/ability/index.ts`: the CASL wrapper, the statements compile and the wire types
- `plugins/auth/src/scope.ts`: `defineScope`, the membership predicate, the refused scope names
- `plugins/auth/src/schema/index.ts`: the identity tables
- `plugins/auth/src/schema/organization.ts`: the organization tables
- `plugins/auth/src/schema/passkey.ts`: the passkey table
- `plugins/auth/src/schema/oauth.ts`: the OAuth provider tables
- `plugins/auth/src/schema/devices.ts`: the device key table
- `plugins/auth/src/worker/index.ts`: `authRuntime`, `buildAuth`, the `fetch` handler, the re-exported Better Auth helpers
- `plugins/auth/src/worker/procedures.ts`: the `auth.*` procedures and their limits
- `plugins/auth/src/worker/outputs.ts`: the written-out procedure output types
- `plugins/auth/src/worker/callback-url.ts`: the magic-link redirect check
- `plugins/auth/src/worker/listener.ts`: the base URL and `passkeyFor` per listener
- `plugins/auth/src/worker/tenancy.ts`: the tenancy capability
- `plugins/auth/src/worker/devices.ts`: the device key plugin and its guard
- `plugins/auth/src/worker/oauth.ts`: the MCP authorization server, `verify`, the grants
- `plugins/auth/src/worker/cimd-transport.ts`: the metadata-document fetch transport
- `plugins/auth/src/worker/session-ended.ts`: the session-ended channel
- `plugins/auth/src/screens.ts`: the workbench's `get-session` handlers
- `plugins/auth/src/screens-fixtures.ts`: the workbench's `auth.*` fixtures
- `plugins/auth/src/serve.ts`: the `/fixture/link` control for `stack screens serve`
