# MCP connections

`auth({ mcp: true })` makes the worker an authorization server for MCP clients: a member connects
a client by signing in, choosing an organization and approving it, and the client holds a 1-hour
access token bound to `${APP_URL}/mcp` and a rotating 30-day refresh token. It needs
`organization`. A client is known by its metadata document
(the URL it uses as its client id); one that only registers dynamically cannot connect.

```ts
// slotform.config.ts
auth({ organization: true, mcp: true }),
// src/schema/index.ts
export * from "@slotform/auth/schema/oauth"; // the grant and signing-key tables
```

The worker serves the discovery documents under `/.well-known/` and limits calls per grant
(`rateLimiter.agent` in [config](./config.md)). The scopes are `mcp` (the whole tool list) and
`offline_access` (the refresh token); a request without a `resource` gets a token the verifier
refuses.

## The pages the app builds

The authorization sends the member to three addresses, each carrying a signed query:

| Page | Does |
| --- | --- |
| `/sign-in` | Signs in by code through `orpc.auth.signIn.sendOtp` and `verifyOtp({ email, otp, oauthQuery })`, whose answer is `{ redirect: true, url }` that the page follows |
| `/connect/organization` | Asked only of a member of several organizations, or of none; a member of exactly one organization goes from sign-in straight to consent. Then `orpc.auth.organization.setActive({ organizationId, oauthQuery })`, the active one too: it resumes the authorization to consent, answering `{ redirect: true, url }` that the page follows. A member of none sees an empty state whose Deny calls `auth.oauth.consent({ accept: false, oauthQuery })`, which answers the client `access_denied` |
| `/connect/consent` | Reads the client with `orpc.auth.oauth.client({ clientId })`, shows the session's active organization, and calls `auth.oauth.consent({ accept, oauthQuery })` |

`oauthQuery` is the signed part of the page's query string: the `sig` parameter and the parameters
named by `ba_param`, which the page builds from `location.search` and passes to each of these calls.
`signIn.verifyOtp`, `signIn.magicLink` and `organization.setActive` take it, and answer the redirect
beside their own result, only while `mcp` is on. The page leaves to the redirect itself
(`window.location.assign(url)`). `auth.oauth.client` and `auth.oauth.consent` exist only with `mcp`.

Consent is asked on every authorization. The grant is for the session's active organization, which
must still resolve for the member when they allow: if it no longer does (an expired external
member, an unknown id), the grant is refused `403` with code `ORGANIZATION_NOT_RESOLVED`. A session
with no active organization gets the member's one organization, and with two or none is refused the
same way.

## The endpoint

`src/worker/mcp.ts` lists the procedures an agent may call, and the worker serves them at
`POST /mcp` behind this verification (api's `mcp` page). `mcp` is then a
reserved organization slug.

## Verifying a call

`context.oauth` is on a procedure's context beside `tenancy`. `verify(request)` reads only the
`Authorization` header and answers the grant's member, or the `Response` the client reads:

```ts
const verified = await context.oauth.verify(request);
if (verified instanceof Response) return verified; // 401, 403 or 429, with WWW-Authenticate
const { user, session, member, grant, tenancy } = verified;
```

`user` is the member's user row with `agent: true`, `session.id` is the grant's id, and `tenancy`
resolves the grant's organization and no other. `grant` is
`{ id, clientId, organizationId, scopes }`. A drizzle read of a grant row's `scopes` answers JSON
text; `scopesOf` from `@slotform/auth/schema/oauth` returns the list. A token is refused when
it fails its checks, lacks `mcp` (`403`), or outlives its grant's consent or the member's membership.

`revokeGrant(id, userId?)` deletes a grant's consent and tokens and answers whether it existed (with
`userId`, only that member's); `listGrants(userId)` lists a member's grants. Removing a member, a
member leaving and deleting an organization end their grants there. Reconnecting a revoked client
starts a new grant.

## Showing a member their connections

`auth.oauth.grants.list` answers the caller's grants, newest first, and `auth.oauth.grants.revoke({ id })` ends one,
tokens included:

```ts
const grants = orpc.auth.oauth.grants.list.read(); // { id, name, uri, organizationId, scopes, createdAt }[]
const revoke = orpc.auth.oauth.grants.revoke.mutationOptions(); // { id }; the list refreshes
```

`name` is the client's name, or its client id when it has none; `uri` is its address or `null`. The
list holds the member's grants in every organization, so one client connected to two organizations
is two rows, told apart by `organizationId`. A grant that is not the caller's, or does not exist, is
`NOT_FOUND` from `revoke`, so a member cannot learn another's grant ids. Better Auth's own consent
routes (`/oauth2/get-consent` and the others) stay closed.

## Rules

- One grant per client, member and organization: the same client connected twice to one
  organization shares it.
- A client holds one token per server address, so connecting it to a second organization replaces
  the first in the client; both grants stand.
- A refresh token reused after its 30-second window revokes every refresh token of that client for
  the member.

**Check:** `slotform generate`, `slotform db generate`, then an MCP client connects a member and `verify`
answers their organization.
