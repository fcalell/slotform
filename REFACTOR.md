# Refactor

Working file for the refactor of `@fcalell/stack`. It is deleted in the last commit. Working files
(findings, row assignments, baseline logs, scripts) live in `.refactor/`, which `.gitignore` excludes
until the last commit removes that line.

## Session start

Every session, before any work:

```
git fetch
git status --porcelain          # empty
git rev-parse master origin/master   # refactor commits are local: master is ahead, never behind or diverged
```

Stop and tell the owner if the tree is dirty or `origin/master` has commits `master` lacks.

## Goal

Pieces that change together end up together, pieces that do not are not tied, and everything
depends on what changes less.

Done when: as few special cases remain as possible, a typical change lands in one place, no import
reaches something more volatile than the importer, fresh subagents find no issues, and behaviour is
the same as at the start (tested at the end against the baseline).

## Confirmed decisions

- Comments that only restate the code are removed.
- Tests that would not catch a real bug are removed; tests that fail without a bug are fixed. Tests
  are done last.
- One commit per fix group on `master`, scoped by package, no push. Docs change in the same commit.
- Before removing or renaming a public export, subpath or slot: grep `~/projects/stead` and report.
- Agents: Haiku explores, Sonnet audits, summarises and does easy implementation, Opus does hard
  implementation. An agent gets a checklist and a report shape. Agents that edit the same files run
  one after another.
- Each step ends by telling the owner it is a good point to compact.

## Owner preferences from an earlier attempt (checked against current code in step 3)

| # | Preference | First reading of current code (not yet audited) |
| --- | --- | --- |
| P1 | UI does not depend on plugin-api, nor api on UI. Read, act and draft model in ui-core; plugin-api keeps the wire; a new `@fcalell/plugin-query` that requires api binds them. No `@fcalell/read` package | Open. react-ui has 82 imports of plugin-api (61 `tanstack-query`), native-ui 74 (54 `tanstack-query`); plugin-api imports `@fcalell/ui-core/store`; `plugins/api/src/read.ts` is 1256 lines and `packages/ui-core/src/read.ts` 216 |
| P2 | Hooks both UI plugins run live in ui-core React subpaths | Open. 34 same-named files in the two `src/ui/lib/` folders, 3 byte-identical (`clock.ts`, `confirm.ts`, `same-by.ts`); ui-core has no React subpath |
| P3 | Showcase data moves from react-ui into `apps/showcase` | Open. `plugins/react-ui/src/ui/showcase/` exists and is exported (`./showcase/*`) |
| P4 | A list a check holds equal to a derivable set is derived | To audit (H5) |
| P5 | The UI plugins' `./lib/*` pattern closes; `exports` names each module | Looks done: both manifests name each `./lib/<module>`. plugin-api names `./lib/*` modules one by one too. To confirm (N1) |
| P6 | Every check the repo has runs inside `pnpm check` | Open. `pnpm release:check`, ui-core `design-md` lint, `icon-name`, showcase `test-screens` and `build-storybook` are outside it |
| P7 | A stream read gets a stop | To audit (C4/P7 row) |

## Skeleton scripts

```
node .refactor/skeleton.ts [path-prefix] > .refactor/skeleton.txt   # every file, bodies cut
node .refactor/graph.ts > .refactor/graph.txt                        # package edges, folder edges, cycles, unimported; writes graph.json
```

Both run after each fix group. `.refactor/churn.txt` is commits per file over six months.

## Starting measurements (686cd3e1)

