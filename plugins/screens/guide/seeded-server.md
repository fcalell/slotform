# The seeded server

Fixtures are the answers the workbench draws with no server. `slotform screens serve` is the second
source: the app's real server, on a scratch database, with data a seed made through real
procedures, for [`shoot` and `drive`](shots.md#driving-a-live-app) to open.

| Source | Use it for |
| --- | --- |
| Fixtures (`src/app/fixtures.ts`: `dev`, `test`) | The check and the five states: every route in loading, error, empty, not found and data, each judged with nothing running |
| The seeded server (`serve`, then `shoot --url`, `drive --url`) | What the server makes of a state (a list the real query sorted, a count it computed, a row it refused) and acts (a mutation that writes and the screen that reads it back) |

```bash
slotform screens serve                                   # prints: slotform screens serve: http://localhost:43379
slotform screens shoot --url http://localhost:43379 --sign-in http://localhost:43379/fixture/link --route /library
```

The command builds the web client and a scratch database from the committed migrations, seeds it
from `src/schema/seed.ts` as every database is, starts the server on a free port, runs the app's seed,
prints the one line and stays in the foreground. Ctrl-C (or SIGTERM) stops it and deletes its
scratch directory in the OS tmp dir, which `--keep` leaves; `{ url, pid }` is `serve.json` in it.
Two runs at once never collide. A database without a committed migration fails the run: `slotform db
generate` first.

## The app's seed

The app's seed is `src/app/seed.ts`, run once the server answers. `client` is the app's typed API
client, signed in as the fixture member, so a seed goes through the procedures the screens call:

```ts
// src/app/seed.ts
import { defineServeSeed } from "@slotform/screens/serve";
import type { AppRouter } from "../../.slotform/worker";

export default defineServeSeed<AppRouter>(async ({ client, url, fx }) => {
  await client.projects.create({ name: "Acme" });
});
```

`dir` is the run's scratch directory, removed when the run stops. `fx(path)` GETs a path of the served app and answers its text. A seed that throws stops the run
with its error. The fixture member signs in by email code, so an app whose sign-up is closed seeds
that member's user in `src/schema/seed.ts`.

## Controls

The served app answers four controls under `/fixture`, which exist only under `serve`:

| Path | Does |
| --- | --- |
| `/fixture/delay?match=<pattern>&ms=<n>` | Slows each request whose path holds the pattern (`*` is any run); `ms=0` clears it |
| `/fixture/fail?match=<pattern>&status=<n>` | Answers each such request with that status; `status=0` clears it |
| `/fixture/socket?close=1` | Closes the WebSockets of the session the request holds (a Node server) |
| `/fixture/link[?to=/path]` | Signs the browser in as the fixture member and redirects: `shoot --sign-in <url>/fixture/link`. A plugin answers it (the `auth` plugin with email codes, through `serveControls`); with none, it is a 404 |

`drive` plans reach them with an `fx` step. An app's own controls (a clock, a reset) wrap the same
worker: `fixtureControls(worker, ...extra)` from `@slotform/screens/serve`, where each `extra(request,
{ env, ctx, app })` is asked in turn, first of every `/fixture/*` path, so it can answer a generic one (an app with its own sign-in links supplies `link`), and returns undefined to pass to the next and then to the generic controls. `app(request)` asks the app's own worker past the controls.

## Your own entry

`--entry <file>` is for a server that needs fakes injected (its own `startNodeServer`, given `env: process.env`, a fake
adapter). The command still owns the directory, the port and the printed line, and runs the file
with `SLOTFORM_SERVE_DIR` and `SLOTFORM_SERVE_PORT` set; the file puts its state in that directory,
listens on that port, and wraps its worker with `fixtureControls` (passing `link` from `@slotform/auth/serve` for an app with email codes; a Node server lists
`fixtureSockets` of `@slotform/node/serve` in its `services` for the socket control).
