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

## Checklist (step 2, confirmed by the owner)

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

### Audit (run; findings in `.refactor/findings/`)

Every agent read `.refactor/brief.md`. N2 is `.refactor/volatility.ts` over `graph.json` and `churn.txt`.

| Findings file | Slice | Files read in full |
| --- | --- | --- |
| `U01.md` | `packages/cli` | 64 of 64 |
| `U02a.md` | ui-core contract modules | 21 of 26 (the four data files went to U02c) |
| `U02b.md` | ui-core model modules | 45 of 45, two tests in part |
| `U02c.md` | ui-core `roster.ts`, `descriptors.ts`, `variants.ts`, `variant-tables.ts` | 4 of 4 |
| `U03.md` | `plugins/api` | 45 of 45 |
| `U04.md` | `plugins/auth` | 31 of 31 |
| `U05-U07-U09-U10.md` | cloudflare, expo, react, vite | 42 of 42 |
| `U06-U08.md` | db, node | all source; two node tests in part |
| `U11.md` | `plugins/screens` | 43 of 43 source, 10 of 12 tests |
| `U12ab.md` | react-ui outside components | 78 of 78 |
| `U12c-1.md` to `U12c-4.md` | react-ui components | 23, 25, 35, 59: all |
| `U12d.md` | react-ui `ui/showcase` | 8 of 54; structural answers complete, line-level counts from greps (accepted as partial: the folder is read whole when it moves) |
| `U13a.md` | native-ui outside components | 64 of 64 |
| `U13b-1a.md`, `U13b-1b.md`, `U13b-1c.md` | native-ui row, table; picker, form; sheet, section, input, bar-chart | 9, 8, 16: all. They replace `U13b-1.md`, which was answered from greps and is ignored |
| `U13b-2.md` | native-ui remaining components | 69 of 69 |
| `U14-U15.md` | both apps | 68 of 68, 19 of 19 |
| `U16.md` | root, turbo, manifests | manifests by field dump |
| `U17.md` | every Markdown file | path, command and count statements only |
| `U17b.md`, `U17c.md`, `U17d.md` | behaviour claims: architecture docs; server guides; UI guides | 25 pages read, claims sampled; 62 pages read; by script. Not merged into `problems/`: read them directly |
| `X1.md` | react-ui against native-ui | from diffs and export lists |
| `X3.md` | plugin-api against its importers | 11 files in full |
| `N2.md` | volatility | script |

Consolidation: four Sonnet agents merge the findings by question group into
`.refactor/problems/{hidden,needless,surplus,special-tests}.md` following `.refactor/consolidate.md`
(rows recounted, grouped into problems by mechanism, no fixes). State: done.

Corrections the audit made to earlier statements in this file:

- Stale stories: both story writers remove files they no longer generate
  (`plugins/screens/src/node/stories.ts:166-173`, `apps/showcase/.storybook/roster.ts:80-81`). The gate
  fails because the showcase `tsc -b` reads the gitignored `stories/` folder that only `pnpm stories`
  regenerates.
- Turbo overlap: proven as a defect (`turbo.json:7,11` declare `.stack/**`;
  `apps/*/tsconfig.worker.json:13-14` emit into `.stack/types`; 55 cached `generate` archives hold
  `.stack/types/`). The archive of the failing run (`f487e5c3ebb0f471`) holds no `.stack/types`, so
  the cause of the 64 errors in `check-2-stale-types.log` is unknown and is reproduced in step 3.
- The `stopAll` failure is in the test: `packages/cli/src/commands/dev.test.ts:72` sleeps 500 ms
  instead of waiting for the child's `up` line.

## Problem list (step 2 result)

`.refactor/problems/INDEX.md` lists every problem on one line (id, mechanism, rows). The rows are in
`.refactor/problems/{hidden,needless,surplus,special-tests}.md`; each problem names its findings files.
Step 3 starts from INDEX.md, opens a problem's rows only when designing its fix, and writes each fix
above the problem ids it resolves.

