# plugin-screens

`@fcalell/plugin-screens` is the screens workbench: a Storybook host that serves every route of a web
app in each state its queries can take, answered from typed fixtures by MSW, and the test run that
checks each screen in a headless Chrome. This page covers how it is built: what it requires, its
subpaths and dependencies, the host configs, the generated stories, how a call is answered, the test
run and its render walk, the shared browser, `shoot` and `drive`, and `serve`'s controls. Using the
workbench is the consumer guide's ([the screens workbench](../../../plugins/screens/guide/screens.md));
the commands' procedures are under [screens](../commands.md#screens); the slots are in the
[slot catalog](../slot-catalog.md#screensslots-plugin-screens).

## Requirements

- **A Chrome.** `stack screens test`, `shoot` and `drive` drive a headless Chrome over the DevTools
  protocol, with nothing to download. `CHROME_PATH` names the executable, else `chromium`,
  `google-chrome` or `google-chrome-stable` on PATH; with none, the command fails with one line that
  says so and exits non-zero. A `CHROME_PATH` that is no executable fails before anything is
  generated. The commands share one browser per machine ([Shared browser](#shared-browser)).
- **Storybook 10 and Vitest 5.** The host is Storybook `^10.6` (`@storybook/react-vite`,
  `@storybook/addon-a11y`, `@storybook/addon-vitest`) and the run is Vitest `^5.0` with
  `@vitest/browser`. `stack add screens` writes those majors; an app on an earlier major of either is
  unsupported.

## Subpaths

The plugin requires `react` and `api`. `src/node/` runs in Node (compiled to `dist`), `src/ui/` in the
browser.

| Subpath | Holds |
| --- | --- |
| `.` | the plugin |
| `./vite` | the host's Vite plugins, `screensPlugin` and `storybookHost` |
| `./storybook` | the Storybook config |
| `./node` | `writeStorybookConfig` ([Storybook host](#storybook-host)) |
| `./browser` | Vitest's browser provider over the shared Chrome, `chrome()` |
| `./serve` | `defineServeSeed`, `fixtureControls`: run in the served app's worker, web APIs only |

As source the host's Vite compiles: `./fixtures`, `./channels`, `./msw` (the app's MSW, re-exported
for a plugin's handler module), `./preview`, `./floors` (the test run's checks), `./shift` (the
loading shift), `./walk` (the render walk) and `./stories`.

## Dependencies

The packages `stack add screens` installs are the plugin's `devDependencies` and the manifest's
`peerDependencies`, every one optional: Storybook, its addons, MSW, Vitest and `@vitest/browser`. An
app that has auth or react-ui without `screens()` installs none of them. `stack add screens` writes
them into the app, where the host's Storybook config, test config and preview resolve them. The oRPC
packages the host answers with are this package's own dependencies, not the app's: a second copy of
`@orpc/client` in the app (plugin-react's tanstack-query pulls one) is a second `ORPCError` class.

## Storybook host

Every Storybook host changes the app's own Vite config the same way (`hosted`), and nothing it changes
reaches the app's `.stack/vite.config.ts`:

- `clientHeaders` goes: `frame-ancestors 'none'` blocks Storybook's preview iframe.
- No dev-server proxy and no port: the app's backend is never reached, and Storybook serves Vite
  itself.

`.stack/screens/main.ts` (`storybookMain`) and `.stack/screens-test/main.ts` (`testMain`, the same
with the floors, which only `stack screens test` loads) are the Storybook configs, run from the project
root: the files `stack-screens/` holds are the stories, and the host is Vite on the config the plugin
derives. `stories` is relative to the config directory, two levels under the root, because the Vitest
plugin joins it to that directory. Both are null without routes.

### A Storybook that draws components

`writeStorybookConfig({ config, cwd })` from `@fcalell/plugin-screens/node` serves a Storybook that
draws components, not routes (the showcase's roster). The app's own `.storybook/main.ts` and its
`vitest.config.ts` call it with the app's `stack.config.ts`. It builds the slot graph
(`buildGraphFromConfig`), resolves vite's slots and renders them with `renderViteConfig` as the screens
host does, with `hosted`'s changes, then writes `.stack/storybook.vite.config.ts`. That file holds the
app's own plugin calls and values and one host-only plugin call, `storybookHost()`, which starts the
dependency optimizer ([Vite plugin](#vite-plugin) gives why a Storybook host must). No router plugin,
no `screensPlugin`, no route tree and no fixtures reach it: the router plugin needs the route files
and rewrites the route tree, and it lives in `vite.slots.appPlugins`, outside the calls a host reads.
It returns the file's path, for Storybook's `viteConfigPath` and Vite's `loadConfigFromFile`. It is a
function and not a slot, so `stack generate` never writes it and a consumer without such a Storybook
gets no file.

## Screens Vite config

`viteConfig` renders `.stack/screens.vite.config.ts`, the config the screens host runs on: the app's
own, rendered by `@fcalell/plugin-vite/node` from the same `vite.slots.*` values and react's
`routesDir`, `entryImports` and `routerBindings`, with what a host that serves the app's screens
changes:

- `hosted`'s changes ([Storybook host](#storybook-host)).
- The router plugin, from `react.slots.routerPlugin`, which the app's own config runs, and
  `screensPlugin`, a host-only call that never reaches the app's config.
- The router plugin runs with `autoCodeSplitting: false`, from `react.slots.routerOptions`: a split
  module's id (`?tsr-split=component`) fails `existsSync`, so Vitest's `--changed` walk drops it and a
  component's edit would reach no screen.

Vite's root stays `.stack/`: every path a contribution hands a plugin is anchored on the config file.
The config is null without routes.

## Vite plugin

`screensPlugin` is the Vite plugin only the screens host runs, added to
`.stack/screens.vite.config.ts` and never to the app's config. It serves what a story needs (the app's
route tree, fixtures and entry imports as one virtual module, and `/mockServiceWorker.js` from MSW's
package), keeps the story files in step with the routes, and starts the dependency optimizer.

Storybook runs Vite in middleware mode and never calls `server.listen()`, the call that starts Vite's
dependency optimizer. Without it `optimizeDeps` never scans or pre-bundles, a CJS dependency behind a
`node_modules` import (`react-dom/client` through Storybook's dom shim) is served raw (`require is not
defined`), and each dependency found late reloads the page. The plugin pre-bundles a package installed
under `node_modules`; one linked from a checkout is served as source, since pre-bundling a module of it
would load a second copy beside the one the app's imports load (react-ui's router binding would bind a
copy no component reads). One that cannot be resolved is left to the optimizer.

## Story generation

`stack-screens/` at the app root (gitignored, and no dot directory, which Storybook's watcher ignores)
holds one CSF file per file that declares `createFileRoute("<id>")`, mirroring the id
(`stack-screens/projects/$id.stories.ts`). A `postWrite` hook writes them after every generate, and
while `stack screens dev` runs, `screensPlugin` does on the routes directory's add, change and unlink
events. The folder is brought to one file per screen: written for an added route, rewritten when its
content changed, removed for a deleted one and left untouched otherwise. A file's content is the
route's id and the paths of the files its screen imports, so an edit to a route file rewrites nothing.

A file holds its title and a story per state. The imports are the screen's import graph (the root
route, each layout route above the route, the route, its lazy sibling and the fixtures), as side
effects so the transform keeps every one: an import of a name nothing uses is dropped. That graph is
what `vitest --changed` walks. The stories render the app's `routeTree` from the virtual module, an
edge the walk drops.

Beside each state's story the file exports one hidden story per combination of the globals' `checked`
values other than the defaults, with story-level `globals` (`Data, dark`). `!dev` leaves it out of the
sidebar and keeps the `test` tag, so only the test run lists it. react-ui checks `mode` in light and
dark at the default density. Every story is tagged with its state (`state:loading`) and the value of
each global the run checks (`mode:dark`), which is how a run narrows.

A route's sidebar title is its id under `Screens/` without the segments that add no URL (a pathless
layout `_app`, a group `(auth)`); a trailing slash (an index route) is named `index`, so it never shares
a title with the route it indexes.

## How a screen is served

A story renders `createRouter({ routeTree, history: createMemoryHistory({ initialEntries }) })` in the
app's `virtual:stack-providers`, after the entry's own `bindRouter` calls. The URL is the route's full
path with each param filled from the example values the fixtures give it. A required param without
one throws, naming the route, the param and where it looked, so the gap is the story's error and never
a path with `$id` in it.

The fixtures are the default export of the app's `src/app/fixtures.ts`,
`defineFixtures<AppRouter>(procedures, params, channels, search)` from `./fixtures`: `procedures` is
`Fixtures<AppRouter>` (each procedure optional, `(input) => output` by its `Procedure<I, O>` type),
`params` the example values below, `channels` the channel fixtures ([Channels](#channels)), and
`search` an example query string every screen is drawn at. Writing them is the guide's
[fixtures](../../../plugins/screens/guide/screens.md#fixtures).

The example values are keyed by name. A key that is a route id holds the values of that route and
every route under it (only their param names), the most specific id winning; the other keys are the
values of every route (any route's param name). They are typed from the route tree, so a misspelt id
or name fails the type-check.

## Answers

MSW answers every call under the worker's route prefixes in oRPC's wire format from the fixtures. A
request outside the answered prefixes that reaches for another origin or a worker path fails
(`onUnhandledRequest`).

### States

- **Data** is the fixture.
- **Loading** holds its calls on a promise until `release()`. Nothing releases it in the workbench, so
  a Loading story stays waiting; the test run releases it to measure the loaded shape of the same
  screen, then answers the held calls as data, and holds again before the next story. A release stays
  open, so the reads that follow the first ones (a query that waits on another's answer) are answered
  too.
- **Error** is `INTERNAL_SERVER_ERROR`; **not found** is `NOT_FOUND`.
- **Empty** is derived from the value alone, since the browser holds the router's type and no schema.
  A collection answers `[]`, a `{ data, nextCursor }` page its envelope with no rows, a
  `{ data, total, offset }` window the same with a total of 0, and any other object is walked (never
  into arrays): every array in it becomes `[]`, and a JSON Schema object schema (`type: "object"` and
  an object `properties`, the format of a stored data layer) has its `properties` emptied to `{}`. The
  rest is kept. A plain object has `Object.prototype` or none; a `Date`, a `Map` or a class instance is
  a value and stays as it is (`emptyOf`).

### What a state applies to

A state applies to a query, told by the procedure's kind (a direct client call to a query is a POST,
since the wire is untouched) or by a GET where the schema lacks the path. A mutation, a frame route
(`isFrameRoute`), the session read (`isSessionRead`) and a procedure a plugin's fixture module answers
always answer from their fixture, as the story records; the app's own fixture for a plugin's procedure
overrides it and follows the state.

- **Frame routes** are the routes the api and auth plugins serve for the frame: the scope lookup of the
  organization or project the URL names, and the caller's rules in it. A story forces the state of the
  screen's reads; the scope is always found (a missing one is the `$org` route's own story), whoever
  supplies the fixture.
- **The session read** (plugin-auth's `auth.session`, the path mirroring plugin-auth's router) is the
  frame's precondition: the auth guard and the active organization hang on it, so a forced error or
  loading would fail the guard in every such story rather than draw the screen in that state. It
  answers data whoever supplies the fixture, so an app that answers it with its own session (an
  `activeOrganizationId`, a role) is exempt like the plugin's.

### Gaps

The answerer records the procedures a story's queries call, in the order they first did, since the
last `holdCalls` (`called`). The run finds a screen's reads by watching: nothing declares them, and a
dependent or ambient read shows up like any other.

It also records what the fixtures could not answer since the last `holdCalls`: a procedure with no
fixture, or a fixture that threw other than the procedure's own error. The screen draws either as a
failed read, so the test run fails the story on it rather than judge an error form as the state asked
for.

A read that lands on any error in the data state (not found, a refusal such as a bad request or a
conflict) fails the story: the screen's example record is missing or is the wrong one for the
procedure, so it would draw an error form as its data. The failure names the procedure, the route
params whose example value the call sent and the error's code (`notFound` and `error` are the states
that draw a failure on purpose). A read whose input carries none of them (a setup form's) has no
example record to blame and is no gap.

An error a fixture threw as oRPC's own may come from any copy of `@orpc/client`: an app with a second
copy (a version split between this package and the app's tanstack-query) throws an `ORPCError` this
module's `instanceof` does not know, and a fixture that threw the procedure's error would be reported
as a gap. oRPC's error is told by its fields (`code`, `status`, `defined`, which no other error carries
together) and rebuilt as this copy's class, so the codec encodes it as its own.

### Channels

plugin-node contributes `@fcalell/plugin-node/screens` to `handlerModules`: an MSW `ws.link("*/ws")`
handler that answers each `{ t: "sub", ch }` with the `{ t: "msg", ch, type, payload }` frame
(plugin-node's `ServerFrame`, under [channels](node.md#channels)) built by `channelAnswer` from the
app's `channels` fixture: the third argument of `defineFixtures`, a map from channel name to
`(params) =>` the snapshot payload, or `{ type, payload }` naming another opening message. It answers
for the story on screen, which `stories.tsx` sets as the story renders; `./channels` exports both for
the handler module.

On a subscribe the socket sends the opening frame, closes, or sends nothing. Data sends the frame,
loading holds it with the queries, and empty applies `emptyOf`. The protocol has no error frame and no
not-found frame: a channel read fails only when its fold throws on a message type the app defines,
which no fixture can name, or when the socket is down. So error closes the socket, which the client
backs off from and, after `PAUSE_AFTER`, pauses the channel's read for; not found sends the snapshot as
data. A channel with no fixture sends nothing, logs one console error and is a gap of the test run.

## Single copies for plugin modules

A plugin's handler module imports MSW and the channel answer by this package's name (`./msw`,
`./channels`), which are source the host's Vite compiles, so each is the one copy the workbench runs:
a handler built on another copy of MSW would not match the worker the host starts, and the channel
answer is the one copy the stories set.

## Test run

`stack screens test` generates, then runs the app's `vitest run --config
.stack/screens.vitest.config.ts` (`--changed [<ref>]` unless `--all` or `--screen`,
`--passWithNoTests`, then the story files `--screen` names). The config spreads
`.stack/screens.vite.config.ts`, so the run's host is the workbench's, and runs the Storybook test
plugin on `.stack/screens-test/`, whose `main.ts` adds `./floors`.

### Vitest config

`vitestConfig` renders `.stack/screens.vitest.config.ts`: the screens host's Vite config with the
Storybook test plugin on the test run's config directory and one browser project, `chrome()` as its
provider, headless at 1280x800. Each parallel page is one renderer, so two open at most. The CLI's
narrowing reaches it in the environment: the tags to leave out go to the storybook plugin, and the
widths and the screenshot directory to the floors, which read them with `inject` (`provide`).
Without the environment (Vitest run by hand) every story and every width run, and no screenshot is
saved.

`--state`, `--mode`, `--width` and `--shots` reach the run as `STACK_SCREENS_EXCLUDE`,
`STACK_SCREENS_WIDTHS` and `STACK_SCREENS_SHOTS`. `--full`, `--open` and `--search` reach it as
`STACK_SCREENS_FULL`, `STACK_SCREENS_OPEN` (`provide`) and `STACK_SCREENS_SEARCH` (read by the story
from `import.meta.env`, through the config's `envPrefix`).

### Narrowing a run

The run excludes the tags of every value it was not asked for, so narrowing across globals and states
multiplies where an include list would add.

### Changed runs

With `--changed`, Vitest reruns the story files whose import graph holds a file with uncommitted
changes, or one changed since the ref (`<ref>...HEAD` plus uncommitted). It follows the module graph,
so some files' change must rerun every test file: for each
workspace package the app links, the files under its `src/` that no source export serves. A served
directory is in the graph; a compiled entry (`dist/`, gitignored) holds none of its `src/`. A
published app links nothing, so its list is empty.

### Test run order

The floors are preview annotations the test run's Storybook config loads and the workbench never does.
Each story runs:

1. axe with every rule on. A screen is a page, so the document-level rules judge it: `region`, which
   the a11y addon turns off for components, and `target-size`, which axe leaves off.
2. At each rubric width (`page.viewport`, back at the starting size afterwards): the horizontal
   overflow check, then the render walk once the width has settled. A loading story also has each
   width's Sections measured, its held calls answered and the Sections measured again
   ([Loading shift comparison](#loading-shift-comparison)). The screenshot at a width is taken once the
   floors there ran, so a loading story's shows its waiting shape.
3. The console check: `console.error`, `console.warn` and the window's `error` event.

A data story's screen also runs with one of its reads failed at a time. The reads are the procedures
the story called (`called`); the run answers one with an error and every other with data, resets
those queries so they fetch again, waits for the page to settle, and applies the width floors and the
console capture. A failed read draws in its frame, and the dev error for a read no frame holds is a
console line here. With fewer than two procedures this is the error story's case already (it fails
them all), so it runs only when a read can fail while another holds data.

### Rubric widths

A screen is checked at 320, 1280 and 1920: the narrowest phone (touch), a laptop (the list and the
record stand together) and a desktop monitor (the only width where a cap leaves dead space).

### Toolbar globals

A global with `byViewport` is one the root's own rules decide from the viewport (a media query on width
and pointer) once its pin is off. The test run takes the pin off at each width, so 320 draws the
phone's value (the touch density), and puts it back after.

### Loading shift comparison

A Section stands whatever its data holds, so the page must not move between its waiting shape and its
loaded one. `measure` reads every Section's heading in the drawn page (in a Pane with no Section, its
body's direct blocks); `compare` judges the two reads, a pure function tested in node. The floors run
both around `release()`.

Sections pair by slot (`slotsOf`), every other block by name. The loaded shape may draw more Sections
than the waiting one in a column (one per record), and those below the paired ones are not findings.
Per Pane, each Section is judged against the Sections above it in its column (those whose horizontal
extent overlaps its own and whose top is above its top), never against a Section beside it:

- a Section that stood while waiting and is absent loaded fails;
- a Section with none above it in its column fails when it moved by other than what the text above it
  grew by (a head's description wrapping) plus, in a column the page centres, half of what the
  column's height changed by;
- a Section with some above it fails when it moved by other than what the first of its column moved by
  plus what the Sections above it grew by;
- a Section that changed height with no rows, chart or text in either form fails; a block beside the
  Sections (a Diff between two) changing height fails the same, and what it grew by moves the Sections
  below it.

A move that a block caused, one absent while waiting and present loaded above the moved Section (a
Banner that stands only with its data), by at least that block's height, is reported and not failed;
so is the move the other way, of a block present while waiting and absent loaded.

### Screenshots

`--shots` names a directory, resolved from the app's root; with the flag absent the run saves none.
It must lie inside the app: Vitest writes a screenshot only where Vite's `server.fs.allow` reaches, the
workspace. A story's shot at a width goes to `<dir>/<screen>/<story>-<width>.png`, the screen its
title without `Screens/` and the story its name in kebab case (`Data, dark` is `data-dark`); the open
pass adds `-open-<slug>`, the control text in kebab case.

### Test run exit

A Vitest killed by a signal (the OOM killer's `SIGKILL`, a Ctrl-C) exits with no code. That is no pass:
`stack screens test` fails, naming the signal, and never exits 0 over a run that did not finish.

## Render walk

The render walk (`walk.ts`) is one pass over the page's elements that reads what is drawn against the
contract's values, taken from the page's own computed custom properties at the density it is in, so
the numbers are the ones the theme emitted and never a second copy. The test run calls it once per
width after the resize settles. Its checks (`walk-checks.ts`) are each a pure function over plain
measured data, so a test in node can hand one a bad case and see it found; nothing there reads a
document. The rules as a consumer meets them are in the guide's [render walk](../../../plugins/screens/guide/screens.md#the-render-walk).

### Render walk rules

- **Control height.** Each control's height is a size token at the density, or, where it sets a floor,
  the floor is one and the height at least it; each row is at least the shortest row token (a row is a
  floor, `min-h-row`, that its content grows).
- **Radius.** Every radius is 0, a radius role or a pill (at least half the box's shorter side); a box
  inside a rounded box with an inset smaller than the outer radius has the outer radius less the inset.
- **Insets that are no spacing role**: a field's border, and the centring insets a recipe spells, half
  of what one size has over another (an icon act's glyph in the control, a field's line in it, a
  switch's knob in its track, a line of parts' dot).
- **Clipped content.** A box that clips (`overflow` hidden or clip) with more inside than it shows, and
  neither an ellipsis, a line clamp nor a scroll container saying so, hides a layout error.
- **Late face.** A face the screen asked for at its first layout that was not loaded at the first frame
  draws the fallback and then jumps; a face that failed draws the fallback for good (a metric fallback
  face is a system font, which a host may lack: `isMetricFallback`).
- **Heading order.** Of the headings a reader gets (not under `display: none`, so a Pane folded away
  has none), one `h1` names where you are, and a heading is never more than one level under the one
  before it.
- **Canvas.** A canvas opens with every node whole at the pane's start and none under the zoom stack.
  The pane's far side may cut a node only where the graph is wider than the overview's floor holds, and
  the viewer pans for the rest; a node wholly outside the pane is the viewer's to pan to.
- **Alignment (`align-*`).** These report what a layout draws off the group structure and fail a run
  with the walk's other rules: a row is a text group and an end group centred on the row, a line of
  mixed sizes has one baseline, nothing takes room and draws nothing, and the layout is flex alone.
  The rows on the page are flex rows with a row's role, or ones whose floor is a row token's (a control
  with that floor is no row); a flex column that is one stands its end items on its label line, which
  is then the row measured, centre and all. Its label is its first text, and its end items are what
  draws beyond the label's right edge.
- **Shared baseline.** Texts of different sizes on one line share a baseline, to a pixel: a count
  centred by its line box beside a heading rides above the heading's baseline. The runs are the bare
  texts of one flex row's items; two share a line when they overlap by most of the smaller one's height
  (a value centred over a title and its meta shares neither), and are compared when their sizes differ.
- **Dead box.** A box in the flow, wider and taller than half a pixel, that draws nothing and holds
  nothing that does (the empty end square, a spacer) fails. Room that holds an alignment is a group's
  gap or padding, never an element.
- **Covered text.** A text is covered when a box that is no relative of it and draws at a point of one
  of its lines stands above it there. A layer, a sticky box, a transparent box and a hit area that draws
  nothing are no cover. A layer with `pointer-events: none` is never in the hit test: a decoration that
  lets the press through, by design, is not read.

### Render walk exceptions

The named exceptions are the one place the walk lets a rule pass over an element: the rule, a selector
the element (or an ancestor) matches, for `nested-radius` the selector of the rounded box it stands in,
and why. An exception is never a baseline: each stands for a thing the contract itself draws off the
rule. The class lists the exceptions name (in `./walk` and `./shift`) live in react-ui's
`src/ui/lib/walk-classes.ts`, outside that package's exports: a component draws them from there, and
`walk-exceptions.test.ts` holds each exception's tokens to the one it names.

## Shared browser

Every screens command on the machine shares one headless Chrome. Its address is `chrome.json`
(`{ port, pid }`, plus `kept` when `stack screens browser` started it) in `$XDG_RUNTIME_DIR/stack/`
(the OS tmp dir without it). A `chrome.lock` file taken by exclusive create orders every start and
every last-one-out check across processes, and a stale `chrome.json` (a dead pid, a port that does
not answer) is replaced. Each command opens its own browser context (`Target.createBrowserContext`,
disposed on detach) with its tabs inside, and disposes it at the end, on failure and on SIGINT or
SIGTERM. A Chrome a command started closes when `Target.getBrowserContexts` is empty; one
`stack screens browser` started stays until `stack screens browser stop`. A connect that fails because
the browser has just closed starts it once more.

The DevTools protocol (CDP) client talks to it over Node's own WebSocket. Nothing there waits without a
limit: every call carries a timeout and rejects, naming its method. The test run's provider (`src/node/provider.ts`
over `browser.ts`) is a Vitest browser provider with one context per session, reduced motion, a device
scale of 1, and the commands `__vitest_viewport`, `__vitest_takeScreenshot`, `press` and `key`.

## Judging shoot and drive

`shoot` and `drive` judge a page with the test run's own page code (`src/ui/inject.ts`: the render
walk, the overflow check, the control hit test), bundled once by the app's Vite and injected into each
tab, never copied, and axe with
the rules the test run turns on.

## Serve

`stack screens serve` answers a worker's requests as the app does, plus the `/fixture/*` paths:

| Path | Does |
| --- | --- |
| `delay?match=<pattern>&ms=<n>` | slows each request whose path matches; `ms=0` clears |
| `fail?match=<pattern>&status=<n>` | answers each one with status `n`; `status=0` clears |
| `link[?to=/path]` | signs the browser in as the fixture member: a control extra answers (plugin-auth's), 404 when none does |

A pattern is a part of the path, `*` standing for any run. The rules live in the worker instance.
`socket` is the node server's, which owns the sockets. A plugin's or an app's own controls are asked
first of every `/fixture/*` request, in the order given, so one can answer a generic path
(plugin-auth's `link`); `undefined` passes to the next, then to the generic controls.

What `stack dev` and `stack build` write holds no trace of `serve`'s controls: the files generate
writes are what both run from (`/fixtures` is the workbench's own file, which stays).

## In the code

- `plugins/screens/src/index.ts`: the plugin, its slots and the dependency split.
- `plugins/screens/src/types.ts`: the toolbar globals.
- `plugins/screens/src/widths.ts`: the rubric widths.
- `plugins/screens/src/node/config.ts`: `hosted`, the screens Vite config, the roster config, the Vitest config.
- `plugins/screens/src/node/storybook-config.ts`: `writeStorybookConfig`.
- `plugins/screens/src/node/storybook.ts`: the Storybook config of `.stack/screens/` and `.stack/screens-test/`.
- `plugins/screens/src/node/vite-plugin.ts`: `screensPlugin`, the dependency optimizer start.
- `plugins/screens/src/node/stories.ts`: the CSF files and the stories folder's upkeep.
- `plugins/screens/src/node/screens.ts`: story titles.
- `plugins/screens/src/node/select.ts`: the run's narrowing and the screenshot directory.
- `plugins/screens/src/node/triggers.ts`: the files `--changed` cannot see.
- `plugins/screens/src/node/exit.ts`: a child process's failure.
- `plugins/screens/src/node/browser.ts`: the shared Chrome.
- `plugins/screens/src/node/chrome.ts`: the Chrome process and the CDP client.
- `plugins/screens/src/node/judge.ts`: what `shoot` and `drive` judge with.
- `plugins/screens/src/ui/fixtures.ts`: the fixtures and the example values.
- `plugins/screens/src/ui/route.ts`: the URL a route is drawn at.
- `plugins/screens/src/ui/answer.ts`: the answerer, states, gaps, channels.
- `plugins/screens/src/ui/channels.ts`: the channel answer a plugin's handler module imports.
- `plugins/screens/src/ui/msw.ts`: the one MSW copy.
- `plugins/screens/src/ui/floors.ts`: the test run's checks and their order, screenshot paths.
- `plugins/screens/src/ui/shift.ts`: the loading shift.
- `plugins/screens/src/ui/walk.ts`: the render walk and its exceptions.
- `plugins/screens/src/ui/walk-checks.ts`: the walk's pure checks.
- `plugins/screens/src/serve/controls.ts`: the `/fixture/*` controls.
- `plugins/react-ui/src/ui/lib/walk-classes.ts`: the class lists the walk exceptions name.
