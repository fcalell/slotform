# plugin-react-ui

`@fcalell/plugin-react-ui` is the web half of the design system: it renders `@fcalell/ui-core`'s
contract into `.stack/app.css` on Tailwind v4, loads the fonts, sets the mode before first paint,
mounts the words and the app's lockup, and ships the web roster on `@base-ui/react`. This page holds
how the plugin and its components are built: the stylesheet, density, the mode script, the lint
rules, the component shape, focus, popups, navigation and the canvas. How a consumer builds a screen
with it is the guide (`plugins/react-ui/guide/`); the slots it owns are in the
[slot catalog](../slot-catalog.md#reactuislots-plugin-react-ui).

## Generated files

| File | Slot | Content |
|------|------|---------|
| `.stack/app.css` | `reactUi.slots.appCssSource` | `tailwindcss` with `source(none)`, the plugin's `globals.css`, `@source "../src"`, the `@theme` tokens and shadow utilities from ui-core, the `touch:` and `page-*` custom variants, the `pb-safe` and `pt-safe` utilities, and `@layer base` for the mode scopes, reduced motion and density |

CSS is this plugin's domain: the entry's `import "./app.css"` pairs with the artifact, so a consumer
with `react()` alone neither imports nor emits a stylesheet. `.stack/entry.tsx` imports
`./app.css`; `.stack/vite.config.ts` gains `tailwindcss()`, `themeFontsPlugin` (the preloads and
`@font-face` rules), `themeModePlugin` (the script that sets the `dark` class before first paint)
and `canvasPlugin` ([Canvas serving](#canvas-serving)).

`pb-safe` and `pt-safe` pad by `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)`, which
are non-zero under the react plugin's `viewport-fit=cover`.

The `tailwindcss` and `@tailwindcss/vite` ranges `reactUi()` writes into the app are the package's
own optional peer ranges, read from its `package.json` when the plugin loads.

The plugin hands the CLI ui-core's guide pages (`cliSlots.guide`), as native-ui does; the index
lists each page once.

### Router bindings

The plugin hands the generated entry two router bindings (`react.slots.routerBindings`), and the
entry calls each with the app's router right after creating it. Each takes the slice of the router
it needs, typed structurally, so react-ui imports no router.

- `bindRouter` (`lib/navigate`): an act opens a route in place ([Navigation](#navigation)).
- `bindNotFound` (`lib/not-found`): sets the router's default not-found page, so the app passes
  nothing. A route of the app's own that matches (a catch-all) or sets a `notFoundComponent` wins.

The not-found page stands wherever the router lands the miss. TanStack's fuzzy mode hands a miss to
the deepest matched route that has children: an address under one of the app's routes
(`/members/zzz`) stands in that route's layout, a `Shell`, and any other miss stands at the root,
outside it. So the page draws in three forms: under a record's `Pane` (its tabs' outlet) the
missing sentence in that Pane's body; elsewhere under a `Shell`, where a record would stand beside
the place's `Pane`, a record's `Pane` titled "Not found" with the missing shape; at the root a
`Gate` with Back to `/`.

## Stylesheet assembly

Tailwind's automatic content detection roots at the sheet's directory, `.stack/`, and would scan
every generated file there (the worker types, wrangler's bundle). The `tailwindcss` import turns it
off with `source(none)`, so the consumer's sources are declared explicitly.

Every contract utility is generated whether or not a source spells it: the showcase's foundations
page builds its classes from the token names. The vocabulary is the contract's, never a usage
scan's, and the cost is the whole contract in every sheet.

Each `@font-face` gets a metric fallback face named by ui-core's `fallbackFace`
(`"IBM Plex Sans Fallback"`), the name the contract's family stack carries second.

## Modes

Each mode is a class scope in `@layer base`, never a third block kind: `@theme` compiles into
`@layer theme` and Tailwind sorts `base` after it, so the layered values win over the seeded light
ones. `.dark` on the root is the mode; `.light` inside it restores the light set for its subtree, so
a light frame renders light under a dark page. `color-scheme` travels with the colours, so UA
controls follow the scope. A raised ground's fill class then re-points the hairline for its subtree,
after the mode scopes, so an element that is both keeps the re-point; a soft ground's fill class
re-points it to the strong edge. The token side of grounds and edges is
[tokens](../ui-core/tokens.md#edges).

## Density

The **density rule** is one query (`./density`), built once and read by the density layer, the
`touch:` variant and `useTouch` (`lib/media`); what it draws and the `data-density` pin are the
guide's [Density](../../../plugins/react-ui/guide/reference.md#density). The pin is how the showcase and a board address a
density. The token sets themselves are [density and room](../ui-core/tokens.md#density-and-room).

- **Desktop set.** It draws under the rule's desktop query and overrides the seeded touch set in
  `@layer base`, the cascade the dark layer rides, so every class set that names a size or a type role
  (`min-h-control`, `text-body`) follows with no class of its own.
- **Room set.** The one scope a place states (`distance="room"`, which the `Shell` does not take):
  `[data-density="room"]` in the density layer (`ROOM_SCOPE`) holds `--room-unit` and every room
  value as a `calc` over it, so the unit resolves where it is read. The scope comes last, so a root
  pinned to the room beats the desktop query.
- **`touch:` variant.** It draws where the density layer draws the touch set: under the touch pin,
  with no desktop pin outside the desktop query (a pointer that is not fine, or a viewport narrower
  than `tablet`), and inside a room scope, which draws the touch structure. It is how a molecule's
  structure follows density (an action bar at natural width on the desktop, full width on touch). A
  token never needs it: a size, a spacing role and a type role follow density through their
  variables.
- **`useTouch`.** A molecule whose tree differs by density (the Shell's sidebar or places layer, its
  tab bar) reads it, so its structure and the token set cannot disagree. It reads the place's
  `DistanceContext` as well as the query. Every caller reads one store: one cached query, one
  observer of the pin, one set of listeners, wired while any caller listens.

## Size containers and variants

| Container | Variant | Draws |
|-----------|---------|-------|
| `page` (a `Pane`, `@container/page`) | `page-<breakpoint>:`, `page-max-<breakpoint>:` | from or below a breakpoint's width of the Pane, emitted from the contract's breakpoint values, so a molecule decides its form by the room its Pane has, never the viewport's |
| `place` (a `Panes`) | `place-…:` | by the place's width, which is how a Pane knows whether its Panes stands it alone |
| `row` (a list row that may stand one line) | `row-two-line:` | below `rowOneLine` of the row, where its meta stands under the title |
| `rules` (a rules list) | `rules-stacked:` | below `rulesOneRow` of the list, where each rule stacks its terms |
| `page` | `definitions-stacked:` | below `definitionsOneRow` of a Pane, where a definition row stands its value under its label |
| `acts` (an action bar) | `acts-stacked:` | up to `actsStackedMax` of the bar, where its acts stack one per row |
| `time` (a bar chart's time between its ends) | `time-fits:` | where the space holds the times |

The `time` container is a box as wide as its space in the plot over `TIME_SPACE` times its longest
time's characters, in the time's own font, so one `ch` of that box is the whole test.

## Fonts

Fonts resolve from options only, into `reactUi.slots.fonts`, so every other contribution reads one
source. An omitted `fonts` takes `defaultFonts` (IBM Plex Sans on its `wght` axis, IBM Plex Mono at
400, 500 and 600), while `fonts: []` means no fonts at all: no `@font-face`, no preload, no
`<style>` tag. The `??` that does this is load-bearing, and the font functions take the fonts
argument as required (codegen always passes the resolved slot value; a direct caller imports
`defaultFonts`), so `fonts: []` keeps its meaning from consumer config to runtime.

A font entry is a webfont file: `themeFontsPlugin` preloads the woff2 and declares `@font-face` with
fallback metrics. Which family the contract binds to `sans` or `mono` is the theme's `fonts` knob; an
entry only makes a family's file load.

The files are served out of this package's `node_modules` (`@fontsource`). When stack is
workspace-linked those files sit outside the consumer's workspace root and Vite's dev server answers
403, so the plugin adds its own workspace root to `vite.slots.fsAllow`. `import.meta.resolve` runs
in the generated config and yields the real, symlink-resolved location; installed from a registry it
lands inside the consumer's allowed root and the entry is inert.

## Mode script and CSP

The **mode script** sets the `dark` class the stylesheet keys on before first paint, so a dark
viewer never sees a light flash, in the order the guide's
[Modes](../../../plugins/react-ui/guide/reference.md#modes) gives. With no `defaultMode` it listens to
the system's colour scheme (a schedule that darkens a screen at dusk, a viewer's switch) and reads
the stored choice again at each change, so a choice stored after load holds. Storage that throws
reads as no stored choice; a missing `matchMedia` with no `defaultMode` leaves the page light. The
script runs before the page and never throws into it.

The script also writes the paint each glyph region waits in as `data-loading-<region>` on the root. The
stylesheet and `lib/scramble` read it (the shared `loading` record reads it once, so any module that
can paint knows it), so the first frame of a page that waits is already in the theme's voice. A region
that pulses carries none. Paint itself is [reads](../ui-core/reads.md#paint).

A built page carries one inline script, the mode script (the dev server adds React Refresh's
preamble, which [plugin-react allows](./react.md#dev-csp-and-react-refresh) on the dev server
alone). A policy with `script-src 'self'` blocks it, so the plugin contributes `script-src 'self'
'sha256-…'` to `vite.slots.clientHeaders`: the hash of the exact string `themeModePlugin` injects for
the same theme, computed at generate time from the same `modeScript(…)` call, so the two cannot
drift. A consumer's policy needs only `script-src 'self'` plus its own sources, merged as
[Content-Security-Policy](./vite.md#content-security-policy) says. The plugin contributes no
`style-src`: a hash on the `@font-face` `<style>` does not cover the inline `style=` attributes React
sets, so `style-src` is the consumer's.

## Lint rules

`lint/*.grit` are the web rules' "never" list as Biome GritQL plugins; `guide/rules.md` points at
`LINT_RULES` and the `.grit` headers for which rule enforces which never, the rest staying a reading
of the page. The plugin contributes them to `cliSlots.lintPlugins` with `includes` the app's own
sources: the directory its routes sit in (`react.slots.routesDir`'s parent), or `src` (the
stylesheet's `@source`) with file routing off. A routes directory at the project's root leaves the
whole project. `stack generate` writes them into `.stack/biome.json`, which the app's `biome.json`
extends ([Lint](../consumer-project.md#lint)).

A new rule is a file in `lint/` whose header states what it forbids and a name in `LINT_RULES`
(`src/node/lint.ts`). A rule matches the attribute's text by regex, since Biome's GritQL reads a node's text whole
and has no look-ahead: a reset (`border-0`) is excluded per category.

## Components

Each roster component lives in `src/ui/components/<componentDir(name)>/index.tsx` and is imported as
`@fcalell/plugin-react-ui/components/<dir>`. The file exports the component and its `XProps`
interface, which extends `Closed` (`./lib/closed`: `class`, `className`, `classList` and `style` as
`?: never`) and declares exactly the roster's prop names
([closed props](../ui-core/roster.md#the-canon-and-the-closed-props)).

- **Look.** A part's `className` is `cn(cva(props), OVERLAY)`: the ui-core cva (or single-class-set
  constant) first, then the overlay, so an overlay colour wins over the class set's. `cn` is
  `@fcalell/ui-core/cn` ([composing with cn](../ui-core/tokens.md#composing-with-cn)). An overlay is
  a module constant spelled verbatim, never a class built from a variable.
- **States.** Hover, press and focus are the web variants `hover:`, `active:` and `focus-visible:`;
  a disabled control `disabled:` or `aria-disabled:`, a pending act `aria-busy:`. Focus rings are
  [Field box and focus rings](#field-box-and-focus-rings).
- **Behaviour.** `@base-ui/react` supplies behaviour and accessibility (a button, a switch, a
  checkbox, a slider, a field, a select) through its per-component subpaths
  (`@base-ui/react/switch`); its parts take the component's classes, never Base UI's look.
- **Composition.** A component that draws another's place takes its pattern, never a copy. A
  field's `Picker` trigger is `Input`'s box (`BOX`, `BOX_HOVER`, `BOX_DISABLED`, exported from
  `components/input`) and its open list a popover (`POPOVER`) of rows (`ROW`, `highlighted` under
  Base UI's highlight). A popup mounts in its root container's portal ([Popups](#popups)).
- **Words.** A word the component draws on its own comes from `useWords()`; a sentence is a prop.

`Text` is the worked example: a `<p>` in `text({ role })` with the `max-w-measure` overlay.

### Gate

`Gate` is the layout container of a page outside the shell, a sign-in or a consent step
([Gate](../ui-core/layout.md#gate)), the app's lockup drawn by [App lockup](#app-lockup); its props
are the guide's [Gate](../../../plugins/react-ui/guide/containers.md#gate). It mounts
the same `ContainerHost` as the `Shell` (`components/shell/host.tsx`: the `toast()` queue, the
`confirm()` decisions). The first field of a step takes focus as the page opens and as `title`
changes (`focusFirst` in `./lib/focus`). Its `form` (a `Form`'s props, over the step's procedure) is
drawn in the column by the Gate (`components/gate/index.tsx`, a `FormShell` from
`components/form/base.tsx` in the auth column), its bar laid out by the column's width as every `ActionBar` is.

## App lockup

The generated providers mount the app's lockup once, from the react plugin's icon
(`react({ icon })`, [HTML shell](./react.md#html-shell)), its drawn lockup (`react({ logo })`) and
the app's name. An app with no icon mounts none, and the `Shell` and the `Gate` draw no lockup. A
subtree is scoped to none with `lockup={null}` (a container under an app that has an icon, drawing the bare
form).

## Field box and focus rings

The root's `data-modality` records how the viewer last drove the page: `keyboard` once a key moves
through the page, `pointer` after a press, and neither before the first. A ring draws only under
`keyboard`: a browser also counts a clicked text field, and focus a script moves after one, as
`:focus-visible`, which would ring the page under the pointer. A key counts as moving through the
page as React Aria counts it: never with Meta, Control or Alt held (a shortcut), never a modifier
alone, and in a field that takes typing only Tab and Escape (typing moves nothing). One capture
listener pair serves the page, installed by the first frame or field to mount and dropped with the
last; there is no provider and no prop.

The base rule in `globals.css` (`--focus-ring` in `--color-ring` at `--focus-ring-offset`) draws
under `keyboard` only, so a component spells nothing for it. A control inside a control rings inset
with `focus-visible:-outline-offset-2`, and a component that draws a ring of its own spells it under
`in-data-[modality=keyboard]:`. The ring tokens are
[radius, hairline and focus ring](../ui-core/tokens.md#radius-hairline-and-focus-ring).

A field box (`Input`, a `Thread`'s composer, the `Picker` trigger in a field) draws the field's
states, and its value inside is a bare line, so the ring is the box's and the value's own is off.
The box ring is 2 px centred on its 1 px edge (`--focus-ring-edge-offset`, -1 px), for the keyboard
alone; under the pointer the box takes the accent edge alone (`FOCUS_EDGE`). The box rings on its
value's focus alone: an act inside it rings inset on its own focus, so the box yields to it. The
guard names the act, not the value, so a showcase scene forced to focus still rings the box.

Base UI's `Field` wires the control (its id, label, description and validity); the render function
hands over its props and state, so the box around the value draws that state. A disabled box carries
`aria-disabled` itself: the unit outside the native control (an `Input`'s box, a file input's name
and size, a prose input's budget) reads as disabled to a checker only through an ancestor that says
so.

A `Switch` or a checkbox inside a field is disabled through Base UI's field context, which sets
`disabled` and `data-disabled` on the hit box and the thumb or mark. The hit box is a native button:
on a span, Base UI reads the hidden input's `labels` after every render, a walk of the whole
document.

## Icon acts

A trigger stays pressed while its popup is open, on `aria-expanded`, which the menu, picker and sheet
triggers set and the tooltip's own trigger does not (its `data-popup-open` would press every act that
shows its name).

An icon act shows its name in a tooltip on a pointer resting on it or on the keyboard reaching it,
hidden by Escape, a press or leaving. The label stays the element's accessible name (the tooltip
adds none), and touch draws none: a press there is no rest, and the name would cover the act under
the finger. Focus a dialog hands its own first act (its close) shows no name: the name would take the
first Escape, which belongs to the dialog; Tab inside it does show it.

## Focus

Who holds focus is tracked by the page's own focus and press events, never read from the DOM during
a render: the React compiler memoizes a render-time ref read, so the answer would be the mount's.

- **Pane.** A `Pane` opened from a press in another `Pane` takes the keyboard on its head's first
  control, as the guide's [rules](../../../plugins/react-ui/guide/rules.md) say, and a `Pane` hidden by the opening (below
  `tablet` of the Panes) keeps no focus. A `Pane` drawn with the page, focus on the
  body, takes nothing.
- **Foot region.** A foot region hands focus to its first field when what held it leaves with its own
  page (a docked `Sheet` closing for the `Thread`'s composer that returns); the document takes focus
  then.
- **Sheet close.** A sheet that closes with its focus inside it and nowhere to fall back to (its
  opener unmounted with the popup that held the act, or no act opened it, a route did) hands focus to
  its opener when that stands, else to the page's head. A press on the scrim, which moves focus on
  purpose, is left alone. The opener of a sheet opened from an act in a popup (a `Picker`'s or a
  `Menu`'s), whose row the popup's close unmounts, is the popup's trigger, held by the module for the
  one sheet that opens in the same breath: the app's handler opens the sheet and never sees the
  trigger.
- **Page a sheet left.** Focus goes to the page's head, or its first control, retried while a route
  is still drawing the page. The retries are for focus nobody has taken: once any element takes
  focus (a viewer's Tab, a field that autofocuses, another region's hand-off) the sheet's claim is
  over, so a late retry never pulls focus off where the viewer has since moved it.

## Accessibility

Base UI draws focus guards around an open non-modal popup (a `Menu`, a `Picker`): empty spans that
relay Tab between the trigger and the portaled popup, `aria-hidden` and focusable at once, which
axe's `aria-hidden-focus` flags (serious) on every open menu. Each guard moves focus the moment it
takes it, so nothing rests on it, and no prop turns them off (Base UI 1.8.0). `lib/guards` leaves a
guard focusable, so the relay holds, and removes its `aria-hidden`, which is what the rule objects
to: an empty span in the tab order with no role, which assistive tech passes over as it does any
empty element.

## Popups

A root container (the `Shell`, the `Gate`) names an element inside its `main` as the popups' mount
(`lib/portal`), so an open popup stands inside a landmark, never in the body beside them, and draws
the mode of the box the container stands in. Base UI's portal waits on a `null` container, so a provider
names `null` until its element mounts; with no provider the container is `undefined` and the popup
mounts in the body.

The mount is a point at the viewport's origin, so a popup's positioner measures against the
viewport as it would in the body (its first frame stands where it settles) while the element stands
in `main`. Being fixed, it is a stacking context, so it stands on the popover layer, the top of the
layers it holds: over the page and the tab bar, under the toasts.

## Toast anchor and stacking

The toasts stand on their layer over an open sheet's portal, so nothing between them and the root
makes a stacking context: no `isolate`, `z-*` or transform on the container, the column or `main`. The
`b-layers` walk rule holds it.

Their foot is the top of what docks at the container's foot, which names itself the `--docked-foot`
anchor: a place's `foot` (a Pane's docked foot, which spans the body that scrolls past it, centres a field's own
measure column at every density, and draws nothing, border and inset included, while it holds nothing, such as a chosen bar with no row
ticked), a filling `Thread`'s input, and on touch an open bottom sheet. The layer stands above the
anchor by layout as it grows, and at `main`'s foot without one, so a toast covers what the guide's
[rules](../../../plugins/react-ui/guide/rules.md#an-act-holds-its-attempt) say it may.

The layer is fixed, as the sheet is: an anchor resolves only for a layer whose containing block is
the anchor's own, and an absolute layer in `main` (relative) cannot reach a fixed sheet in the
portal, so it falls back to the page inset and stands over the sheet's act. `main` is the container's
last column and reaches the viewport's end and its foot, which is where the layer stands its toasts.

A bottom sheet stops at the viewport's top and its body scrolls; its bottom inset clears a phone's
home indicator.

## Navigation

Every anchor stack draws is a plain `<a href>`, so one delegated listener for the page covers them
all, and TanStack's own `Link`, with no prop on any component.

- **Click.** A plain primary click on a route of the app opens it in place; every other click
  (modifier, middle, external, unbound) is the browser's, so a new tab and a copied link keep
  working.
- **Preload.** A touch's `pointerover` fires as the finger lands, which is the web's press-in. Any
  other intent in the window drops the pending one. The bound router is read when the timer fires,
  so a rebind (the screens workbench binds per story) adds no listener and never preloads into a
  stale router. External, hash-only and current hrefs have nothing to load.
- **Location.** The page holds one router and one location listener, whatever reads the route: every
  reader hears it through the store. Unbound (routes off, a render outside the app's router) the
  location is read from the document and an act loads it.

## Organization routes

An organization is served at `/<slug>`, which the app's routes share, so their first segments are
slugs auth refuses: the plugin contributes `react.slots.topLevelRoutes` to `auth.slots.reservedSlugs`
([reserved segments](./react.md#reserved-top-level-segments),
[reserved slugs](./auth.md#reserved-slugs)). This plugin reads both the routes and auth; neither of
those reads the other.

## Table

A read whose procedure declares `sort` is ordered by the server: the header's sort goes into the
read's input, and a column the procedure does not name does not sort. A window read orders by the
server or not at all, since the rows loaded are not the rows there are. The read side is
[Sort](../ui-core/reads.md#sort).

## Picker segments

The segments keep their natural width and a label is never cut. Where they do not fit the track's
space the track scrolls sideways with no scrollbar drawn, as a phone's tab row does, the chosen
segment is scrolled into view, and the track fades at the edge that has more (`scroll-fade-x`), so a
tab at the edge never stands cut with nothing to say so. It hugs its segments in a column too (a
`FormField`), never stretching to the field.

- **Cap.** The track's cap is its container's, `!important`: a Pane's body caps what stands in it at
  the measure by a child selector, which would otherwise outrank `max-w-full`, leave a track wider
  than its column and scroll the page.
- **Height.** A scroll container has no automatic minimum height, so `shrink-0` keeps it from giving
  up its height to a column that overflows (a Pane's body above a tall facet).
- **Offset parent.** The track is positioned, so it is its segments' offset parent: the radio group
  scrolls the chosen segment into view by its offset in the track (`offsetLeft` up the offset
  parents). From any further ancestor that offset is the segment's place in the page, which reads as
  a segment past the track's end and scrolls a chosen segment that fits past the ones before it.

## Text

A **parts line** (a record head's overline, a message's provenance, `lib/parts-line`) is one text of
parts a middle dot apart that never breaks at a separator. The dot is bound to the word before it and
the word after it by no-break spaces, so a line breaks only between the words of a part. A box beside
a no-break space still takes a break, so the caller draws a part's code inline (`RunText` `whole`).
Where the line is cut at its end (an overline, truncating) or set to its end, nothing marks a line's
start for a dot to be clipped at. Facts are no such text: a row's, a head's and a node's status are
badges (`BadgesLine`), which have no separator.

A code run in a line of text (`lib/code`) is one box, drawn or bare: it moves whole to the next line
and is cut with an ellipsis only where it alone is wider than the line, never broken inside its word.
In a text read whole (a row's `wrap`, a field's error) it is cut nowhere: it moves whole to the next
line as a word does, and one wider than the line wraps at its path or URL separators (`CodeWhole`),
breaking inside a segment only where that segment alone is wider than the line. A bare run (a name)
flows as text there; a boxed one is an atom (`ATOM`), so its box is one box, never drawn again on
each line. The runs themselves are [text runs](../ui-core/words.md#text-runs).

## A picked file's `src`

A file attached to a message (`lib/picked`) that is an image also carries `src`, an object URL made
for its thumbnail. Nothing in the package knows when the consumer is done showing it, so the
consumer revokes it, as the guide's [rules](../../../plugins/react-ui/guide/rules.md) say.

## Canvas

A canvas has no class to restyle, so it reads the colour roles' resolved values off its own element
(`lib/ink`), once per mode: the version moves when the mode or the density pin changes on the root,
and a reader draws again.

- **Layout.** A layer gap holds the router's own space (`canvas/elk.ts`): a forward edge bends a
  `pair` under its source, and under the bend a label chip hangs a `pair` below it with a `pair` of
  air and an arrowhead beneath it before the next node. With no chip the gap is the bend's `pair`, two
  `pair`s and the arrowhead, never under `floor`.
- **Text floor.** A node's smallest text is the caption role, and its size is the text floor: the
  same number, so a node draws its words from zoom 1 up and its glyph alone below. Both are read from
  the type scale at the desktop body size.
- **Fixed size.** The region keeps a variable at `1 / zoom`, and a style holds a part of the layer at
  its own size on screen through it: a coordinate of the layer, known at run time, written outside
  React.
- **Whole pixels.** A 1 px stroke at a whole coordinate straddles two pixel columns at half
  intensity, so the layer stands at a whole translate (`fitTransform`, `overviewTransform`) and a stroke
  at `n + 0.5` (`crisp`) is one solid column at scale 1, as are a node's border and a dot of the grid.
  The viewport applies it to every transform the canvas sets itself, and the canvas's `drop` to every
  position a viewer's move reports (a drag, a lift, an arrow key), so a stored node draws its border on
  one column at scale 1.
- **Viewport.** d3-zoom runs on the region's element, its transform applied to the layer marked
  `data-layer` and the grid pattern marked `data-grid` inside it. A pan touches no React state. A
  move lands on the element, which the effect reaches after the commit: one asked for before it lands
  nowhere. A plain wheel with Shift and no sideways delta pans sideways (`wheelPan`): a Mac turns a
  Shift wheel into a sideways delta itself, so no platform check is needed.
- **Edge pan.** A drag of a node (a mouse drag or a lift) or of a link hands the viewport its pointer at
  each move (`Viewport.edge`). While the pointer stands in the pane's edge band, a frame loop pans the
  view toward that edge at a scroller's edge speed, ramp included
  ([Web drag](../ui-core/drag.md#web-drag); `autoPan` in `view.ts` turns its sign, since a pan moves
  the content where a scroll moves the view), and has the drag follow its pointer again, so the dragged
  node stays under it: a held node's place is the pointer's flow point less where it was taken
  (`heldAt`), read at the view as it stands. The loop stops on a frame at zero depth (the pointer
  out of the band) and on the drag's end, and a drag begun or ended enters the band afresh; a node
  unmounted mid-drag ends its pan. The band's entry and steps are `bandAt`'s; its pans are the
  viewer's move.
- **Keyboard move.** A node that can move is a button, with `onSelect` or without. An arrow moves the
  focused one by `keyStep` (the step the guide's [Editing](../../../plugins/react-ui/guide/canvas.md#editing) gives) through `drop`,
  the path a release takes. Nothing is announced ([product](../../product.md)).
- **Ground.** The region's ground is the region, its layer or its grid (which carries
  `data-ground`). Everything else inside (a node, the zoom stack, the act) is a part.
- **Chrome.** What the canvas's own chrome takes from the pane is a part marked `data-clear` with the
  edge it stands against, `left` or `bottom`, and a `pair` of air beyond it, so a fit stays clear of
  it.
- **Zoom stack.** The buttons stack at the bottom left: zoom in, zoom out, fit, then arrange when the
  canvas can move nodes. A press there starts no pan. A zoom is unavailable at its end of the scale
  (`atMax`, `atMin`), and the button keeps focus, as a disabled icon act does. A waiting canvas draws
  them with no act, inside its inert region.
- **Lift.** A node lifts after the long press a dragged row takes: `DRAG_DELAY` and `DRAG_DELAY_SLOP` from
  `@fcalell/ui-core/drag`, one definition for both ([Web drag](../ui-core/drag.md#web-drag)).

## Canvas serving

The canvas lays out in a worker. A `?worker` import cannot survive Vite's dependency pre-bundling,
and the dev optimizer pre-bundles this package's `.tsx`, so `lib/canvas-layout` is the only module
that touches the worker and is served as source: the canvas reaches it by its package name, and
`canvasPlugin` (`./node/canvas`) keeps it out of the pre-bundle and pre-bundles ELK's CJS API by name.
The worker is ELK's own file; `elk.bundled.js` fails as a module worker once pre-bundled.

## Screens workbench

The plugin contributes the mode and the density the sheet keys on (a `dark` class and
`data-density` on the root) to `screens.slots.previewGlobals`, as toolbars the screens workbench
pins before a story paints ([Toolbar globals](./screens.md#toolbar-globals)). The workbench opens in
the theme's default mode, and a test run checks both modes. The test run takes the density pin off
at each width, so 320 draws the touch set and 1280 and 1920 the desktop one, as a phone and a laptop
do.

## In the code

- `plugins/react-ui/src/index.ts`: the plugin, its slots and its contributions.
- `plugins/react-ui/src/density.ts`: the density rule.
- `plugins/react-ui/src/types.ts`: the font entry and option types.
- `plugins/react-ui/src/node/theme.ts`: the stylesheet's tokens, modes, density layer and variants.
- `plugins/react-ui/src/node/codegen.ts`: `.stack/app.css`.
- `plugins/react-ui/src/node/fonts.ts`: `themeFontsPlugin`, the preloads and `@font-face` rules.
- `plugins/react-ui/src/node/mode.ts`: the mode script, `themeModePlugin` and its policy hash.
- `plugins/react-ui/src/node/lint.ts`: `LINT_RULES` and their includes.
- `plugins/react-ui/src/node/canvas.ts`: `canvasPlugin`.
- `plugins/react-ui/src/ui/lib/canvas-layout.ts`: the canvas layout worker's one importer.
- `plugins/react-ui/src/ui/lib/media.ts`: `useTouch` and the density store.
- `plugins/react-ui/src/ui/lib/modality.ts`: `data-modality` and the field box ring.
- `plugins/react-ui/src/ui/lib/focus.ts`: focus hand-offs for panes, foot regions and sheets.
- `plugins/react-ui/src/ui/lib/guards.ts`: Base UI's focus guards without `aria-hidden`.
- `plugins/react-ui/src/ui/lib/portal.ts`: the popups' mount.
- `plugins/react-ui/src/ui/lib/navigate.ts`: `bindRouter`, the delegated anchor listener, preload.
- `plugins/react-ui/src/ui/lib/not-found.tsx`: `bindNotFound` and the not-found page.
- `plugins/react-ui/src/ui/lib/lockup.tsx`: the app's lockup context.
- `plugins/react-ui/src/ui/lib/scramble.tsx`: the `loading` record read from the root.
- `plugins/react-ui/src/ui/lib/ink.ts`: the canvas's colour tokens.
- `plugins/react-ui/src/ui/lib/parts-line.tsx`: the parts line.
- `plugins/react-ui/src/ui/lib/code.tsx`: code runs in a line of text.
- `plugins/react-ui/src/ui/lib/picked.ts`: a file attached to a message.
- `plugins/react-ui/src/ui/components/shell/host.tsx`: `ContainerHost`, the toasts' layer and the popups' mount.
- `plugins/react-ui/src/ui/components/pane/index.tsx`: the Pane and its docked foot.
- `plugins/react-ui/src/ui/components/sheet/layer.tsx`: the sheet layer and the bottom sheet's anchor.
- `plugins/react-ui/src/ui/components/input/base.tsx`: the field box (`file.tsx`, `prose.tsx` beside it).
- `plugins/react-ui/src/ui/components/switch/base.tsx`: the switch hit box.
- `plugins/react-ui/src/ui/atoms/switch/checkbox.tsx`: the checkbox hit box.
- `plugins/react-ui/src/ui/atoms/button/glyph.tsx`: icon acts and their tooltip.
- `plugins/react-ui/src/ui/components/picker/segments.tsx`: the segmented picker's track.
- `plugins/react-ui/src/ui/components/table/index.tsx`: the Table and its server sort.
- `plugins/react-ui/src/ui/components/canvas/`: `elk.ts`, `floor.ts`, `view.ts`, `viewport.ts`, `hit.ts`, `lift.ts`, `zoom.tsx`, `geometry.ts`.
