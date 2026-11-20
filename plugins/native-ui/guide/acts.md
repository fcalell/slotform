# Acts

An act holds its attempt, carries its wiring as data and runs it in one order: `node_modules/@slotform/ui-core/guide/acts.md`, with route acts, icon acts and the fold in `node_modules/@slotform/ui-core/guide/links.md` and the sheet an act opens in `node_modules/@slotform/ui-core/guide/sheets.md`. This page is what the phone adds: its act types, the `ActionBar`, `toast()` and `confirm()`.

```tsx
import { type Act, type IconAct, type MenuEntry, sheetOf } from "@slotform/native-ui/lib/act";
import { ActionBar } from "@slotform/native-ui/components/action-bar";
import { toast } from "@slotform/native-ui/lib/toast";
import { confirm } from "@slotform/ui-core/react/confirm";
```

The phone's `Act`, `IconAct` and `MenuEntry` are ui-core's with `sheet` added; `sheetOf({ … })` types an act's sheet by its form's procedure. `refusal(error)` and `issues(error)` come from `@slotform/query/acts`; `useAttempt()` and `useDraft` from `@slotform/ui-core/react/acts`.

## The attempt on the phone

- The pending look is the pending fill, the label and glyph hidden and the spinner, after `tuned.actDelay` (300 ms, `@slotform/ui-core/paint`); it snaps in.
- A failed toast's Retry runs the whole act again, a navigation included.
- `refusal(error)` is a 4xx the procedure worded itself, except 401, 403, 404 and 429, and for an input the procedure's schema refused, the schema's first issue message. `issues(error)` gives every issue's message and path, so a `Form` puts each under its field itself; an act carries no sentence of its own.
- An act is refused at the press offline, or while the app's connection read says the server is out of reach.
- A `confirm()` act closes its sheet when it resolves, and stays open, ready, with the sentence in its bar line when it rejects.
- In dev, `QueryProvider` logs an error for a mutation an `onAct` started without returning its promise and for a mutation failure nothing drew; a mutation with its own `onError` is exempt.

## ActionBar

Acts that stand together at the end of what they decide (a record's Approve and Decline) are one `ActionBar`, drawn stacked full width with the filled act on top. A `Form` and a `Sheet` keep one in flow; a `Pane`'s `foot` docks one as a table's chosen bar, its column centred in the foot, which a docked `sheet` takes over while it is open.

| Prop | Is |
| --- | --- |
| `acts` | function acts, `Act[]` only, in reading order with the filled act last |
| `fit` | `end` (the default), at its container's end, or `full`, across it (a `Gate`'s form) |
| `chosen` | a chosen bar: `{ count, of, noun?, onAll? }` |
| `pending` | the server works on a decision: `{ sentence, until?, act? }` takes the bar's place at its own loaded height, the acts kept under it unseen and out of reach |

A chosen bar draws "N of M chosen" (its numbers formatted; `noun`, a plural word, names the rows: "2 of 4 items chosen") over a row of the more menu, holding every act but the last, and the filled act, whose label you set ("Publish 4 changes") and whose `blocked` reason you give when nothing can go (read your own `chosen`). `of` counts the rows that can be chosen, which you count. The phone has no head tick, so with `onAll` the bar puts the acts beside the count: "Select all" while some rows stand unchosen and "Deselect all" while any are chosen, the first that applies standing and the other in a more menu beside it. `onAll` hears the set to choose (every row that can be chosen, or none), so apply your rule to it as to a tick. The bar draws nothing while no row is ticked or `of` is 0.

## A sheet no act opens

It is addressed by the route (`node_modules/@slotform/ui-core/guide/sheets.md#a-sheet-no-act-opens`):
the screen reads the `sheet` search param with expo-router's `useLocalSearchParams`, and its
`onClose` clears it with `router.setParams({ sheet: undefined })`.

## `toast()` and `confirm()`

`toast(sentence, options)` queues a toast for what no act started (an act's `done` toasts its own), and `confirm(confirmation)` asks for a decision no act starts (an act's `confirm` asks its own). The `Shell` draws each decision as a bottom sheet and the toasts at the screen's foot, over any open sheet.

| `toast` option | Is |
| --- | --- |
| `tone` | how the thing it reports ended: `done` by default, `attention` or `failed` |
| `act` | an `Act` or a `LinkAct` it offers |
| `onGone` | called once the toast has left, however it went |

| `Confirmation` field | Is |
| --- | --- |
| `title` | the sheet's heading (a short phrase; wraps) |
| `sentence` | what the decision asks (a sentence; wraps) |
| `act` | the act it runs, wearing its own `label` and `destructive` |
| `cancel` | the way out's own label ("Keep editing") where the `cancel` word is not the decision's |
| `confirmName` | `{ value, label, blocked }`: a name to type before the act runs, its field's label, and why the act is blocked until then |