| Measure | Value |
| --- | --- |
| Tracked files | 1089 (866 source, 89 tests, 148,075 TS lines) |
| Package cycles | 0 |
| File cycles, all imports | 8 (react-ui components 46 files, native-ui components 35 and 3, cli 5, ui-core 2, node 2+2+2) |
| File cycles, value imports | 2 (react-ui 24 files, native-ui 22 files) |
| Unimported non-route files | 28 candidates |
| Comment lines | 21,855 |
| `catch {` without a binding | 77 (16 empty) |
| `setTimeout(` outside tests | 47; `sleep(`/`delay(` 11 |
| Skipped tests | 0 |
| `@ts-ignore`/`@ts-expect-error` | 5; `biome-ignore` 135; `any` 49; `as unknown as` 44 |
| `process.env.` reads outside tests | 16 |
| Churn, six months, commits touching | react-ui 1562, native-ui 719, ui-core 633, showcase 444, screens 233, api 150, cli 128, auth 118, db 113, node 103, phone 49, expo 42, vite 34, react 33, cloudflare 33 |

Volatility order from churn, most stable first: typescript-config, biome-config, cloudflare, react,
vite, expo, node, db, auth, cli, api, screens, ui-core, native-ui, react-ui, then the apps.
ui-core is imported by eight packages and is the third most changed.

## Checklist (step 2, awaiting confirmation)

### Units

| Unit | Scope |
| --- | --- |
| U01 | `packages/cli` |
| U02 | `packages/ui-core` |
| U03 | `plugins/api` |
| U04 | `plugins/auth` |
| U05 | `plugins/cloudflare` |
| U06 | `plugins/db` |
| U07 | `plugins/expo` |
| U08 | `plugins/node` |
| U09 | `plugins/react` |
| U10 | `plugins/vite` |
| U11 | `plugins/screens` |
| U12a | `plugins/react-ui/src` outside `ui/` (index, node, density, types) |
| U12b | `plugins/react-ui/src/ui/lib` |
| U12c | `plugins/react-ui/src/ui/components` |
| U12d | `plugins/react-ui/src/ui/showcase` |
| U13a | `plugins/native-ui/src` outside `ui/components` |
| U13b | `plugins/native-ui/src/ui/components` |
| U14 | `apps/showcase` |
| U15 | `apps/phone` |
| U16 | Root: `scripts/`, `turbo.json`, `package.json` scripts, `packages/typescript-config`, `packages/biome-config`, every `package.json` |
| U17 | `docs/`, `CLAUDE.md`, `CONTRIBUTING.md`, `README.md`, every `guide/*.md` |
| X1 | The pair react-ui and native-ui (the 133 same-named files under `src/ui/`) |
| X2 | ui-core against its eight importers |
| X3 | plugin-api against react-ui, native-ui, screens, node, expo, auth |

### Questions

Each answer is a count and a `file:line` list, one line of evidence per row. A zero is an answer.

Hidden links
- H1 How many blocks of 8 or more lines, or same-named functions with the same body, exist twice (inside the unit or against another unit)?
- H2 How many modules read a global, an env var, a file on disk or module-level mutable state that another module sets?
- H3 How many features have their files in two or more folders split by layer?
- H4 How many functions must be called in an order the caller has to know (init before use, register before run)?
- H5 How many lists does a test or check hold equal to a set that code could derive?

Needless links
- N1 How many imports reach a module that is not the target's public surface, or a symbol exported for exactly one outside caller?
- N2 How many imports reach a file with more six-month commits than the importer (`.refactor/churn.txt`), across a folder or package boundary?
- N3 How many functions take a parameter or option that one caller passes, or that always gets one value?
- N4 How many modules are shallow: every export a body of 5 lines or fewer that delegates, or a file under 30 lines with one importer?

Surplus
- S1 How many functions or components only forward their arguments?
- S2 How many extension points never vary: a slot with zero or one contributor, a generic with one instantiation, a callback or option with one value, an interface with one implementation?
- S3 How many exports, files or `exports` subpaths have no importer in this repo? For each public one, how many uses in `~/projects/stead`?
- S4 How many comments only restate the code under them? (count per file, files listed)

Special cases
- C1 How many branches test for one literal value, one plugin name, one platform or one caller?
- C2 How many boolean or mode parameters select a code path for one caller?
- C3 How many `catch` blocks neither rethrow, return a typed failure nor report?
- C4 How many timers, sleeps, polls or retries stand in for an event or a promise?
- C5 How many suppressions (`@ts-ignore`, `@ts-expect-error`, `biome-ignore`, `any`, `as unknown as`) have no stated fact behind them?

