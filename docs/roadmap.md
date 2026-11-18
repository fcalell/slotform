# Roadmap

Unbuilt work, one item each; an item moves into the built docs when it lands.

## Shared logic into ui-core

Each item is logic or a constant both UI plugins hold in their own copy. It waits because moving it into ui-core changes ui-core and both plugins in one change.

- Avatar initials: `initials(name)` is written in `plugins/react-ui/src/ui/atoms/avatar/base.tsx` and `plugins/native-ui/src/ui/atoms/avatar/base.tsx`. It moves to ui-core with its edge cases (`@ada`, `Jean-Luc`).
- A row mark's reading: `says` and `wordless` are in react-ui `atoms/row/marks.tsx` and native-ui `lib/facts.ts`, and `useReasonLine` is in react-ui `atoms/button/reason.tsx` and native-ui `components/row/acts.tsx`.
- The facts reading: react-ui's Row reads facts through ui-core `splitFacts` (`list-state.ts`), while native-ui builds them in its own `lib/facts.ts` (`badgesOf`). `splitFacts` becomes the one reading on both, and the Facts sentence in `docs/architecture/ui-core/roster.md` follows it.
- The row text floor: ui-core `ROW_TEXT_FLOOR` (`basis-2/5 shrink-0`) and react-ui's own `TEXT_AT_FLOOR` (`basis-2/5 shrink`, `components/row/index.tsx`) state one floor twice. One constant on both platforms changes the phone's row, which then gives way at the floor.
- An act's ending: both action bars (`components/action-bar/base.tsx`) call `leave.settle(true | false)` around a press by hand; a `leave.run(fn)` in ui-core `react/touched` takes their place. The close-or-settle after a run in react-ui `sheet/confirm.tsx`, `lib/reorder.ts` and `action-bar/base.tsx` becomes one helper beside `isThenable` in ui-core `acts`.
- `Draft.ended`: 12 controls across both plugins (`input/base.tsx`, `input/prose.tsx`, `switch`, `picker`, `slider`, `atoms/switch/checkbox.tsx`) write `draft.ended !== undefined`; ui-core `react/acts`'s `Draft` gains a derived `ended` boolean.
- The removed sign: `removed: "−"` is in both plugins' `components/diff/index.tsx` (and their FileRow); it becomes one ui-core constant.
- An ended act and an option's second line: the ended act's offer (react-ui `offerOf` in `row/acts.tsx` and `section/head.tsx`, native-ui `row/acts.tsx` and `section/head.tsx`) and `optionBlocked(option, chosen) ?? option.line` (both pickers' base and list) each become one ui-core export, in `acts` and `list-state`.
- The press wash: `hover:bg-wash-hover active:bg-wash-press` is written in react-ui `table/index.tsx` (`ROW_PRESS`), `shell/row.ts` (`ROW_PRESS`) and `stats/index.tsx` (`OPENS`); it becomes one ui-core `variants` constant.
- A QR code past version 40 throws during render: ui-core `qrModules` (`qr.ts`) returns a typed failure and both plugins' `QrCode` draw a failed shape.
- Prose prints a character reference (`&#38;`, `&amp;`) literally: ui-core `prose.ts` gains a decoder for text tokens that both plugins' inline text case calls.
- The phone's pick failure: `expo-document-picker` throws unhandled in native-ui `components/input/file.tsx` and `components/message-input/index.tsx`. The catch draws a new closed word (`pickFailed`) in ui-core words.
- The tone helpers: ui-core `variants` exports `summaryContentTone` and `rowWarningContentTone`; one `toneOf` export takes their place in both plugins.

## Public surface

Each item adds, renames or moves a public name, which a consumer's import follows, or changes a stored shape.

- Name clashes: `accepts` (`ui-core/src/file.ts` and `drag.ts`), `STATES` (`controls.ts` and `roster/shared.ts`), `Band` (`drag.ts` and `roster/section.ts`), `Held` (read and form) and `Fielded` each name two things. One of each pair is renamed.
- The motion knobs: `tuned`, `tune` and `subscribeMotion` live in `@fcalell/ui-core/paint` and move to a `motion` module; `release()` in `follow.ts` reads `tuned.fling` and `tuned.reach` and takes them as arguments instead.
- Density pins: the pin names `room`, `touch` and `desktop` are literals in react-ui `src/ui/lib/media.ts` beside `ROOM_SCOPE` in the public `./density`; they become one exported set.
- `isDevMode` is written in `plugins/api/src/worker/index.ts` and exported from `plugins/auth/src/worker/listener.ts`, and `tooManyRequests` lives in auth's `worker/oauth.ts`; plugin-api exports both.
- The drawn row types (`WithReads`, `Row`, `RowItem`) move from react-ui `components/section` to a row types module; the section subpath re-exports them or consumers import from the new place.
- react-ui's `lib/read.tsx`, `lib/more.tsx` and `lib/not-found.tsx` import components; `FrameBody`, `StateLine`, `OptionsLine`, `FrameLine`, `MoreRow` and `NotFound` move into component folders, which moves the public `./lib/not-found` and about 19 importers.
- Typing gaps the apps cast around, each a stack shortfall the app reports and does not patch:
  - a Read passed straight to a Picker's `options` and a Section's `groups` (`apps/showcase` `sprints.tsx`, `owners.at((all) => all)`);
  - a Toolbar filter's `onChange` typed by its `options` values (`releases.tsx`, `next as Stage | null`);
  - `AuthCallbacks` env typed with `STACK_DEV` (`apps/phone` `worker/plugins/auth.ts`);
  - `places` that take a conditional spread (`apps/phone` `app/_layout.tsx`, `as PlaceSpec[]`);
  - the query read's pages overload, so the showcase's `roster/waiting.ts` drops its `as never`, and `PaneProps` `read?` that takes a maybe-absent read.
- Components the apps build by hand:
  - a Stats that takes a read of items and draws one cell per item (`usage.tsx`, `meters.at((all) => all[at])`);
  - a form `after` block that says "nothing to send" for a failed or empty read (`keys.tsx`, `useSelections` and `useDrawsFailure` by hand);
  - a named constant read for a page whose data is not built (`settings.tsx`, `logs.tsx`, `Promise.resolve([])`);
  - an act that writes its answer into the list read it belongs to (`members.tsx`, `settings.tsx`, `skipAutoInvalidation` and `setQueryData`);
  - a read held open and released by the page, a gate (`apps/phone` `app/motion.tsx`, the deferred `land`);
  - an options list derived from a procedure's input schema, so the worker's enum reaches the client (`releases.tsx`, the hand-kept `STAGES`).
- Smaller renames and exports: a typed derived code length; `runs` `filled` renamed `hasText`; `AnyCall` exported from `ui-core/form` (both plugins' `gate/index.tsx` define it); a per-component `props.ts` leaf; `ToastOptions<A>` generic over the act.
- ui-core organisation: wash-place tokens; the `MATRIX_GROUPS` registry (`variants.ts`, `design-md.ts`); a `words.ts` subpath; scope ids passed by context.
- native-ui provider props: `setRoomKnobs` (`plugins/native-ui/src/ui/lib/room.tsx`) and `connectOutput` (called in `apps/phone/src/app/_layout.tsx`) become props of the app's provider.
- native-ui's docked foot keeps a `claim` ref (`components/pane/index.tsx`) for the input that returns; a "returning" state of the foot region takes its place, and the gorhom sheet's container parts arrive by context.
- The drive plan's scroll step becomes `{ scroll: { to, in? } }` (`plugins/screens/src/node/drive.ts`, today `scroll: number`); it changes a stored shape, so saved plans change.
- `signUp: "first"` lets an account in while the user count is 0 (`plugins/auth/src/worker/sign-up-policy.ts`), so two first sign-ups can race; a sentinel row closes it and changes the stored shape.

## Across packages

Each item crosses a package boundary, so it changes two or more packages in one commit.

- The phone's query wiring: native-ui `requires: ["expo", "api", "query"]` and wires the phone's `QueryProvider`, `queryClientModule` and the `src/lib/query.ts` scaffold (`plugins/native-ui/src/index.ts`). Moving them into plugin-query needs plugin-query to depend on plugin-expo, which closes the package cycle query, expo, cloudflare, screens, query.
- Auth's wire names: `AUTH_PREFIX` is restated in `plugins/expo/src/worker/version-gate.ts` and `plugins/node/src/server/ws-guard.ts`, `SESSION_ENDED_CHANNEL` in `ws-guard.ts`, and the session path (`SESSION_PATH`) in `plugins/screens/src/ui/answer.ts`; plugin-auth owns each. They move to `@fcalell/plugin-api/wire` or are read from plugin-auth, and `RATE_LIMITER_RPC` (`plugins/api/src/worker/guards.ts`, the literal in `plugins/cloudflare/src/index.ts`) joins them.
- Dependency ranges: plugins write their consumers' ranges as literals (native-ui `uniwind`, `@gorhom/bottom-sheet`, `lucide-react-native`, `@tanstack/react-query`, `@better-auth/expo`; node `esbuild`; expo `@types/react`, `babel-plugin-react-compiler`). A cli helper reads them from the plugin's own manifest, or `release:check` asserts they match.
- `STACK_PACKAGES` (`packages/cli/src/lib/stack-packages.ts`) lists each package's dependencies by hand; the build generates it from the manifests.
- Template names: the init templates name plugins by literal (`packages/cli/src/templates/tsconfig.ts`, `package-json.ts`: `vite`, `expo`, `api`, `db`, `node`, `cloudflare`, `react`); a slot contributed by api, db, expo and react replaces each test.
- The expo `lib-api.ts` template writes `http://localhost:8787` and `/rpc` (`plugins/expo/templates/lib-api.ts`); the prefix comes from `api.slots` and the port from plugin-cloudflare.
- Barrels: `generateRouteBarrel` (`plugins/api/src/node/barrel.ts`) and `generateServiceBarrel` (`plugins/node/src/node/barrel.ts`) become one cli `directoryBarrel`. The node services watcher (`plugins/node/src/index.ts`, `devWatchers`) writes the barrel itself and leaves `servicesModule` stale; a cli `WatcherSpec` regenerate step does both.
- `WatcherSpec`'s handler `type` (`"add" | "unlink" | "change"`, `packages/cli/src/specs.ts`) is read by five plugins; reshaping it changes each.
- Middleware phases: `before-routes` and `after-context` (`packages/cli/src/ast/specs.ts`, `plugins/api/src/node/codegen.ts`) collapse in cli `MiddlewareSpec`.
- The `a.source.localeCompare(b.source)` comparator is written in react, api, expo and vite (`src/index.ts` of each); it becomes one `bySource` in `cli/ast`.
- vite's `resolveAliases` slot has only screens as a reader and no contributor: it goes with those readers or gains its first contributor.
- Plugin command handlers read their positional argument from `process.argv[4]` (`plugins/screens/src/index.ts`); the cli command router hands them positionals through `ctx`.
- A destructive command's confirm rule: `remove` takes `--yes` without a terminal, while `stack db reset` and `deploy` confirm only on a TTY and run unasked without one. One rule covers all three.
- A plan-only deploy check: plugin-db contributes a `cliSlots.deployChecks` entry whose `action` does nothing, only to list migrations; the slot gains a plan-only kind.
- The screens OTP: `stack screens serve`'s fixture code is served inside auth's `generateOTP` wiring (`plugins/auth/src/worker/index.ts`); a runtime seam that screens owns replaces it.
- Auth's DDL test (`plugins/auth/src/worker/runtime.test.ts`) writes `create table` by hand; plugin-db exports a test helper that creates a SQLite file's tables from a drizzle schema.
- The canvas graphs fixture is in `plugins/react-ui/src/ui/components/canvas/__fixtures__/graphs.ts` and `apps/showcase/src/roster/graphs.ts`; the react-ui test and the showcase share one.
- The canvas opening check is both a scene judge (`apps/showcase/src/roster/scenes/canvas.tsx`) and the walk rule `canvas-open` (`plugins/screens/src/ui/walk-checks.ts`); one of them holds it.
- Walk exceptions: each walk exception's class list (`GATE_CENTRED` in `plugins/react-ui/src/ui/lib/walk-classes.ts`) gets its home in ui-core `variants`, imported by both the screens walk and the component, and the test that keeps the copies equal goes.
- The screens workbench's shared facts: the frame type shared by node and screens, the DOM marker names and type floor constants homed in ui-core, and the story-scoped watch and capture state across Storybook hooks.
- react-ui's Biome rules: a `biome-manifest.json` in react-ui so lint names the package.
- The base64 encoder is written in `packages/ui-core/src/form.ts` and `plugins/api/src/lib/cursor.ts`; one helper serves both.
- Config reload: `stack dev` reloads the config in its own process (`loadConfig(..., { reload: true })`, `packages/cli/src/commands/dev.ts`), which leaks each evaluation; the config is evaluated in a restartable child.
- Payload shapes with two defensible forms: node `payload.workerFile` beside `hasWorker` (`plugins/node/src/types.ts`; one worker module field replaces both), cloudflare `payload.serve` (its `main` override and `clientDir` in `src/node/codegen.ts`), auth `createTenancy`'s `pin` (a predicate inside the shared organization resolver, `worker/tenancy.ts`), and db's `assertSqliteDriver` before `runDrizzleKit` (folding it in moves where `pushSchemaLocal` fails, `node/push.ts`).
- `plugins/query/src/read.ts`'s window read compiles only without its explicit type argument, while the same line compiled inside plugin-api; why is not known.

## Owner decisions

- The act-sheet value cycle (Button, Sheet, Form, FormField, Input; 24 files in react-ui, 22 in native-ui): the recommendation is to accept it as real recursion and document the group as one unit. A host-drawn sheet loses its context, since an act sheet opens under a scope boundary below the Shell.
- Edges no consumer can draw, whether a component offers each:
  - a form group with a read of its own: `plugins/react-ui/guide/rules.md` says a group can be given its read, while the public `Form`'s groups (`FormGroupOf`, `packages/ui-core/src/form.ts`) take none;
  - a field's `answered` fold, `change` mark and a checkbox field (FormField is outside the exports);
  - a control disabled while placed alone (`Input`, `Picker`, `Switch` take no `disabled`);
  - a `confirm()` or a toast staged beside others on one page;
  - a file pick shown chosen and disabled, a painted file row, the painted mini image tile;
  - a popup outside a root frame drawing its frame's mode.
- A Pane bar's breadcrumb holds one level, the place's name (`plugins/react-ui/src/ui/components/pane/head.tsx`); whether it shows every parent of the page is open.
- The type mark's box is `size-icon-control` (`ROW_MARK`, 20 px on touch): a two-character mark fits, and the touch box wants 22.
- `useDerivedForm` on native keeps `open`: native clears after every send, and react-ui keeps the values when a form leaves its page.
- `onUpdateRequired` (`plugins/expo/src/client/index.ts`) has no reader in stack: the update wall stays the app's, or it goes.
- The dead public signature types (`Hint`, `LineKind`, `FormatterKind` and the like in ui-core): keep or drop.
- `pickChooser`'s mixed head rule in query mode, and whether blocked rows count (`packages/ui-core/src/list-state.ts`).
- react-ui's canvas `useLayout` split (view policy from the run): build it or cut it.
- `textSize` on `@fcalell/plugin-react-ui/lib/media` is a public name the owner has not confirmed.
- The phone's spot place (`#activity`) tab behaviour.
- The stage rows' 48 and 64 px floor.
- The screens story probe router (`plugins/screens/src/ui/stories.tsx`, `bindRouter` in a `useState` initialiser): building one router without a probe needs a Storybook run.
- The screens state dir (`stateDir`, `plugins/screens/src/node/browser.ts`) and db's `sqliteFile` (`plugins/db/src/node/push.ts`) read `process.env` below the entry; whether the environment is threaded from the entries.
- The `Specimen` story that `packages/ui-core/guide/voice.md` ("How the face is held") and `screen.md` name does not exist: build it or rewrite those lines.
- The phone's `Waveform` is not built, and `docs/architecture/ui-core/sound.md` "Scope" names no cost.
- Docs layout between guides and architecture pages: which page owns each native-ui component's prop list (`rules.md` or `containers.md`, `blocks.md`, `content.md`); the floors stated in both `voice.md` and `docs/architecture/ui-core/tokens.md`; the rules `node.md`, `runtime.md` (job context, MCP order) and `screens.md` own that their guides restate.
- `docs/architecture/plugin-authoring.md` sets a guide page at about 600 words at most, and most guide pages exceed it: the rule changes or the pages do.
- `CLAUDE.md` says "screen run", which `docs/glossary.md` lists under Avoid.
- The showcase's static copy repeats its places and dates (Frankfurt in 7 files, Oct 31 in 3, Oct 14 in 2).
- Consumer migration (stead, martechthings) follows stack, on the owner's word.

## Not verified on a device or browser

- The whole phone: the Expo SDK 58 boot, reanimated 4.7 and gesture-handler 3.3, `usePreventRemove` and iOS swipe-back, LegendList windowing, Thread chat mode, the tall Picker sheet.
- `eas build` under TypeScript 7.
- The press retry's trusted-event check in Chrome: no showcase screen draws a control under a fixed bar.
- Production D1's SQLite version for `nulls last` from an index.
- 52 Storybook stories whose drawing changed and that no one has looked at: `shared-actionbar--error`, `atom-button--rest`, `content-canvas--rest`, `layout-form--*` (7), `content-gallery--rest`, `content-image--rest|loading|error`, `atom-input--rest|disabled|error|empty`, `layout-pane--rest`, `shared-picker--rest|loading|selected|disabled|error`, `layout-section--*` (9), `shared-sheet--*` (9), `atom-switch--rest|disabled`, `content-table--*` (6), `content-thread--rest`, `shared-toast--rest`. The first risk: an overlay stage holds a `Gate` (`h-dvh`), so sheets in stages are modal.
