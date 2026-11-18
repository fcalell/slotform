# @fcalell/ui-core

The design system both stack UI plugins render from: one closed token contract, the approved
foundations sheet as data behind six knobs, the words the molecules speak, the platform-invariant
variant matrices, the roster every component and its props are pinned to, and the laws that say
which token to pick. The contract subpaths export build-time data only, so each plugin renders its
own CSS from the same records and ui-core stays framework-free outside `react/*`. One subpath is Node-only:
`./manifest`, the guide pages the UI plugins index.

How it is built: [docs/architecture/ui-core.md](../../docs/architecture/ui-core.md).

## Install

```bash
stack add react-ui   # or: stack add native-ui
```

Either plugin depends on `@fcalell/ui-core`; to import its subpaths directly, `pnpm add @fcalell/ui-core`.

The subpaths:

- `@fcalell/ui-core/tokens`: the contract as data, the sheet's every value, the knob defaults and
  the English `words`.
- `@fcalell/ui-core/schema`: the zod `themeSchema` and `wordsSchema`, and the `Theme` input type.
- `@fcalell/ui-core/derive`: `deriveTheme(theme)` resolves the knobs into final values, one string
  per token, plus the motion scale as numbers.
- `@fcalell/ui-core/emit`: the token records a plugin renders, `themeTokens`, `rootTokens`,
  `modeTokens`, `densityTokens`, `roomTokens`, `roomScope`, `roomMeasureTokens`, `roomUnitFor`,
  `nativeMeasureTokens`, `reducedMotionTokens`, `shadowUtilities`, `raisedGroundTokens` and
  `softGroundTokens` ([Emit](../../docs/architecture/ui-core/tokens.md#emit)).
- `@fcalell/ui-core/cn`: `cn()`, the class merger, taught the contract's scales
  ([Composing with cn](../../docs/architecture/ui-core/tokens.md#composing-with-cn)).
- `@fcalell/ui-core/variants`: the platform-invariant variant matrices, each a cva built from a
  table, the single-class-set constants beside them, and `MATRIX_GROUPS`, every matrix by name with its axes,
  which `matrixClasses` enumerates into class sets; the prop types a component shares across plugins
  with them (`ContentTone`, a glyph's ink; `IconFit`, the `ICON` matrix's `meta`, `body` or
  `control`, what an icon sits beside, which picks `icon-meta`, `icon` or `icon-control`;
  `ButtonFit` and `IconButtonFit`, what an act sits in, read off each matrix's `fit`
  axis; `ActionBarFit`, where a native action bar stands, `end` or `full`;
  `TextRole`, the `body` and `meta` roles `Text` draws).
- `@fcalell/ui-core/descriptors`: `IconName`, `Act`, `LinkAct`, `IconAct`, `Run`, `Runs`, `StatusMark`, `ChipMark`, `RowMark`, `Fact`, `RecordFact`,
  `Option`, `OptionLeading`, `OptionGroup`, `OptionPick`, `MultiPick`, `Row` (`RowItem`, `FileItem`), `Band`, `PlaceSpec`, `Hunk`, `FieldBinding`, `Confirmation`, `Decision`,
  `RowEntry`, `Lock`, `Answered`, `TableColumn`, `TableRowRegions`, `Stage`,
  `StageEnd` and the other framework-free types a prop carries.
- `@fcalell/ui-core/rules`: what the Rules editor and the Picker decide before they draw, free of
  any framework: `pairSet`, `isTyped` and `marked`.
- `@fcalell/ui-core/streaming`: `closeOpenRuns`, a still-arriving reply's Markdown with the runs open at its end closed, free of any framework.
- `@fcalell/ui-core/read`: the read model, free of any framework and of TanStack: `readState`, a read's phase (idle, waiting, ready, failed, missing) and flags (busy, stale, more, streaming, paused) from the few fields of a query's result it names; `frameOf` and `turnOf`; `isEnded`, whether a frame's shape or a selection's phase says its read ended (failed or missing); the `Read` handle (`key`, `kind`, `missing`), `Selection`, `Datum`, `combine`, `lift`, `Drawn` and `paints`, the stand-in and the sample, the frame's holds and flags, and `planSelections`/`planFrame`, the pure core of the hooks. The binding that runs the reads builds a `Read` with `readOf`. `endedSentence` is the sentence a failed or missing row says.
- `@fcalell/ui-core/acts`: what an act is made of apart from what runs it: `isThenable`, `drew`/`wasDrawn`, `placed`/`isPlaced` (a rejection whose sentences its own host draws in place), `Offered` and `offered` (an act as a region takes it, and that made whole), `startAttempt`, `keepSave`, `Issue`, `Unreached`, and a more menu's items (`moreMenu`, `endedItems`).
- `@fcalell/ui-core/scope`: the route's registered scope (`registerScope`, `releaseScope`, `registeredScope`, `ScopeIds`) and `mergeScope`.
- `@fcalell/ui-core/listen`: `QueryListeners`, the shape of the query provider's `listen`.
- `@fcalell/ui-core/react/port`, `/react/read`, `/react/acts`, `/react/form`, `/react/scope` (React, an optional peer): the read hooks (`useSelections`, `useFrameRead`, `useMore`, `useWindow`, `useDraft`, `useAttempt`, ...), `createActs` (a platform's `useAct` and `useHeldDraft` over its `ActPlatform`, with `Acting` and `Attemptable`), `useFormModel` (a form's model over its procedure, `FormModel` with each field's `FieldModel`, read from `FormModelProps`), `FrameHolds`, `ScopeBoundary`, and `ReadPort`, the port a binding (`@fcalell/plugin-query`) provides them and the components through. A component asks the port to observe reads, to say whether a fetch is the next page's, to retry a read, to load a window's pages or wait for fetches to settle, to run an act and carry the binding's context into a portal, to word a failed act (its refusal sentence, whether it retries, its schema issues), to submit a procedure, to give a procedure's schema, to answer whether the caller may do an action, and to warm a route's reads. With no binding above, plain values draw, an act runs as it is, and a read or a procedure throws naming `QueryProvider`.
- `@fcalell/ui-core/react/words`, `/react/clock`, `/react/arrive`, `/react/reason`, `/react/touched`, `/react/confirm`, `/react/frame`, `/react/field` (React, an optional peer): what both UI plugins' components share over React alone: the words (`WordsProvider`, `useWords`), the one coarse clock (`useClock`, `usePending`), a list's arrivals (`useArrivals`, `useDrawn`, `useStreamed`), a blocked act's reason host and press (`ReasonHostContext`, `usePressed`), a form's or sheet's touched state (`TouchedContext`, `useTouched`, `useTouchState`, `usePageTurn`), the decision queue (`confirm`, `ask`, `askDiscard`, `dismissConfirmation`, `useConfirmations`), `ShellHome`, and the field contexts `FieldDisabled` and `FieldOwned`.
- `@fcalell/ui-core/same-by`: `sameBy`, a collection row's `memo` comparison (its item by value, the other props by identity), free of any framework.
- `@fcalell/ui-core/paint`: what a part draws while its data is not here, free of any framework:
  `paintText` (deterministic filler of a role's length), `painting` (a region over a painted item, a
  throw painting the region), `WAIT_DELAY`, `PAINT_ROWS` and `PAINT_TURNS`, and `timings` (the live `waitDelay`,
  `actDelay` and `waitMin` a bench tunes, with `paintWait`, the minimum hold on a first load).
- `@fcalell/ui-core/arrive`: `arrivals`, the keys a collection did not hold when it first drew,
  which fade in on their own.
- `@fcalell/ui-core/list-state`: what a collection decides before it draws, free of any framework:
  a table's records,
  sort and tick logic (`tableRecords`, `sorted`, `tickable`), a tree's visible rows (`treeRows`),
  the states a meter, a step count and a rail draw (`levelOf`, `stepStateOf`, `stagesShown`) and
  the set a toggled value leaves (`toggled`), a title's cut (`valueCut`, its stem and
  the last four characters it keeps), and the one reading of a list of facts (`splitFacts`, with
  `isStatusFact`, `isWarningFact`, `isChipFact` and `isMarkFact`) and of an option's leading
  (`optionLeading`), the reads a Section's pick rows draw their options from (`optionReads`), a row
  title's reading (`isAbsent`, `isCopy`, `titleWords`), a record fact's key (`factKey`) and a file
  row's glyph and path split (`glyph`, `split`).
- `@fcalell/ui-core/file`: `accepts(file, accept)`, whether a picked file matches a control's
  `accept` list, `kindsOf(accept, words)`, the kinds that list names in the viewer's words,
  `pickerTypes(accept)`, the MIME types a platform's picker filters by, and `fileSize(bytes)`, a
  file's size in the viewer's language.
- `@fcalell/ui-core/commit`: `commitMoment()`, when a typing control's value is final: on
  leaving the field or Enter, only when it changed since focus, Escape restoring the value at
  focus, and ending the edit. Both plugins' `Input` drive their `onCommit` with it.
- `@fcalell/ui-core/reason`: `pressStands(blocked, pressedUnder)`, whether a blocked act's press
  still shows its reason: a press is kept as the reason it came under and stands while the act
  is blocked by that reason, so unblocking or a different reason forgets it in render.
- `@fcalell/ui-core/leave`: `createLeave()`, whether leaving a form asks: the form's edit by value writes it (a
  value put back un-edits it), the filled act's press clears the edit while the act runs (a rejection puts it back), and a leave
  attempt asks once while the form stands edited. Both plugins' forms drive it.
- `@fcalell/ui-core/form`: what a `Form` is made of on both platforms: the `FieldSpec`, `FormFields`,
  `FormGroupOf`, `Can` and `FormSubmit` types, `pathOf` (a procedure's dotted path, from its mutation key), and the derivation of a field from a procedure's input JSON Schema
  (`derive`: its control, whether it is required, its values; `toShown`, `isEmpty` and `toInput`:
  what the control shows, whether it is empty and the value the input takes; `readPicked`: a picked
  file as the text or base64 a `file` field sends). No React.
- `@fcalell/ui-core/route`: where an address stands among a shell's places, by plain string
  parsing (React Native's `URL` is partial): `isCurrent(route, at)`, whether a row's route is
  current (a route is current below it, the root `/` only at itself, a query narrows it to the
  addresses carrying each parameter, a hash to the address carrying it), and `placeAt(places, at)`,
  the route of the place that owns the address: of the places that hold it, the longest pathname,
  then the most query parameters, the root `/` holding every address so it owns what no other
  place claims. Both Shells select by `placeAt`; the rows use `isCurrent`. Places nest
  (`PlaceSpec.children`): `flatPlaces(places)` lists a tree's places, each before its children, for
  `placeAt`; `placeTrail(places, at)` the routes from the top-level place down to the owner of the
  address; `placesFolded(places, chosen, trail)` the branches a sidebar draws folded (the viewer's
  choice by route, else open on the current path).
- `@fcalell/ui-core/format`: `formatterFor(kind, lang, options)`, the platform's `Intl` number,
  date and relative-time formatters, built once per kind, language and options; every formatter
  both plugins use comes from it.
- `@fcalell/ui-core/chart`: what a `BarChart` decides before it draws: `chartScale(peaks, figures)`,
  its axis step, band count and top over a floor of zero (four even bands, or a step of 1 over the
  peak rounded up for a small whole-number chart), `levelScale(figures)`, a level's axis around its
  readings (four bands, the floor a step under the lowest and the top over the highest), and
  `chartShare(value, scale)` where a value stands on it, `timeSpace(index, count)`, the space in regions
  a time between the ends stands in (it draws where that holds `TIME_SPACE` times the longest time),
  `chartHead(series, keys, level)`, the figures its head draws (the sum, or with `level` the bars'
  span, lowest to highest), `spanText` and `spanUnit`, a head figure's text and the unit's word
  after it, `levelUnit(unit)`, whether a unit never sums (`%`, `°C`) so its chart is a level, and
  `unitOf(unit, count)`, a unit's word at the figure it follows (a word, or `{ one, other }`).
- `@fcalell/ui-core/clock`: what a clock-read part draws, as functions of its times and now:
  `timeLeft`, a `PendingAttempt` with `pendingAttempt` and `pendingShare` (a `Banner` with `until`'s clock
  and fill), and an ISO moment's age: `ageOf` (its value and unit), `ageWords` (long) and `ageShort`
  (a row's "2 min"). Both plugins tick `now` from one shared clock.
- `@fcalell/ui-core/roster`: the component roster as data (`STATES`,
  `rosterEntries(platform?)`): the layer, prop names, drawn class sets, moves, states and
  platforms of every component the plugins ship.
- `@fcalell/ui-core/canvas`: what a `Canvas` and its consumers decide from a graph, free of any
  framework: `pathOrder(nodes, edges)`, every node id once, depth first from the roots with a node
  of several predecessors placed after its last and a cycle cut at its back edge; `backEdges(order,
  edges)`, the ids of the edges whose target is at or before its source; and `HANDOFF_GLYPH`.
- `@fcalell/ui-core/store`: `createStore`, a value held outside React that `useSyncExternalStore` reads through `subscribe` and `get`.
- `@fcalell/ui-core/action-bar`: what an action bar derives from its acts: the button fit by bar fit (`FIT`), the failure line's held text (`NO_FAILURE`), `chosenAbsent` and `kindOf`.
- `@fcalell/ui-core/banner`: `GLYPHS` and `TOAST_GLYPHS`, the glyph each banner and toast tone draws.
- `@fcalell/ui-core/controls`: what a control derives from its value: `wordCount` for a text area and `STATES`, a checkbox's state names.
- `@fcalell/ui-core/pick`: what a picker derives from its options and value: the search threshold (`SEARCH_PAST`), the one-or-several split (`Several`), the option groups (`groupsOf`, `Grouped`, `paintedGroups`), the current pick (`pickCurrent`), link segments (`linked`, `linkAt`) and `scrollEdges`.
- `@fcalell/ui-core/prose`: the reading of a markdown text: `parts` and `Part`, `keyed` (each token keyed by its source) and `safeHref` (a link's target unless its scheme runs script).
- `@fcalell/ui-core/line-diff`: the line diff of two texts and the numbers a `Diff` draws: `lineHunks`, `held`, `indented`, `hunkKey`, `hunkContext`, `elidedBefore`, `tokenParts`, `lineKey`, `numbersAt` and `numbersOf`.
- `@fcalell/ui-core/stages`: the rail below a stage (`railBelow`, `RailState`) and the painted rail's stages (`WAITING`).
- `@fcalell/ui-core/runs`: the words of a part and a line of parts, free of any view: `runsOf`, `partRuns`, `partText`, `factParts`, `flowRuns`, `filled`, `isRun` and `isCode`.
- `@fcalell/ui-core/overflow`: the one overflow rule for acts that stand side by side: `actsSplit`, `rowOneLine`, `rulesOneRow`, `definitionsOneRow`, `actsStackedMax` and `ROW_TITLE_LINES`.
- `@fcalell/ui-core/follow`: what a finger or pointer carries moves 1:1 with it and only its release eases: `position`, `velocity`, `release`, `eased` and `mix`.
- `@fcalell/ui-core/roll`: how a figure that changes while shown moves: `rollOf` and `rollShift`.
- `@fcalell/ui-core/scramble`: the glyph region's scramble, pure over the tick it is given: `frame`, `decode`, `lockedAt`, `seedOf`, `busy` and `createTicker`, the one ticker every region of a page shares.
- `@fcalell/ui-core/window`: how a long collection windows: `windowEntries`, `ranged`, `pagesCovering`, `VIRTUAL_FROM` and `OVERSCAN`.
- `@fcalell/ui-core/drag`: drag and drop, free of any framework: when a press becomes a drag (`pressed`), which side of a row a pointer is on (`sideOf`), where a move lands (`movedTo`, `moveOf`, `stepOf`, `moveEntry`), how deep a drag stands in a scroller's edge band and the distance a frame carries it there (`edgeDepth`, `edgeSpeed`), the band's entry and steps (`bandAt`) and the drop a drag is accepted by (`accepts`).
- `@fcalell/ui-core/waveform`: a waveform's arithmetic: the peaks reduced to columns (`columns`), the moment a pointer or key names (`momentAt`, `seekKey`, `shareOf`) and the keyboard's steps (`SEEK`).
- `@fcalell/ui-core/player`: the audio player's rules, free of the sound: `createPlayer` over an `Output` an app passes, `windowQueue`, `trackTime`, `keyOf`, `neighbour` and `shortcut`, with `QueueProvider` and the player's types.
- `@fcalell/ui-core/qr`: `qrModules`, a QR code's modules as one SVG path, so both platforms draw the same code.
- `@fcalell/ui-core/manifest`: `uiCoreGuide`, the package's `guide/` pages with their load
  triggers, which react-ui and native-ui contribute to `cliSlots.guide`.

The package's `guide/` is how to design on it: the screen recipe (`screen.md`), the voice (`voice.md`:
the anchor, its pinned screens, the decisions and the floors), the structure rules for building a
component (`structure.md`) and the critique a review of a screen runs (`critique.md`).

The contract has two modes, `light` and `dark`. `themeTokens` seeds the light colors and the touch
density set into the `@theme` block as well, because Tailwind v4 generates no utility from a
property declared only inside a variant block; which mode and density seed it never shows, since
every utility reads its variable and the active scope sets it.
