# Sign-in

Email one-time codes are on by default; magic links, OAuth and passkeys are options of `auth()`. A web
app reads the session and signs in and out through the `orpc.auth.*` procedures
([the web app's calls](#the-web-apps-calls)); Better Auth serves the emailed link's verification,
OAuth and passkeys under `/api/auth` on the worker.

## Magic links

`magicLink: true` adds sign-in by emailed link and requires `sendMagicLink({ email, url, token, env })`
in the callbacks file ([callbacks](./callbacks.md)). The token expires in 5 minutes and is spent on
its first verification. An address with no user signs up when its link is first opened.

```ts
auth({ magicLink: true }),
// a web app
await orpc.auth.signIn.magicLink.call({ email, callbackURL: "/home" });
```

`callbackURL` is relative or on a trusted origin; the verify redirect refuses any other. A
spent, unknown or expired link redirects to `callbackURL` with `error=INVALID_TOKEN`.

## OAuth

`socialProviders.google` and `.apple` take `true` for the conventional var names
(`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET`) or
`{ clientIdVar, clientSecretVar }` to rename them. Apple takes `appBundleIdentifier` for native
ID-token sign-in.

```ts
auth({ emailOtp: false, socialProviders: { google: true, apple: true } }),
```

`emailOtp: false` makes an OAuth-only app: no code sign-in and no required `sendOTP`.

## Passkeys

`passkey: {}` turns them on with every setting derived: `rpID` from `app.domain`, `rpName` from
`app.name`, the accepted origins from the production CORS list. Set any of them, or
`authenticatorSelection`, on the same object. Re-export the `passkey` table
([config](./config.md)). Under `slotform dev` the ceremony runs on `localhost`, so a passkey enrolled
in dev works only in dev. On a Node listener that serves an origin of its own, the ceremony runs at
that origin. Enrolling needs a session younger than `session.freshAge`: the user
signs in another way first, calls `passkey.addPasskey()`, and signs in with `signIn.passkey()`
after.

## Who may sign up

Every way in makes an account for an address it has not seen: a code or link verified, an OAuth
callback. `signUp` closes that, with one rule for all of them.

| `signUp` | An address with no account may sign up when |
| --- | --- |
| `"open"` (default) | always |
| `"invite"` | it holds a pending, unexpired organization invitation |
| `"first"` | the app has no account yet; after that, as `"invite"` |

A single-owner app is `signUp: "first"` with `organization: true`: the owner signs in first,
creates the organization, and invites anyone else from it ([organizations](./organizations.md)).
An address that already has an account always signs in.

```ts
auth({ organization: true, signUp: "first" }),
```

A refused sign-up answers `FORBIDDEN` with code `SIGN_UP_CLOSED` (the `ORPCError`'s `data.code`)
and the sentence "Sign-up is closed. Ask for an invitation to join." in `message`, which a screen
shows. The code and link sends refuse it before an email goes out, so a closed app tells a stranger
whether an address has an account; an OAuth callback redirects with it as `error`.

## The web app's calls

A web app never imports Better Auth's client for what the worker serves as procedures. Each is a
typed oRPC procedure under `auth`, present while its option is on and a type error to name
otherwise.

```ts
const session = useQuery(orpc.auth.session.queryOptions()); // { user, session } | null
await orpc.auth.signIn.sendOtp.call({ email });
await orpc.auth.signIn.verifyOtp.call({ email, otp });
await orpc.auth.user.update.call({ name });
await orpc.auth.signOut.call();
```

| Procedure | Option | Input | Answers |
| --- | --- | --- | --- |
| `auth.session` (query) | always | `{ disableCookieCache? }`, optional | `{ user, session } \| null`; reads `session` |
| `auth.signOut` | always | none | `{ success }`; writes `session` |
| `auth.user.update` | always, session | `{ name?, image? }` | `{ status }`; writes `session`, `member` |
| `auth.signIn.sendOtp` | `emailOtp` | `{ email }` | `{ success }` |
| `auth.signIn.verifyOtp` | `emailOtp` | `{ email, otp (six digits), name?, image?, oauthQuery? }` | `{ token, user }`, or `{ redirect: true, url }` inside an MCP authorization; writes `session` |
| `auth.signIn.magicLink` | `magicLink` | `{ email, name?, callbackURL?, newUserCallbackURL?, errorCallbackURL?, metadata?, oauthQuery? }` | `{ status }` |

Both sends are limited per email (`TOO_MANY_REQUESTS`). A refusal's `code` is the endpoint's
(`BAD_REQUEST` for a wrong code) and its `data.code` Better Auth's (`INVALID_OTP`). The
organization calls are in [organizations](./organizations.md); `oauthQuery` is
[mcp-oauth](./mcp-oauth.md)'s.

Social sign-in and passkeys have no procedure and stay on `createAuthClient` from
`@slotform/auth/client`, Better Auth's React client, given the flags the config sets:

```ts
// src/app/lib/auth.ts
import { createAuthClient } from "@slotform/auth/client";

export const authClient = createAuthClient({ passkey: true });

await authClient.signIn.social({ provider: "google" });
```

`baseURL` defaults to the page's origin.

## The native client

The phone signs in through `@slotform/auth/expo`, set up by `auth({ expo: true })`: its
server option, scaffolded client and sign-in helpers are
`node_modules/@slotform/expo/guide/native-auth.md`.

## Rules

- The server decides which providers exist: a call to a provider the config leaves off fails, and
  its procedure is absent from `AppRouter`.
- Close sign-up with `signUp`, never a `sendOTP` that returns early or a hand-written hook: it
  would leave OAuth open.
- Read the session through `orpc.auth.session`, never `authClient.useSession()`, in a web app.

**Check:** `pnpm check` passes, and under `pnpm dev` a sign-in sets the session cookie.
