# Node server

`node()` runs the app as one long-running Node process in place of Cloudflare Workers. The process
serves the API worker, a WebSocket endpoint at `/ws`, your background services and, with `vite()`,
the built web client from `dist/client` with every other `GET` answered by its `index.html`. It needs `api()`
and Node 24.14 or newer.

```ts
// stack.config.ts
import { node } from "@fcalell/plugin-node";

plugins: [
  node({ port: 8788 }),
  db({ dialect: "sqlite", path: "./data/app.sqlite" }),
  api(),
  // ...
],
```

| Option | Default | Effect |
| --- | --- | --- |
| `port` | `8788` | The listen port. The `PORT` env var overrides it in production |
| `host` | every interface | The bind address. A loopback address (`127.0.0.1`) makes the local origins of `app.origins` the production allow-list. The `HOST` env var overrides it in production |
| `listeners` | none | Further ports, each serving one origin of its own (below) |
| `bounds.body` | 16 MiB | A request body over it answers 413 |
| `bounds.frame` | 1 MiB | A WebSocket frame over it closes its socket |

## Hosts and listeners

Every request, the client's files, the worker's paths and `/ws` alike, gets 421 unless its Host is
one of the app's origins (`app.domain`, `app.origins`) or the bound address itself
(`127.0.0.1:8788` under `host: "127.0.0.1"`); under `pnpm dev` a loopback name or an IP address
passes too. A proxy in front passes the Host through.

A further listener serves one more origin, a proxy's named address beside the loopback port, say:

```ts
node({
  port: 8788,
  host: "127.0.0.1",
  listeners: { network: { port: 8789, host: "127.0.0.1", originVar: "NETWORK_ORIGIN" } },
}),
```

The server reads its origin (`https://app.example.com`) from `originVar` on each request, so
setting `process.env.NETWORK_ORIGIN` moves it live; unset, the listener refuses everything. It
admits that origin's Host alone, the worker's env there carries `STACK_LISTENER` (`"network"`) and
`STACK_ORIGIN`, and auth signs in at that origin.

## Moving from Cloudflare

Replace `cloudflare()` with `node()`, and the database with `db({ dialect: "sqlite", path })`:
`d1` runs on Cloudflare only. Remove a root `wrangler.toml` and `.dev.vars`; neither is read.

## Env

The worker's `env` is `process.env`, and `context.env` is untyped (`unknown`) in a handler. Every var a plugin declares is checked when the server starts, before it
opens the port or starts a service: a missing or malformed one stops the boot with one message
listing them all (`stack node: failed to start: the environment is incomplete: - Missing env var:
AUTH_SECRET ...`).

What a production process needs, by the plugin that declares it (a renamed var, `fileVar`,
`secretVar` or `appUrlVar`, replaces its default name):

| Plugin | Var | Needed | Rule |
| --- | --- | --- | --- |
| `db({ dialect: "sqlite" })` | `DB_FILE` | always | The database file's path. `path` is only its dev default, and `stack db` commands read the same var (see `plugin-db`'s `commands.md`) |
| `auth()` | `AUTH_SECRET` | always | At least 32 characters; signs sessions |
| `auth()` | `APP_URL` | always | The app's public origin as a URL (`https://app.example.com`); it is the sign-in links' and cookies' origin, and `STACK_DEV` with a non-local `APP_URL` refuses to start |
| `auth({ socialProviders })` | `<PROVIDER>_CLIENT_ID`, `<PROVIDER>_CLIENT_SECRET` | per enabled provider | e.g. `GOOGLE_CLIENT_ID` |
| `api({ env })` | the names listed | as declared | Your own vars; each is required |
| `node({ listeners })` | each listener's `originVar` | per listener | Its origin; unset, that listener refuses everything (above) |

- Under `stack dev` each declared var the shell leaves unset gets its dev default, with
  `STACK_DEV=1`. In production set each one yourself, and never `STACK_DEV`.
- Cloudflare bindings do not exist here: a feature backed by one (auth's rate limiters) skips
  itself.

## Framing

The web client's files carry `frame-ancestors 'none'` and `X-Frame-Options: DENY`: a stack app is
never framed.

## Dev

`stack dev` runs `node --watch .stack/server.ts` on the port. With `vite()` in the config, the dev
server proxies the worker's paths (`/rpc`, `/api/auth`) and `/ws` to it, so the browser stays on
one origin as in production.

## Production

`PORT` and `HOST` set where the process listens, over `port` and `host`, with no rebuild (a `PORT`
that is not a port number stops the boot); `stack dev` ignores both. `HOST` moves the bind
address only: the origins baked from a loopback `host` stay.

```bash
pnpm build                       # builds dist/client
DB_FILE=/var/lib/my-app/app.sqlite AUTH_SECRET=… APP_URL=https://example.com node .stack/server.ts
```

Run `node .stack/server.ts` from the app's root under your process manager. Node strips the types
on load, so there is no compile step, but the box needs the project and its dependencies, a `link:`
dependency's checkout included. `stack deploy` has nothing to ship here. To ship a directory instead, [deploy a bundle](bundle.md).

`SIGINT` and `SIGTERM` stop the services in reverse order, then the server.

## Rules

- Never import a Cloudflare binding type or `cloudflare:*` module in worker code that runs here.
- Keep every file the server loads erasable TypeScript, since Node strips the types: no enums, no
  parameter properties, no `namespace`, and every relative import that is not type-only names its
  file (`./types.ts`, `../schema/index.ts`), never `./types` or a directory.
- Reach the app only at an origin on its CORS list (`app.domain`, `app.origins`) or a listener's:
  the `/ws` socket refuses a page served from any other ([who is connected](channels.md#who-is-connected)).
- Keep `.stack/` in production: it holds the server entry, generated by `stack build`.

**Check:** `stack generate`, then `pnpm check` passes, and `pnpm dev` logs
`stack node: listening on`.
