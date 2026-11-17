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

## Where things stand (read this first; it overrides older lines below)

State at `ce220c23` plus log commits, 2026-11-16: `pnpm check` is green on the whole tree (check-types 32 of 32, test 27 of 27, Biome clean). Master is about 120 commits ahead of origin, unpushed. F1 to F9 and the stable-package parts of F10, F11 and F12 are committed. Entries lower in this file that say "unverified" or "uncompiled" predate the first green gate.

Rules that changed since the Orchestration section was written:

- Agents may now compile and test their own perimeter (`pnpm --filter <pkg> check-types`, `test`, `biome check --write` on touched files). They still change no git state; the orchestrator runs `pnpm check` and commits. `.refactor/agent-rules.md` still says no build or check: each prompt states this exception.
- **No visual checks** (no Storybook, no `test-screens`, no shots, no browser) unless the owner says otherwise.
- **The showcase is a consumer**: `apps/showcase` imports only what `exports` lists; no relative import into a plugin.
- Two consumers are checked before a public removal or move: stead and martechthings. `node .refactor/consumers.mjs` (after a build) prints every import of theirs that no longer resolves. Neither is ever edited.
- An agent cannot write a file named like a report; it returns its report in its reply.

Remaining work, in order:

1. **F10 and F11 over both UI plugins, ui-core and the showcase: done** (row lists and briefs in `.refactor/f10ui/`). Commits: native-ui `947b1761`, `1b2b583d`, `d61cc936`, `867a0841`; react-ui `ce220c23`, `11568f45`, `6751d6fc`, `519d1e3d`, `a46a4b2b`; ui-core `4288a757`; cli `83660c41`; showcase `4107f009`. The reshape rows are settled (`.refactor/f10ui/reshape-rows.md`, proposals P1 to P6 built in both plugins where the defect exists; react-ui keeps the decision sheet `centred?: boolean`). Public changes, consumers unchanged (`node .refactor/consumers.mjs` gives the recorded break list): ui-core `asChip` removed, `matrixCells()` takes no argument, `planFrame`'s `enclosing` required; cli css helpers' `label` required; react-ui `Lockup` lost `logo`. Native `useDerivedForm` keeps `open` (native clears after every send, react-ui keeps the values when a form leaves its page): for the owner's props pass. Owner-approved and committed: react-ui Badge `hit` (one prop for `underlined` plus `className`); `ReasonHostContext` holds the press (the `ReasonHost` interface is gone, consumers 0); new export `isEnded` in `@fcalell/ui-core/read` at 25 failed-or-missing tests. `pnpm check` green at HEAD.
2. **P7: done** (brief `.refactor/p7/brief.md`; commits below in git log, gate green): every `read(..., { kind: "stream" })` returns `StreamRead<T>` with `stop(): Promise<T | undefined>` (aborts the running stream through the queryFn signal; the read keeps the chunks so far), and `streamRead({ queryKey, stream, reducer, initialValue, onDone })` beside `read` in `@fcalell/plugin-query/read` replaces both apps' `answerOf`. `pause` and `spoken` stay in the apps as demo data.
3. **F7 part 2: done** (brief `.refactor/f7b/brief.md`; `e1c5c221` step A, the next commit step B). New public names: `createActs`, `ActPlatform`, `ToastOptions`, `Acting`, `Runnable` (`ui-core/react/acts`); `moreMenu`, `endedItems` (`ui-core/acts`); `optionReads` (`ui-core/list-state`); `useFormModel`, `FormModel`, `FieldModel`, `FormModelProps` (new subpath `ui-core/react/form`); `FormSubmit` (`ui-core/form`). Moved from the plugins' public `lib/act` and `components/form`: `Acting`, `Runnable`, `FormSubmit` (stead 0). native-ui now behaves as react-ui: awaits `onDone`, clears only a form that stays and goes nowhere, `stays` plus `useClearOnOpen`, its bar paints under the ability read, and its fields no longer paint while only the ability loads. native-ui keeps `useSubmitOf` (its hoisted sheet bar). For the docs sweep: native-ui's `Form` JSDoc lacks react-ui's sentence that a pick or switch with a schema `default` is required.
4. ~~ui-core's 84 type-only roster cycles~~ done (`b5e45e62`): the descriptor model moved whole to `roster/descriptors.ts` (`descriptors.ts` re-exports it with `export type *`), `RosterEntry`, `Owns`, `STATES`, `PLATFORMS`, `Axes`, `Matrix`, `ContentTone`, `Variant`, `VariantProps`, `ClassProp` to `roster/shared.ts`, `BUTTON`/`ICON_BUTTON` to `roster/button.ts`, `FIELD_VALUE` to `roster/input.ts`. tsc 5.9.3 proves native-ui's `RouteRegistry` augmentation merges through the re-export. No public name moved. DESIGN.md regenerates identical. File cycles, all imports: 5 to 4. **Found:** a value cycle in the showcase, `roster/frames/dock.tsx` and `image.tsx` (owner list).
5. **Final docs sweep, as a knowledge-base rebuild** (owner: run the `knowledge-base` skill, in a fresh session so the updated nix-provisioned CLAUDE.md, agents and skills load). **Decided:** sources are docs/, root CLAUDE.md and README.md, package READMEs (moved onto the layout) and guide/*.md (read-only sources: they stay where they ship; a fact in a guide and a doc gets one home, the guide for how to build on stack, docs/ for how stack is built). **Owner's answers (2026-11-16):** (a) the comment inventory reads all 2,827 comment blocks of 3+ lines (945 KB), sorted by worker-sonnet agents; (b) the queued fixes land first as their own commit (brief `.refactor/kb/queued-brief.md`); (c) the inventory covers every source at `##` level, guides included, about 16 reader-haiku agents. Queued-fixes audit, carried into the map: ui-core's subpath list is in both `packages/ui-core/README.md` and `docs/architecture/ui-core.md` (one home in the map); both plugins' `Form` JSDoc repeat the form rule that ui-core's `useFormModel` owns (`packages/ui-core/src/form.ts:265-275`), so the comments step moves it to `FormModelProps` and the plugins point there. Map decisions (owner): package READMEs keep summary, install, guide index, exports, license, and their implementation half moves to `docs/architecture/plugins/<name>.md`; **every** rule comment moves into a page and the comment becomes a pointer; full layout (`overview.md` to `docs/architecture.md`, new `index.md`, `glossary.md`, `procedures/`, `rows-are-data.md` rewritten to current state, no `evidence.md`); README drops its tables and links (reverses F12). Built and committed: `612d382a` (move), `c7491313` (comments to pointers, 1,127 pointers, 0 non-comment lines), `84e32d42` (index, glossary of 160 terms, CLAUDE.md and CONTRIBUTING.md trimmed), gate green at each. Audit of the rebuild (`.refactor/kb/audit-rebuild.txt`): 20 facts said twice, 3 link-only sections, 9 bolded terms not in the glossary, 1 "Rejected:" passage; a docs fix is running. **Owner (2026-11-17): the 22 words with two meanings are renamed in code too, now**; a census of their code names and consumer use (`.refactor/kb/rename-census-brief.md`) feeds a design the owner confirms before any rename. **Design confirmed (owner, 2026-11-17):** `.refactor/kb/rename-design.md` (D1 external vocabulary stays, D2 the meaning with more public and consumer use keeps the word, D3 `docs/procedures/` and `## Scope` stay, D4 consumers migrate after stack; the name table as drafted). **Renames built** in five waves (`91bb5f4a`, `597927cc`, `78c05b07`, `8343aa0d`, `83b4fd5e`), gate green at `83b4fd5e`; `node .refactor/consumers.mjs` now adds stead `Place` (2 files) and `MessageSlots` (3 files); the prop and guide renames below are not import-visible and are checked by hand at migration. Also renamed beyond the table, by the waves: guide pages `frames.md` to `containers.md` (both UI plugins), `DRAG_DELAY_SLOP`, `ACTION_BAR_CHOSEN_COLUMN`, subpath `@fcalell/plugin-api/lib/chosen`. Consumer breaks it adds: `Place` to `Panes`, `MessageSlots` to `MessageRegions`, `isPlaceholder` to `isStandIn`, the frame `marks` prop to `flags`, guide `gap.md` to `shortfall.md`. Post-move fix list: `.refactor/kb/comment-fixes.md` (guides citing voice items by number, `plugins/vite/package.json` description) and the five guide contradictions in `map-decisions.md` (the sixth, the paren check, was a stale comment, fixed). Map confirmed (owner, 2026-11-17): `.refactor/kb/map2.tsv`, 1,789 rows (930 keep, 429 merge, 422 guide, 8 drops listed in `.refactor/kb/map-decisions.md`); tree plus `architecture/ui-core/components.md`; `plugins/auth.md` stays one page; the six contradictions in `map-decisions.md` (five guides, the paren check in cli `css.ts` and ui-core `schema.ts`) are fixed in one commit after the move. Inventory closed (`24ef3866` tree): 659 doc sections over 13,397 lines, 1,129 rule comments of 2,808 blocks, reports in `.refactor/kb/inv/`. The queued fixes: F7's rows in `.refactor/f7/core-report.md` (`packages/ui-core/README.md:53-84`, `docs/architecture/ui-core.md:18,129,170`, `docs/architecture/conventions.md:40`), F9's doc edits, native-ui's `Form` JSDoc lacking react-ui's sentence that a pick or switch with a schema `default` is required, anything naming a moved path. Sizes: docs/ 2,615 lines in 20 files, READMEs 3,163, guides 7,695.
6. `pnpm release:check`.
7. **Step 5**: fresh-agent review rounds until nothing is found.
8. Last commit deletes `REFACTOR.md` and the `.refactor/` line of `.gitignore`.

Open with the owner (none blocks item 1):

- **The act-sheet value cycle** (Button, Sheet, Form, FormField, Input; 24 files in react-ui, 22 in native-ui). Recommended and not yet confirmed in words: accept it as real recursion and document the group as one unit. The inversion described under "After the first gate" is withdrawn: martechthings opens 109 of 112 act sheets under a scope boundary below the Shell, so a host-drawn sheet would lose its context.
- **Edges the showcase dropped** (see the F9 part 2 entry): whether a component should offer each. One is a contradiction: the react-ui guide says a form group can be given its own read, the public `Form` takes none.
- **52 stories redrawn and never looked at** (list in the F9 part 2 entry).
- **The phone's query wiring** (native-ui still requires `query`; blocked by the cycle query, expo, cloudflare, screens, query).
- 46 not-done rows in stable packages and 11 stack gaps in the apps (lists under Orchestration).
- Why `plugins/query/src/read.ts`'s window read needed its explicit type argument removed, when the same line compiled inside plugin-api, is not explained.
- Consumer migration (break list near the end of this file) happens after stack, on the owner's word.

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

## Design (step 3; confirmed by the owner, kept table included)

Target layering, most stable first. An import points up this list only.

```
typescript-config, biome-config
cli                                   slot graph, commands
cloudflare, vite, react, expo, node, db, auth, api (the wire)
ui-core/model                         read, act, draft, form, list-state, store, tokens: no React, no wire
ui-core/roster/<component>            one contract file per component: entry, descriptors, variants, tables
ui-core/react                         hooks both UI plugins run, over a port the model defines
plugin-query (new, requires api)      TanStack binding: implements the port, owns QueryProvider
react-ui, native-ui                   parts layer, then one folder per component; drawing only
screens
apps/showcase, apps/phone             screens, frames, stories
```

Fixes in the order they are made. Each names the problem ids it resolves (`.refactor/problems/INDEX.md`).

**F1 The gate owns its inputs and nothing else checks.** `tsc -b` emits outside turbo's `generate`
output; the showcase's stories are generated by a gate step before they are type-checked; package
`check` scripts and the unused `lint` turbo task go; DESIGN.md is held equal to its emitter by a
test. First act of the group: reproduce `check-2-stale-types.log`.
Resolves: P6-01, P6-02, H4-03, H2-02 (generated-file rows), S2-06, S3-23, S3-28, H1-05, D1-02, baseline failures 1 and 2.

**F2 What nothing imports is removed; what one file imports is not exported.** Per package, stable
first. The compiler proves each removal; a public one is grepped in stead first and listed in the
stead table below. A slot with no contributor goes; a slot with one contributor stays only when the
slot catalog names it as a consumer extension point.
Resolves: S3-01 to S3-27, N1-01, N1-05, N1-08, N1-13, N1-14, N1-16, N1-17, N1-19, N1-20, N1-23, N1-32, S2-02, S2-03, S2-04, S2-05, N4-01 to N4-04, S1-01, S1-03, S1-06.

**F3 A list code can derive is derived.** `STACK_PACKAGES` and release-check `CONSUMERS` from the
workspace; `FAMILIES` and the 72 `build(X)` exports from the `matrix(` tables; `MOTION_CELLS`
removed (no reader); auth test DDL from the schema; walk-exception owners from the exceptions.
Rows with no derivation (the Lucide union, `apply-motion` SITES) keep their test and say so.
Resolves: H5-01, H5-02, H5-03, H5-04 (owner preference P4).

**F4 File cycles close by moving the shared type down.** cli `config.ts` group, ui-core
`paint.ts`/`scramble.ts`, three node pairs.
Resolves: N1-21, N1-24, N1-28, N1-29, N1-30, N1-31.

**F5 The read, act and draft model lives in ui-core; plugin-api is the wire; plugin-query binds.**
ui-core gains the model shapes (`Read`, `Selection`, `Datum`, `Drawn`, `Held`, `paints`, `drew`,
`issues`, scope ids, 81 names that touch neither network nor React) free of TanStack types, and a
port (`observe`, `retry`, `more`, `ensure`, `run`) read from React context. The hooks components
call (`useFrameRead`, `useMore`, `useWindowMore`, `useDraft`, `useDrawsFailure`, `useSelections`,
`usePainted`, `useRun`) move to `ui-core/react` over that port. `@fcalell/plugin-query` implements
the port on TanStack, owns `QueryProvider`, `useRead`, `useMutation`, ability, listen, preload,
query-invalidation, and contributes the provider the UI plugins now name in a codegen string.
plugin-api drops `react` and `@fcalell/ui-core` and keeps client, procedure, runtime, schema, error,
wire. A stream read's handle carries `stop`, wired to the query's abort signal; the streamed-reply
helper both apps copy becomes one function beside it.
Resolves: N1-02, N1-06, N1-10 (rows that move), N1-11, N1-12, N1-15, N1-22, N1-25, S3-03, S3-12, H3-04, C5-01, P7-01, P7-02, GAP-01, GAP-03, GAP-04 (owner preferences P1, P7).

**F6 One contract file per roster component.** `roster.ts`, `descriptors.ts`, `variants.ts` and
`variant-tables.ts` split into `ui-core/src/roster/<component>.ts`; the four files stay as the
indexes the public subpaths name (stead imports `ui-core/descriptors` 49 times). A component change
then touches one ui-core file, not four that every other component also touches.
Resolves: H3-02, H1-08, S1-04, and the 565 uphill edges into ui-core (N2-02, N2-03, N2-08, N2-10, N2-16).

**F7 Logic both drawers run exists once, in ui-core.** The 33 same-body derivations (`pathOf`,
`controlOf`, `isRun`, ...) move beside their component's contract; the 16 same-body hooks and the
platform-free lib files (`clock`, `confirm`, `same-by`, `reason`, `touched`, `arrive`) move to
`ui-core/react`; a file that is shared logic plus a platform edge splits there, and the edge stays
in the plugin. No test is added for moved logic (owner's answer 3).
Resolves: H1-01, H1-02, H1-06, H1-07, H3-03, C1-01 (rows that test the same literal in both drawers), owner preference P2.

**F8 A component folder imports another only through its entry, and a parts layer sits below.**
The files other folders reach into (`base`, `glyph`, `face`, `dot`, `act`) move to a `parts/`
layer that imports no component; the 87 closing edges then point down.
Resolves: N1-03, N1-04, N1-07, N1-18, S1-02, S1-05.

**F9 The showcase is an app.** `ui/showcase/` leaves react-ui: `tv` and `foundations` become
showcase routes' own code, frames and the story scaffold move to `apps/showcase`, and frames draw
through public exports only. The 51 internal imports are each resolved as "draw it through the
public component" or "this module is public", never a new pattern export. `./showcase/*` leaves
the manifest (stead uses: 0). CLAUDE.md and `structure.md` name the new frame path.
Resolves: N1-09, N1-26, N1-27, N1-33, H1-04, FR-01 to FR-04, GAP-06, C1-06, C4-04 (owner preferences P3, P5).

**F10 Row rules, applied inside each package's group.** Every row ends as fixed or as kept with
its fact in one comment line; counts go in the progress table.

| Rows | Rule |
| --- | --- |
| N3-01 to N3-06, C2-01 to C2-03, S2-01, C1-05 | a parameter, flag or branch with one caller moves into that caller or goes |
| C3-02 | the catch narrows to the expected code (`ENOENT`) and rethrows the rest |
| C3-01, C3-03, C3-04, C3-05 | returns a typed failure or reports; a best-effort teardown keeps its catch with the fact stated |
| C4-01, C4-02, C4-03 | the event or promise replaces the timer; where the platform has no event the timer stays with the fact stated |
| C5-02 to C5-14 | a type replaces the cast; a cast the type system cannot express keeps one line saying why |
| C1-03, C1-07, C1-08, C1-09 | the literal moves to the owner of the name (a slot value, a table) |
| S4-01 | removed |
| H2-01, H4-01, H4-02 | a module-level singleton another module sets becomes a value passed in, or one module owns both the write and the read |

**F11 Tests, last.** T1 rows removed or rewritten to assert behaviour; T2-01 waits on the event
(`dev.test.ts:72` waits for the child's `up` line); T2-02 uses a temp dir; T2-05 isolates state. No test is added: T3-01 to T3-11 are closed as not in the ask (owner's answer 3).
Resolves: T1-01 to T1-03, T2-01, T2-02, T2-05.

**F12 Docs.** Each page changes in the commit that changes its code; a last docs commit clears
what is left of D1, D2, DH, DS-02.

Proposed as kept, each a mechanism and not an accident (needs the owner's yes):

| Ids | Why kept |
| --- | --- |
| H2-03, H2-05, H4-04 | CSS custom properties, `data-*` and React context are how a tree shares state |
| H2-04, H2-06, H2-08, C1-02 | env, platform and router globals are read at the platform edge; rows outside an edge file are fixed |
| H2-07, C1-04 | request-context keys and protocol literals are the wire contract; they stay typed |
| H3-01 | `src/`, `src/node`, `src/worker` split by where code runs (Node dist, bundler, worker) |
| H4-05 | slot contribution order is the slot graph's documented contract |
| N4-05 | router contract files are what the router requires |
| T2-03, T2-04 | tests whose subject is a process, a socket or the toolchain |
| N2 edges from apps into plugins | an app is the top layer; its churn count is lower only because it is smaller |

Where an owner preference no longer fits:

- P5 is already true for `lib`; its last pattern (`./showcase/frames/*`) leaves with F9.
- P6: the screen run and the Storybook build need Chrome, and CLAUDE.md scopes the screen run to
  what changed; `release:check` installs three consumers from the registry (1.6 GB). The owner
  confirmed: only offline checks join the gate.
- P1 to P4 and P7 fit.

What stead has to change (grep counts, files): `plugin-api/tanstack-query` 91 (F5),
`plugin-react-ui/lib/act` 31, `lib/clock` 13 (F7), `ui-core/descriptors` 49 (unchanged path).
Each removal or rename adds a row here in its commit.

Owner's answers:

| Question | Answer |
| --- | --- |
| Component home | Three packages; one contract file per component in ui-core; shared logic in ui-core |
| What joins the gate | Offline checks only: the DESIGN.md test and story generation with its type-check. `release:check`, the screen run and the Storybook build stay outside |
| New tests | None. Moved logic is held by the type-checker and the final screen comparison |
| Stead | Not touched. Every break is recorded here with old and new path; migrated after stack, on the owner's word |

## Progress

| Step | State |
| --- | --- |
| 1 Additions | done |
| 2 Problem list and checklist | done: 196 problems in `.refactor/problems/INDEX.md`, presented to the owner |
| 3 Redesign | done, confirmed |
| 4 Fixes | F1 to F9 done and gated; remaining work listed under "Where things stand" |
| 5 Fresh-agent checks | not started |

## Orchestration (owner's instruction, given after F4)

Work is parallel: the main session orchestrates agents whose perimeters do not overlap. **No build
and no check runs until all the work is in**; the gate, `release:check`, the screen comparison and
the fresh-agent checks happen once, at the end. Every commit from F4 on is therefore unverified
until then, and the final gate is expected to need a fix-up round.

Every agent reads `.refactor/agent-rules.md` (perimeter, no build or check, no git state change,
self-review pass, report sections) and its own brief. Work that needs a file outside an agent's
perimeter comes back in its report and is applied by the next phase. A commit is made per agent
perimeter when it reports.

| Phase | Agents (model) and perimeter | Brief | State |
| --- | --- | --- | --- |
| 1 | F5 core (Opus): `plugins/api`, new `plugins/query`, ui-core except the four roster files, cli `stack-packages.ts`, `scripts/release-check.ts`, `slot-catalog.md`, `runtime.md`. Writes `.refactor/f5/map.md` | `.refactor/f5/core-brief.md` | done, committed |
| 1 | F6 roster split (Opus): ui-core `roster.ts`, `descriptors.ts`, `variants.ts`, `variant-tables.ts`, `design-md.ts`, `roster/`, `docs/architecture/ui-core.md` | `.refactor/f6/brief.md` | done, committed |
| 1 | F10 row rules (Sonnet), one each: cli (not `stack-packages.ts`); cloudflare, expo, react, vite; db; node; auth; screens | `.refactor/f10/brief.md` | done, committed |
| 2 | F5 apply (Sonnet), one each from the map: react-ui; native-ui; screens, node, expo, vite, auth; the apps. F7 core (Opus): the shared logic's home in ui-core's per-concept modules, plus `.refactor/f7/map.md` | `.refactor/f5/apply-brief.md`, `.refactor/f7/core-brief.md` | Phases 2a, 2b, 2c done, committed |
| 3 | Per UI plugin (Opus), one each: apply the F7 map, then F8 (parts layer, cycles, walk-exception owners for react-ui with `plugins/screens/src/ui/walk.ts`). Stream stop and the reply helper (P7). F10 and the F2 leftovers for api and ui-core. F10 for the apps | `.refactor/f8/brief.md` (F7 apply and the layers, per plugin); stream stop and the F10 rows for the UI plugins to write | F8 done as far as moves go, committed. **Next, in this order:** F9 (`.refactor/f9/brief.md`, Opus; note that react-ui's `components/icon`, `spinner`, `status` are now under `parts/`); P7 stream `stop` (brief to write: `plugins/query`, `plugins/api` wire, ui-core `read.ts` and `react/`; the apps' copies of `pause` and `answerOf` become one function); F10 and F11 for both UI plugins and for ui-core's `read`, `acts`, `scope`, `listen`, `form`, `react/` (briefs `.refactor/f10/brief.md`, `.refactor/f11/brief.md`); the final docs sweep |
| 4 | F9 showcase leaves react-ui for `apps/showcase` (Opus). Then F10 and the F2 leftovers for react-ui; native-ui in parallel | to write | waits for phase 3 |
| 5 | F11 tests per package; F12 docs sweep, including every `docs to change` row the agents reported | to write | waits for phase 4 |
| 6 | Main session: `pnpm install`, `pnpm check`, fix-ups, `pnpm release:check`, the screen comparison against `686cd3e1`, step 5 | | last |

F7 refinement: shared derivations go into ui-core's per-concept model modules (the style of
`action-bar.ts`, `form.ts`, `pick.ts`), not into the roster contract files, so F6 and F7 do not
write the same files.

Owner's decisions after phase 1 and 2a:

- **The UI imports only ui-core.** No file under a UI plugin's `src/ui/` imports plugin-query,
  plugin-api, `@tanstack/*`, `@orpc/*` or `@casl/*`; the UI plugins do not `require` query; with
  no binding mounted, plain values still draw. The port grows by about six members (act failure
  sentence, whether it retries, submit, schema, permission, issues). Step F5b,
  `.refactor/f5/port-brief.md`.
- **The port's observing members stay hooks the binding supplies** (`useReads`, `useNextPage`,
  `useWindowState`).
- **`FAMILIES` stays a hand list:** its order is data DESIGN.md's front matter follows.

Closed as kept without a row pass: N1-01 (ui-core exports a symbol one outside file imports). ui-core is the contract both drawers reach; a name one plugin uses today stays where both can.

Rule that settled during phase 2b: a parameter only a test passes is a test seam and stays (`listenOf(env)`, `findChrome(env, executable)`, `stateDir(env)`, `requestLogger(print)`, `stopAll(procs, graceMs)`). `sqliteFile` lost its `env` seam in phase 1 and its test sets `process.env` with a restore; left as is.

Still to run after F7 and F8: the F10 and F11 rows whose code is now in `packages/ui-core/src/{read,acts,scope,listen,form}.ts` and `src/react/` (18 rows listed in `.refactor/f10/query.md`, 13 casts in `read.ts` and `form.ts` from `.refactor/f10/ui-core.md`), the ui-core tests, and F10 with F11 for both UI plugins.

Docs still to apply (final docs sweep): F7's rows for `packages/ui-core/README.md:53-84`, `docs/architecture/ui-core.md:18,129,170`, `docs/architecture/conventions.md:40` (text in `.refactor/f7/core-report.md`); F9's doc edits.

After the first gate, with a compiler and the screen runs (each changes what a file does, so none is done blind):

- **F8 part 2, the inversion** (owner to confirm the shape): `button` stops importing `sheet`. Recommended: a context in `lib/` carries the act sheet, the Shell provides it, and a Button draws it inline through the context, so the sheet keeps the opener's React context. Types that entries declare for other folders (`ButtonRunProps`, `ActSheetProps`, `ActionBarProps`, `SliderProps`) move to `lib/` or `parts/`.
  Audit of the two consumers (Haiku, read-only, `.refactor/f8/act-sheet-stead.md` and `act-sheet-martechthings.md`): stead has 22 act sheets, none under a context provided below the Shell, 1 on a page with no Shell (sign-in). **martechthings** (a second consumer, 200 files importing a stack UI plugin; never covered by the stead-only checks of this refactor) has 112 act sheets, 109 of them opened under an organization or project `ScopeBoundary` mounted inside the Shell, 91 of them forms over a procedure, and 2 on pages with no Shell (onboarding). So a sheet drawn by the Shell would sit above the scope its form needs: host-drawn act sheets are not safe without carrying scope, and the host cannot live in the Shell. The context inversion (drawn inline, `button` imports `lib` only) keeps the opener's context.
- **F7 part 2:** `useAct` and `useHeldDraft`, the shared part of `lib/read.tsx`, `useDerivedForm`'s closures, the two `optionsOf`.
- **ui-core's 84 type-only roster cycles:** shared types into `roster/shared.ts` once a compiler proves native-ui's `declare module "@fcalell/ui-core/descriptors"` still merges through a re-export.
- **The phone's query wiring:** turn the screens edge around so plugin-query can depend on plugin-expo (owner).

Stead's break list so far (imports in its tree): `plugin-api/tanstack-query` 91 files and `plugin-api/read` 2 (to `plugin-query/*` and `ui-core/*` per `.refactor/f5/map.md`); `reactUi()` no longer pulls query, add `query()`; `plugin-react-ui/lib/clock` 13 imports and `lib/confirm` 2 (to `ui-core/react/*`); `lib/act` `placed` 1 import (to `ui-core/acts`).

For phase 6: delete every `dist/` before the final build (`tsc` leaves the output of deleted modules, such as `plugins/api/dist/tanstack-query.js`, and `files` ships `dist`).

Carried forward from phase 1:

- **Deliberate behaviour changes** (C3-02 and boundary parses; listed per file in the reports): a
  filesystem or resolve error other than `ENOENT`/`ENOTDIR` (or `MODULE_NOT_FOUND`,
  `ERR_PACKAGE_PATH_NOT_EXPORTED`) now throws in cli `package-info`, `write-artifact`, `remove`;
  node `barrel`; expo `not-found`; vite `excluded`; screens `browser` lock and `chrome` port
  file. Package manifests are schema-checked in cli, node `bundle` and vite.
- **Public changes, stead uses 0 each:** cli `ProcessSpec.portConflictPattern` no longer takes
  `null`; expo `VersionGateOptions.metricsBinding` removed (the worker reads the binding name from
  `version-gate-shared.ts`); screens `WalkOptions.roots` removed and `alignFindings`, `settled`,
  `watchFirstPaint` take no argument.
- **Not done, each needs a decision or a second package (46 rows):** cli plugin names in the init
  templates (4 rows: a new slot contributed by api, db, expo, react); cli `ProcessSpec.color` and
  `WatcherSpec` handler `type` (used by five plugins); expo `AUTH_PREFIX` and screens
  `SESSION_PATH` (literals plugin-auth owns); node `payload.bundle` and `payload.workerFile`
  (two defensible shapes); cloudflare `payload.serve` (3 rows, one coupled override); auth
  `createTenancy` `pin`; db `assertSqliteDriver` call order; screens `Tab.goto` load poll; the
  rows in test files (20), which F11 owns.
- **For F11:** `plugins/db/src/node/sqlite-file.test.ts` now sets `process.env` because
  `sqliteFile` lost its `env` parameter; it must restore what it sets. `plugins/auth/src/worker/listener.test.ts`
  has a line over the column limit.
- **For step 5:** four packages each grew an errno guard (cli `isErrno`, db `errnoCode`, vite
  `isAbsent`, node inline).
- **Formatting:** agents cannot run Biome; one `biome check --write` over the tree precedes the
  final gate.

## Step 4 log

| Fix | State | Gate | Notes |
| --- | --- | --- | --- |
| F1 | done | exit 0: 30 type tasks, 25 test tasks, 538 tests, Biome 938 files; `release:check` exit 0 | Cause of `check-2-stale-types.log` proven by mtimes: run 1's `generate` archived old `.stack/types`, run 2's cache hit restored 18 files at 08:56:15 before `tsc -b`. `generate` and `build` now exclude `.stack/types` and `.stack/node_modules`; app `check-types` declares `.stack/types`. Showcase `generate` writes the stories. Package `check` and `lint` scripts, turbo `lint` and `dev` tasks, two unused `imports` maps, ui-core's unused cli devDependency, changeset `linked` removed. `dev.test.ts` fixed early because it failed the gate twice under load. Kept: H1-05 (manifests have no inheritance; the apps' `tsconfig.worker.json` is the cli template's output), changeset `fixed` (the version rule), ui-core's three hand-run scripts, `@fcalell/cli` as an app devDependency (config file only) |
| F2 part 1: exports, files, subpaths | done (commits `26d34e1f` to `63d6724f`, plus the native-ui Menu entry) | exit 0: 30 type tasks uncached, 25 test tasks, 538 tests, Biome 923 files; `release:check` exit 0 | Ten Sonnet agents, one per package group, brief `.refactor/f2-brief.md`, per-row reports `.refactor/f2/*.md`. 906 rows (agents' counts): deleted 44, unexported 207, moved 48, kept stead 25, kept documented 108, kept signature 202, kept used 64 (the audit was wrong), kept test 45, kept one importer 129, not done 39 (showcase, F9). Checked apart from the agents by `.refactor/f2-verify.mjs`: stead imports none of the removed public names (2168 `@fcalell` specifier occurrences); no body line of the 16 deleted files is lost. `@fcalell/cli/codegen` restored: the cli agent deleted it though the README lists it. Files 866 to 852; cycles unchanged (8 all-import, 2 value) |
| F2 part 2, stable packages: pass-throughs, aliases, dead members, shallow files | done (commits `e5592c1c` to `fb36918a`) | exit 0: 30 type tasks, 25 test tasks, 538 tests, Biome 929 files | Six Sonnet agents, brief `.refactor/f2-part2-brief.md`, reports `.refactor/f2/part2-*.md`. 67 rows (agents' counts): changed 15 (cli 5, small plugins 3, db and node 4, screens 3), the rest kept (binds an argument, boundary, documented, entry, sibling kind) or audit errors (5). Undone by me: the auth agent folded `worker/session-ended.ts` into `worker/index.ts`, which made the test spell the channel name as a second literal and left `README.md:82` pointing at a deleted file; the module stays (a test counts as an importer for a shallow file) |
| F2 part 2, slots | closed: kept by the owner's decision | | Table `.refactor/f2/slots.md`: 54 slots, none unread, 32 used across packages, 22 touched only by their own plugin. No slot changed; two catalog rows added |
| F2 part 2, volatile packages | after F5 to F9 | | The same row kinds, and the one-importer rows N1-01, N1-05, N1-13, N1-16, in api, ui-core, react-ui, native-ui |
| F3 derived lists, part done now | done (`b60912e4`, `14fa7fb2`, `b3ed1912`) | exit 0: 30 type tasks, 25 test tasks, 538 tests, Biome 929 files; `release:check` exit 0, and exit 1 with `FAIL @fcalell/plugin-expo is in no consumer` when expo is dropped from its consumer (run with `--only none --no-build`, then restored) | Of the 29 H5 rows: **3 done** (`MOTION_CELLS` removed, nothing read it and DESIGN.md is unchanged; the Storybook breath pattern no story id matches and the `behaviour` include of a missing folder removed; `release:check` now fails a plugin in none of its three consumers). **5 kept with the fact:** the Lucide `IconName` union (written by `scripts/icon-name.ts`, its test holds it to Lucide), `YIELDS_LAST_EACH` (Tailwind reads a class as written, so it cannot be composed), `apply-motion` SITES (a typed record that throws on a miss), auth `BASE_CONTEXT` (held by `keyof`), auth `CALLBACK_MARKERS` (strings of an on-disk template; the test is the link). **16 move with their files:** roster against component folders, `draws`, `owns`, `FAMILIES` and the 72 `build(X)` exports in F6; the walk-exception owners (5 rows) in F8; the six showcase rows in F9; the plugin-api `exports`, `slots` and `guide` lists after F5. **1 is a test:** the auth DDL, in F11. **4 await the owner:** `STACK_PACKAGES` |
| F4 file cycles | committed (`29e4ce97` to `e50311f4`), **not verified** | The one gate run failed: `@fcalell/plugin-node#check-types` exit 2, two tests imported `NodeWorker` from `create-node-server.ts`. Both now import it from `server/worker.ts`; fixed by reading, not re-run. The run stopped there, so the rest of F4 is unverified too | File cycles 8 to 3 (the three left are the UI plugins' component cycles, F8). cli: `src/config.ts` is a leaf, `src/index.ts` is the package entry. ui-core: `kindOf` and `scrambles` moved from `scramble.ts` to `paint.ts`. node: `PAUSE_AFTER` in the client, `ServiceLogger` in `server/log.ts`, `NodeWorker` in `server/worker.ts`. Public moves, stead uses 0 each: `kindOf` `ui-core/scramble` to `ui-core/paint`; `PAUSE_AFTER` `plugin-node/live` to `plugin-node/client`. Kept: `add` importing `uninstall` from the `remove` command (commands call each other's operations, as four do with `generate`); `lib/` and `templates/` importing each other at folder level (no file cycle). N1-24's native-ui row goes to F8 |
| F10 row rules, stable packages (phase 1) | committed (`09e9cb6e` to `856cb382`), **not verified** | none run (owner's instruction) | Six Sonnet agents, reports `.refactor/f10/*.md`. 497 rows (agents' counts): fixed 216, kept with the fact stated 194, audit wrong 41, not done 46. Per package, rows and fixed: cli 112 and 58; cloudflare, expo, react, vite 47 and 29; db 83 and 41; node 59 and 23; auth 87 and 24; screens 109 and 41. Read by the main session before commit: auth's token deletion, redirect guard and dev-mode check; db's serve step and recreate SQL; node's server; expo's version gate; vite's manifest read; screens' tab emulation; cli's watcher, package resolution and manifest read. **Three corrections made:** (1) cli `readManifest` returned zod's copy of the app's `package.json`, which puts `dependencies` and `devDependencies` first (checked against zod 4.6.5), and `installStack` writes it back: it now returns the file's own object. (2) cli `dev.ts`: a non-`ENOENT` stat error was rethrown inside the `fs.watch` callback, which would end `stack dev`; the catch swallows again and says why. (3) Two contract comments deleted as restating were restored (auth `consumerScopes`, db `withMigrationLock`) |
| F6 roster split (phase 1) | committed (`54c9be5e`), **not verified** by a build | Agent's own scripts in `.refactor/f6/`: exports diff of the four public modules 0 lines; 706 of 706 moved declarations verbatim; imports resolve, none unused, no value cycle | 33 files `packages/ui-core/src/roster/<component>.ts`, 420 declarations moved, 254 left shared, `roster/shared.ts` holds the 20 shared values component files need. `roster.ts`, `descriptors.ts`, `variants.ts`, `variant-tables.ts` stay the public modules and re-export. `design-md.ts` and DESIGN.md untouched. **Open:** `FAMILIES` (72 rows) not derived, its order is data that DESIGN.md's front matter follows (owner). 84 type-only import cycles between component files and the four modules (shared types stayed there because native-ui augments `RouteRegistry` in `@fcalell/ui-core/descriptors`); cleared after the gate, when a compiler can prove augmentation through a re-export |
| F5 core (phase 1) | committed (`c6979119`, `8d28303b`, `b1a977e9`, `c7335489`, `f9387b86`), **not verified** by a build | Main session's static checks: no `@tanstack`, `@orpc`, `@casl` or `hono` in ui-core and `react` only under `src/react/`; no React, ui-core or TanStack in plugin-api; no old specifier left in the perimeter's source; import graph resolves every specifier in ui-core, plugin-api, plugin-query and cli; no package cycle | Report `.refactor/f5/core-report.md`, plan `.refactor/f5/plan.md`, **map `.refactor/f5/map.md` (260 rows)**. 140 names placed: ui-core model 61, `ui-core/react` 13, plugin-query 43, stay in plugin-api 23. New `plugins/query` (`plugin("query", { requires: ["api"] })`), contributes the web `QueryProvider` spec and the vite `optimizeExclude` entry. plugin-api: peers none. Port (9 members): `useReads`, `fetchingNext`, `retry`, `useNextPage`, `useWindowState`, `ensurePages`, `settled`, `act`, `carry`. `query-invalidation` stays in plugin-api (moving it makes a package cycle). The phone's provider spec and `src/lib/query.ts` scaffold stay in native-ui. cli `FIRST_PARTY_PLUGINS` gains `query` (applied by the main session). **Open with the owner:** the UI still takes `ability`, `useMutation`, `schemaOf`, `issues` (the derived Form) and `refusal`, `retries` (`lib/act.ts`) from plugin-query, imports TanStack directly in `same-by.ts`, form, native `navigate.ts` and `warm.ts`, and would `require` query; the port's observing members are hooks the binding supplies |
| F5 apply (phase 2a) | committed (`7fa635d0` to `d3109e77`, docs `88cec42a`), **not verified** by a build | Main session's import graph over the whole repo: 2 unresolved specifiers, both on-disk templates that import a consumer's `.stack/` files (as before); no old plugin-api client specifier left in source or docs; no package cycle | Five Sonnet agents from the map, reports `.refactor/f5/apply-*.md`. Files changed: react-ui 70, native-ui 62, screens, node, expo, vite, auth, react 18, apps 30, docs 6. No name without a map row. Imports of plugin-api from the UI plugins: 155 statements before, now 1 in react-ui (the showcase's `ApiError`, leaves with F9) and 1 in native-ui's plugin entry |
| F11 tests, stable packages (phase 2b) | committed (`ea6c7235` to `565d714e`), **not verified** | none run | Six Sonnet agents, reports `.refactor/f11/*.md`. 25 rows: fixed or rewritten 14, kept 10, not done 1 (cli `stack-packages.test.ts`, held by F5b). No test removed. cli: two fixed sleeps wait for an event, three casts gone. node: two weak assertions now require generated text (patterns never run). screens: a 10 ms timer became `setImmediate`. auth: temp directories removed after the run; the hand-written `DDL` stays (no schema-to-SQL function in the package). db: nothing to do (`sqlite-file.test.ts` already restores `process.env`) |
| F10 row rules, plugin-api and the apps (phase 2b) | committed (`aff8b5ab`, `619e1a5c`), **not verified** | none run | Reports `.refactor/f10/api.md`, `apps.md`. api: fixed 9, kept with the fact about 33, rows of moved files not done. Public: `clampLimit(limit, max)` is `clampLimit(limit)` (stead uses 0); `barrel.ts` rethrows a non-`ENOENT` read error. **Corrected by the main session:** the agent removed `requestLogger`'s `print` parameter and made the test mock `console.log`; the parameter is back as the test's seam. apps: 81 rows, fixed 12, kept 19, audit wrong 16, not done 34 (the streamed-reply helpers and `.storybook/` wait for later steps; 11 `GAP` rows are stack gaps, listed in the report, none patched) |
| F2 leftovers, plugin-api (phase 2b) | committed (`b52715c9`), **not verified** | none run | Report `.refactor/f2/part2-api.md`. 31 rows, 2 changed: the `serverRoot` pass-through around `posix.normalize` is gone; `MAX_LIMIT` is private in `procedure.ts` (was exported from `lib/cursor`, stead uses 0, no doc names it). 29 kept with a reason each or in files that moved to plugin-query |
| F12 docs, `docs/` and the root pages (phase 2b) | committed (`5ebcc29a`) | Markdown only | Report `.refactor/f12/docs.md`. 45 rows: corrected 14, merged to the owning page 11, history removed 5, already fixed 3, not done 12. **Undone by the main session, each closed as kept:** README's package, plugin and command tables, and the gate's one-line description in README, CONTRIBUTING and CLAUDE.md (an entry page states these itself; a link chain to learn six words is worse); the shared-Chrome paragraph in `commands.md` (it holds three facts no other page has); the measurements in `decisions/form-from-a-procedure.md` and `decisions/public-roster.md` (a decision's evidence is its why). `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` moved into `conventions.md` when `releasing.md` lost its copy. **Still to apply:** the report's 12 `docs to change` rows for pages outside that slice (react-ui README, native-ui `guide/rules.md`, auth `guide/callbacks.md`, the screens guide, `slot-catalog.md:21` and `:98`, `overview.md:70` and `:93`); `packages/cli/guide/config.md` lists `query()` under `reactUi()` and `nativeUi()`, which F5b removes; `conventions.md` names the `./showcase/frames/*` export pattern, which F9 removes |
| F10 and F2 part 2 rows, ui-core (phase 2b) | committed (`472ef5ac`), **not verified** | none run | Report `.refactor/f10/ui-core.md`. About 119 rows: fixed 30, kept 46, not done 12, 35 restating comments deleted. Seven public signatures narrowed, each checked by the main session against every caller in the repo, tests included (stead uses 0 each): `createTicker` lost `timers` and the `Timers` type; `rollOf` lost `clock`; `fileSize` lost `lang`; `parseTheme` lost its `{}` default (its one caller `deriveTheme` has one); the `timings` setters; `FontWeight` lost `"semibold"`; `toneOf` lost `property` (traced to the same result). New internal `src/record.ts`. Not done: seven one-line tone lookups with a single importer in native-ui; `matrixCells(families)` (the showcase passes it) |
| F5b the UI imports only ui-core (phase 2b) | committed (`1febf42f`, `498addbe`, `32c37497`, `a36cf3e2`, `4592610c`, `8910beb6`), **not verified** by a build | Main session: under both plugins' `src/ui/` (showcase excluded) the only `@tanstack` import is `@tanstack/react-virtual` in react-ui `lib/window.tsx`; import graph resolves everything; no package cycle; UI plugin edges into api and query: react-ui 3 (all in the showcase), native-ui 2 (its plugin entry and the query-client template) | Report `.refactor/f5/port-report.md`. Port 9 to 16 members: `refusal`, `retries`, `issues`, `useSubmit`, `schemaOf`, `may`, `warm`. A default port: plain values draw; a member handed a read throws naming `QueryProvider`. `sameBy` is in `@fcalell/ui-core/same-by` with TanStack's `replaceEqualDeep` restated as a private comparison (edge: an object whose non-null prototype has no constructor is not walked). The phone's network listeners are `@fcalell/plugin-query/net`. react-ui `requires` is `react`, `vite`. Applied by the main session: the two `input/code.tsx` rows and nine `sameBy` importers. **Removed by the main session:** the agent's new `same-by.test.ts` (owner: no new tests). **Open with the owner:** native-ui's plugin entry still requires `query` and wires the phone's `QueryProvider`, `queryClientModule` and `src/lib/query.ts` scaffold, because moving them into plugin-query needs plugin-query to depend on plugin-expo, which closes the package cycle query, expo, cloudflare, screens, query. **Kept:** `@tanstack/react-virtual` (a virtualizer, not the data layer). react-ui's manifest keeps plugin-query and plugin-api until the showcase leaves (F9). Stead: `reactUi()` no longer pulls query, so stead adds `query()` |
| Small passes beside F7 (phase 2c) | committed (`194fd8e4`, `3eeeede3`, `8e424061`, and the plugin-query commit after it), **not verified** | none run | **Doc rows** (`.refactor/f12/rows.md`): 17 rows on 9 pages; `packages/cli/guide/config.md` follows each plugin's `requires`; the screens guide holds the shared-browser facts. **plugin-api tests** (`.refactor/f11/api.md`): the request-log duration pattern accepts `1.2s` as well as `12ms`. **cli `stack-packages`** (`.refactor/f10/stack-packages.md`): kept one restating test deleted, the `ENOENT`-only catch and a comment; **reverted by the main session:** the agent removed `pinnedCommit`'s npm guard with its `version` parameter and rewrote the `stackPluginSpecs` test to compare the function with the function it calls. **plugin-query** (`.refactor/f10/query.md`): 49 source rows, fixed 4, kept 27, not done 18 (their code is in ui-core now); `withRead(target, schema)` and `withScope(target, schema)` lost their recursion and scope arguments (stead uses 0); one weak test rewritten, one test isolates module state. **H5-03 closed as kept** (`.refactor/f8/walk-owners.md`): none of the five class literals the screens walker matches is an exported ui-core constant, so the react-ui test keeps pinning them |
| F7 core, shared logic in ui-core (phase 2c) | committed (`f6c774b6`, apps `b43dbe65`), **not verified** by a build | Main session: no binding or platform library in ui-core, `react` only under `src/react/`; import graph resolves everything | Report `.refactor/f7/core-report.md`, **map `.refactor/f7/map.md`** (what each UI plugin deletes and repoints). Moved 47 names (14 pure, 33 React), 1 split, 36 not shared. Pure: `placed`, `isPlaced`, `Offered`, `offered` (`acts.ts`); `pathOf` (`form.ts`); `isAbsent`, `isCopy`, `titleWords`, `factKey`, `glyph`, `split` (`list-state.ts`); `linked` (`pick.ts`); `isRun` (`runs.ts`); `endedSentence` (`read.ts`). React: `blocked`, `useFieldDraft` (`react/acts.ts`); `useFrame`, `Frame`, `useCollection`, `useRow`, `useOptions`, `submitOf`, `hasBody` (`react/read.ts`); eight new modules `react/{words,clock,arrive,reason,touched,confirm,frame,field}.ts`. The four app imports of `confirm` point at `@fcalell/ui-core/react/confirm` (main session). **Until F8 applies the map, each plugin still holds its own copy, and its own `confirm` queue.** Against the audit: derivations 33, moved 9; hooks 28, moved 15 and split 1; lib files 34, moved whole 7 and split 5. **Left in both plugins, to do after the first gate with a compiler (F7 part 2):** `useAct` and `useHeldDraft` in `lib/act.ts` (122 identical lines; they differ in the platform's `toast` and navigation), the shared part of `lib/read.tsx`, `useDerivedForm`'s inner closures, the form's and section's `optionsOf` (needs a name: `list-state` already exports another `optionsOf`), `MARK_FROM` and `Closed` (belong in the roster contract). Stead: `plugin-react-ui/lib/clock` 13 imports and `lib/confirm` 4 lines go to `ui-core/react/*`; `lib/act` `placed` 6 lines and `offered` 13 lines go to `ui-core/acts` |
| F8: F7 map applied, layers (phase 3) | committed (native-ui `76590cf4`, react-ui `4a73df7e`), **not verified** by a build | Agents' own scripts (`.refactor/f8/*-proof.txt`, `f8-react-ui-check.mjs`): every import resolves to a name its target exports, none unused. Main session's import graph: 2 unresolved (the on-disk templates, as before); value-import cycles still 2 | Reports `.refactor/f8/native-ui.md`, `.refactor/f8/react-ui.md`. **Job 1 done in both:** 30 local copies deleted per plugin, 6 lib files gone each (`arrive`, `clock`, `confirm`, `reason`, `touched`, `words`), one confirmation queue (`@fcalell/ui-core/react/confirm`), the words provider's source is `@fcalell/ui-core/react/words`, `exports` lost `./lib/clock`, `./lib/confirm`, `./lib/words`. **Job 2 partial, and the design was wrong:** the component cycle is real recursion (a Button opens an act sheet, the Sheet holds a Form, the Form draws Buttons; Form, FormField and Input draw each other), so moving files cannot cut it. What moved: the leaf drawing files into `src/ui/parts/` (native-ui 22, react-ui 20; `parts` imports no component). Left: value cycle native-ui 22 files, react-ui 24; cross-folder imports that skip the entry native-ui 60, react-ui 71 (was 142); `lib` importing parts or components 12 and 13. The blocking edges are in the reports and `.refactor/f8/f8-react-ui-blocked.txt`. No wrapper removed (S1-02, S1-05: each is public, has several callers, or adds a hook value) |

Owner's decisions after F2 part 1 (applied in `7d0fbdc9`, `7ebe81fb`, `6f4786d9`; gate exit 0, 538 tests; `release:check` exit 0):

- One-importer rule, replacing F2's "what one file imports is not exported": a symbol moves beside
  its single importer when its home file stays, or when its whole kind moves with it. A module is
  not emptied into its importer while siblings of its kind stay behind. The init templates,
  `lib/guide.ts` with `lintConfig`, and the four showcase fixture files are separate modules
  again. The 129 `kept one importer` rows stay kept, each with its reason in `.refactor/f2/*.md`.
- Documented public surface nothing uses (108 rows) stays, except `@fcalell/cli/codegen`, which is
  removed (stead uses: 0).

Owner's decisions after F3:

- Slots: all 54 stay (S2-02 and S2-03 are closed as kept). The slot catalog is the plugin contract
  and is not trimmed by current use. The two rows it lacked are added
  (`api.slots.routeBarrelSource`, `reactUi.slots.appCssSources`; DS-02).
- `STACK_PACKAGES` stays a hand list held by its test. Preference P4 does not fit it: it ships in
  the published CLI, runs where no workspace exists, and carries hand-written `builds` verdicts.

Public names removed in F2 part 1 (stead uses of each: 0): plugin-api `./node/codegen`,
`./node/types`, `WINDOW_PAGES`, `withPage`, `fetchScope`, `scopeQueryKey`, `ScopeLookupInput`,
`whenSettled`, `defaultEntityRegistry`, `isColumn`, `orderOf`; plugin-auth `AccessControlLike`,
`Statements`; plugin-node `listenOf` from `./server`; plugin-native-ui `useUniwind`, `Uniwind`,
`FileItem`; plugin-react-ui `./components/toast`, `FileItem`; ui-core 12 state types and
`IMAGE_TILE_LINES` from `./variants`, `GAP_ROLES`, `GapRole`, `WAIT_MIN`, `Width` and `Words`
through `./descriptors`, 17 names unexported; cli `SlotCycleError`, `SlotResolutionError`,
`ScaffoldError`, `ProcessOnExit`, `CliSlots`.

## Baseline

Taken at 686cd3e1 before any change. Logs in `.refactor/baseline/`.

| Run | Command | Exit | Result |
| --- | --- | --- | --- |
| Gate | `pnpm check` | 0 | `check.log`: check-types 30 of 30 tasks, test 25 of 25 tasks, 537 tests pass, 0 fail, 0 skipped, Biome 937 files clean |
| Release | `pnpm release:check` | 0 | `release-check.log`: "Release check passed."; web 475 packages, node 449, native 1081; one copy of each stack package |
| Screens | `pnpm --filter showcase test-screens --all --mode dark --width 320,1920 --state data,empty --shots shots/baseline` | 1 | `test-screens.log`: no test ran; `CDP Emulation.setDeviceMetricsOverride timed out after 30000 ms` on `_app/deploys/$deployId`; not retried, the owner decides how (recommended: `stack screens browser stop`, then once more). `--shots` must be a folder inside the app |
| Stories | showcase Storybook build and story run, sharded | not taken | see below |

Owner decision: the screen and story baselines are not taken up front. The gate and release
baselines stand. Before the first UI fix group: `stack screens browser stop`, then one screen run on
the screens that group reaches; a second timeout is reported, not retried. At the end: shoot
`686cd3e1` in a worktree and the final commit on the touched screens in one sitting, and hand both
sets to a critic agent that built neither.

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

Owner, after phase 3: run the gate now (not only at the very end); **no visual checks** (no screen runs, no shots, no Storybook) in this refactor unless the owner says otherwise. martechthings (`~/projects/martechthings`) is a second consumer: check removed and moved public names against it as well as stead.

First gate after phases 4 to 8 (2026-11-15): `pnpm check` exit 0 (check-types 32 of 32, test 27 of 27, Biome 975 files). Two fixes were needed: `plugins/query/src/read.ts` window read type inferred, `plugins/screens/src/serve/controls.test.ts` helper made async. Biome reformatted 25 files. Not checked: any drawing (visual checks are off), `pnpm release:check`, martechthings imports.

Consumer break list, measured after the first green gate by `.refactor/consumers.mjs` (every `@fcalell/*` import in both consumers against the current `exports` and the names each target exports; output in `.refactor/consumers.txt`). File counts are this script's and replace the earlier hand counts.

| Consumer | Import | Files | Goes to |
| --- | --- | --- | --- |
| stead | `@fcalell/plugin-api/tanstack-query` | 180 | `@fcalell/plugin-query/*` and `@fcalell/ui-core/*` per `.refactor/f5/map.md`; add `query()` to the config |
| stead | `@fcalell/plugin-api/read` | 4 | `@fcalell/ui-core/read` |
| stead | `@fcalell/plugin-react-ui/lib/clock` | 26 | `@fcalell/ui-core/react/clock` |
| stead | `@fcalell/plugin-react-ui/lib/confirm` | 4 | `@fcalell/ui-core/react/confirm` |
| stead | `placed` from `@fcalell/plugin-react-ui/lib/act` | 2 | `@fcalell/ui-core/acts` |
| martechthings | `@fcalell/plugin-api/tanstack-query` | 423 | as stead |
| martechthings | `@fcalell/plugin-api/read` | 12 | `@fcalell/ui-core/read` |
| martechthings | `@fcalell/plugin-api/acts` | 6 | `@fcalell/ui-core/acts`, `@fcalell/plugin-query/acts` per the map |
| martechthings | `@fcalell/plugin-api/ability-client` | 2 | per the map |
| martechthings | `@fcalell/plugin-react-ui/lib/words` | 6 | `@fcalell/ui-core/react/words` |
| martechthings | `ProcedureCall`, `InputOf` from `@fcalell/plugin-api/types` | 2, 4 | `@fcalell/ui-core/form` |

Neither consumer is edited; both migrate after stack, on the owner's word.

F9 (showcase move), gate green (`pnpm check` exit 0, 32 and 27 tasks, Biome 976 files); no visual check. 53 files moved to `apps/showcase/src/roster/` and `src/screens/`; stories 114 before and after, diff empty (`.refactor/f9/stories-*.txt`); five `./showcase/*` exports removed (0 uses in both consumers); react-ui lost the `plugin-api` and `plugin-query` dependencies. Open, for the owner:
- 34 frame imports still reach 19 plugin modules by relative path (`grep -rho "plugins/react-ui/src[^\"]*" apps/showcase/src | sort | uniq -c`): 23 have no public way to stage the edge (`FormField` 9, `PortalContainer` 3, `FormBody` 2, `SheetCard` 2, shell host 2, `ButtonBase`/`IconButtonBase` painted 2, `ToastList`, `RowBase`, `FileRowBase`), 9 have a public route that draws a different tree (needs a look), 2 read `graphs.ts`.
- `apps/showcase/tsconfig.app.json` sets `"rootDir": "../.."` so those relative imports compile; it goes when the last one goes.
- `plugins/react-ui/src/ui/showcase/graphs.ts` stays: `components/canvas/open.test.ts` and two frames both read it.

F9 part 2 (owner: the showcase is a consumer), commit `915aab1c`. Gate: check-types 32 of 32, test 27 of 27, Biome 977 files clean (Biome re-run alone after an import-order fix). The three open items above are closed: imports from the app into plugin source 34 to 0, no `rootDir` override, `plugins/react-ui/src/ui/showcase/` gone, canvas test data at `components/canvas/__fixtures__/graphs.ts` (6 graphs), app copy at `apps/showcase/src/roster/graphs.ts` (24). No new `exports` entry. Stories 114 before and after. **Nobody looked at any drawing.**

To look at when visual checks are allowed (52 stories whose drawing changed): `shared-actionbar--error`, `atom-button--rest`, `content-canvas--rest`, `layout-form--*` (7), `content-gallery--rest`, `content-image--rest|loading|error`, `atom-input--rest|disabled|error|empty`, `layout-pane--rest`, `shared-picker--rest|loading|selected|disabled|error`, `layout-section--*` (9), `shared-sheet--*` (9), `atom-switch--rest|disabled`, `content-table--*` (6), `content-thread--rest`, `shared-toast--rest`. First risk: an overlay stage now holds a `Gate` (`h-dvh`), where the stage was 600 px tall; sheets in stages are now modal.

Edges dropped because no consumer can draw them (owner decides whether a component should offer each):
- a form group with a read of its own (`plugins/react-ui/guide/rules.md` says a group can be given its read; the public `Form` groups take none)
- a field's `answered` fold, `change` mark, and a checkbox field
- a control disabled while placed alone (`Input`, `Picker`, `Switch` take no `disabled`)
- a decision (`confirm()`) or a toast staged beside others on one page: one queue each, every root frame draws it; the confirm frames and the one-toast-per-tone cells went
- a file pick shown chosen and disabled; a painted file row; the painted mini image tile
- a popup outside a root frame drawing its frame's mode

For the react-ui F10/F11 pass: `components/sheet/base.tsx` `scoped` branch and `PortalHosted` in `lib/portal.ts` are dead now that only root frames name a portal (and the comment on `PortalHosted` still names a showcase stage).
