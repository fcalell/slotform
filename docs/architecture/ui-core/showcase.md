# Showcase, roster stories and enforcement

`apps/showcase` is a private stack consumer that shows `@fcalell/plugin-react-ui`: the token page,
the room screens and the places of one app composed from the built components. It also holds the
roster scenes that Storybook draws one story per component and state, and it is the first consumer
of the screens workbench (`@fcalell/plugin-screens`), whose test run is the one machine check of a
drawn screen. This page holds how the app, the scenes and the stories are built, what the screen
run holds, and how ui-core's guide pages reach a consumer.

## The app

The routes (`src/app/routes/`) are one app composed from the built components, plus the token page
and the room screens, whose screens are `src/screens/` (outside `src/app/`, where react-ui's lint
rules for app screens run).

- `/foundations`: the token page, every role of the contract on the emitted `app.css`, light and
  dark side by side. `/` redirects to it. The URL holds the view: `?mode=<light|dark>` sets the
  page's own mode (without it the page keeps what the mode script set) and
  `?density=<touch|desktop>` the density it draws at (`desktop` without it); the header toggles
  rewrite the URL and store nothing (`src/screens/view.tsx`). A density switch loads the page
  afresh: the showcase's scenes drive themselves before any popup listens (see root containers under
  [roster scenes](#roster-scenes)), and a switch in place would mount the next density's scenes while the
  old scenes' popups still listen.
- `/tv`: a screen read from across a room, a `Panes` with `distance="room"` whose one column holds
  the strips of `Stats`, a cell each, filling the viewport, dark unless the URL asks `?mode=light`.
  It carries no view toggles, since a television has no pointer, and takes no density: the room
  scale follows the window, so a browser at 1280, 1920 and 3840 wide draws the sizes of those
  screens.
- `/tv-board`: a board longer than the room, a strip over a list of thirty rows with a status at the
  room set. The room cannot scroll, so the page shows what fits and the rows past it are the edge it
  draws.
- `/tv-offline`: the room screen with its server not answering, a `Gate` in the room place.
- In the Shell (the pathless layout `_app`): `/deploys`, `/deploys/$deployId` and
  `/deploys/$deployId/steps/$stepId` (one place whose layout route holds the list Pane and the
  router's `Outlet`: a deploy opens as the Panes after the list, a step as the Pane after them;
  `?file=` names the changed file whose diff is open), `/projects`, `/usage`, `/domains`,
  `/domains/verify` (a covering Pane pushed over Domains), `/logs`, `/requests`, `/tasks`, `/flow`,
  `/assistant`, `/members`, `/settings` and `/home`.
- One screen per read shape: `/keys` (a `Form` with a `secret` field and an `after` that draws a
  live preview read beside it), `/releases` (a `Pane` action and a `Toolbar` filter whose `blocked`
  and `description` are selections, and `Stats` cells that each frame their own read), `/activity`
  (a `BarChart` of 24 buckets named by `bar.label`, thinned where they would touch) and `/sprints` (a
  `Section` whose `groups` and `read` are reads).
- Outside the Shell, each a `Gate`: `/sign-in` (the email step, then the code step), `/connect` (the
  first of two Connect steps) and `/welcome` (a first run, a titled `Gate` whose body is its acts).

A place calls typed procedures through the generated client's `read` and draws their states through
the frames (`Pane`, `Section`, `Sheet`, `Form`) that hold the read, its leaves and collections
taking selections of it ([frames](reads.md#frames)). The procedures are `src/worker/routes/`: zod
input and output schemas and a stub handler each, so a run against the dev worker draws every
collection empty and every record not found. The data a place shows is `src/app/fixtures.ts`, which
answers every procedure, with an example value for each route param (`deployId`, `stepId`).

## The roster in Storybook

The roster is in Storybook: one story per roster component and drawn state (`DRAWN_STATES` in
`class-sets.ts`, each one a prop of the component), every class set of that component in that
state, light and dark side by side, at the toolbar's density (desktop or touch). The `rest` story
takes a `classSet` control to browse one class set. A lone scene (`LONE_STORIES` in `class-sets.ts`)
is the one scene of a story of its own, named for what it stages, at rest on its component's first
class set, dark only: what it raises into a page-wide queue (`confirm()`, `toast()`) every root
container on the page draws, so a page of several stages would show it in each. Its drawer tells
it by `scene.story`. Pointer and focus states stay in the roster and draw no
story, since the web variants match only real pseudo-classes: hover, press and focus are driven on
the real component in its story. `pnpm stories`, from the repo root, builds the workspace chain and
opens Storybook on `:6006`. Nothing runs the stories headlessly; `stack screens test`, run on the
screens a change works on, is the one machine run.

### Roster scenes

`src/roster/` holds the scene data (`class-sets.ts`), the `Scene` wrapper (`scene.tsx`) and one drawer
per component (`scenes/<dir>.tsx`, `draw<Name>`). A drawer takes the scene and returns the real
component in that class set and state, or `undefined` for a class set the component has no form for. A state
the component takes as a prop (`disabled` through `blocked`, `loading`, `error`, `selected`,
`empty`) is drawn by passing it.

`showcaseScenes()` in `class-sets.ts` lists the scenes: one per matrix class set a roster component draws (the
matrix groups its entry's `draws` names, enumerated by `matrixClasses`) and drawn state its entry's
`states` lists, in both modes and both densities, then its lone scenes. Each is drawn in `Scene`, which sets
`data-cell="<component>/<class set>/<story>/<mode>/<density>"` (the story is the state's, or the lone scene's name), its mode's class and the canvas ground. A
scene stands on the canvas, since a group ground would re-point the hairline of every surface drawn
inside it ([edges](tokens.md#edges)). It shrinks to the viewport (`min-w-0`), so a component that
fits a narrow screen is drawn fitting it. Without a drawer, or when the drawer returns `undefined`,
it draws its component's name and the class set's strings.

A scene imports react-ui through its `exports` only, as any consumer does, so a part stands inside
the public composition that hosts it: a painted control in a host whose read waits, a popup in the
portal of a `Gate` or a `Shell`, a toast raised by `toast()` into the queue every root container on the
page draws. A scene outside a stage has no root container, so its popups (a tooltip, a menu) mount in the document body and draw the body's mode. An edge no public composition reaches has no scene.

- **Reads.** `Reads` in `src/roster/waiting.ts` gives a scene's drawer the reads that show each of its forms, each member documented there. None retries, so a failure
  shows at once. A drawer that draws several scenes, or a page of scenes, takes each its own set
  with `readsAt`, so the states of one do not leak into the next.
- **Root containers.** A `Gate` or a `Shell` stands in a viewport-tall stage (`scenes/overlay-stage.tsx`),
  so a popup mounts in that container's portal and draws the scene's mode. `contain` stands the container's
  fixed layers (its portal, its toasts) in the stage's box, since a transformed box contains its
  fixed descendants; a popover anchored to its trigger must not take it. `ready` drives the scene
  (opens a menu, presses a blocked submit so its reason shows). It runs before paint, in the commit
  the stage mounts in, before any popup on the page listens for a press outside it: every open Base
  UI popup scans the whole document on each press anywhere, so a scene pressing after the page's
  popups open costs all of them and can dismiss another scene's. A press inside a popup waits one
  frame for the popup's content.
- **Self-judging scenes.** Some scenes judge their own edge and log an error where it breaks; the
  others are looked at. No event says a scene's parts have mounted and laid out, so a judging scene
  waits for its layout by counting animation frames (`judge.ts`), except the toolbar scene, which judges on a `ResizeObserver`; each wait returns its cancel, for
  the effect that starts it to return.

### Story generation

`.storybook/roster.ts` writes one CSF module per roster component into the gitignored
`apps/showcase/stories/` (Storybook's watcher does not see dot directories), each importing `state-stories.tsx` and that
component's drawer, and written only when its text changes, so an unchanged module is neither
re-indexed nor re-run. The roster is read in a child process (`roster-list.ts`), since Node caches ES
modules, and `rosterPlugin` rewrites the generated modules when the roster, its class sets or a drawer
change, so a roster edit reaches the sidebar without a restart; a roster that does not load keeps
the stories last written, and the error goes to the dev server's log. `pnpm generate` runs `roster.ts`, so
the check type-checks the stories the roster names.

### Storybook config

`.storybook/` holds the roster's own config: the story globs, `rosterPlugin` and the generator of
`stories/`. Its Vite config is the one `writeStorybookConfig` writes at Storybook's start
([a Storybook that draws components](../plugins/screens.md#a-storybook-that-draws-components)).

The preview (`.storybook/preview.tsx`):

- **Dev checks fail a story.** plugin-query's act checks (a mutation an act started without
  returning its promise, a failure nothing drew) log to `console.error`, and a story that trips one
  fails, so a route or a story that wires an act wrong cannot pass
  ([dev checks](reads.md#dev-checks)).
- **The breath is still.** The painted fills' breath repaints every one of them each frame. The test
  browser paints in software, so a story that draws dozens of fills (a roster's loading states, a
  screen's waiting shape) spends its frames there and every wait on one runs several times slower. A
  story judges a scene, not the loop, so the preview sets `--pulse-name: none`, what reduced motion
  sets ([fills](motion.md#value-and-fills)).

Every timing is tuned in one place, the phone app's `Motion tuning`
([tuning record](motion.md#tuning-record)).

## The screens workbench

```bash
pnpm --filter showcase exec stack screens dev   # Storybook on every route of the app, on :6006
pnpm --filter showcase test-screens --screen <title>  # the screens you work on, headlessly
```

The workbench draws every route in data, loading, error, empty and not found, light and dark, at
either density: the toolbar pins the mode and the density, and no request leaves MSW. A mutation
always answers from its fixture, whatever state the screen is forced into
([answers](../plugins/screens.md#answers)). Workbench stories carry tags per state
(`state:loading`) and checked global (`mode:dark`), so `--state` and `--mode` filter them.

## Enforcement

The test run opens each screen in every state, light and dark, and fails it on an axe violation, a
horizontal overflow, a finding of the render walk, or a console error or warning. The run's checks
are one preview annotation (`@fcalell/plugin-screens/checks`) that visits each
[rubric width](../plugins/screens.md#rubric-widths) and, per width, checks overflow and runs the
render walk ([test run order](../plugins/screens.md#test-run-order)). The run also fails each read in
turn (one procedure's GETs answered with a server error) and runs the checks at each width.

**Render walk.** The walk (`walk.ts` in plugin-screens) holds what needs a layout: heights, gaps,
insets, radii, clipping, type sizes, late fonts, tabular digits, a root's margin and same-name
regions. It reads the contract off the page (`--spacing-*`, `--text-*`, `--radius-*` at the
element's own density), never from a copy, and its checks are pure functions, each with a canary
that fails on a bad case. The alignment rules (`align-dead`, `align-centre`, `align-baseline`,
`align-grid`) fail the run. What the contract itself draws off a rule is a named exception in
`EXCEPTIONS` (`walk.ts`) with its reason, never a baseline; the standing one is a control, row or
chip inside a card, popover or sheet, which keep their roles' radii, since a concentric inner radius
would need the inner part to know its outer. The rules themselves are in
[render walk rules](../plugins/screens.md#render-walk-rules).

**Shift check.** The run measures every Section heading waiting and then loaded at each rubric
width and fails the screen when the first Section moves, a later one moves by other than what the
Sections above grew by, or a Section that stood disappears
([loading shift comparison](../plugins/screens.md#loading-shift-comparison)).

**Findings.** A failing check is a finding in the component: it stays failing until the component
is fixed, never weakened or skipped. Nothing is excluded from axe beyond the document-structure
rules. A node off a canvas's run path is a button that can be chosen, so its words stay in the meta
ink and pass the text floor; the showcase's `/flow` draws one. The rules a component's source must
keep (`packages/ui-core/guide/structure.md`) are judged in review.

**Changed runs.** A change reaches a story file only through its module graph, which `dist/` and
generated files do not join, so the generated screens config adds `workspaceTriggers(<app dir>)`
(`@fcalell/plugin-screens/node`) to Vitest's `forceRerunTriggers`, the files no module graph
reaches ([changed runs](../plugins/screens.md#changed-runs)).

**Voice lengths.** `voice.test.ts` holds `packages/ui-core/guide/voice.md` to its tokens: the page
states a length by its token. A px value stands only as the value at the default `size` (or
`radius`) knob, written "`token` (32 px, 44 px on touch, at the default `size`)", or is a true
constant the test lists: a number no knob moves. A formula never joins that list.

## The guide

ui-core's `guide/` holds what both platforms share: the screen recipe, the voice (the anchor app,
its pinned screens, the decisions and the floors), the critic's checklist and the structure rules;
the package README lists the pages ([README](../../../packages/ui-core/README.md#install)). How a
screen is judged is the screen recipe's (`packages/ui-core/guide/screen.md`).

`@fcalell/ui-core/manifest` lists the pages (`uiCoreGuide`) that react-ui and native-ui contribute
to `cliSlots.guide` ([the guide](../consumer-project.md#the-guide)). Each UI plugin
adds `@fcalell/ui-core` to the consumer's own `dependencies`, so the index's
`node_modules/@fcalell/ui-core/guide/` paths resolve. A platform's rules for every `.tsx` are its
plugin's own page (react-ui's `guide/rules.md`).

## In the code

- `apps/showcase/src/app/routes/`: the app's routes
- `apps/showcase/src/screens/tv.tsx`: the room screens
- `apps/showcase/src/screens/view.tsx`: the token page's view and its density switch
- `apps/showcase/src/worker/routes/`: the stub procedures
- `apps/showcase/src/app/fixtures.ts`: the data every procedure answers
- `apps/showcase/src/roster/class-sets.ts`: `showcaseScenes()`
- `apps/showcase/src/roster/scene.tsx`: `Scene`
- `apps/showcase/src/roster/waiting.ts`: the reads a drawer hands its scenes, `readsAt`
- `apps/showcase/src/roster/judge.ts`: a judging scene's wait for layout
- `apps/showcase/src/roster/scenes/overlay-stage.tsx`: the stage a root container stands in
- `apps/showcase/.storybook/main.ts`: the story globs and the Vite config
- `apps/showcase/.storybook/roster.ts`: the story generator
- `apps/showcase/.storybook/roster-plugin.ts`: `rosterPlugin`
- `apps/showcase/.storybook/state-stories.tsx`: one story per component and state
- `apps/showcase/.storybook/preview.tsx`: the dev-check failure and the still breath
- `packages/ui-core/src/voice.test.ts`: the voice page's length rule
