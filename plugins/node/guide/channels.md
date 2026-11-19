# Channels

A channel carries typed messages between the Node server and the app over one WebSocket at `/ws`.
A [service](services.md) registers it on the hub its `start` receives; this page covers declaring
one, the client side, and who may connect. Drawing a channel's data on a screen is [live](live.md).

A channel is declared once with `defineChannel` from `@fcalell/plugin-node/ws`, in a module the
server and the app both import. Its zod schemas type every message both ways.

```ts
// src/shared/channels.ts
import { defineChannel } from "@fcalell/plugin-node/ws";
import { z } from "@fcalell/plugin-api/schema";

export const board = defineChannel("board", {
  server: { snapshot: z.object({ cards: z.array(z.string()) }), tick: z.object({ at: z.number() }) },
  client: {},
});
```

The hub takes `onSubscribe(conn)`, `onUnsubscribe(conn)` and `onMessage.<type>(payload, conn)`;
`conn.id` is stable for the socket's life. In the app, `createWsClient()` from
`@fcalell/plugin-node/client` opens one socket to `/ws` on its first subscribe, and
`client.subscribe(board, { onMessage: { tick(payload) {} }, onStatus(status) {} })` answers a
subscription with `send(type, payload)` and `unsubscribe()`. The client reconnects on its own and
subscribes again, so a channel that sends a snapshot in `onSubscribe` stays consistent. A session
that ended (close code 1008) is not retried until `reconnect()` or a new subscribe. A `send` made
before the socket is open is queued (the newest `SEND_QUEUE_MAX` are kept) and goes out after the subscribes.

## Who is connected

`/ws` is authenticated and origin-checked before the socket opens, because a browser applies no
CORS to a WebSocket. An upgrade off the worker's CORS list (the production origins, plus the dev
origins under `pnpm dev`; on a further listener, its own origin alone) is refused with 403, and so
is one with no valid session when the app has `auth()`. An upgrade with no `Origin` is refused too,
unless the app has `auth()` and it carries `Authorization: Bearer`, a header no browser page can set on a WebSocket: a
headless daemon sends its device key so, which `createWsClient({ url, headers })` sets on the
upgrade (a browser ignores `headers`), and it is judged by that key alone, its cookies unread. The
session is read from the database, past the cookie cache, so a revoked one opens nothing.

Every handler's `conn` carries the session the socket opened with, `conn.session`: `{ user, session }`
as `auth.api.getSession` answers, or `null` when the app has no auth. A channel decides what a
connection may see or do from it; a channel with no check sends to anyone signed in.

```ts
const channel = ws.channel(notifications, {
  onSubscribe(conn) {
    const userId = conn.session?.user.id;
    if (typeof userId !== "string") return;
    conn.send("snapshot", { items: itemsFor(userId) });
  },
});
```

`broadcast` reaches every subscribed connection, so a channel whose data is per user or per
organization sends it with `conn.send` to the connections that may read it. The session is read
once, at the upgrade, and its sockets close when it ends: a sign-out or a revoke through auth
closes them by itself, and a session your code ends another way (its row deleted) closes them with
`ws.closeSession(sessionId)` on the hub `start` received. A lost membership closes nothing, so a
handler that must honour one re-checks on each message.

A mounted route authenticates by the same rule, so it checks no `Origin` of its own: a bearer key
is read on any request, and a cookie only from one of the app's pages, an `Origin` on the CORS list
(on a further listener, its own) or a `GET` or `HEAD` with none, which a browser sends from the app's
own page (an image, a link). A page elsewhere that sends the user's cookie, and a write with no
`Origin`, are anonymous. Answer `401` on `null`, and change no state on a `GET`.

```ts
http.mount("/sync", async (request) => {
  const session = await http.session(request);
  if (!session) return new Response("Unauthorized", { status: 401 });
  return handleSync(session.user.id, request);
});
```

