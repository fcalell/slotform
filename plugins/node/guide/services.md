# Services

A service is code that runs for the life of the Node server: a watcher, a queue consumer, a
WebSocket channel, an HTTP surface outside the API. Each is a file in `src/server/services/`
default-exporting `defineService` from `@slotform/node/server`. The generated
`src/server/services/index.ts` lists them; never edit it.

```ts
// src/server/services/board-watcher.ts
import { defineService } from "@slotform/node/server";
import { board } from "../../shared/channels.ts";

export default defineService({
  name: "board-watcher",
  start({ log, ws, http }) {
    const channel = ws.channel(board, {
      onSubscribe(conn) {
        conn.send("snapshot", { cards: [] });
      },
    });
    const timer = setInterval(() => channel.broadcast("tick", { at: Date.now() }), 5000);
    log.info("watching");
    return () => clearInterval(timer);
  },
});
```

`start` runs before the server listens, one service after another: the services plugins add, then
yours in file-name order. It may
return a stop function, which runs on shutdown in reverse order. A `start` that throws stops the
process.

## Order: `start` then `ready`

That is the only order, so a `start` must not rely on another service having started:
`notifications.ts` starts before `jobs.ts`, and a `start` that enqueues a job would run before the runner
that takes it exists. Work that needs the other services goes in `ready`: it runs for every
service, in the same file-name order, once every `start` has resolved, and still before the server
listens.

```ts
export default defineService({
  name: "notifications",
  start({ log }) {
    // Own state only: open the watcher, load what this service keeps.
  },
  async ready() {
    // Every service has started: enqueue, read what another service loaded, broadcast.
    await enqueue("notifications", { reason: "boot" });
  },
});
```

`ready` takes the same context as `start` and may return a stop function too. Stops run in reverse
over `start`s and `ready`s together, so every `ready` stop runs before any `start` stop. A
`ready` that throws stops the process like a `start`. Keep `ready` short (it holds the listen):
enqueue the work and return. Two `ready`s still run in file-name order, so one `ready` must not
wait on another's.

## The context

| Field | Is |
| --- | --- |
| `log` | `info(message)` and `error(message)` |
| `ws` | The WebSocket hub: `ws.channel(def, handlers)` registers a channel ([channels](channels.md)) and answers its `broadcast(type, payload)`; `ws.closeSession(id)` closes a session's sockets |
| `http.mount(prefix, handler)` | Routes every request under `prefix` to a fetch-style `handler(request)`, ahead of the worker and the web client. The longest prefix wins |
| `http.session(request)` | The `{ user, session }` the request holds, by `/ws`'s rule ([who is connected](channels.md#who-is-connected)); `null` when there is none, it is refused, or the app has no `auth()` |
| `http.port` | The listen port |

## Rules

- One service per file, flat in `src/server/services/`: a subdirectory, `index.ts`, `*.test.ts`
  and `*.d.ts` are ignored.
- Code that needs a service imports its module; nothing is passed through a context.
- A mount prefix starts with `/`, is not `/`, and has no trailing `/`; never mount under a worker
  path (`/rpc`, `/api/auth`) or `/ws`.
- Release everything `start` and `ready` acquire in the stop function: a timer, a watcher, a connection.
- A service that runs what a directory holds (a job runner over `jobs/*.ts`) lists it with
  `loadModules`, never `readdir`, and starts a thread as `new Worker(new URL("./x.ts",
  import.meta.url))`: the bundle follows only those ([files the build follows](bundle.md#files-the-build-follows)).

**Check:** `slotform generate`, then `pnpm check` passes, and `pnpm dev` logs
`service <name>: started` for each service, then `service <name>: ready` for each with a `ready`.