Tests (audited now, changed last)
- T1 How many tests would still pass with the code under test broken (assert a mock, restate a constant, repeat the implementation)?
- T2 How many tests depend on time, order, the network or the machine?
- T3 How many modules with branching logic and three or more importers have no test?

Docs
- D1 How many statements in a doc disagree with the code?
- D2 How many facts are stated in two docs?

Owner preferences
- P1 to P7: for each, does the current code already satisfy it (yes or no), and the `file:line` list of what does not.

### Unit and question matrix

Every unit U01 to U15 answers H1 to H5, N1 to N4, S1 to S4, C1 to C5 and T1 to T3. U16 answers H1, H2,
H5, S2, S3, C1, C4 and P6. U17 answers D1 and D2. X1 answers H1, H3 and P2. X2 answers N2, S3 and P2.
X3 answers N1, N2 and P1, P7. P3 is answered by U12d and U14, P4 by every H5, P5 by U12a, U13a and U03.

### Report shape handed to each agent

```
unit: U03
H1: 4
  plugins/api/src/read.ts:120 | same body as plugins/api/src/acts.ts:44 | 14 lines
...
not answered: <question> | <why>
```

## Progress

| Step | State |
| --- | --- |
| 1 Additions | done |
| 2 Problem list and checklist | checklist written, awaiting confirmation; audit not run |
| 3 Redesign | not started |
| 4 Fixes | not started |
| 5 Fresh-agent checks | not started |

## Baseline

Taken at 686cd3e1 before any change. Logs in `.refactor/baseline/`.

| Run | Command | Exit | Result |
| --- | --- | --- | --- |
| Gate | `pnpm check` | 0 | `check.log`: check-types 30 of 30 tasks, test 25 of 25 tasks, 537 tests pass, 0 fail, 0 skipped, Biome 937 files clean |
| Release | `pnpm release:check` | not run yet | |
| Screens | `pnpm --filter showcase test-screens --mode dark --width 320,1920 --state data,empty --shots .refactor/baseline/shots` | not run yet | |
| Stories | showcase Storybook build and story run, sharded | not run yet | |

Tests per package: cli 38, ui-core 98, api 45, auth 29, cloudflare 16, db 27, native-ui 17, node 38,
react 4, react-ui 73, screens 126, vite 26.

The gate took five runs to go green on this machine. Each failure is a finding for the audit:

| Log | Exit | Cause |
| --- | --- | --- |
| `check-1-stale-stories.log` | 2 | Gitignored `apps/showcase/stories/` held 64 generated stories, most from October, importing frames that no longer exist. Nothing removes a story that is no longer generated, and `tsc -b` type-checks them. Moved to `.refactor/baseline/stale-stories` |
| `check-2-stale-types.log` | 1 | 64 type errors: `apps/showcase/.stack/types/src/worker/routes/index.d.ts` listed 8 of 16 route modules after `showcase:generate` was a turbo cache hit. `generate` declares `.stack/**` as output and `check-types` emits into `.stack/types/`, so a replay appears to restore old declarations (mechanism not yet proven). Moved to `.refactor/baseline/stale-types` |
| `check-3-forced.log` | 1 | Gate commands with `--force`: types and all 537 tests pass; Biome failed only on `.refactor/baseline/stale-stories` (Biome reads `.gitignore`, not `.git/info/exclude`) |
| `check-4-flaky-stopall.log` | 1 | `packages/cli/src/commands/dev.test.ts:67` "stopAll kills a process that ignores SIGTERM after the grace" failed `Date.now() - started >= 400`; it passed in the runs before and after |
| `check.log` | 0 | The baseline |

## Decision log

| Decision | Why |
| --- | --- |
| `.refactor/` is ignored through a `.gitignore` line, removed in the last commit | Baseline logs and shots are large and machine-bound; the session-start check needs a clean tree; Biome honours `.gitignore` only |