| Group | Code | Rows | Problems |
| --- | --- | --- | --- |
| Hidden links | H1 copies | 405 | 8 |
| | H2 state another module sets | 177 | 8 |
| | H3 features split by layer | 119 | 4 |
| | H4 call orders | 109 | 5 |
| | H5 pinned lists | 29 | 4 |
| Needless links | N1 non-public imports, one-caller exports | 1207 | 33 |
| | N2 uphill imports | 1108 of 2820 edges; 818 cross-package | tables in `needless.md` and `findings/N2.md` |
| | N3 one-caller parameters | 204 | 6 |
| | N4 shallow modules | 64 | 5 |
| Surplus | S1 pass-through | 121 | 6 |
| | S2 extension points that never vary | 145 | 6 |
| | S3 no importer | 763 | 28 |
| | S4 comments restating code | 573 in 266 files (a floor; 21,855 comment lines exist) | 1 |
| Special cases | C1 one-value branches | 275 | 9 |
| | C2 one-caller flags | 78 | 3 |
| | C3 swallowed catches | 67 | 5 |
| | C4 timers for events | 55 | 4 |
| | C5 suppressions | 286 | 14 |
| Tests | T1 pass when broken | 21 | 3 |
| | T2 time, order, machine | 32 | 5 |
| | T3 untested branching modules | 176 | 11 |
| Docs | disproved statements | 43 (U17 9, U17b 10, U17c 9, U17d 15; floors) | in the findings files |

Row counts are what the audits listed, recounted by the merge. Known limits: copies between the two UI
plugins are partly counted twice (two audits, different line ranges); no-importer exports are word-grep
results and are proven by the compiler at removal; `needless.md` dropped U12c-4's cycle-edge list as a
repeat of U12c-2's, which is checked at the start of step 3.

The largest mechanisms, which the step 3 design has to stand behind:

1. One roster component lives in five places: ui-core data (`roster.ts`, `descriptors.ts`,
   `variants.ts`, `variant-tables.ts`), a react-ui folder, a native-ui folder, plugin `lib/` and a
   showcase frame. 70 of 77 `roster.ts` commits also touch a react-ui component; 52 touch both UI
   plugins. (H1-01, H1-02, H3-02, H3-03, N2)
2. ui-core is the most imported and the most changed package: 8.2 commits per file against 1.7 to
   5.3 elsewhere; 565 of 818 uphill cross-package edges point at it (react-ui 303, native-ui 243, showcase 12, phone 4, screens 3).
3. The UI plugins import plugin-api 155 times; about four fifths of the names are model shapes, one
   fifth read and act hooks. plugin-api's `read.ts`, `acts.ts`, `ability-client.ts`, `scope.ts` mix
   wire and model. (N1-06, N1-11, N1-12, N1-25; owner preference P1)
4. Component folders import each other's internals and form one value-import cycle per UI plugin
   (65 closing edges in react-ui, 22 in native-ui). (N1-03, N1-04, N1-07, N1-18)
5. Generated and gitignored state feeds the gate: `.stack/**` is a turbo output of `generate` and
   the `tsc -b` emit folder; the showcase type-checks `stories/` that only `pnpm stories` writes.
   (H2-02, H4-03, the baseline failures)
6. Public surface nobody uses: 52 `exports` subpaths and about 580 exported symbols with no importer.
7. Checks outside the gate, and 13 package `check` scripts that write. (P6)
8. Tests and tooling wait on fixed time: 9 tests, 16 tooling timers, 27 frame-count waits. (T2-01,
   C4-01, C4-02)

## Progress

| Step | State |
| --- | --- |
| 1 Additions | done |
| 2 Problem list and checklist | done: 196 problems in `.refactor/problems/INDEX.md`, presented to the owner |
| 3 Redesign | not started |
| 4 Fixes | not started |
| 5 Fresh-agent checks | not started |

## Baseline

Taken at 686cd3e1 before any change. Logs in `.refactor/baseline/`.

| Run | Command | Exit | Result |
| --- | --- | --- | --- |
| Gate | `pnpm check` | 0 | `check.log`: check-types 30 of 30 tasks, test 25 of 25 tasks, 537 tests pass, 0 fail, 0 skipped, Biome 937 files clean |
| Release | `pnpm release:check` | 0 | `release-check.log`: "Release check passed."; web 475 packages, node 449, native 1081; one copy of each stack package |
| Screens | `pnpm --filter showcase test-screens --all --mode dark --width 320,1920 --state data,empty --shots shots/baseline` | 1 | `test-screens.log`: no test ran; `CDP Emulation.setDeviceMetricsOverride timed out after 30000 ms` on `_app/deploys/$deployId`; not retried, the owner decides how (recommended: `stack screens browser stop`, then once more). `--shots` must be a folder inside the app |
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
