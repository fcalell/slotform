# ui-core

`@fcalell/ui-core` is the design contract both UI plugins render from: the token contract with its
parametric derivation, the motion contract, the words the molecules speak, the shared `cn()` merge
config, the platform-invariant variant matrices, the component roster, the shared descriptor types and
the framework-free logic both platforms run. This page says what the package is, maps its source and
subpaths, draws the sharing line between ui-core and the plugins, lists the package's limits and links
to the page for each part. The emitted `DESIGN.md` is the generated reference for tokens, class sets and
roster ([DESIGN.md](ui-core/roster.md#designmd)).

## What it is

ui-core is a preset library, as `biome-config` is: no `plugin()` factory, no slots, no framework
dependency. React is an optional peer that only the `react/*` subpaths read. `@fcalell/plugin-react-ui`
and `@fcalell/plugin-native-ui` depend on it and draw every component from it; a package that only
reads its descriptors (a server) installs neither React nor Lucide.

## Pages

- [Tokens](ui-core/tokens.md): the knobs, the token contract and its derivation, contrast floors,
  density and the room, the scales, the reset, `cn()` and the emitted records.
- [Motion](ui-core/motion.md): the motion contract, its one table of numbers, the moves and what each
  kind of change does.
- [Words](ui-core/words.md): the words, counted and slotted words, the formatters and the text runs.
- [Roster](ui-core/roster.md): the canon, the roster, the matrices, class sets and variants, the shared
  shapes of statuses, chips, facts and marks, and `DESIGN.md`.
- [Layout](ui-core/layout.md): Shell, Panes, Pane, Section, rows, the overflow rules, headings, cards and
  the rows grid.
- [Reads](ui-core/reads.md): the read model, frames, holds, paint and waiting shapes, and the port.
- [Acts](ui-core/acts.md): acts, saves, forms, confirm, leave, reasons, fields and commit.
- [Components](ui-core/components.md): each content molecule (Table, Picker, Thread, charts, files,
  images, code and the rest).
- [Sound](ui-core/sound.md): the track, the player, the dock and the waveform.
- [Drag](ui-core/drag.md): drag, drop, reorder and the follow.
- [Showcase](ui-core/showcase.md): the showcase app, the roster scenes, Storybook, the guide pages and
  enforcement.

## Source map

All of it is under `packages/ui-core/src/`.

- `tokens.ts`: the token values as data, `MOTION_KNOBS`, `MOVES` and the English `words`.
- `derive.ts`: `deriveTheme`.
- `variants.ts` and `variant-tables.ts`: the matrices and `MATRIX_GROUPS`.
- `roster.ts`: the roster by layer (`rosterEntries`).
- `roster/<component>.ts`: one roster component's contract: its entry, the descriptors, matrices, cvas
  and class sets it alone uses ([roster files](ui-core/roster.md#roster-files)).
- The framework-free logic subpaths ([Subpaths](#subpaths)).

## Subpaths

Each part's page covers its subpaths, the package README lists every subpath with what it exports
([Install](../../packages/ui-core/README.md#install)), and the ones below are shared by several parts.

- `store.ts` is `createStore`, the one held value with `get`, `set`, `emit`, `subscribe` and `size`
  (how many listen) that every `useSyncExternalStore` source over plain state is built on. Its
  optional `source` feeds the value from outside (a timer, a media query, an observer) from the first
  listener to the last.
- `queue.ts` is `createIdQueue`, a store of entries each given an id as it is added, in the order
  added, with `add` and `remove` its writers. The decision queue (`react/confirm.ts`) and the sheets
  acts open (`sheets.ts`) are built on it; it is no subpath of the package.
- `clock.ts` also holds `createClock`, the coarse clock `useClock` (`./react/clock`) reads
  ([ages and the clock](ui-core/words.md#ages-and-the-clock)).
- `acts.ts` also holds `moreMenu` and `endedItems`: what a more menu holds, and the one blocked item it
  stands as once its read ended.
- `list-state.ts` also holds `optionReads`, the reads a Section's pick rows draw their options from,
  which its row list says once.
- `react/acts.ts` holds `createActs`, which binds `useAct` and `useHeldDraft` to a platform's
  `ActPlatform` (its `toast` and its `open` of an act's `to`); each plugin's `lib/act.ts` calls it
  once.
- `sheets.ts` holds the queue of sheets acts open (`openSheet`, `closeSheet`, `openSheets`,
  `closeOnResolve`), which `useAct` fills, and `react/sheets.ts` holds `useDrawnSheets`, what each
  plugin's sheet outlet draws ([sheets an act opens](ui-core/acts.md#sheets-an-act-opens)).
- `react/form.ts` holds `useFormModel`, a form's model over its procedure, read from `FormModelProps`.
  `FormModel` holds its fields' state, each field as a `FieldModel`, the input they make, the bar with
  its submit, the reads the bar paints under and `clear`; each plugin maps every `FieldModel` to its
  `FormField`.

## The sharing line

What ui-core holds and what each plugin holds is decided by whether both platforms can take it.

- A matrix class set holds platform-invariant classes only: fills, borders, ink, spacing roles, radius,
  type role, weight, family, sizes and widths. A type-role class set carries its ink; `mono` carries its
  family.
- Display, alignment, flex sizing, truncation, positioning, overflow, negative bleed margins and
  fraction widths are platform overlays, composed through `cn()` by each plugin: React Native is flex by
  default and the web is not, so the same overlay differs per platform.
- An interaction look that any web renderer would share (the press wash `PRESS_WASH`, and the segment
  classes in `roster/picker.ts`) lives in ui-core's variants, since ui-core can serve other web
  frameworks than React. The phone has no hover, so it composes its own press looks through `cn()`.
- No framework code lives in ui-core outside the `react/*` subpaths. Logic both platforms run lives in
  a ui-core subpath, free of any framework, so a test holds it once and both platforms give the same
  answer.

## Limits

- Native has no render harness: no check draws a native screen.
- A native Button's `count` is not in its accessible name.
- Base UI's Checkbox, Switch, Radio and OTP field look for a `<label>` after every render unless named
  by `aria-labelledby`, a `Field` label or a native button, and the look grows with the document
  (react-ui's Switch and checkbox: [field box](plugins/react-ui.md#field-box-and-focus-rings)).
- The native toasts' layer stands over a box measured against the container's root (`ToastSpace`,
  `ToastContainer`) and follows a growing input a layout late.
- An `Image`'s full view takes no pinch-zoom or pan.
- A product cannot draw in the platform font: `fonts.sans` unset is IBM Plex Sans.
- Table's `hyphens-auto` is unverified: the headless Chrome `stack screens` drives ships no
  hyphenation dictionaries.
- Native Diff and Table name a `list`-role container, since React Native has no table role.
- The Table's columns menu, keyboard cursor and kept column choice are web only: the phone's Table
  honours a column's `hidden` default and nothing else of them.
- A Shift-arrow run on a window read ticks the rows loaded between its ends; a row whose page has not
  landed is passed over.
- Drag, drop, reorder, `choose` over a window's query (`Picked`) and a Table row's `act`, `more` and
  `drop` are web only. The phone's Table and list rows ignore them (a drag there would fight the
  scroll, and the menu is the way), and the phone's `choose` holds ids.
- A drag holds one collection's rows. A reorder moves one row: a ticked set drags to a drop and is not
  moved as a set ([which collections reorder](ui-core/drag.md#reorder)). Over a window read a drop that lands beside a row whose page is not loaded has no line,
  since the neighbours' ids are unknown, and the auto-scroll brings the pages in.
- The drops a row offers by menu are the ones mounted: a drop in a windowed collection that is
  scrolled out is not offered, so a long list of targets keeps its own `more` entries.
- A press that moves a row drags it, so a Table with `drag` or `reorder` does not select text by
  dragging across its cells, and a held finger drags where it would have selected.
- A Table row's `act` that is `blocked` draws inert with no line of its own for the reason (the grid
  has no second line to hold it), so its label says why.

## In the code

- `packages/ui-core/src/store.ts`: `createStore`.
- `packages/ui-core/src/queue.ts`: `createIdQueue`.
- `packages/ui-core/src/clock.ts`: `createClock` and the clock's pure parts.
- `packages/ui-core/src/acts.ts`: `moreMenu` and `endedItems`, with the act model ([acts](ui-core/acts.md)).
- `packages/ui-core/src/list-state.ts`: `optionReads`, with what a collection decides before it draws.
- `packages/ui-core/src/react/acts.ts`: `createActs`.
- `packages/ui-core/src/sheets.ts`: `openSheet`, `closeSheet`, `openSheets`, `closeOnResolve`.
- `packages/ui-core/src/react/sheets.ts`: `useDrawnSheets`.
- `packages/ui-core/src/react/form.ts`: `useFormModel`.
- `packages/ui-core/src/roster/table.ts`: the Table's entry, whose web-only props the limits name.
