# Roadmap

Unbuilt work, one item each; an item moves into the built docs when it lands.

## Public surface

Each item adds, renames or moves a public name, which a consumer's import follows, or changes a stored shape.

- Name clashes: `accepts` (`ui-core/src/file.ts` and `drag.ts`), `STATES` (`controls.ts` and `roster/shared.ts`), `Band` (`drag.ts` and `roster/section.ts`), `Held` (read and form) and `Fielded` each name two things. One of each pair is renamed.
- The motion knobs: `tuned`, `tune` and `subscribeMotion` live in `@slotform/ui-core/paint` and move to a `motion` module; `release()` in `follow.ts` reads `tuned.fling` and `tuned.reach` and takes them as arguments instead.
- Density pins: the pin names `room`, `touch` and `desktop` are literals in react-ui `src/ui/lib/media.ts` beside `ROOM_SCOPE` in the public `./density`; they become one exported set.
- `isDevMode` is written in `plugins/api/src/worker/index.ts` and exported from `plugins/auth/src/worker/listener.ts`, and `tooManyRequests` lives in auth's `worker/oauth.ts`; `@slotform/api` exports both.
- The drawn row types (`WithReads`, `Row`, `RowItem`) move from react-ui `components/section` to a row types module; the section subpath re-exports them or consumers import from the new place.
- react-ui's `lib/read.tsx`, `lib/more.tsx` and `lib/not-found.tsx` import components; `FrameBody`, `StateLine`, `OptionsLine`, `FrameLine`, `MoreRow` and `NotFound` move into component folders, which moves the public `./lib/not-found` and about 19 importers.
- Typing gaps the apps cast around, each a Slotform shortfall the app reports and does not patch:
  - a Read passed straight to a Picker's `options` and a Section's `groups` (`apps/showcase` `sprints.tsx`, `owners.at((all) => all)`);
  - a Toolbar filter's `onChange` typed by its `options` values (`releases.tsx`, `next as Stage | null`);
  - `AuthCallbacks` env typed with `SLOTFORM_DEV` (`apps/phone` `worker/plugins/auth.ts`);
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

