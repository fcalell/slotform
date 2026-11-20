# Consumer migration

How a consumer moves onto Slotform as it stands now: the Node floor, the check
that lists every import that no longer resolves, the app's names, the imports that move, the
renames, the behaviour that changes, and what to run after. It covers a consumer pinned to any
Slotform commit before the split that made `@slotform/query`. Moving the pin to a published version is
[consumer version move](consumer-version-move.md); the version rule is in
[releasing](../architecture/releasing.md#the-version-rule). A consumer is migrated in its own
repository, after Slotform, and Slotform never edits it.

## Before you start

- **Node.** Every Slotform package declares `engines.node` as `>=24.14.0`. The consumer's CI image,
  deploy image and local runtime are on 24.14 or later.
- **Peers.** Read each Slotform package's `peerDependencies` and match them. The ones that moved are
  Vite `^8`, MSW `^3` (`@slotform/screens`), TypeScript 7, and for a phone app
  Expo SDK 58, React Native 0.88, React 19.3. Babel stays on 7.
- **Required peers.** The libraries whose types or instance cross into the app are peers of the
  Slotform packages ([the rule](../architecture/releasing.md#peers-one-copy-of-each-slotform-package)),
  so the app lists each required one itself, at a version inside the peer range. `slotform init` and
  `slotform add` write them in a new app; an existing app adds them by hand from each installed
  `node_modules/@slotform/*/package.json` (every `peerDependencies` entry not marked optional).
  The floors that rose: `zod` `^4.6.7`, `drizzle-orm` `^0.45.4`, `hono` `^4.13.19`, `@orpc/client`
  and `@orpc/server` `^1.16.2`, `react` and `react-dom` `^19.3.0`, `react-native` `^0.88.0`.
- **One copy of each Slotform package.** The lockfile holds one version of each `@slotform/*` package
  ([the count](../architecture/releasing.md#peers-one-copy-of-each-slotform-package)).
- **The app's own vite.** `slotform dev` and `slotform build` fail with `VITE_NOT_INSTALLED` when the app
  does not list `vite` in its own dependencies.
- **The binding.** The read and act hooks reach data through a port that the `query` plugin provides. Add
  `@slotform/query` and its peers (`@orpc/tanstack-query`, `@tanstack/react-query`) to
  the dependencies and `query()` after `api()` in `slotform.config.ts`. A phone app also has
  native-ui, which requires `query`. Without the port every read hook throws on its first render;
  `useAttempt` alone works without one.
- **Measure first.** Move [the app's names](#the-apps-names) and install the new release, then run
  the consumer's typecheck without changing another file. Every import that no longer resolves is
  a TypeScript error: TS2307 for a subpath that is gone, TS2305 or TS2724 for a name the target no longer exports. Group the errors by specifier
  to get the count per row of the tables below:

  ```sh
  pnpm exec tsc --noEmit | grep -E "TS(2307|2305|2724)" | grep -oE "@slotform/[^\"']+" | sort | uniq -c | sort -rn
  ```

  A `.d.ts` that a package no longer ships also fails here. A rename that keeps its specifier and
  name changes nothing the compiler sees: a prop or a returned field (under Renames) is checked by
  reading the failing call sites.

## The app's names

Every name the app takes from Slotform is in the `slotform` namespace. The app moves each name in one pass, before the install, so the tables below read in the
new scope. Each step ends on a **Check:** run from the app's root; a check prints nothing when the
step is done.

### Dependencies and imports

In `package.json` each `@fcalell/plugin-<name>` becomes `@slotform/<name>` and each other
`@fcalell/<name>` (`cli`, `ui-core`, `typescript-config`, `biome-config`) becomes
`@slotform/<name>`, at the caret of the release. Every import specifier, `tsconfig.json`
`extends` and `biome.json` `extends` moves the same way; the plugin form goes first, so
`@fcalell/plugin-db` lands on `@slotform/db` and never on `@slotform/plugin-db`.

**Check:** `git grep -n -E '@fcalell/(plugin-|cli|ui-core|typescript-config|biome-config)|@slotform/plugin-'`

### The config file

`stack.config.ts` is `slotform.config.ts` (`git mv stack.config.ts slotform.config.ts`), and every
script or tsconfig `include` that names the file names the new one.

**Check:** `git ls-files stack.config.ts; git grep -n -F 'stack.config'`

### The generated folder

The generated folder is `.slotform/`. The name moves in `.gitignore`, in each tsconfig `include`
and `paths` entry (`.slotform/*.d.ts`, `.slotform/worker`), in `biome.json`'s `extends`
(`./.slotform/biome.json`) and in the `CLAUDE.md` import line, which reads `@.slotform/guide.md`.
The old `.stack/` folder is deleted; `slotform generate` writes the new one.

**Check:** `git grep -n -E '(^|[^A-Za-z0-9_])\.stack([^A-Za-z0-9_-]|$)'`

### Scripts

Each `package.json` script and CI step that runs `stack <command>` runs `slotform <command>`
(`"dev": "slotform dev"`, `pnpm exec slotform deploy`).

**Check:** `git grep -n -w stack -- '*package.json' '.github/**'`

### Virtual modules

Each `virtual:stack-<name>` import, and each tsconfig `paths` key that names one, is
`virtual:slotform-<name>`: the routes import `virtual:slotform-procedure`, and a Storybook preview
that composes the providers imports `virtual:slotform-providers`.

**Check:** `git grep -n 'virtual:stack-'`

### Code names

`StackConfig` is `SlotformConfig`, `StackError` is `SlotformError` and `stackContext` is
`slotformContext`.

**Check:** `git grep -n -w -E 'StackConfig|StackError|stackContext'`

### Environment variables

Each `STACK_<name>` env var is `SLOTFORM_<name>`. The root
`.dev.vars` holds `SLOTFORM_DEV` in place of the old line, a shell or CI step that turns on the
CLI's debug output sets `SLOTFORM_DEBUG`, and app code reads `SLOTFORM_ORIGIN` and
`SLOTFORM_LISTENER` (a Node listener's origin and kind) and, in a `slotform screens serve --entry`
file, `SLOTFORM_SERVE_DIR` and `SLOTFORM_SERVE_PORT`. The names move in `.env` files, `.dev.vars`,
the root `wrangler.toml` `[vars]`, CI env and the app's code. A secret on the deploy target under
an old name is set again under the new one, since no package reads the old name: `wrangler secret put SLOTFORM_<name>` on Cloudflare,
the process environment on a Node host.

**Check:** `git grep -n -E '\bSTACK_[A-Z]' | grep -v STACK_ORDER; ls -A | grep -E '^\.(env|dev\.vars)' | xargs -r grep -n -E '\bSTACK_[A-Z]'`, and on Cloudflare `pnpm exec wrangler secret list | grep STACK_`

### Migration markers

A committed SQL migration's markers read `-- slotform:fts`, `-- slotform:fts-drop` and
`-- slotform:allow-destructive`. Each `-- stack:` line in `src/migrations` is rewritten in place,
its name and hash kept.

**Check:** `git grep -n -e '-- stack:'`

### Client headers

The `x-slotform-client-*` headers are generated on both sides, so the app edits nothing. A native
build installed before the move sends the old header, so a phone app ships a new native build with
the move.

**Check:** `git grep -n 'x-stack-'`

## Imports that move

One row per old specifier and target; a list in the name column moves together under the same
names. A bare `@slotform/api/tanstack-query` import is the largest break: it was the whole
client side of the api, and it splits into ui-core (the read model and the hooks) and `@slotform/query`
(the TanStack binding). Rewrite one import statement per new specifier, `type` kept on a type-only
name.

### From `@slotform/api`

| Old specifier | Old name | New specifier | New name |
| --- | --- | --- | --- |
| `@slotform/api/tanstack-query` | `createQueryClient`, `ApiQueryUtils`, `createApiQueryUtils`, `scoped`, `QueryProvider`, `QueryProviderProps`, `useRead`, `useAbility`, `streamedQuery`, `QueryClient`, `QueryClientProvider`, `useInfiniteQuery`, `useMutation`, `useQuery`, `useQueryClient`, `useSuspenseQuery` | `@slotform/query/tanstack-query` | same |
| `@slotform/api/tanstack-query` | `useSelections`, `useDrawsFailure`, `usePainted`, `FrameHolds`, `useFrameRead`, `useWindow`, `useWindowMore` | `@slotform/ui-core/react/read` | same |
| `@slotform/api/tanstack-query` | `useMore` | `@slotform/ui-core/react/port` | `usePort().useNextPage(read)` |
| `@slotform/api/tanstack-query` | `Draft`, `useDraft` | `@slotform/ui-core/react/acts` | same |
| `@slotform/api/tanstack-query` | `Run`, `useRun` | `@slotform/ui-core/react/acts` | `Attempt`, `useAttempt` |
| `@slotform/api/tanstack-query` | `ScopeBoundary` | `@slotform/ui-core/react/scope` | same |
| `@slotform/api/tanstack-query` | `More`, `WindowView`, `Datum`, `Drawn`, `DrawnPhase`, `Fielded`, `Held`, `Holds`, `Lifted`, `QueryOf`, `Read`, `ReadHow`, `ReadKind`, `Selection`, `Sorting`, `WindowState`, `combine`, `isRead`, `isSelection`, `lift`, `moreOf`, `pagesOf`, `paints`, `sameQuery`, `sampleOf`, `windowOf` | `@slotform/ui-core/read` | same |
| `@slotform/api/tanstack-query` | `isPlaceholder` | `@slotform/ui-core/read` | `isStandIn` |
| `@slotform/api/tanstack-query` | `drew`, `Issue`, `isThenable` | `@slotform/ui-core/acts` | same |
| `@slotform/api/tanstack-query` | `heldAct`, `issues`, `refusal` | `@slotform/query/acts` | same |
| `@slotform/api/tanstack-query` | `read` | `@slotform/query/read` | same |
| `@slotform/api/tanstack-query` | `ability`, `PackedRulesLike` | `@slotform/query/ability-client` | same |
| `@slotform/api/tanstack-query` | `preload` | `@slotform/query/preload` | same |
| `@slotform/api/tanstack-query` | `QueryListeners` | `@slotform/ui-core/listen` | same |
| `@slotform/api/tanstack-query` | `ScopeIds` | `@slotform/ui-core/scope` | same |
| `@slotform/api/tanstack-query` | `RouterClient` | `@slotform/api/client` | same |
| `@slotform/api/read` | `Selection`, `ReadKind`, `QueryOf`, `Sorting`, `Read`, `ReadHow`, `WindowPage`, `WindowState`, `Datum`, `Lifted`, `Fielded`, `lift`, `DrawnPhase`, `Drawn`, `paints`, `placeholderData`, `sampleOf`, `isSelection`, `moreOf`, `sameQuery`, `combine`, `SortSchema`, `planSelections`, `isRead`, `Held`, `planFrame`, `pagesOf`, `windowOf`, `readsOf`, `readKey`, `dev`, `Holds`, `NO_HOLDS`, `holdsOf`, `holdReads` | `@slotform/ui-core/read` | same |
| `@slotform/api/read` | `isPlaceholder`, `heldPlaceholder` | `@slotform/ui-core/read` | `isStandIn`, `heldStandIn` |
| `@slotform/api/read` | `HeldResult` | `@slotform/ui-core/read` | `ReadResult` |
| `@slotform/api/read` | `Marks`, `createMarks` | `@slotform/ui-core/read` | `Flags`, `createFlags` |
| `@slotform/api/read` | `read`, `withRead`, `holdOf`, `withHold`, `isStreamQuery`, `retryOnce`, `watchUnheld`, `ensurePages` | `@slotform/query/read` | same |
| `@slotform/api/acts` | `Issue`, `isThenable`, `drew`, `Unreached` | `@slotform/ui-core/acts` | same |
| `@slotform/api/acts` | `RunState`, `startRun`, `holdSave` | `@slotform/ui-core/acts` | `AttemptState`, `startAttempt`, `keepSave` |
| `@slotform/api/acts` | `issues`, `refusal`, `retries`, `heldAct`, `watchActs`, `Reach`, `guardReach` | `@slotform/query/acts` | same |
| `@slotform/api/scope` | `ScopeIds`, `ScopeSchema`, `registerScope`, `releaseScope`, `registeredScope`, `mergeScope` | `@slotform/ui-core/scope` | same |
| `@slotform/api/scope` | `withScope`, `scoped` | `@slotform/query/scope` | same |
| `@slotform/api/ability-client` | `ability`, `composeAbility`, `orgRules`, `PackedRulesLike` | `@slotform/query/ability-client` | same |
| `@slotform/api/ability-client` | `registerApiClient`, `getRegisteredApiClient` | `@slotform/api/client` | same |
| `@slotform/api/listen` | `QueryListeners` | `@slotform/ui-core/listen` | same |
| `@slotform/api/listen` | `listenQueries` | `@slotform/query/listen` | same |
| `@slotform/api/preload` | `preload` | `@slotform/query/preload` | same |
| `@slotform/api/types` | `ProcedureCall`, `InputOf`, `OutputOf` | `@slotform/ui-core/form` | same |
| `@slotform/api/lib/selection` | `selectionWhere` | `@slotform/api/lib/chosen` | `chosenWhere` |

`read` changed shape. ui-core's `Read` has a `key: string` (its query's hash) and no `options`
field. `options` (TanStack's query options) appears on `Read` only in a program that imports a
`@slotform/query` module, which augments ui-core's `ReadBinding`; code that reads
`someRead.options.queryKey` keeps working because it imports `@slotform/query`, and UI code never reads
`.options`. The selection symbol is `Symbol.for("@slotform/ui-core/selection")`.

### From `@slotform/react-ui`

| Old specifier | Old name | New specifier | New name |
| --- | --- | --- | --- |
| `@slotform/react-ui/lib/clock` | `useClock` | `@slotform/ui-core/react/clock` | same |
| `@slotform/react-ui/lib/confirm` | `ConfirmEntry`, `confirm`, `Question`, `ask`, `dismissConfirmation`, `useConfirmations` | `@slotform/ui-core/react/confirm` | same |
| `@slotform/react-ui/lib/words` | `WordsProvider`, `useWords` | `@slotform/ui-core/react/words` | same |
| `@slotform/react-ui/lib/act` | `placed` | `@slotform/ui-core/acts` | same |
| `@slotform/react-ui/lib/act` | `Acting` | `@slotform/ui-core/react/acts` | same |
| `@slotform/react-ui/lib/act` | `Runnable` | `@slotform/ui-core/react/acts` | `Attemptable` |
| `@slotform/react-ui/components/form` | `FormSubmit` | `@slotform/ui-core/form` | same |
| `@slotform/react-ui/lib/mark` | `AppMark`, `MarkProvider`, `useMark`, `Lockup` | `@slotform/react-ui/lib/lockup` | `AppLockup`, `LockupProvider`, `useLockup`, `Lockup` |
| `@slotform/react-ui/components/shell` | `Place` | same | `Panes` |
| `@slotform/react-ui/components/thread` | `MessageSlots` | same | `MessageRegions` |
| `@slotform/react-ui/components/bar-chart` | `BarSlots` | same | `BarRegions` |

### From `@slotform/native-ui`

| Old specifier | Old name | New specifier | New name |
| --- | --- | --- | --- |
| `@slotform/native-ui/lib/confirm` | `ConfirmEntry`, `confirm`, `Question`, `ask`, `dismissConfirmation`, `useConfirmations` | `@slotform/ui-core/react/confirm` | same |
| `@slotform/native-ui/lib/words` | `WordsProvider`, `useWords` | `@slotform/ui-core/react/words` | same |
| `@slotform/native-ui/lib/words` | `Words` | `@slotform/ui-core/tokens` | same |
| `@slotform/native-ui/lib/net` | `listen` | `@slotform/query/net` | same |
| `@slotform/native-ui/lib/act` | `placed` | `@slotform/ui-core/acts` | same |
| `@slotform/native-ui/lib/act` | `Acting` | `@slotform/ui-core/react/acts` | same |
| `@slotform/native-ui/lib/act` | `Runnable` | `@slotform/ui-core/react/acts` | `Attemptable` |
| `@slotform/native-ui/components/form` | `FormSubmit` | `@slotform/ui-core/form` | same |
| `@slotform/native-ui/components/thread` | `MessageSlots` | same | `MessageRegions` |
| `@slotform/native-ui/components/bar-chart` | `BarSlots` | same | `BarRegions` |

### From `@slotform/ui-core` and `@slotform/screens`

| Old specifier | Old name | New specifier | New name |
| --- | --- | --- | --- |
| `@slotform/ui-core/fold` | `actsSplit`, `rowOneLine`, `rulesOneRow`, `definitionsOneRow`, `actsStackedMax`, `ROW_TITLE_LINES` | `@slotform/ui-core/overflow` | same |
| `@slotform/ui-core/read` | `FrameForm` | same | `FrameShape` |
| `@slotform/ui-core/window` | `Slot` | same | `WindowEntry` |
| `@slotform/ui-core/variants` | `matrixCells` (took an argument) | same | `matrixClasses` (takes none) |
| `@slotform/ui-core/variants` | `FAMILIES`, `Family` | same | `MATRIX_GROUPS`, `MatrixGroup` |
| `@slotform/ui-core/variants` | `PAGE_HEAD_ROOM`, `PAGE_BODY_TOAST_ROOM` | same | `PAGE_HEAD_SPACE`, `PAGE_BODY_TOAST_SPACE` |
| `@slotform/ui-core/variants` | `LINE_IN` | same | `FLOW_IN` |
| `@slotform/ui-core/chart` | `TIME_ROOM` | same | `TIME_SPACE` |
| `@slotform/ui-core/drag` | `DRAG_HOLD` | same | `DRAG_DELAY` |
| `@slotform/ui-core/paint` | `holdFor` | same | `paintWait` |
| `@slotform/ui-core/tokens` | `Holds` | same | `ContrastGrounds` |
| `@slotform/ui-core/tokens`, `@slotform/ui-core/descriptors`, `@slotform/ui-core/list-state` | `LoadingSlot`, `TableRowSlots`, `ChoiceSlots`, `OptionSlots` | same | `LoadingRegion`, `TableRowRegions`, `ChoiceRegions`, `OptionRegions` |
| `@slotform/screens/floors` | default export | `@slotform/screens/checks` | default export |

### Removed with no replacement

These were exported at the pinned commit, no longer are, and neither consumer imports them. A
consumer that does has no named successor: it stops using them, or copies the few lines it needs.

- **`@slotform/api`:** `InferRouter`, `EntityRegistry`, `createEntityRegistry`, `createSlugify`,
  `apiOptionsSchema`, `selectedIds`, `fetchOrgRules`, `ORG_RULES_QUERY_KEY`, `orgRulesQueryKey`
  (the org-rules query is internal to `useAbility`), `schemaOf` (the provider answers it through
  the port), `draftFor`, the `./node/codegen`, `./node/types` and `./lib/selection` subpaths.
- **`@slotform/react-ui`:** `useDerivedForm`, `DerivedFrame`, `WithReads`, `PickerListShape`, `Wiring`,
  `plexSans` (off `./node/fonts`), `spacing` and `textSize` (off `./lib/media`), the
  `./components/toast` and `./showcase/*` subpaths.
- **`@slotform/native-ui`:** `ThemeName`, `Wiring`, `WithReads`, `PickerListShape`, the `./app` subpath
  and the `appCssImports` slot.
- **`@slotform/ui-core`:** `asChip`, `ROSTER`, `componentDir`, `PLATFORMS`, `WAIT_DELAY`, `ACT_DELAY`,
  `timings`, `raisedGroundTokens`, `softGroundTokens`, `isStatus`, `isStatusCell` (use
  `isStatusFact`), `SLOP`, `DRAG_SLOP`, `Pointer`, `SHELL_COLUMN_PHONE`, `SetChoice`, `chipWidth`,
  `toHeld`, `UNIT_WIDTHS`, `TAB_COUNT_MAX`, `PICKED_GLYPH`, `termSet`, `termLabel`, and the variant
  constants `LinkFit`, `ITEM_PILLS`, `TOGGLE_THUMB`, `CURRENT_BAR`, `FILL_Y`, `TRAVEL_Y`,
  `FILL_FADE`, `RADIO_DOT`, `ITEM_FACTS`, `ClassProp`.
- **`@slotform/auth`:** `getStatements`, `BakedPasskey`, `AbilitySubjects`, `AbilityFor`, `PackedRule`.
- **`@slotform/cloudflare`, `@slotform/react`, `@slotform/db`, `@slotform/expo`, `@slotform/screens`, `@slotform/cli`:**
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
| `@slotform/screens` options | `ScreensMainOptions.floors` | `checks` |
| CLI guide | `gap.md`, guide key `gap` | `shortfall.md`, guide key `shortfall` |
| `Draft` (`@slotform/ui-core/react/acts`) | `ended` (`"failed" \| "missing" \| undefined`) | `ended` is a boolean; the reason is `endedBy` |
| `splitFacts` (`@slotform/ui-core/list-state`) | `{ status, warnings, chips, marks, words }` | `{ facts, quiet }`: every fact in order, tagged by `kind`, every status kept |
| `@slotform/ui-core/variants` | `summaryContentTone()`, `rowWarningContentTone()` | `toneOf(FORM_FIELD_SUMMARY_GLYPH)`, `toneOf(ROW_WARNING)` |
| `Leave` (`@slotform/ui-core/leave`) | `press()` then `settle(failed)` | `run(fn)` |
| `useReasonShown` result | none | `{ host, reason }` |
| Guide pages | one `rules.md`, `containers.md`, `content.md`, `canvas.md`, `screens.md` per plugin; ui-core `voice.md` and `critique.md` whole | split by topic, each under 600 words; `.slotform/guide.md` lists the new pages after `slotform generate`, and a consumer's own link to a moved section follows its page |
| Scaffold import alias (a new `slotform init` project) | none | `"imports": { "#/*": "./src/*" }` in `package.json` |

A consumer that keeps its own alias (such as `#src/*`) keeps working. Taking the scaffold's
`#/*` means renaming every `#src/` import in the app.

## Behaviour that changes

Each bullet is what the consumer does.

**Reads and the client**

- Mount the binding: `query()` in `slotform.config.ts` provides the `QueryProvider` that carries the
  read port. A component tree that renders a read hook outside it (a portal drawn outside the
  providers) wraps its content in `PortProvider` from `@slotform/ui-core/react/port`.
- `ScopeBoundary` registers its ids in a layout effect and renders its children once they are
  committed, and a change in the ids' values remounts the subtree. Any state held under a boundary
  resets when the scope changes; keep state that must survive above it.
- `useDraft`'s `failed` is required. Pass it where it was omitted.
- `scoped(...).x.window()` no longer throws, and a 4xx with a blank message toasts the generic
  sentence. Delete workarounds for either.
- Every `read(..., { kind: "stream" })` returns `StreamRead<T>` with `stop()`. An app that wrote its
  own streaming reducer uses `streamRead` from `@slotform/query/read`.
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
- A row's facts draw every status, the first leading the line, on both platforms. A consumer that
  relied on a second status being dropped removes it from `facts`.
- A row's text group gives way at its two-fifths floor at the default weight on both platforms, the
  Pane head's included. Look at a headed row and a phone row with a long title.
- A `QrCode` whose value is too long to encode draws the failed tile and logs in dev, where it threw.
  Shorten the value.
- Prose decodes character references (`&amp;`, `&copy;`, `&#38;`) in text. Text that showed one
  literally on purpose writes it as code.
- On the phone a failing document or photo pick draws `pickFailed`. A consumer that supplies a full
  translation adds the key.

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
- `slotform db reset` refuses SQLite. A drop that stands behind a later custom or full-text migration
  is refused, and two full-text indexes with one name throw. Rename or reorder the migration.
- Removing the `db` plugin deletes the configured migrations directory, not a fixed one.

**Node, cloudflare, vite and the CLI**

- Services bind by position in the generated barrel (`src/server/services/index.ts`), so any file
  name binds. Run `slotform generate` and commit the rewritten barrel.
- `http.session` resolves through `AsyncLocalStorage`, not request identity: a session read on a
  second listener after the request is rebuilt now finds it.
- A socket `send` after `close()` throws. Guard it, or stop sending once the handle is closed.
- `SLOTFORM_DEV=0` honours `PORT` and `HOST`. The dev ready line matches only the main listener, so a
  script that waited on a further listener's line waits on the main port.
- `.dev.vars` sees every dotenv form (`KEY = x`, `export KEY=x`, `KEY: x`) when it decides whether
  `AUTH_SECRET` is set. Delete a duplicate line kept to work around the old scan.
- A `vars` that is not a table fails generate.
- `slotform dev` and `slotform build` fail without the app's own `vite`. Add it to the app's dependencies.
- `slotform remove` prunes only dependencies no remaining plugin declares; `slotform add` stops on a
  broken config instead of continuing. Global flags (`--config`, `--debug`, `-h`) pass through
  plugin commands.
- A font weight or metric holding `;`, `{` or `}` throws at build.
- `@slotform/screens/msw` re-exports only `HttpResponse`, `http` and `ws`. Import anything
  else from `msw` itself.
- The screens fixture answerer decodes a call's input through oRPC's codec and answers
  `BAD_REQUEST` for an input it cannot decode.
- The environment is handed down from each process entry
  ([conventions](../architecture/conventions.md#the-environment)). A server the consumer starts
  itself (a `slotform screens serve --entry` file, an embedding host) passes `env: process.env` to
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
  track's waveform alone imports `Waveform` from `@slotform/native-ui/components/waveform`.
- The phone `Slider` answers a screen reader's increment and decrement: each step calls `onChange`
  and then `onCommit`, as a let-go drag does. A handler that expects a drag first holds no state
  across the two calls.

## After

- Run `slotform generate`, then the consumer's own `pnpm check` and its tests.
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
