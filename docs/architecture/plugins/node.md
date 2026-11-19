# plugin-node

`@fcalell/plugin-node` is the long-running Node server target, the alternative to
[plugin-cloudflare](cloudflare.md) for the same worker. This page holds what the plugin owns and
contributes, the server `.stack/server.ts` starts (its Host rule, its WebSocket admission, its
services and channels), the browser socket client, the dev process, the production bundle and the
screens serve target. How a consumer runs and deploys the server is the plugin's guide
(`plugins/node/guide/`).

## Slots and contributions

`requires: ["api"]`. Subpaths:

| Subpath | Holds |
| --- | --- |
| `./server` | The Node runtime: `startNodeServer`, `createNodeServer`, `defineService`, `loadModules` |
| `./ws` | The isomorphic channel contract ([Channels](#channels)) |
| `./client` | The browser WebSocket client ([Client socket](#client-socket)) |
| `./live` | `channelRead`, a channel as a read ([Channels](#channels)) |
| `./serve` | `fixtureSockets`, the `/fixture/socket` service ([Screens serve](#screens-serve)) |
| `./screens` | The screens workbench's handler module ([Screens serve](#screens-serve)) |

`node/` (codegen) and `server/` never import each other; `client/` and `server/` share only `ws/`
([plugin folder structure](../conventions.md#plugin-folder-structure)). The plugin writes `esbuild`
into the consumer's `devDependencies` as an optional peer ([Build and bundle](#build-and-bundle)).
Its owned slots, from `serverPort` (default 8788) to `serverBundleSource`, are listed in the
[slot catalog](../slot-catalog.md#nodeslots-plugin-node).

| Target slot | Behaviour |
| --- | --- |
| `cliSlots.artifactFiles` | `.stack/server.ts` and the services barrel `src/server/services/index.ts` |
| `cliSlots.buildSteps` | `node-bundle`, phase `post` ([Build and bundle](#build-and-bundle)) |
| `cliSlots.devProcesses` | `node --watch .stack/server.ts` ([Dev](#dev)) |
| `api.slots.localOrigins` | `deployed` when `host` is a loopback address: the local origins in `app.origins` are then its deployed allow-list |
| `api.slots.devTargetOrigins` | `http://localhost:<port>`, unless `app.origins` is set ([CORS and origins](api.md#cors-and-origins)) |
| `vite.slots.clientHeaders` (read) | `serverSource` passes it to the server as `clientHeaders`, with a static root only |
| `vite.slots.serverProxy` | Every worker path, and `/ws` as a WebSocket, so API clients keep relative URLs in dev; inert without vite |
| `screens.slots.serveTargets` | The node serve target ([Screens serve](#screens-serve)) |
| `screens.slots.handlerModules` | `@fcalell/plugin-node/screens` ([Screens serve](#screens-serve)) |
| `cliSlots.devWatchers` | Rewrites the services barrel when a service file appears or goes (300 ms debounce) |
| `cliSlots.removeFiles` | `src/server/` |

## Runtime

`.stack/server.ts` (composed by `node.slots.serverSource`) is one `startNodeServer({ ... })` call
from `@fcalell/plugin-node/server`: an outer Hono app that mounts, in order, `/ws`
([WebSocket admission](#websocket-admission)), the service mounts ([Services](#services)), the worker's
fetch handler on every `api.slots.routePrefixes` path, and, with `vite()`, the web client's build
(`vite.slots.outDir`, `dist/client`) as static files with an SPA fallback to its `index.html`. The
fallback shadows the worker's `GET /` liveness route; with no vite neither is mounted. The static
files and the fallback carry `clientHeaders` ([content security policy](vite.md#content-security-policy));
the earlier layers never do. A request body over `bounds.body` bytes is refused with 413, and a
WebSocket frame over `bounds.frame` bytes closes its socket ([Channels](#channels)). Where the
server listens is the guide's [production](../../../plugins/node/guide/server.md#production) (`listenOf`). Services start before it listens
and stop in reverse order on `SIGINT` or `SIGTERM`; a failed boot logs and exits 1.

Node has no bindings: the worker gets the `env` the entry passes, `process.env`, `executionCtx`
degrades to a no-op `waitUntil`, and binding-backed features (rate limiters) skip themselves when the binding is absent.

The consumer's TypeScript (`.stack/`, `src/`) runs directly under Node >= 24.14 (type stripping) while
the stack packages it imports load compiled from `dist/`. Everything of the consumer's on the
runtime import path is erasable-only syntax (no parameter properties, no enums) and names the file
of every value import (`./types.ts`, `../src/schema/index.ts`): node resolves neither a missing
extension nor a directory (`ERR_UNSUPPORTED_DIR_IMPORT`). The generated worker imports the schema
in that form for this reason ([db's schema import](db.md#schema-import)), and a node consumer's route
files name their files the same way.

### Worker contract

The server calls the worker shape plugin-api's `.stack/worker.ts` emits (its `WorkerExport`,
[api's runtime](api.md#runtime)), reduced to what this target calls. On Node, `env` is
`process.env` and there is no execution context; the worker runtime degrades both.

## Generated server entry

`.stack/server.ts` is a thin call into the runtime, so every moving part (module loading, mounting,
static serving, service lifecycle) lives in `@fcalell/plugin-node/server`, where it is testable, and
none in generated text. The entry is the server's process entry. It passes `env: process.env`, its
one read of the environment ([conventions](../conventions.md#the-environment)), and the worker, the
Host rule, `listenOf` and the boot tasks read that argument; `startNodeServer` has no default for it.

The entry hands `startNodeServer` module URLs (`workerModule`, `procedureModule`, `servicesModule`)
instead of importing them. Route files import `virtual:stack-procedure`
([virtual:stack-procedure](../runtime.md#virtualstack-procedure)), which plain node cannot resolve
(tsx and esbuild resolve it through tsconfig `paths`). A static import resolves at link time, before
any hook can register, so the boot calls `node:module`'s `registerHooks` to map
`virtual:stack-procedure` to `.stack/procedure.ts` and only then dynamic-imports the worker and the
services barrel. A plugin's `node.slots.services` entry is a statically imported `ServiceSpec`
expression, so its module must not import `virtual:stack-procedure`; the consumer's own services
load through `servicesModule`.

The production bundle's form of the same entry hands over the modules themselves (`modules`): the
bundler has already followed the imports and aliased `virtual:stack-procedure`
([Build and bundle](#build-and-bundle)).

## Hosts and listeners

Every request meets its listener's Host rule first: the static files, the worker's paths, the `/ws`
upgrade and the service mounts alike. A rebinding page reaches a server under its own name, so a
Host the listener does not serve is refused with 421, never trusted. The Host is the raw header, so
a request without one is refused too. The consumer's half is the guide's
[hosts and listeners](../../../plugins/node/guide/server.md#hosts-and-listeners).

- **The main listener** admits the Host of one of the app's origins (`api.slots.cors`, passed as
  `origins`) or the bound address itself; under `STACK_DEV` also a loopback name or an IP literal (a
  dev server reached as `127.0.0.1`, a phone on the LAN). Without an origin list (a server built by
  hand) every Host is admitted, as is every Host under a wildcard origin.
- **A further listener** (`listeners`, by name) admits the Host of the origin its `originVar` env var
  holds at that moment. The worker sees a request on it with the server's env plus `STACK_LISTENER`
  (the name) and `STACK_ORIGIN` (its origin), one env object per origin.

## WebSocket admission

`/ws` is mounted first: neither the worker nor the SPA ever owns it. A browser applies no CORS to a
WebSocket and sends its Origin, so a page open beside the app opens a socket with the user's
cookies; the server admits the upgrade itself, by one rule in `ws-guard.ts`:

1. **Origin.** An upgrade names the page it comes from, and an Origin the app does not trust is
   refused with 403 first (a native client's WebSocket sends one too). The trusted list is the
   worker's CORS list on the main listener and the listener's own origin on a further one. Whether
   the worker's CORS layer answers an origin is asked by a preflight through `worker.fetch`, which
   reads the same effective list the worker's `isForbiddenOrigin` guard does (production origins,
   plus the dev origins only under `STACK_DEV`,
   [CORS and origins](api.md#cors-and-origins)), so no second list exists to drift. A worker with no
   CORS, or none at all, trusts no browser origin.
2. **No Origin.** The one upgrade admitted without an Origin is a headless client's (a daemon holding
   a device key) in an app with `auth()`, which carries its credential as `Authorization: Bearer`, a
   header no browser page can set on a WebSocket. It is judged by that credential alone, its cookies
   unread. Without `auth()` there is no credential to judge, so every upgrade without an Origin is
   refused.
3. **Session.** An app with `auth()` requires a session of every socket. The session is asked of the
   same auth the RPC calls resolve it from (better-auth's `get-session`, answered by the worker),
   from the database rather than the signed cookie cache, so a session revoked a moment ago opens
   nothing. Anything but a session is null, and an error refuses the socket.

The session rides to each channel handler as `conn.session` ([Channels](#channels)).

### Auth coupling

This package cannot import plugin-auth, so, as plugin-expo's version gate does, it names two of
auth's contracts: the worker path better-auth is mounted under (auth's `AUTH_PREFIX`; the auth plugin
is configured exactly when the worker owns that path), and the `stack:auth:session-ended`
diagnostics channel, where plugin-auth publishes `{ sessionId }` when Better Auth deletes a session
(a sign-out, a revoke, a deleted user). The server closes that session's sockets
([auth's session end](auth.md#session-end)).

## Service route sessions

`http.session(request)` resolves a mounted route's request to the `{ user, session }` the app's auth
holds, by `/ws`'s rule for the one credential a browser attaches by itself. A bearer (a member's
session token or a device key, which no page holds) is read on any request. Cookies are read only
when the request comes from one of the app's pages: an Origin the app trusts, or a `GET` or `HEAD`
with no Origin. A browser sends an Origin on every cross-origin request and on a same-origin one that
changes state, and sends none on the reads it makes from the app's own page (an image, a link, a
download); a route answers those without changing state, so a cookie on one opens nothing a page
elsewhere can use. The result is null when there is no credential, it is refused, or the app has no
auth. A mounted handler calls it first and answers 401 on null; a page elsewhere that posts with the
user's cookies is anonymous, so the route checks no Origin of its own.

## Services

A service is a plain module singleton in the consumer tree: `src/server/services/<name>.ts`
default-exports a `defineService({ name, start, ready? })`, and code that needs a service imports the
module directly, with no context plumbing. `start(ctx)` receives `{ log, ws, http }` and may return a
stop handle. The consumer's half is the guide's [services](../../../plugins/node/guide/services.md).

- **Order.** The services of `node.slots.services` start first, by name, then the consumer's in
  file-name order, so a `start` never relies on another service having started. Work that needs the others (enqueueing a job, reading what another service loaded,
  broadcasting) goes in `ready`, which runs for every service, in the same order, once every `start`
  has finished and before the server listens. Stops run in reverse order.
- **Mounts.** `http.mount(prefix, handler)` registers a raw fetch-style route: every request whose
  path equals `prefix` or is under `prefix + "/"` goes to `handler`, matched after `/ws` and before
  the worker, static files and SPA. The longest registered prefix wins and a duplicate throws, so a
  service owns its subtree (an in-process MCP endpoint a spawned CLI reaches directly by
  `http.port`); a consumer mounting a worker prefix is documented, not guarded.
- **The barrel.** The services directory is flat, as plugin-api's route barrel is
  ([routes barrel](api.md#routes-barrel)): one module per file `listed.ts` lists
  ([Directory modules](#services)), subdirectories ignored, so `index.ts`, the barrel, never imports
  itself. The barrel names each import by its position (`service0`), so any file name binds.
  `consumerServices` is seeded from the directory's contents, the one value the barrel emission and
  the barrel import both resolve, so they never disagree about whether the directory takes part.
- **Directory modules.** `loadModules(new URL("./dir/", import.meta.url))` returns the modules of a
  directory by file name without the extension: a registry the code does not list by hand
  (`jobs/*.ts`, `importers/*.ts`). A test, a declaration and an `index` are not modules; `loadModules`
  at run time and the bundle at build apply that one rule (`listed.ts`). The URL is written in the
  call because `stack build` reads that argument ([Build and bundle](#build-and-bundle)).

## Channels

The channel contract is isomorphic: the consumer defines one `ChannelDef` in a shared module and
imports it from server code (`hub.channel`) and browser code (`client.subscribe`). Types flow from
the zod schemas, with no codegen. The wire protocol is JSON text frames: `sub`, `unsub`, `msg` and
`ping` from client to server, `msg` and `pong` from server to client. Every frame is zod-validated at both ends; an
invalid frame is dropped and logged.

`./server`'s hub serves the contract: `ctx.ws.channel(def, { onSubscribe, onUnsubscribe, onMessage })`
returns `broadcast` and a per-connection `send`. A connection carries an `id` stable for the socket's
life, and `onUnsubscribe` runs once, on an `unsub` or the socket's close, so per-connection state
such as presence never outlives the socket. The transport is `@hono/node-server` v2's own
`upgradeWebSocket` with `serve({ websocket: { server } })` over a `ws`
`WebSocketServer({ noServer: true })`; `@hono/node-ws` peer-pins `@hono/node-server` v1 and is not
used. `ws`'s `maxPayload` enforces `bounds.frame`, and Hono's body limit enforces `bounds.body`. On
shutdown the server calls `terminate()` on the tracked sockets before `server.close()`, which
otherwise hangs on live sockets.

The hub keeps three guards on a socket. One socket's frames run in the order they arrived, so an
`unsub` never overtakes the `sub` whose async `onSubscribe` is still running; a `ping` is answered at
once, ahead of that queue. Every 30 seconds (`IDLE_SWEEP_MS`) the hub, which the server starts and stops with it, sends each socket a protocol
ping and terminates one that answered nothing (no pong, no frame) since the last sweep, so a client
that vanished without a close stops being present and stops receiving broadcasts. A send to a socket
with more than `MAX_BUFFERED_BYTES` (4 MiB) unsent terminates it, since a stalled link would grow the
server's memory without bound; the client reconnects and is snapshotted again.

A connection's session is fixed at the upgrade. A session auth ends (a sign-out, a revoke) closes the
socket, as does `ws.closeSession(id)` for one the app ends itself; a lost membership changes nothing
here, so a handler that must honour it re-checks. The session is null only when the app has no auth,
where every connection is anonymous. A channel's `onSubscribe` and `onMessage` read it to decide what
the connection may see or do. A socket whose session ends closes with 1008 (a policy violation), so
the client's reconnect meets the upgrade's own refusal rather than a socket that just dropped.

`channelRead` (`./live`) makes a channel a read: its frames fold into one value, written to the query
cache as they arrive, so a frame holds it like any other read ([the read model](../ui-core/reads.md)).
The `queryFn` stays in flight for the subscription's life, which ties the subscription to the
observers and ends it when the last one leaves. Drawing one is the guide's
[live channels](../../../plugins/node/guide/live.md).

## Client socket

`./client` holds one shared socket per client, opened by the first subscribe or reconnect (a client
made at module level holds none before sign-in), reconnecting with capped exponential backoff. Any
number of subscriptions share a channel: every frame on it reaches each of them, a new one sends
`sub` so the server snapshots again, and `unsub` goes only when the channel's last one leaves. On
every open and reopen the client sends `sub` once per channel, so a server that snapshots on
subscribe gives reconnect consistency. It uses the global `WebSocket` (the browser's; Node >= 22 has
it natively, so the same client runs in tests).

The client keeps its own liveness, with the constants named in `./client`:

- A socket still connecting after `CONNECT_TIMEOUT_MS` is abandoned and retried, and `reconnect()` also
  abandons one that is connecting.
- The backoff resets only after a socket stayed open `MIN_UPTIME_MS`, so a server that accepts and
  closes at once is not retried at the base delay. Each delay is a full jitter, a random share of the
  backoff step, so clients dropped together do not retry together.
- Close code 1008 (the session ended) stops reconnecting until `reconnect()` or a new subscribe, so a
  screen that subscribes after the viewer signs in again reopens the socket. The online and visible
  wake does not.
- The page listeners are registered when the client opens its first socket, so constructing a client
  reads no environment.
- When the page becomes visible or the browser comes back online, an open socket gets an app-level
  `ping` (a browser cannot read protocol pings) and is dropped and reconnected if no frame arrives
  within `PING_TIMEOUT_MS`; a socket waiting on its backoff reconnects at once. The listeners are
  guarded, so the client loads on Node and React Native, which have no such events.
- A `send` while the socket is not open is queued, at most `SEND_QUEUE_MAX`, the oldest dropped, and
  flushed after the `sub` frames on open. A `send` after `close()` throws.

The socket's status is a read in the query cache. It never opens the socket, only watches it. Its
`meta.reach` is what the mutation guard asks (`guardReach`, [query's acts](query.md#acts)): a lost
connection refuses acts.

## Dev

The dev process runs the generated server directly under the consumer's node (type stripping, no
build step): `node --watch .stack/server.ts`. Its env, `ProcessSpec.env`, carries `STACK_DEV=1`,
which puts the worker runtime in [dev mode](../runtime.md#dev-mode), and the `devDefault` of each
declared `api.slots.env` var the shell leaves unset. The main listener binds last: its `listening on`
line (`READY_LINE`, `server/log.ts`) is the dev supervisor's ready signal (`readyPattern`), so it
comes once every port answers; a further listener's line does not match it.

## Build and bundle

`stack build` adds a self-contained form of the server. The `node-bundle` build step (phase `post`,
after the client is built) writes `.stack/server.bundle.ts` (`node.slots.serverBundleSource`, written
by the step, not by `generate`): the same server as `serverSource`, with the worker and the services
barrel imported for esbuild to follow (`virtual:stack-procedure` is its alias for
`.stack/procedure.ts`), the client's directory found beside the bundle (`staticDir`), and the `boot`
tasks of `node.slots.bundleEntries` run before it listens. It is null where `serverSource` is. A
`bundleEntries` entry adds imports, a boot task (an expression evaluating to
`(env) => void | Promise<void>`, called with the server's env) and files copied beside the bundle
for it to read at run time (a source that does not exist copies nothing): db
applies its committed migrations ([db's contributions](db.md#slots-and-contributions)). Dev runs
neither, since it runs the sources and db pushes the schema.

The output is `server/` beside the client's directory: the server, the app's sources and every
dependency written into one file, `server.mjs`, plus what a file cannot hold:

- `node_modules/` with each package that carries a native addon (found while resolving: a
  `binding.gyp`, `prebuilds/` or `build/Release`), which keeps its binary and is copied with its
  runtime dependencies, where Node finds it;
- the files an entry asks to be copied (`migrations/`);
- `workers/<name>.mjs` for each `new Worker(new URL("./w.ts", import.meta.url))` the app's sources
  start, bundled on its own, with the URL rewritten to name that file;
- `bin/<name>.mjs` for each module of `src/bin/`, bundled the same way: a tool run by hand on the box.

The build reads those two idioms, `new Worker(new URL(...))` and `loadModules(new URL(...))`, in the
sources outside `node_modules` (the app's own, and a `link:` or workspace package's, which resolve
to their checkout) and rewrites them, so neither needs a registry or a second
build step: a thread is started from a module the bundle holds no file for, and a directory listed at
run time lists the source's files, not the bundle's. A `loadModules` call becomes lazy imports of the
directory's modules, listed at build; from source the same call reads the directory. The directory
runs on a box with only `node` on it, wherever the app was built (a `link:` to a checkout, a workspace
package, TypeScript under `node_modules` are all followed at build). The consumer's half is the
guide's [deploy a bundle](../../../plugins/node/guide/server.md#deploy-a-bundle).

esbuild is loaded inside the step: it is the plugin's optional peer, which the app declares as a
devDependency (`stack init` and `stack add node` write it), so a config that only reads this plugin,
and an install that only runs the app, never pay for it.

## Screens serve

A `stack screens serve` run ([screens' serve](screens.md#serve)) on the node target starts the
source entry `.stack/server.ts` is, on the run's port and with the worker wrapped in the fixture
controls, beside the `/fixture/socket` service. Both files live in `.stack/`, where the entry's
relative modules and the app's packages resolve, and go with the run.

`/fixture/socket?close=1` (`fixtureSockets`, `./serve`) closes the WebSockets of the session the
request holds, as a server restart or a revoked session does. The other `/fixture` controls are
`@fcalell/plugin-screens/serve`'s; the sockets are this server's. A serve run starts it; an app's own
entry lists it in `services`.

The screens workbench answers the app's `/ws` through `screens.slots.handlerModules`:
`@fcalell/plugin-node/screens` is an MSW `ws.link("*/ws")` handler that answers each `sub` with the
snapshot the story's `channels` fixture gives that channel, as the frame the client decodes. It lives
under its own subpath because it imports MSW through the screens package, which only the workbench's
browser loads. Without `screens` in the config the slot resolves to nothing.

## In the code

- `plugins/node/src/index.ts`: the plugin, its slots and contributions, the dev process, the build step, the serve target.
- `plugins/node/src/types.ts`: the options, `ServiceEntry` and `BundleEntry`.
- `plugins/node/src/node/codegen.ts`: renders `.stack/server.ts` and the bundle entry.
- `plugins/node/src/node/barrel.ts`: the services directory layout and its barrel.
- `plugins/node/src/node/bundle.ts`: the production bundle.
- `plugins/node/src/listed.ts`: which files of a directory are modules.
- `plugins/node/src/server/start-node-server.ts`: the boot, module URLs and `registerHooks`.
- `plugins/node/src/server/create-node-server.ts`: the Hono app, its mount order, listen and shutdown.
- `plugins/node/src/server/listeners.ts`: each listener's Host rule and env.
- `plugins/node/src/server/ws-guard.ts`: the WebSocket admission rule and route sessions.
- `plugins/node/src/server/ws-hub.ts`: channels, connections and session close.
- `plugins/node/src/server/service.ts`: `defineService` and the service context.
- `plugins/node/src/server/modules.ts`: `loadModules`.
- `plugins/node/src/server/worker.ts`: the worker shape the server calls.
- `plugins/node/src/ws/index.ts`: the channel contract and wire protocol.
- `plugins/node/src/client/index.ts`: the browser socket client and its status read.
- `plugins/node/src/live/index.ts`: `channelRead`.
- `plugins/node/src/serve.ts`: the `/fixture/socket` service.
- `plugins/node/src/screens.ts`: the workbench's `/ws` handler.