- The phone's query wiring: native-ui `requires: ["expo", "api", "query"]` and wires the phone's `QueryProvider`, `queryClientModule` and the `src/lib/query.ts` scaffold (`plugins/native-ui/src/index.ts`). Moving them into the `query` plugin needs `@slotform/query` to depend on `@slotform/expo`, which closes the package cycle query, expo, cloudflare, screens, query.
- Auth's wire names: `AUTH_PREFIX` is restated in `plugins/expo/src/worker/version-gate.ts` and `plugins/node/src/server/ws-guard.ts`, `SESSION_ENDED_CHANNEL` in `ws-guard.ts`, and the session path (`SESSION_PATH`) in `plugins/screens/src/ui/answer.ts`; the `auth` plugin owns each. They move to `@slotform/api/wire` or are read from the `auth` plugin, and `RATE_LIMITER_RPC` (`plugins/api/src/worker/guards.ts`, the literal in `plugins/cloudflare/src/index.ts`) joins them.
- Dependency ranges: plugins write their consumers' ranges as literals (native-ui `uniwind`, `@gorhom/bottom-sheet`, `lucide-react-native`, `@tanstack/react-query`, `@better-auth/expo`; node `esbuild`; expo `@types/react`, `babel-plugin-react-compiler`). A cli helper reads them from the plugin's own manifest, or `release:check` asserts they match.
- `SLOTFORM_PACKAGES` (`packages/cli/src/lib/slotform-packages.ts`) lists each package's dependencies by hand; the build generates it from the manifests.
- Template names: the init templates name plugins by literal (`packages/cli/src/templates/tsconfig.ts`, `package-json.ts`: `vite`, `expo`, `api`, `db`, `node`, `cloudflare`, `react`); a slot contributed by api, db, expo and react replaces each test.
- The expo `lib-api.ts` template writes `http://localhost:8787` and `/rpc` (`plugins/expo/templates/lib-api.ts`); the prefix comes from `api.slots` and the port from the `cloudflare` plugin.
- Barrels: `generateRouteBarrel` (`plugins/api/src/node/barrel.ts`) and `generateServiceBarrel` (`plugins/node/src/node/barrel.ts`) become one cli `directoryBarrel`. The node services watcher (`plugins/node/src/index.ts`, `devWatchers`) writes the barrel itself and leaves `servicesModule` stale; a cli `WatcherSpec` regenerate step does both.
- `WatcherSpec`'s handler `type` (`"add" | "unlink" | "change"`, `packages/cli/src/specs.ts`) is read by five plugins; reshaping it changes each.
- Middleware phases: `before-routes` and `after-context` (`packages/cli/src/ast/specs.ts`, `plugins/api/src/node/codegen.ts`) collapse in cli `MiddlewareSpec`.
- The `a.source.localeCompare(b.source)` comparator is written in react, api, expo and vite (`src/index.ts` of each); it becomes one `bySource` in `cli/ast`.
- vite's `resolveAliases` slot has only screens as a reader and no contributor: it goes with those readers or gains its first contributor.
- Plugin command handlers read their positional argument from `process.argv[4]` (`plugins/screens/src/index.ts`); the cli command router hands them positionals through `ctx`.
- A destructive command's confirm rule: `remove` takes `--yes` without a terminal, while `slotform db reset` and `deploy` confirm only on a TTY and run unasked without one. One rule covers all three.
- A plan-only deploy check: the `db` plugin contributes a `cliSlots.deployChecks` entry whose `action` does nothing, only to list migrations; the slot gains a plan-only kind.
- The screens OTP: `slotform screens serve`'s fixture code is served inside auth's `generateOTP` wiring (`plugins/auth/src/worker/index.ts`); a runtime seam that screens owns replaces it.
- A test database: auth's DDL test (`plugins/auth/src/worker/runtime.test.ts`) writes `create table` by hand, and a consumer's tests build a scratch SQLite by splitting its migration SQL by hand; `@slotform/db` exports a public test helper that creates a SQLite file's tables from the schema or the committed migrations, which adds an `@slotform/db` subpath the consumer imports.
- The node target's background work, each changing the `node` plugin and the packages named:
  - Dev push before boot: under `slotform dev` db pushes the schema in `cliSlots.devReadySetup`, after the node server listens, so a service's first write on a fresh database finds no tables; a SQLite push before the dev processes start needs a pre-process step in the cli's dev procedure (cli, db; the `node` plugin unchanged).
  - Services under `slotform screens serve`: the serve target starts the consumer's services (`plugins/node/src/index.ts`), so a service that writes (a poller) changes the scratch database during a run; leaving them out needs a rule for which services a run needs (screens).
  - Cron on node: the `node` plugin refuses `src/worker/scheduled.ts`; honouring it needs a scheduler in the server that reads the cron schedules (api).
  - Typed env on node: `env` is `unknown` there (no target names `api.slots.envType`), so a service narrows `jobContext().env` by hand; node naming an env type from `api.slots.env` changes the generated `createWorker` call (api).
  - A job context per further listener: `jobContext()` is built with the main listener's env, so work for a further listener's origin (its auth instance) has no context; a `jobContext(listener)` form adds a parameter to the service context (api's listener contract).
- The canvas graphs fixture is in `plugins/react-ui/src/ui/components/canvas/__fixtures__/graphs.ts` and `apps/showcase/src/roster/graphs.ts`; the react-ui test and the showcase share one.
- The canvas opening check is both a scene judge (`apps/showcase/src/roster/scenes/canvas.tsx`) and the walk rule `canvas-open` (`plugins/screens/src/ui/walk-checks.ts`); one of them holds it.
- Walk exceptions: each walk exception's class list (`GATE_CENTRED` in `plugins/react-ui/src/ui/lib/walk-classes.ts`) gets its home in ui-core `variants`, imported by both the screens walk and the component, and the test that keeps the copies equal goes.
- The screens workbench's shared facts: the frame type shared by node and screens, the DOM marker names and type floor constants homed in ui-core, and the story-scoped watch and capture state across Storybook hooks.
- react-ui's Biome rules: a `biome-manifest.json` in react-ui so lint names the package.
- The base64 encoder is written in `packages/ui-core/src/form.ts` and `plugins/api/src/lib/cursor.ts`; one helper serves both.
- Config reload: `slotform dev` reloads the config in its own process (`loadConfig(..., { reload: true })`, `packages/cli/src/commands/dev.ts`), which leaks each evaluation; the config is evaluated in a restartable child.
- Payload shapes with two defensible forms: node `payload.workerFile` beside `hasWorker` (`plugins/node/src/types.ts`; one worker module field replaces both), cloudflare `payload.serve` (its `main` override and `clientDir` in `src/node/codegen.ts`), auth `createTenancy`'s `pin` (a predicate inside the shared organization resolver, `worker/tenancy.ts`), and db's `assertSqliteDriver` before `runDrizzleKit` (folding it in moves where `pushSchemaLocal` fails, `node/push.ts`).
- `plugins/query/src/read.ts`'s window read compiles only without its explicit type argument, while the same line compiled inside `@slotform/api`; why is not known.

## Decided, to build

Each item is decided and waits to be built. One that adds a part or crosses packages is designed first (an architecture section and a change map), then built.

- Consumer migration: the two consumer apps move onto Slotform in one pass each, in their own repos, by the [procedure](procedures/consumer-migration.md).

## Not verified on a device or browser

- The whole phone: the Expo SDK 58 boot, reanimated 4.7 and gesture-handler 3.3, `usePreventRemove` and iOS swipe-back, LegendList windowing, Thread chat mode, the tall Picker sheet.
- `eas build` under TypeScript 7.
- The press retry's trusted-event check in Chrome: no showcase screen draws a control under a fixed bar.
- Production D1's SQLite version for `nulls last` from an index.
- 52 Storybook stories whose drawing changed and that no one has looked at: `shared-actionbar--error`, `atom-button--rest`, `content-canvas--rest`, `layout-form--*` (7), `content-gallery--rest`, `content-image--rest|loading|error`, `atom-input--rest|disabled|error|empty`, `layout-pane--rest`, `shared-picker--rest|loading|selected|disabled|error`, `layout-section--*` (9), `shared-sheet--*` (9), `atom-switch--rest|disabled`, `content-table--*` (6), `content-thread--rest`, `shared-toast--rest`. The first risk: an overlay stage holds a `Gate` (`h-dvh`), so sheets in stages are modal.
