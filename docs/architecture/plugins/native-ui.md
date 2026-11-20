# native-ui plugin

`@slotform/native-ui` is the phone half of the design system: it renders `@slotform/ui-core`'s
contract into the uniwind stylesheet, embeds the font files, composes the app's providers around the
expo-router root, generates the native auth constants and scaffolds the native clients, and ships
the phone roster on React Native. This page holds how the plugin and its components are built. How a
consumer builds a screen with it is the guide (`plugins/native-ui/guide/`); the slots it owns are in
the [slot catalog](../slot-catalog.md#nativeuislots-the-native-ui-plugin).

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
The [update wall](#update-wall) imports `expo-constants` itself, so it is a peer too.

`@legendapp/list` is a dependency, not a peer: it is JavaScript only, with `react` its one peer, so a
consumer has nothing of its own to resolve ([releasing](../releasing.md#peers-one-copy-of-each-slotform-package)).
It windows the phone's long collections ([Long collections](#long-collections)).

## What it contributes

- `.slotform/global.css`: the uniwind entry stylesheet ([Stylesheet](#stylesheet)).
- `withUniwindConfig` around the Metro config, pointing at `.slotform/global.css` and
  `.slotform/uniwind-types.d.ts`. It must wrap every other Metro plugin (uniwind's requirement); Metro
  wrappers apply ascending by `order`, so it takes the highest, `order: 100`, and is applied last,
  outermost.
- An `expo-font` config plugin embedding the `fonts` files, when there are any.
- The provider stack around the expo-router root ([Provider order](#provider-order)).
- `.slotform/native-auth.ts`: the resolved `scheme` and `cookiePrefix` ([Native auth client](#native-auth-client)).
- `.slotform/native-theme.ts`, imported by the entry ([Theme startup](#theme-startup)).
- The page for an address no route serves (`lib/not-found`, the module `expo.slots.notFoundRoute`
  names). `slotform generate` writes it into the routes directory as `+not-found.tsx`, a re-export, only
  while the app has no `+not-found` route of its own ([Routes](./expo.md#routes)). It stands where
  expo-router stands a route: inside the root layout's `Shell` when the layout draws one, alone when
  it does not. Under a `Shell` it is a record's `Pane` titled "Not found" with the missing shape;
  outside one it is a `Gate` with Back.
- `uniwind/types` in the consumer's tsconfig `types` ([Type-checking](#type-checking)).

## Generated files

The uniwind entry stylesheet and its build-time type output both land under `.slotform/`, which is
gitignored. The Metro wrapper paths resolve relative to Metro's `projectRoot`, the consumer root
(the `expo` plugin's generated `metro.config`, [Generated files](./expo.md#generated-files)), so they point
back into `.slotform/`. The stylesheet's own `@source` roots stay relative to the file in `.slotform/`
(`../src`).

## Stylesheet

uniwind scans for class names from the stylesheet's directory, so without `@source` roots it sees
only `.slotform/`. The roots, relative to `global.css` in `.slotform/`, name the consumer's `src`, this
plugin's `src` and ui-core's `src`, where the matrix class-set strings live: a dependency package is never
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

`.slotform/native-theme.ts` applies the theme's `defaultMode`, `loading`, `radius` and `size` once at
startup:

- `Uniwind.setTheme(defaultMode)`: the mode a viewer starts in until the app sets another, ahead of
  the system's.
- `setLoading`: the glyph regions the app waits in the scramble; a region left out pulses.
- `setRoomKnobs`: the room's knobs, when `radius` or `size` is not the default. The density sets
  carry theirs in the stylesheet.

With none of them there is no file and uniwind follows the system. uniwind theming is CSS-first, so
there is no theme provider to mount. `lib/theme` switches the active theme at run time: setting
`light` or `dark` also drives React Native's `Appearance`, so native dialogs match, and `system`
turns adaptive theming back on.

## Provider order

`.slotform/entry.tsx` composes the providers around `<ExpoRoot>`, outer to inner by `order`:
`GestureHandlerRootView` → `KeyboardProvider` → `SafeAreaProvider` → `WordsProvider` (only when
`words` is set) → `QueryProvider` → `AuthProvider` → `UpdateWall` → `BottomSheetModalProvider`.

- `GestureHandlerRootView` is outermost.
- The gorhom bottom-sheet modal host is innermost, inside the gesture and safe-area context: gorhom
  draws a sheet's content in its host, outside the screen that opened it, so every context a sheet
  body reads (words, Query, Auth) wraps the host. It hosts the sheets of the screens with no `Shell`;
  a `Shell` holds its own ([Container host](#container-host)).
- The Auth provider stands with `auth()` in the config (the app owns the server's auth), with a
  client module the app names, or, in a client of a server with auth, with the default client module
  the app wrote.
- There is no theme provider: uniwind theming is CSS-first (a global `Uniwind.setTheme`), never
  context-based.

## Update wall

`UpdateWall` (`lib/update-wall`, `order: 28`) is the provider that draws the version gate's wall
([version gate](./expo.md#version-gate)). It subscribes to `onUpdateRequired` from
`@slotform/expo/client` and draws the app until the first `426`. From then on it draws a
`Gate` in the app's place until the app restarts: the closed words `updateRequired` as its title,
`updateFromStore` as its sentence, and one act, `update`, that opens the platform's store URL with
`Linking.openURL`. The URL is `ios.appStoreUrl` or `android.playStoreUrl` read from
`Constants.expoConfig`; with none for the platform, the Gate draws the sentence and no act.

- **In place of the app.** The wall replaces the expo-router root, so the Shell, every sheet and every
  toast are unmounted with it and nothing behind it runs or takes a press. Its `Gate` mounts its own
  `ContainerHost`. The act is a labelled `Button` with `onAct`, never an `href`: a route link reads
  expo-router's context, which no longer stands above the wall.
- **Inside the context it reads.** It stands inside `WordsProvider`, so a consumer's words reach it,
  and inside the gesture, keyboard and safe-area providers the Gate draws in.
- **Always contributed.** A build carries the wall whether or not the worker has a floor, so a floor
  raised later walls builds already in the stores.

## Native clients in src/lib

The consumer configures the native clients in `src/lib/`. The provider defaults point at that
convention: the generated entry imports `queryClient` and `authClient` from `src/lib/query.ts` and
`src/lib/auth.ts`, paths relative to `.slotform/entry.tsx`. Without those files the app does not
compile, so the plugin seeds editable starters, copy-once like the auth callback file. A consumer
with another layout points a provider at its own module with `queryClientModule` or
`authClientModule` (a `{ source, export }` resolved relative to `.slotform/`), and that path skips the
starter: the module is the consumer's to own. A client app writes its own `src/lib/auth.ts`; no
scaffold stands for an app with no `auth()`.

## Native auth client

`.slotform/native-auth.ts` holds the constants the scaffolded `src/lib/auth.ts` imports: `scheme` and
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

The phone app (`apps/phone/src/lib/api.ts`) builds its client as the
[API client guide](../../../plugins/expo/guide/api-client.md) states.

## Type-checking

The plugin ships source, never declarations, and the consumer compiles its `.tsx` directly, so
uniwind's global augmentation (`className` and the per-prop `*ClassName` variants) loads wherever the
plugin's source is type-checked. The plugin contributes `uniwind/types` to `cliSlots.tsconfigTypes`,
which `slotform init`'s tsconfig template reads; the plugin's own presence is the gate, so a plain Expo
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
A look the matrices do not cover is a matrix class set in ui-core or a primitive under the app's `ui/`,
never a prop. The prop names are the roster in `@slotform/ui-core/roster`. Inside a component a class
follows the consumer's rule ([classes are geometry, on hosts only](../../../plugins/native-ui/guide/rules.md#classes-are-geometry-on-hosts-only)),
and nothing carries a product noun in a prop, an enum word or a string.

`Image`'s full view is the sheet base's `view` form: a gorhom modal at the screen's height inside the
safe area, with no handle, ground, body or foot, so a sheet's chrome never takes the picture's space.
It stands under the toasts like every sheet, and it draws the picture contain-fit with no pinch-zoom.

### Gate

`Gate` is the container of a page outside the shell, a sign-in or a consent step
([Gate](../ui-core/layout.md#gate)): the banner, the product's lockup, an optional step count, the
title, the description and the body in one column at the `auth` width inside the page inset,
scrolling over the keyboard (`Scroll`) and keeping the safe area. It mounts the same `ContainerHost` as
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
baseline with its 0. The columns in the chip marks by part, each bar in its region of the plot
([Regions](../ui-core/components.md#regions)). The first bar's time is centred under the first bar and
the last bar's under the last, each kept whole inside the plot; the times between stand at evenly
spaced strides (`timeSpace`), each drawn where its space holds `TIME_SPACE` times the longest time
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
ground (its mark and words are in `packages/ui-core/src/roster/diff.ts`). A long line wraps at its spaces and between tokens, under itself at its own
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
sections gap under them. The thread fills what it stands in (a Pane's body) by plain flex (`FILL`),
and the log is a LegendList inside it at the Pane's inset, oldest message first. It opens at the
newest message (`initialScrollAtEnd`), and a short log stands at the bottom (`alignItemsAtEnd`).
While the reader is at the end the log follows each arrival, a streaming reply's growth and the
keyboard's resize (`maintainScrollAtEnd`, whose edge is
`AT_END`). A reader scrolled up keeps their place. While the reader is more than `AT_END` from the
end, the Latest act floats centred above the foot and `scrollToEnd`s. With `replying` set, one
waiting `Message` of the other author follows the messages, followed as any message is and
replaced in place when the reply's item arrives. The turn being written is the list's footer, which
`maintainScrollAtEnd` follows as it grows. The failed, missing and empty shapes are the list's empty
component. The rest is
[Thread](../ui-core/components.md#thread).

A document or photo picker that fails draws the closed word `pickFailed`: the file `Input` shows it as
the field's error line, and the composer toasts it.

### Stats meter

The meter form of a bound stat (`atoms/stats/meter.tsx`, outside the package's exports) is a cell
like the plain one: the label in meta, wrapping at its words, the share in percent as its figure
under it, and the bar under them filling by the share in the meta ink, amber once near full and
`danger` once over; a `goal` draws the meta ink short of it and the good tone once reached
([Stats meter](../ui-core/components.md#stats-meter)). The line under the bar is the `line`, or the
counts as links; the `line` paints only while its own read waits, a constant one standing as given while the meter paints. Once its read ended the meter stands empty (no share, no fill) in the same box; a
failed read keeps the label, shows the failure mark and the retry icon in the share region, reads
"This didn't load." under the bar, and a press retries. React Native has no meter role, so it is a
progress bar.

### Waveform

An `Svg` of the web's columns under a played layer clipped to the playhead's share, dragged and
stepped as the `Slider` is: [Waveform](../ui-core/sound.md#waveform).

## Long collections

A collection windows on the phone where it owns a scroll: it mounts only the rows near the view, and
LegendList (`@legendapp/list/react-native`, through `List` in `lib/hosts.tsx`) places and measures
them. LegendList windows only against its own scroll view and never against a parent's: on React
Native it reads its visible length from its own layout and its offset from its own scroll events
(`scrollElement` and `useWindowScroll` resolve only on the web), so a collection that shares the
Pane's scroll with other parts draws every row.

- **Which collections.** A `Thread`'s log always windows. A Picker's sheet windows once it is `tall`
  (past `SEARCH_PAST` options, where it searches). A `Section`'s rows and a `Table`'s rows below
  `tablet` window when they stand alone in their Pane (below). The rows grid from `tablet`, a
  `Gallery`, a `Picker` at `fit: list`, a `BarChart` and every collection that shares the body draw
  whole ([Scope](#scope)).
- **Standing alone.** A Pane whose children are one `Section` element with `items` or one `Table`
  element, and that has no `record` head, tells that part it stands alone (`BodyAlone`, `lib/container.ts`). Only the
  element itself counts: a Section inside `Columns` or a card, or a consumer component that returns
  a Section, is not told, so it never takes the height its siblings need. The part takes the body's
  free height by plain flex (`FILL`, `lib/hosts.tsx`), as a Thread does. The Pane's `Scroll` stays
  around it, and its content then fits the view, so only the list scrolls. A Section that stands
  alone keeps its head and picks line over its card. The card is the list's box: it hugs a short
  list and is bounded by the body for a long one, and the rows scroll inside its clip. A Table keeps
  its sort pick over the rows. Either one, standing beside any other part, draws its rows whole in
  the Pane's scroll. A sheet one of its rows opens is told nothing: gorhom draws it outside
  the providers above it ([Sheets](#sheets)).
- **Rows.** The list's data is the sheet's entries (`sheetEntries`, `@slotform/ui-core/list-state`):
  rows, bands and a tree's flattened children, each with its key, its kind (`getItemType`) and
  whether the card's hairline stands above it, so a row draws the same wherever it is mounted.
  `keyExtractor` is the entry's key. Rows are not recycled (`recycleItems={false}`, set once in
  `List`: an omitted prop logs a dev warning), so a row's state is its own and each mount is a fresh
  row. A row's first size is the `row` spacing (`estimatedItemSize`, read from the theme where the
  list stands), and every row is measured from then on.
- **Paging.** The more row is the rows' foot, the list's footer when they window. A windowed list
  with at least `VIRTUAL_FROM` loaded entries fetches its next page itself once the rows it mounts
  reach its last entry, as the web does ([paging](../ui-core/reads.md#paging)). The list reports its
  mounted range through `onViewableItemsChanged`, which fires when the viewable set changes:
  `endBuffered`, the last index it mounts (view plus draw distance), goes into `useReach`'s `onLast`,
  and the hook's `reached` reaches the foot's `MoreRow` as `scrolled`. `onEndReached` goes unused:
  it measures in fractions of the screen (`onEndReachedThreshold`), and the rule is said once, in row
  indices (`reachesEnd`). A shorter list, and a Section or Table that shares its Pane's scroll,
  keep the "Show more" press. The painted next page stands in the footer and never windows, since it
  holds fewer than `VIRTUAL_FROM` rows.
- **Painted rows.** A waiting collection paints `min(last loaded, VIRTUAL_FROM - 1)` rows, inside
  the list when the collection windows.
- **Arrivals.** A row that arrived after the first draw fades in as it mounts (`useArrivals`). A row
  that mounts by scrolling is already known and does not fade.
- **Keyboard.** No windowed list is keyboard-aware itself. The Pane's and the Thread's `Lifted`
  column lifts the list and the docked foot over the keyboard, as it lifts the body, and no windowed
  row holds a text field. `KeyboardAwareLegendList` (`@legendapp/list/keyboard`, which needs
  keyboard-controller 1.21.7 or later) goes unused: its `KeyboardChatScrollView` lifts the content
  for the keyboard itself, which inside `Lifted` would lift it a second time.
- **Sheets.** A tall Picker sheet's body is the list itself. A `tall` `SheetLayer` drops its
  `BottomSheetScrollView`, and the list scrolls through gorhom's `useBottomSheetScrollableCreator()`
  (`renderScrollComponent`), so a drag on the rows moves the sheet as a drag on any sheet body does;
  gorhom takes one scrollable per sheet. The group labels are entries and so are the options
  (`optionRows`, `@slotform/ui-core/pick`), the same rows a short sheet draws whole. "No matches" is
  the list's empty component and the sheet's act is its footer. A tall sheet stands at `FULL`, so
  gorhom never sizes it from the list's estimated height.

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
`Count` and every `Button`'s count renders (`atoms/count/base`, outside the package's exports) takes
`inAct` to draw in the act's ink, never the muted one: a text takes no `currentColor`, so the ink the
button provides is resolved and set. `painted` is the number while its data is not here, a figure's
filler.

## Container host

A root container (the `Shell`, the `Gate`) mounts `ContainerHost` (`components/shell/host.tsx`, outside the
package's exports) around itself:

- the sheets' provider, the nearest one every sheet inside resolves, which draws the sheets after the
  container;
- the sheet outlet (`components/sheet/outlet.tsx`), inside the provider before the decisions: the
  sheets acts open, side by side in the order they opened, which the provider stacks as they are
  presented ([sheets an act opens](../ui-core/acts.md#sheets-an-act-opens));
- The `confirm()` decisions, as a sheet;
- the toast queue. `toast()` is called from anywhere and the `Shell` renders the queue. The queue is
  client-owned, so a toast's act is a route or a retry, never an undo. `tone` says how the act it
  reports ended (`failed` for a refused edit, `done`, the default, for a finished one).

The toasts' layer stands after the provider's host view, so over every sheet, since React Native's
`zIndex` orders siblings only. Standing outside the page's tree, it takes the box the page draws (the
Pane's `ToastSpace`: its body over its docked foot and the tab bar) by measuring that box against the
container's root; each layout of the box places the layer over it.

## Sheets

gorhom draws a sheet outside the tree that opens it, in its provider's host, so the sheet's contexts,
and the read port its body's leaves read through, start at the container it draws everything in. A
value a sheet's layer reads reaches it only when the modal itself re-renders, which is when gorhom
pushes the layer.

gorhom renders the head, the foot and the scrim each as an element type, so a new component identity
remounts its tree (a typing field in the head loses focus): the regions are module components reading
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
inside `SheetBase`'s children, which the bottom sheet portals out of the tree it is drawn in.

## Routes and preload

A route on the phone is one of the app's expo-router paths (`lib/route`): with the app's route types
(`.slotform/routes.d.ts`, [Routes](./expo.md#routes)) in its program, a path no route file serves fails
the type-check wherever a route is a prop or a descriptor's.

A press-in on a route starts the reads its screen is about to make (`lib/warm`): the route file's
`preload` export, which the binding calls with its client and the href's params, as a web route's
`loader` is. So the push finds the reads under way. One function serves every press, since each
route's `preload` is read from its file. A route with no `preload` and an external URL have nothing
to start. Navigation never waits on it, and one that fails to start does not stop it.

The route tree a press walks and a `Pane`'s back target (the nearest path above that a route
serves) come from expo-router's match of an href, which it exports no public way to read. `lib/navigate`
reads it as expo-router's own link preview does, through two modules of its build:
`expo-router/build/global-state/routerConfigContext` (`RouterConfigContext`, the route tree and the
linking config its root provides) and `expo-router/build/link/getStateForHref`. A minor of
expo-router can move either, so the peer and every manifest hold expo-router to the SDK's
`~58.0.x`. The context exists only under `ExpoRoot`; a route link or a `Pane` drawn outside it
throws, a mounting mistake.

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

- The tablet Table grid draws its rows whole: its frozen leading column and its sideways cells are two
  columns, which would need two lists kept in step. That cost is not paid.
- A `Gallery` draws whole: its wrapping tiles would need `numColumns` and aspect sizing, which are
  unbuilt.
- A Section or Table that does not stand alone in its Pane draws whole: LegendList windows only against
  its own scroll ([Long collections](#long-collections)).

The toasts' layer follows the page's box one layout late (a growing foot, the keyboard), because it
is placed by measuring and React Native cannot stand a layer after the sheets' host from the page's
tree. The upgrade is to place it by layout once React Native can, or once the sheets host the toasts.

## In the code

- `plugins/native-ui/src/index.ts`: the plugin, its requires, providers, generated files and scaffolds.
- `plugins/native-ui/src/ui/lib/update-wall.tsx`: the update wall.
- `plugins/native-ui/src/types.ts`: the options, the client module shape.
- `plugins/native-ui/src/node/theme.ts`: the uniwind stylesheet's variants and utilities.
- `plugins/native-ui/src/node/codegen.ts`: `.slotform/global.css` and its `@source` roots.
- `plugins/native-ui/templates/lib-auth.ts`: the scaffolded native auth client.
- `plugins/native-ui/src/ui/lib/closed.ts`: `Closed`.
- `plugins/native-ui/src/ui/lib/theme.ts`: switching the active theme.
- `plugins/native-ui/src/ui/lib/raised.tsx`: `RaisedGround` and `SoftGround`.
- `plugins/native-ui/src/ui/lib/room.tsx`: the room scope.
- `plugins/native-ui/src/ui/lib/ink.ts`: `Ink`.
- `plugins/native-ui/src/ui/atoms/count/base.tsx`: the count number.
- `plugins/native-ui/src/ui/components/shell/host.tsx`: `ContainerHost`.
- `plugins/native-ui/src/ui/lib/container.ts`: the toasts' placement, the docked foot region and `BodyAlone`.
- `plugins/native-ui/src/ui/lib/hosts.tsx`: `Scroll`, `Lifted`, `FILL` and `List`.
- `plugins/native-ui/src/ui/lib/toast.ts`: the toast queue.
- `plugins/native-ui/src/ui/components/sheet/layer.tsx`: the sheet layer, its regions and its body.
- `plugins/native-ui/src/ui/components/section/rows.tsx`: a Section's rows, whole or windowed.
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
- `plugins/native-ui/src/ui/atoms/stats/meter.tsx`: the meter form of a stat.
- `plugins/native-ui/src/ui/components/waveform/index.tsx`, `plugins/native-ui/src/ui/lib/adjustable.ts`: the phone's `Waveform`, and the track drag and screen-reader steps it shares with the `Slider`.
- `apps/phone/src/lib/auth.ts`, `apps/phone/src/lib/api.ts`: the phone app's clients.
