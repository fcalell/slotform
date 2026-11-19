# Consumer migration

How a consumer moves onto stack as it stands now: the Node floor, the check
that lists every import that no longer resolves, the imports that move, the renames, the behaviour
that changes, and what to run after. It covers a consumer pinned to any stack commit
before the plugin-query split. Moving the pin to a published version is
[consumer version move](consumer-version-move.md); the version rule is in
[releasing](../architecture/releasing.md#the-version-rule). A consumer is migrated in its own
repository, after stack, and stack never edits it.

## Before you start

- **Node.** Every stack package declares `engines.node` as `>=24.14.0`. The consumer's CI image,
  deploy image and local runtime are on 24.14 or later.
- **Peers.** Read each stack package's `peerDependencies` and match them. The ones that moved are
  Vite `^8`, MSW `^3` (plugin-screens), TypeScript 7, and for a phone app
  Expo SDK 58, React Native 0.88, React 19.3. Babel stays on 7.
- **One copy of each stack package.** The lockfile holds one version of each `@fcalell/*` package
  ([the count](../architecture/releasing.md#peers-one-copy-of-each-stack-package)).
- **The app's own vite.** `stack dev` and `stack build` fail with `VITE_NOT_INSTALLED` when the app
  does not list `vite` in its own dependencies.
- **The binding.** The read and act hooks reach data through a port that plugin-query provides. Add
  `@fcalell/plugin-query` and its peers (`@orpc/tanstack-query`, `@tanstack/react-query`) to
  the dependencies and `query()` after `api()` in `stack.config.ts`. A phone app also has
  native-ui, which requires `query`. Without the port every read hook throws on its first render;
  `useAttempt` alone works without one.
- **Measure first.** Install the new stack, then run the consumer's typecheck without changing a
  file. Every import that no longer resolves is a TypeScript error: TS2307 for a subpath that is
  gone, TS2305 or TS2724 for a name the target no longer exports. Group the errors by specifier
  to get the count per row of the tables below:

  ```sh
  pnpm exec tsc --noEmit | grep -E "TS(2307|2305|2724)" | grep -oE "@fcalell/[^\"']+" | sort | uniq -c | sort -rn
  ```

  A `.d.ts` that a package no longer ships also fails here. A rename that keeps its specifier and
  name changes nothing the compiler sees: a prop or a returned field (under Renames) is checked by
  reading the failing call sites.

## Imports that move

One row per old specifier and target; a list in the name column moves together under the same
names. A bare `@fcalell/plugin-api/tanstack-query` import is the largest break: it was the whole
client side of the api, and it splits into ui-core (the read model and the hooks) and plugin-query
(the TanStack binding). Rewrite one import statement per new specifier, `type` kept on a type-only
name.

### From plugin-api

| Old specifier | Old name | New specifier | New name |
| --- | --- | --- | --- |
| `@fcalell/plugin-api/tanstack-query` | `createQueryClient`, `ApiQueryUtils`, `createApiQueryUtils`, `scoped`, `QueryProvider`, `QueryProviderProps`, `useRead`, `useAbility`, `streamedQuery`, `QueryClient`, `QueryClientProvider`, `useInfiniteQuery`, `useMutation`, `useQuery`, `useQueryClient`, `useSuspenseQuery` | `@fcalell/plugin-query/tanstack-query` | same |
| `@fcalell/plugin-api/tanstack-query` | `useSelections`, `useDrawsFailure`, `usePainted`, `FrameHolds`, `useFrameRead`, `useWindow`, `useWindowMore` | `@fcalell/ui-core/react/read` | same |
| `@fcalell/plugin-api/tanstack-query` | `useMore` | `@fcalell/ui-core/react/port` | `usePort().useNextPage(read)` |
| `@fcalell/plugin-api/tanstack-query` | `Draft`, `useDraft` | `@fcalell/ui-core/react/acts` | same |
| `@fcalell/plugin-api/tanstack-query` | `Run`, `useRun` | `@fcalell/ui-core/react/acts` | `Attempt`, `useAttempt` |
| `@fcalell/plugin-api/tanstack-query` | `ScopeBoundary` | `@fcalell/ui-core/react/scope` | same |
| `@fcalell/plugin-api/tanstack-query` | `More`, `WindowView`, `Datum`, `Drawn`, `DrawnPhase`, `Fielded`, `Held`, `Holds`, `Lifted`, `QueryOf`, `Read`, `ReadHow`, `ReadKind`, `Selection`, `Sorting`, `WindowState`, `combine`, `isRead`, `isSelection`, `lift`, `moreOf`, `pagesOf`, `paints`, `sameQuery`, `sampleOf`, `windowOf` | `@fcalell/ui-core/read` | same |
| `@fcalell/plugin-api/tanstack-query` | `isPlaceholder` | `@fcalell/ui-core/read` | `isStandIn` |
| `@fcalell/plugin-api/tanstack-query` | `drew`, `Issue`, `isThenable` | `@fcalell/ui-core/acts` | same |
| `@fcalell/plugin-api/tanstack-query` | `heldAct`, `issues`, `refusal` | `@fcalell/plugin-query/acts` | same |
| `@fcalell/plugin-api/tanstack-query` | `read` | `@fcalell/plugin-query/read` | same |
| `@fcalell/plugin-api/tanstack-query` | `ability`, `PackedRulesLike` | `@fcalell/plugin-query/ability-client` | same |
| `@fcalell/plugin-api/tanstack-query` | `preload` | `@fcalell/plugin-query/preload` | same |
| `@fcalell/plugin-api/tanstack-query` | `QueryListeners` | `@fcalell/ui-core/listen` | same |
| `@fcalell/plugin-api/tanstack-query` | `ScopeIds` | `@fcalell/ui-core/scope` | same |
| `@fcalell/plugin-api/tanstack-query` | `RouterClient` | `@fcalell/plugin-api/client` | same |
| `@fcalell/plugin-api/read` | `Selection`, `ReadKind`, `QueryOf`, `Sorting`, `Read`, `ReadHow`, `WindowPage`, `WindowState`, `Datum`, `Lifted`, `Fielded`, `lift`, `DrawnPhase`, `Drawn`, `paints`, `placeholderData`, `sampleOf`, `isSelection`, `moreOf`, `sameQuery`, `combine`, `SortSchema`, `planSelections`, `isRead`, `Held`, `planFrame`, `pagesOf`, `windowOf`, `readsOf`, `readKey`, `dev`, `Holds`, `NO_HOLDS`, `holdsOf`, `holdReads` | `@fcalell/ui-core/read` | same |
| `@fcalell/plugin-api/read` | `isPlaceholder`, `heldPlaceholder` | `@fcalell/ui-core/read` | `isStandIn`, `heldStandIn` |
| `@fcalell/plugin-api/read` | `HeldResult` | `@fcalell/ui-core/read` | `ReadResult` |
| `@fcalell/plugin-api/read` | `Marks`, `createMarks` | `@fcalell/ui-core/read` | `Flags`, `createFlags` |
| `@fcalell/plugin-api/read` | `read`, `withRead`, `holdOf`, `withHold`, `isStreamQuery`, `retryOnce`, `watchUnheld`, `ensurePages` | `@fcalell/plugin-query/read` | same |
| `@fcalell/plugin-api/acts` | `Issue`, `isThenable`, `drew`, `Unreached` | `@fcalell/ui-core/acts` | same |
| `@fcalell/plugin-api/acts` | `RunState`, `startRun`, `holdSave` | `@fcalell/ui-core/acts` | `AttemptState`, `startAttempt`, `keepSave` |
| `@fcalell/plugin-api/acts` | `issues`, `refusal`, `retries`, `heldAct`, `watchActs`, `Reach`, `guardReach` | `@fcalell/plugin-query/acts` | same |
| `@fcalell/plugin-api/scope` | `ScopeIds`, `ScopeSchema`, `registerScope`, `releaseScope`, `registeredScope`, `mergeScope` | `@fcalell/ui-core/scope` | same |
| `@fcalell/plugin-api/scope` | `withScope`, `scoped` | `@fcalell/plugin-query/scope` | same |
| `@fcalell/plugin-api/ability-client` | `ability`, `composeAbility`, `orgRules`, `PackedRulesLike` | `@fcalell/plugin-query/ability-client` | same |
| `@fcalell/plugin-api/ability-client` | `registerApiClient`, `getRegisteredApiClient` | `@fcalell/plugin-api/client` | same |
| `@fcalell/plugin-api/listen` | `QueryListeners` | `@fcalell/ui-core/listen` | same |
| `@fcalell/plugin-api/listen` | `listenQueries` | `@fcalell/plugin-query/listen` | same |
| `@fcalell/plugin-api/preload` | `preload` | `@fcalell/plugin-query/preload` | same |
| `@fcalell/plugin-api/types` | `ProcedureCall`, `InputOf`, `OutputOf` | `@fcalell/ui-core/form` | same |
| `@fcalell/plugin-api/lib/selection` | `selectionWhere` | `@fcalell/plugin-api/lib/chosen` | `chosenWhere` |

`read` changed shape. ui-core's `Read` has a `key: string` (its query's hash) and no `options`
field. `options` (TanStack's query options) appears on `Read` only in a program that imports a
plugin-query module, which augments ui-core's `ReadBinding`; code that reads
`someRead.options.queryKey` keeps working because it imports plugin-query, and UI code never reads
`.options`. The selection symbol is `Symbol.for("@fcalell/ui-core/selection")`.

### From plugin-react-ui

| Old specifier | Old name | New specifier | New name |
| --- | --- | --- | --- |
| `@fcalell/plugin-react-ui/lib/clock` | `useClock` | `@fcalell/ui-core/react/clock` | same |
| `@fcalell/plugin-react-ui/lib/confirm` | `ConfirmEntry`, `confirm`, `Question`, `ask`, `dismissConfirmation`, `useConfirmations` | `@fcalell/ui-core/react/confirm` | same |
| `@fcalell/plugin-react-ui/lib/words` | `WordsProvider`, `useWords` | `@fcalell/ui-core/react/words` | same |
| `@fcalell/plugin-react-ui/lib/act` | `placed` | `@fcalell/ui-core/acts` | same |
| `@fcalell/plugin-react-ui/lib/act` | `Acting` | `@fcalell/ui-core/react/acts` | same |
| `@fcalell/plugin-react-ui/lib/act` | `Runnable` | `@fcalell/ui-core/react/acts` | `Attemptable` |
| `@fcalell/plugin-react-ui/components/form` | `FormSubmit` | `@fcalell/ui-core/form` | same |
| `@fcalell/plugin-react-ui/lib/mark` | `AppMark`, `MarkProvider`, `useMark`, `Lockup` | `@fcalell/plugin-react-ui/lib/lockup` | `AppLockup`, `LockupProvider`, `useLockup`, `Lockup` |
| `@fcalell/plugin-react-ui/components/shell` | `Place` | same | `Panes` |
| `@fcalell/plugin-react-ui/components/thread` | `MessageSlots` | same | `MessageRegions` |
| `@fcalell/plugin-react-ui/components/bar-chart` | `BarSlots` | same | `BarRegions` |

### From plugin-native-ui

| Old specifier | Old name | New specifier | New name |
| --- | --- | --- | --- |
| `@fcalell/plugin-native-ui/lib/confirm` | `ConfirmEntry`, `confirm`, `Question`, `ask`, `dismissConfirmation`, `useConfirmations` | `@fcalell/ui-core/react/confirm` | same |
| `@fcalell/plugin-native-ui/lib/words` | `WordsProvider`, `useWords` | `@fcalell/ui-core/react/words` | same |
| `@fcalell/plugin-native-ui/lib/words` | `Words` | `@fcalell/ui-core/tokens` | same |
| `@fcalell/plugin-native-ui/lib/net` | `listen` | `@fcalell/plugin-query/net` | same |
| `@fcalell/plugin-native-ui/lib/act` | `placed` | `@fcalell/ui-core/acts` | same |
| `@fcalell/plugin-native-ui/lib/act` | `Acting` | `@fcalell/ui-core/react/acts` | same |
| `@fcalell/plugin-native-ui/lib/act` | `Runnable` | `@fcalell/ui-core/react/acts` | `Attemptable` |
| `@fcalell/plugin-native-ui/components/form` | `FormSubmit` | `@fcalell/ui-core/form` | same |
| `@fcalell/plugin-native-ui/components/thread` | `MessageSlots` | same | `MessageRegions` |
| `@fcalell/plugin-native-ui/components/bar-chart` | `BarSlots` | same | `BarRegions` |

### From ui-core and plugin-screens

| Old specifier | Old name | New specifier | New name |
| --- | --- | --- | --- |
| `@fcalell/ui-core/fold` | `actsSplit`, `rowOneLine`, `rulesOneRow`, `definitionsOneRow`, `actsStackedMax`, `ROW_TITLE_LINES` | `@fcalell/ui-core/overflow` | same |
| `@fcalell/ui-core/read` | `FrameForm` | same | `FrameShape` |
| `@fcalell/ui-core/window` | `Slot` | same | `WindowEntry` |
| `@fcalell/ui-core/variants` | `matrixCells` (took an argument) | same | `matrixClasses` (takes none) |
| `@fcalell/ui-core/variants` | `FAMILIES`, `Family` | same | `MATRIX_GROUPS`, `MatrixGroup` |
| `@fcalell/ui-core/variants` | `PAGE_HEAD_ROOM`, `PAGE_BODY_TOAST_ROOM` | same | `PAGE_HEAD_SPACE`, `PAGE_BODY_TOAST_SPACE` |
| `@fcalell/ui-core/variants` | `LINE_IN` | same | `FLOW_IN` |
| `@fcalell/ui-core/chart` | `TIME_ROOM` | same | `TIME_SPACE` |
| `@fcalell/ui-core/drag` | `DRAG_HOLD` | same | `DRAG_DELAY` |
| `@fcalell/ui-core/paint` | `holdFor` | same | `paintWait` |
| `@fcalell/ui-core/tokens` | `Holds` | same | `ContrastGrounds` |
| `@fcalell/ui-core/tokens`, `@fcalell/ui-core/descriptors`, `@fcalell/ui-core/list-state` | `LoadingSlot`, `TableRowSlots`, `ChoiceSlots`, `OptionSlots` | same | `LoadingRegion`, `TableRowRegions`, `ChoiceRegions`, `OptionRegions` |
| `@fcalell/plugin-screens/floors` | default export | `@fcalell/plugin-screens/checks` | default export |

### Removed with no replacement

These were exported at the pinned commit, no longer are, and neither consumer imports them. A
consumer that does has no named successor: it stops using them, or copies the few lines it needs.

- **plugin-api:** `InferRouter`, `EntityRegistry`, `createEntityRegistry`, `createSlugify`,
  `apiOptionsSchema`, `selectedIds`, `fetchOrgRules`, `ORG_RULES_QUERY_KEY`, `orgRulesQueryKey`
  (the org-rules query is internal to `useAbility`), `schemaOf` (the provider answers it through
  the port), `draftFor`, the `./node/codegen`, `./node/types` and `./lib/selection` subpaths.
- **plugin-react-ui:** `useDerivedForm`, `DerivedFrame`, `WithReads`, `PickerListShape`, `Wiring`,
  `plexSans` (off `./node/fonts`), `spacing` and `textSize` (off `./lib/media`), the
  `./components/toast` and `./showcase/*` subpaths.
- **plugin-native-ui:** `ThemeName`, `Wiring`, `WithReads`, `PickerListShape`, the `./app` subpath
  and the `appCssImports` slot.
- **ui-core:** `asChip`, `ROSTER`, `componentDir`, `PLATFORMS`, `WAIT_DELAY`, `ACT_DELAY`,
  `timings`, `raisedGroundTokens`, `softGroundTokens`, `isStatus`, `isStatusCell` (use
  `isStatusFact`), `SLOP`, `DRAG_SLOP`, `Pointer`, `SHELL_COLUMN_PHONE`, `SetChoice`, `chipWidth`,
  `toHeld`, `UNIT_WIDTHS`, `TAB_COUNT_MAX`, `PICKED_GLYPH`, `termSet`, `termLabel`, and the variant
  constants `LinkFit`, `ITEM_PILLS`, `TOGGLE_THUMB`, `CURRENT_BAR`, `FILL_Y`, `TRAVEL_Y`,
  `FILL_FADE`, `RADIO_DOT`, `ITEM_FACTS`, `ClassProp`.
- **plugin-auth:** `getStatements`, `BakedPasskey`, `AbilitySubjects`, `AbilityFor`, `PackedRule`.
- **plugin-cloudflare, plugin-react, plugin-db, plugin-expo, plugin-screens, cli:**
  `CloudflareOptions`, `CodegenWranglerPayload`, `WranglerRouteSpec`, `ReactOptions`, `AppIcon`,
  `BUSY_TIMEOUT_MS`, `VersionGateOptions`, `versionHeaders`, walk's `Finding`, `format`,
  `Exception`, `WalkOptions` and `alignFindings`, `ParamValues`, `ChannelFixtures`, `Shift`, the
  cli's `FIRST_PARTY_PLUGINS`, `PLUGIN_NAMES`, `PluginName`, `CollectedPlugin` and the
  `./codegen` subpath.

## Renames

These are not visible to the import check. Search for each.

| Where | Old | New |
| --- | --- | --- |
| The result of `useFrameRead` and `useFrame` | `marks` (the frame's busy, stale and paused flag) | `flags` |
| `FrameState` | `form` | `shape` |
| `Lockup` | `logo` prop | removed |
| Roster and showcase prose | "frame" for a layout part | "container": `SHELL_FRAME` is `SHELL_CONTAINER`; guide pages `frames.md` are `containers.md` in both UI plugins |
| Showcase scenes | `src/roster/frames/`, `Frame`, `ShowcaseFrame`, `FRAMES_DIR` | `src/roster/scenes/`, `Scene`, `ShowcaseScene`, `SCENES_DIR` |
| `@fcalell/plugin-screens` options | `ScreensMainOptions.floors` | `checks` |
| CLI guide | `gap.md`, guide key `gap` | `shortfall.md`, guide key `shortfall` |
| Scaffold import alias (a new `stack init` project) | none | `"imports": { "#/*": "./src/*" }` in `package.json` |

A consumer that keeps its own alias (such as `#src/*`) keeps working. Taking the scaffold's
`#/*` means renaming every `#src/` import in the app.

## Behaviour that changes

Each bullet is what the consumer does.

**Reads and the client**

- Mount the binding: `query()` in `stack.config.ts` provides the `QueryProvider` that carries the
  read port. A component tree that renders a read hook outside it (a portal drawn outside the
  providers) wraps its content in `PortProvider` from `@fcalell/ui-core/react/port`.
- `ScopeBoundary` registers its ids in a layout effect and renders its children once they are
  committed, and a change in the ids' values remounts the subtree. Any state held under a boundary
  resets when the scope changes; keep state that must survive above it.
- `useDraft`'s `failed` is required. Pass it where it was omitted.
- `scoped(...).x.window()` no longer throws, and a 4xx with a blank message toasts the generic
  sentence. Delete workarounds for either.
- Every `read(..., { kind: "stream" })` returns `StreamRead<T>` with `stop()`. An app that wrote its
  own streaming reducer uses `streamRead` from `@fcalell/plugin-query/read`.
- A phone app with `nativeUi()` draws the update wall on the version gate's `426` by itself. Delete
  the app's own `onUpdateRequired` subscription and the screen it routed to, and set `expo({
  appStoreId })` for the iOS store link.
- A phone app's `auth()` takes `expo: true`, which trusts the app's deep-link scheme. With no
  `expo()` in the config it needs `expo: { scheme }`; generate throws otherwise.

**Acts, forms and words**

- A sheet form closes only once the promise its `onDone` returns resolves, on both platforms. A
  rejected `onDone` keeps the sheet open with its reason. Return the promise from `onDone` where the
  sheet should wait.
- The phone's form clears only a form that stays and goes nowhere, and its fields no longer paint
  while only the ability loads.
- `Words` has a new `save` key. A consumer that supplies a full translation adds it; a partial
  override needs nothing.
- Clearing an optional number field sends it absent; a required `several` with no `minItems` sends
  `[]`; a hint on a non-string field, or a non-date hint on a `date-time` field, throws at derive.
  Fix the schema that trips it.
- A phone sheet's `onClose` hears only the viewer's closes. A caller that closed the sheet itself
  and relied on the second call drops that.
- The phone's slider steps from its `min` as the web's does: `min=1 step=3` offers 1, 4, 7, 10.

**Api, auth and database**

- A `.handler()` procedure generates as a mutation, so cache invalidation follows it.
- `procedure({ sort })` without `paginated` throws at build. Add `paginated` or drop `sort`.
- `rbac` takes a non-empty action list. Fix an empty one; the type rejects it.
- A sort key outside `sorts` falls back to its table column, a cursor value is checked against its
  column type, and a bad cursor answers 400 instead of an empty page.
- An app with the `organization` option fails generate or build unless it supplies
  `sendInvitation`. Add the callback.
- Only `/api/auth` and `/api/auth/*` reach Better Auth. A consumer route under another `/api/auth…`
  prefix (`/api/authors`) is its own route now.
- An organization name with no letters and no slug is refused with `ORGANIZATION_SLUG_REQUIRED`,
  and a member's device key past 25 is deleted and refused.
- The seed is re-imported on every run, skips undefined columns and applies in one transaction with
  foreign keys on and `ON DELETE` actions in force. A seed that relied on a partial apply fails
  whole.
- `stack db reset` refuses SQLite. A drop that stands behind a later custom or full-text migration
  is refused, and two full-text indexes with one name throw. Rename or reorder the migration.
- Removing plugin-db deletes the configured migrations directory, not a fixed one.

**Node, cloudflare, vite and the CLI**

- Services bind by position in the generated barrel (`src/server/services/index.ts`), so any file
  name binds. Run `stack generate` and commit the rewritten barrel.
- `http.session` resolves through `AsyncLocalStorage`, not request identity: a session read on a
  second listener after the request is rebuilt now finds it.
- A socket `send` after `close()` throws. Guard it, or stop sending once the handle is closed.
- `STACK_DEV=0` honours `PORT` and `HOST`. The dev ready line matches only the main listener, so a
  script that waited on a further listener's line waits on the main port.
- `.dev.vars` sees every dotenv form (`KEY = x`, `export KEY=x`, `KEY: x`) when it decides whether
  `AUTH_SECRET` is set. Delete a duplicate line kept to work around the old scan.
- A `vars` that is not a table fails generate.
- `stack dev` and `stack build` fail without the app's own `vite`. Add it to the app's dependencies.
- `stack remove` prunes only dependencies no remaining plugin declares; `stack add` stops on a
  broken config instead of continuing. Global flags (`--config`, `--debug`, `-h`) pass through
  plugin commands.
- A font weight or metric holding `;`, `{` or `}` throws at build.
- `@fcalell/plugin-screens/msw` re-exports only `HttpResponse`, `http` and `ws`. Import anything
  else from `msw` itself.
- The screens fixture answerer decodes a call's input through oRPC's codec and answers
  `BAD_REQUEST` for an input it cannot decode.
- The environment is handed down from each process entry
  ([conventions](../architecture/conventions.md#the-environment)). A server the consumer starts
  itself (a `stack screens serve --entry` file, an embedding host) passes `env: process.env` to
  `startNodeServer` or `createNodeServer`, and a boot task reads its `env` argument. A Storybook
  `main.ts` passes `env: process.env` to `writeStorybookConfig`. A consumer's own plugin reads
  `ctx.env` in its command handlers and contributions, and passes the env to `startServer` as its
  last argument.

**Components**

- `matrixClasses()` takes no argument, `planFrame`'s `enclosing` is required, and the cli css
  helpers' `label` is required.
- `Badge` takes `hit` in place of `underlined` plus `className`.
- On the phone, the dock's full player seeks on a `Waveform` for a track with `peaks` and a known
  length. An app that drew its own waveform in that sheet drops it. A phone page that shows a
  track's waveform alone imports `Waveform` from `@fcalell/plugin-native-ui/components/waveform`.
- The phone `Slider` answers a screen reader's increment and decrement: each step calls `onChange`
  and then `onCommit`, as a let-go drag does. A handler that expects a drag first holds no state
  across the two calls.

## After

- Run `stack generate`, then the consumer's own `pnpm check` and its tests.
- Search the whole source for each name in the Renames table, since the compiler does not see
  them.
- Reopen the guides by their new names (`containers.md`, `shortfall.md`) wherever the consumer's
  own docs link to them.
- Boot the server once on a seeded database: the services barrel, the auth routes, the organization
  callbacks and the migrations checks only run there.
- Run the test run on the changed routes at 320 and 1920 dark; the unit tests do not draw.
- A phone app has not been run on SDK 58 (the boot, reanimated 4.7, gesture-handler 3.3,
  list windowing with LegendList, the chat mode and the tall picker sheet): run it on a device
  before release.
