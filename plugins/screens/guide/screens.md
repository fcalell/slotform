# The screens workbench

The workbench draws every route of the web app, one screen per route, in each state its queries
can take, from fixtures and with no backend running. Open it while designing or changing any
screen, and again before calling the screen done: a screen is done when all five states look
right. A default look is `--mode dark --width 320,1920`, the two widths and the mode a screen is
looked at in; the run's other widths and mode are the machine's. The app writes no story, harness or workbench config; a new route is a new screen on its own.

```bash
stack add screens   # once: installs the workbench and its packages into the app
stack screens dev   # serves the workbench (--port 6006)
stack screens test  # checks the screens a changed file reaches (test-run.md); --shots <dir> saves a PNG of each (shots.md)
stack screens shoot --url <app> --route /,/x   # opens routes of a live app, shoots and judges each (shots.md)
stack screens drive <plan.json> --url <app>    # runs a plan of steps in a live app (shots.md)
stack screens serve [--port <n>] [--entry <file>] [--keep]   # runs the real server on a scratch database, seeded (seeded-server.md)
stack screens browser [stop]                   # starts or ends the shared Chrome (The shared browser, below)
```

The workbench's other pages are [fixtures](fixtures.md), [the test run](test-run.md), its
[read checks](read-checks.md), [shots and live apps](shots.md) and
[the seeded server](seeded-server.md).

Requirements, day one: the commands that draw need a Chrome or Chromium: `CHROME_PATH` naming
one, else `chromium`, `google-chrome` or `google-chrome-stable` on PATH; without one they fail
with a line that says so, and a `CHROME_PATH` that is not executable fails before anything is
generated. Nothing is downloaded. The host is Storybook 10 and Vitest 5, which `stack add screens`
installs; an earlier major of either is unsupported.

### The shared browser

Every command drives one headless Chrome per machine. Its address (`{ port, pid }`) is
`chrome.json` in `$XDG_RUNTIME_DIR/stack/` (the OS tmp dir without it). A command connects to it,
or starts it when none runs, so two commands at once share one Chrome. Each command opens its own
browser context and disposes it when it ends, on failure and on SIGINT or SIGTERM, so commands
share the browser and nothing else. A browser a command started closes when the last context is
gone. `stack screens browser` starts one that stays, for a session of many short commands;
`stack screens browser stop` ends it.

## The states

Each route has five states: **data**, **loading**, **error**, **empty** and **not found**. The
toolbar sets the mode (light, dark) and the density (desktop, touch) for the screen in view.
Draw each state in the screen itself (the screen recipe,
`node_modules/@fcalell/ui-core/guide/screen.md`); the workbench only reaches them.

A forced state applies to every query the route makes, a direct client call in a custom `read`
(`api.usage.plan(input)`) included. The exceptions are the session read (`auth.session`) and the
container's scope and org-rules reads, which answer data in every state whoever supplies the
fixture. A mutation and a plugin-owned procedure always answer from their fixture, whatever the
state; the app's own fixture for a procedure a plugin owns follows the state like any app read.

| State | What the screen's queries get |
| --- | --- |
| data | The fixture's value |
| loading | No answer until the test run releases it, then the fixture's value (the workbench never releases it, so the story stays waiting) |
| error | A server error |
| empty | The fixture's value with no items: an array becomes `[]`, a `{ data, nextCursor }` page keeps its envelope with no rows, a `{ data, total, offset }` page has `data: []` and `total: 0`, and any other object (a record) is walked with every array in it emptied to `[]`, the rest kept; a JSON Schema object schema (`type: "object"` and an object `properties`) also has its `properties` emptied to `{}`, so a stored schema's fields list is empty |
| not found | A `NOT_FOUND` error, which `isNotFound(error)` from `@fcalell/plugin-api/client` tests |

## Routes

A route renders as it does in the app, so a parent route (a layout, `route.tsx`) draws its
children through `<Outlet />`; without it a screen under the parent shows an empty container.

**Check:** `stack screens dev` lists the new route with its five states, each drawing as
designed, and `stack screens test` and `pnpm check` pass.
