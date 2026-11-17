# plugin-native-ui

`@fcalell/plugin-native-ui` is the phone half of the design system: it renders `@fcalell/ui-core`'s
contract into the uniwind stylesheet, embeds the font files, composes the app's providers around the
expo-router root, generates the native auth constants and scaffolds the native clients, and ships
the phone roster on React Native. This page holds how the plugin and its components are built. How a
consumer builds a screen with it is the guide (`plugins/native-ui/guide/`); the slots it owns are in
the [slot catalog](../slot-catalog.md#nativeuislots-plugin-native-ui).

## Requires and peers

The plugin requires `expo`, `api` and `query`. It contributes into expo's slots and reads api's
(`nativeScheme`, `serverAuth`): an app owns its worker or names the server it is a client of with
`api({ server })`. The query plugin holds the client its `QueryProvider` mounts and the port the
components' reads run on. `auth` is imported for its slots and its provider subpath but stays
optional, since a client app has no `auth()` of its own; the Auth provider stands when the app's
server has auth ([Provider order](#provider-order)).

`@better-auth/expo`'s client statically imports `expo-constants` and `expo-linking` and dynamically
imports `expo-network` and `expo-web-browser`. They are optional peers there, but Metro bundles every
import, dynamic ones included, so a native consumer cannot bundle without them: they are among the
plugin's `dependencies`, which the consumer declares ([Native client](./auth.md#native-client)).

## What it contributes

- `.stack/global.css`: the uniwind entry stylesheet ([Stylesheet](#stylesheet)).
- `withUniwindConfig` around the Metro config, pointing at `.stack/global.css` and
  `.stack/uniwind-types.d.ts`. It must wrap every other Metro plugin (uniwind's requirement); Metro
  wrappers apply ascending by `order`, so it takes the highest, `order: 100`, and is applied last,
  outermost.
- An `expo-font` config plugin embedding the `fonts` files, when there are any.
- The provider stack around the expo-router root ([Provider order](#provider-order)).
- `.stack/native-auth.ts`: the resolved `scheme` and `cookiePrefix` ([Native auth client](#native-auth-client)).
- `.stack/native-theme.ts`, imported by the entry ([Theme startup](#theme-startup)).
- The page for an address no route serves (`lib/not-found`, the module `expo.slots.notFoundRoute`
  names). `stack generate` writes it into the routes directory as `+not-found.tsx`, a re-export, only
  while the app has no `+not-found` route of its own ([Routes](./expo.md#routes)). It stands where
  expo-router stands a route: inside the root layout's `Shell` when the layout draws one, alone when
  it does not. Under a record's `Pane` it is the missing sentence in that Pane's body; elsewhere
  under a `Shell` a record's `Pane` titled "Not found" with the missing shape; outside one a `Gate`
  with Back.
- `uniwind/types` in the consumer's tsconfig `types` ([Type-checking](#type-checking)).

## Generated files

The uniwind entry stylesheet and its build-time type output both land under `.stack/`, which is
gitignored. The Metro wrapper paths resolve relative to Metro's `projectRoot`, the consumer root
(plugin-expo's generated `metro.config`, [Generated files](./expo.md#generated-files)), so they point
back into `.stack/`. The stylesheet's own `@source` roots stay relative to the file in `.stack/`
(`../src`).

## Stylesheet

uniwind scans for class names from the stylesheet's directory, so without `@source` roots it sees
only `.stack/`. The roots, relative to `global.css` in `.stack/`, name the consumer's `src`, this
plugin's `src` and ui-core's `src`, where the matrix cell strings live: a dependency package is never
scanned unless named.

Both `@variant` blocks carry every per-mode value (the colours and the two shadows, by full
custom-property name), so the variable sets are equal by construction and uniwind's equal-set check
never fires on the output. There is no `color-scheme` declaration: `Appearance` sync is uniwind's job
through `setTheme`, and a non-var declaration inside a `@variant` block is discovered and ignored.

Native declares some utilities itself, as top-level `@utility` blocks. `--shadow-*` is one of the
reset namespaces ([Tailwind reset](../ui-core/tokens.md#tailwind-reset)), so the elevation ladder
ships here, each level reading its mode's variable. `tabular-nums` is redeclared plain: Tailwind
composes `font-variant-numeric` from unset `--tw-*` variables, which uniwind (from 1.11) resolves to
empty `fontVariant` tokens that React Native logs as unsupported.

## Theme startup

`.stack/native-theme.ts` applies the theme's `defaultMode`, `loading`, `radius` and `size` once at
startup:

- `Uniwind.setTheme(defaultMode)`: the mode a viewer starts in until the app sets another, ahead of
  the system's.
- `setLoading`: the glyph slots the app waits in the scramble; a slot left out pulses.
- `setRoomKnobs`: the room's knobs, when `radius` or `size` is not the default. The density sets
  carry theirs in the stylesheet.

With none of them there is no file and uniwind follows the system. uniwind theming is CSS-first, so
there is no theme provider to mount. `lib/theme` switches the active theme at run time: setting
`light` or `dark` also drives React Native's `Appearance`, so native dialogs match, and `system`
turns adaptive theming back on.

## Provider order

`.stack/entry.tsx` composes the providers around `<ExpoRoot>`, outer to inner by `order`:
`GestureHandlerRootView` → `KeyboardProvider` → `SafeAreaProvider` → `WordsProvider` (only when
`words` is set) → `QueryProvider` → `AuthProvider` → `BottomSheetModalProvider`.

- `GestureHandlerRootView` is outermost.
- The gorhom bottom-sheet modal host is innermost, inside the gesture and safe-area context: gorhom
  draws a sheet's content in its host, outside the screen that opened it, so every context a sheet
  body reads (words, Query, Auth) wraps the host. It hosts the sheets of the screens with no `Shell`;
  a `Shell` holds its own ([Frame host](#frame-host)).
- The Auth provider stands with `auth()` in the config (the app owns the server's auth), with a
  client module the app names, or, in a client of a server with auth, with the default client module
  the app wrote.
- There is no theme provider: uniwind theming is CSS-first (a global `Uniwind.setTheme`), never
  context-based.

`AppProviders` (`./app`) composes the UI half of the same stack for use outside the generated entry
(tests, a screenshot harness); the entry adds Auth and Query through plugin-expo's `providers` slot.

## Native clients in src/lib

The consumer configures the native clients in `src/lib/`. The provider defaults point at that
convention: the generated entry imports `queryClient` and `authClient` from `src/lib/query.ts` and
`src/lib/auth.ts`, paths relative to `.stack/entry.tsx`. Without those files the app does not
compile, so the plugin seeds editable starters, copy-once like the auth callback file. A consumer
with another layout points a provider at its own module with `queryClientModule` or
`authClientModule` (a `{ source, export }` resolved relative to `.stack/`), and that path skips the
starter: the module is the consumer's to own. A client app writes its own `src/lib/auth.ts`; no
scaffold stands for an app with no `auth()`.

## Native auth client

`.stack/native-auth.ts` holds the constants the scaffolded `src/lib/auth.ts` imports: `scheme` and
`cookiePrefix`, generated so they always match the deep-link scheme expo bakes into the app config
and the worker's session-cookie prefix ([Cookie prefix](./auth.md#cookie-prefix)). A hand-copied
literal fails silently on a mismatch: the client filters `Set-Cookie` by prefix, so every sign-in
succeeds on the server while the device never persists the session.

The scaffolded client (`templates/lib-auth.ts`, as the phone app's `apps/phone/src/lib/auth.ts`) is
wired into the app by `<AuthProvider>`. The one value set by hand is the deployed API worker's URL,
`EXPO_PUBLIC_API_URL` in `.env` (Expo's
[environment variables](https://docs.expo.dev/guides/environment-variables/)); the localhost
fallback targets the local worker during development.

## Phone app

The phone app (`apps/phone/src/lib/api.ts`) imports the emitted worker's router type type-only, so
no worker code (or its Node or Workers-only dependencies) enters the app bundle. The app's
type-check reads it from the worker project's declarations (`.stack/types/`), so no worker source
enters that either ([Client](./api.md#client)).

## Type-checking

The plugin ships source, never declarations, and the consumer compiles its `.tsx` directly, so
uniwind's global augmentation (`className` and the per-prop `*ClassName` variants) loads wherever the
plugin's source is type-checked. The plugin contributes `uniwind/types` to `cliSlots.tsconfigTypes`,
which `stack init`'s tsconfig template reads; the plugin's own presence is the gate, so a plain Expo
consumer without `nativeUi()` gets no dangling type reference
([TypeScript projects](../consumer-project.md#typescript-projects)).

Because the consumer's type-check follows this source, a module the consumer reaches has no relative
import with a `.ts` specifier, which fails it. `lib/facts` is such a module: the words of a line of
facts and the badges a list of facts draws, free of any view so a test (`facts.test.ts`) holds the
structure of what is drawn.

## Components

Every props type extends `Closed` (`./lib/closed`): `class`, `className`, `classList`, `style` and
uniwind's per-prop class channels as `?: never`. The first four are the ones the canon closes on both
platforms ([closed props](../ui-core/roster.md#the-canon-and-the-closed-props)); the
per-prop channels uniwind adds to React Native's hosts would reopen the look one property at a time.
A look the matrices do not cover is a matrix cell in ui-core or a primitive under the app's `ui/`,
never a prop. The prop names are the roster in `@fcalell/ui-core/roster`. Inside a component, a
class sits only on a `View`, `Pressable`, `ScrollView` or `Animated.View` and carries layout
plumbing; nothing carries a product noun in a prop, an enum word or a string.

`Image`'s full view is the sheet base's `view` form: a gorhom modal at the screen's height inside the
safe area, with no handle, ground, body or foot, so a sheet's chrome never takes the picture's room.
It stands under the toasts like every sheet, and it draws the picture contain-fit with no pinch-zoom.

### Gate

`Gate` is the frame of a page outside the shell, a sign-in or a consent step
([Gate](../ui-core/layout.md#gate)): the banner, the product's mark, an optional step count, the
title, the description and the body in one column at the `auth` width inside the page inset,
scrolling over the keyboard (`Scroll`) and keeping the safe area. It mounts the same `FrameHost` as
the `Shell` and hands `FieldClaim` to its body ([Focus claims](#focus-claims)). Its `form` (a
`Form`'s props, over the step's procedure) is drawn in the column by the Gate
(`components/form/base`, `in` the auth column), its bar set `full`.

## Phone components

What each of these draws as a frame of its read (the failed shape with Retry, the missing and empty
shapes, the stale and paused line) is [What a frame draws](../ui-core/reads.md#what-a-frame-draws);
the shared contract of each is its section of [components](../ui-core/components.md). This holds
what the phone draws itself.

### Bar chart

The total (the bars' span with `level`) stands at body 500 with its unit, the parts' keys under it,
then the axis beside the plot: four gridlines a hairline each, its tick centred on each, and the
baseline with its 0. The columns in the chip marks by part, each bar in its slot of the plot
([Slots](../ui-core/components.md#slots)). The first bar's time is centred under the first bar and
the last bar's under the last, each kept whole inside the plot; the times between stand at evenly
spaced strides (`timeRoom`), each drawn where its room holds `TIME_ROOM` times the longest time
([Time labels](../ui-core/components.md#time-labels)). A chart given `bar.label` names its bars there
instead, each name centred under its bar, every one where the names fit and every second, third one
where they would touch (`axisStride`). With `level`, a span that is one reading draws no figure, and
each reading is a dot against an axis around the readings (`levelScale`,
[Axis](../ui-core/components.md#axis)), the baseline's tick its floor. While the read waits, the
total is a figure's filler, the legend stands (its names and marks declared, its figures painted),
the plot is one painted box at its loaded height with the axis's lane kept, and the time line is two
fillers, the chart inert. A bar given `bar.partial` (its period not over) is drawn hatched (`Hatch`),
and one given `bar.selected` (its record open beside the chart) stands in the selection wash.

### Diff

A unified diff at the code role, in the frame `Code` shares
([Code and Diff](../ui-core/components.md#code-and-diff)): added lines on `ok-soft` and removed on
`danger-soft`, the whole row, each with its `+` or `−` marker. The phone draws one number column, the
new side or the only one (`numbersAt`). No hunk header's ranges are drawn: where lines go unshown
(before a first hunk that starts past line 1, between two hunks) an elided band stands on the group
ground, its mark (`┆`) in the marker's column and, in the code's, the words ("12 lines not shown"
where the numbers count them, else "Lines not shown") and the function git names after the ranges, a
middle dot apart. A long line wraps at its spaces and between tokens, under itself at its own
indent: React Native has no text indent, so a wrapped line hangs no further. The frame is a list
named by `label`, since the phone has no table.

### Table

From `tablet` of the window the table is a grid: a header of sort acts over one row per record, every
column at the short measure, scrolling sideways under its frozen leading column. A press on a row
opens it, and a press on an editable value edits it in place, typed in an `Input`. Below `tablet` it
is one `RowItem` per record under the sort's pick, and the waiting paint is the same records as its
rows. The sort cycle is [Sort](../ui-core/components.md#sort).

### Thread

The messages stand a sections gap apart, one rung above a reply's block gap, and the input a
sections gap under them. The thread fills what it stands in (a Pane's body) by plain flex: the log
scrolls inside it at the Pane's inset, opening at the newest message and following each that arrives
while the reader is at the end, the input docked at the foot over the keyboard. While the reader is
scrolled up, a Latest act floats centred above the foot and returns to the newest message. With
`replying` set, one waiting `Message` of the other author follows the messages, followed as any
message is and replaced in place when the reply's item arrives. The rest is
[Thread](../ui-core/components.md#thread).

### Stats meter

The meter form of a bound stat (`parts/stats/meter.tsx`, outside the package's exports) is a cell
like the plain one: the label in meta, wrapping at its words, the share in percent as its figure
under it, and the bar under them filling by the share in the meta ink, amber once near full and
`danger` once over; a `goal` draws the meta ink short of it and the good tone once reached
([Stats meter](../ui-core/components.md#stats-meter)). The line under the bar is the `line`, or the
counts as links. Once its read ended the meter stands empty (no share, no fill) in the same box; a
failed read keeps the label, shows the failure mark and the retry icon in the share slot, reads
"This didn't load." under the bar, and a press retries. React Native has no meter role, so it is a
progress bar.

## Raised grounds and room

A raised ground re-points the hairline as the web's does. Native has no selector, so each raised
surface wraps its content in `RaisedGround` (`lib/raised`), which scopes `--color-edge` to the mode's
`edge-raised` through uniwind's `ScopedVariables` for the grounds in `RAISED_GROUNDS`. A part's
`border-edge` inside a sheet (its head, body and foot, a `Menu`'s and a Picker's sheet with it) or a
toast draws the raised hairline. A ground on `group` holds no part that draws `edge`, so none wraps
it. A banner's tone is a soft ground: `SoftGround` scopes `--color-edge` to `edge-strong`, so the
banner's act draws an edge on the tint. A scoped variable on native takes a value, never a `var()`,
so each scope declares the variable and the one it reads, and resolves the read in the active mode.
The token side is [Edges](../ui-core/tokens.md#edges).

`lib/room` sets the room set for everything inside it: each variable the web's room scope declares
as a `calc` over its unit is here its canvas units times the unit of the window, since a scoped
variable takes a value and never an expression. The scope follows the window, so a rotation or a
resize rescales it ([density and room](../ui-core/tokens.md#density-and-room)).

## Ink

`Ink` (`lib/ink`) is the ink of the place a glyph or a spinner sits in: the native form of the web's
`currentColor`, which a React Native view never inherits. The place that draws an ink (a labelled
act, an icon act) provides it; elsewhere it is unset and each atom keeps its own. The number every
`Count` and every `Button`'s count renders (`parts/count/base`, outside the package's exports) takes
`inAct` to draw in the act's ink, never the muted one: a text takes no `currentColor`, so the ink the
button provides is resolved and set. `painted` is the number while its data is not here, a figure's
filler.

## Frame host

A root frame (the `Shell`, the `Gate`) mounts `FrameHost` (`components/shell/host.tsx`, outside the
package's exports) around itself:

- the sheets' provider, the nearest one every sheet inside resolves, which draws the sheets after the
  frame;
- the `confirm()` decisions, as a sheet;
- the toast queue. `toast()` is called from anywhere and the `Shell` renders the queue. The queue is
  client-owned, so a toast's act is a route or a retry, never an undo. `tone` says how the act it
  reports ended (`failed` for a refused edit, `done`, the default, for a finished one).

The toasts' layer stands after the provider's host view, so over every sheet, since React Native's
`zIndex` orders siblings only. Standing outside the page's tree, it takes the box the page draws (the
Pane's `ToastRoom`: its body over its docked foot and the tab bar) by measuring that box against the
frame's root; each layout of the box places the layer over it.

## Sheets

gorhom draws a sheet outside the tree that opens it, in its provider's host, so the sheet's contexts,
and the read port its body's leaves read through, start at the container it draws everything in. A
value a sheet's layer reads reaches it only when the modal itself re-renders, which is when gorhom
pushes the layer.

gorhom renders the head, the foot and the scrim each as an element type, so a new component identity
remounts its tree (a typing field in the head loses focus): the slots are module components reading
a context, never closures.

### Docked sheet

A docked foot's region hands the docked `Sheet` it draws:

- `height`: the region the foot shares with what stands over it (a `Thread`'s or a `Pane`'s `Lifted`
  column), read off that column's layout, since Yoga has no container units;
- `chrome`: the foot's own block padding and border;
- `logFloor`: what the region keeps for a log above the foot, zero where none shares it.

All are zero until the first layout. The region also holds a claim for the input that returns: a
docked `Sheet` leaving the region sets it, and the `Thread`'s composer that mounts in its place takes
focus and clears it (React runs the leaving tree's cleanups before the arriving tree's effects).

## Focus claims

A `Gate` or a docked `Sheet` sets `FieldClaim` (`lib/field`) around its body: the typing control of
the region that holds focus, if any. A typing control (an `Input` or a code `Input`) claims its
region's focus: it takes focus as it mounts when none holds it, and holds it for as long as it is
focused; its `onFocus` and `onBlur` join the control's own handlers. So the first field of a page, or
of a step that swaps in a fresh body, takes focus, and a second field beside it, or one revealed while
another is typed in, never does. A sheet's body is the sheet's own claim region; its provider stands
inside `SheetBase`'s children, which the bottom sheet portals out of the opener's tree.

## Routes and preload

A route on the phone is one of the app's expo-router paths (`lib/route`): with the app's route types
(`.stack/routes.d.ts`, [Routes](./expo.md#routes)) in its program, a path no route file serves fails
the type-check wherever a route is a prop or a descriptor's.

A press-in on a route starts the reads its screen is about to make (`lib/warm`): the route file's
`preload` export, which the binding calls with its client and the href's params, as a web route's
`loader` is. So the push finds the reads under way. One function serves every press, since each
route's `preload` is read from its file. A route with no `preload` and an external URL have nothing
to start. Navigation never waits on it, and one that fails to start does not stop it.

## Text breaks

`lib/code` draws runs as one text ([text runs](../ui-core/words.md#text-runs)): words, a `{ quoted }`
run in typographic quotes, a `{ strong }` run at strong weight in the meta role, and a `{ code }` run
in the mono, which never cuts in its middle. A code run takes the inline code style inside a sentence
(`fit` `span`, the default) and is bare where the runs are a name, a crumb or a row's line (`fit`
`name`). `whole` (a text read whole: a row's line, a description, a banner's sentence) gives a code
run a break after each path or URL separator (`codeWhole`), as the web's does, so a path wider than
its line breaks between segments. A nested `Text` draws its fill but no radius or padding: React
Native lays an inline run out as glyphs, never as a box.

`lib/bind` says where a text may and may not break, as the web draws it (`CodeBound`, `CodeWhole`, a
`Section` title's hyphens): the platform breaks a line after a hyphen and never before one, and a
long path or URL has no place to break but anywhere. A word joiner (U+2060) after a hyphen takes the
platform's break after it away, and before one takes the break before it away; a zero-width space
(U+200B) gives a break after a path's or URL's separator. These are only for a text drawn and never
selected: a copy act copies the source, so neither character leaves the screen. The functions are
pure strings, so a test reads them.

## Scope

The toasts' layer follows the page's box one layout late (a growing foot, the keyboard), because it
is placed by measuring and React Native cannot stand a layer after the sheets' host from the page's
tree. The upgrade is to place it by layout once React Native can, or once the sheets host the toasts.

## In the code

- `plugins/native-ui/src/index.ts`: the plugin, its requires, providers, generated files and scaffolds.
- `plugins/native-ui/src/types.ts`: the options, the client module shape.
- `plugins/native-ui/src/node/theme.ts`: the uniwind stylesheet's variants and utilities.
- `plugins/native-ui/src/node/codegen.ts`: `.stack/global.css` and its `@source` roots.
- `plugins/native-ui/templates/lib-auth.ts`: the scaffolded native auth client.
- `plugins/native-ui/src/ui/app/index.tsx`: `AppProviders`.
- `plugins/native-ui/src/ui/lib/closed.ts`: `Closed`.
- `plugins/native-ui/src/ui/lib/theme.ts`: switching the active theme.
- `plugins/native-ui/src/ui/lib/raised.tsx`: `RaisedGround` and `SoftGround`.
- `plugins/native-ui/src/ui/lib/room.tsx`: the room scope.
- `plugins/native-ui/src/ui/lib/ink.ts`: `Ink`.
- `plugins/native-ui/src/ui/parts/count/base.tsx`: the count number.
- `plugins/native-ui/src/ui/components/shell/host.tsx`: `FrameHost`.
- `plugins/native-ui/src/ui/lib/frame.ts`: the toasts' placement and the docked foot region.
- `plugins/native-ui/src/ui/lib/toast.ts`: the toast queue.
- `plugins/native-ui/src/ui/components/sheet/layer.tsx`: the sheet layer and its slots.
- `plugins/native-ui/src/ui/components/sheet/index.tsx`: the sheet and its body's claim region.
- `plugins/native-ui/src/ui/lib/field.ts`: `FieldClaim` and a typing control's claim.
- `plugins/native-ui/src/ui/lib/route.ts`: the phone's route type.
- `plugins/native-ui/src/ui/lib/navigate.ts`: a press on a route.
- `plugins/native-ui/src/ui/lib/warm.ts`: starting a route's `preload`.
- `plugins/native-ui/src/ui/lib/code.tsx`: runs as one text.
- `plugins/native-ui/src/ui/lib/bind.ts`: break characters.
- `plugins/native-ui/src/ui/lib/facts.ts`: a line of facts, free of any view.
- `plugins/native-ui/src/ui/lib/not-found.tsx`: the not-found page.
- `plugins/native-ui/src/ui/components/bar-chart/index.tsx`, `diff/index.tsx`, `table/index.tsx`, `thread/index.tsx`: the phone's charts, diffs, tables and threads.
- `plugins/native-ui/src/ui/parts/stats/meter.tsx`: the meter form of a stat.
- `apps/phone/src/lib/auth.ts`, `apps/phone/src/lib/api.ts`: the phone app's clients.
