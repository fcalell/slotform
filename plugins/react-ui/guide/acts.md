# Acts, the ActionBar and toasts

How the web draws an act: the `Act` type, the `ActionBar`, the chosen bar over ticked rows, and `toast()`. What an act carries and the order it runs in is `node_modules/@slotform/ui-core/guide/acts.md`; a sheet it opens is `node_modules/@slotform/ui-core/guide/sheets.md`; which acts stand together is `rules.md`.

## The act

The web `Act`, `IconAct` and `MenuEntry` are `lib/act`: ui-core's `Act` plus `sheet`, a `Sheet`'s props but `open` and `onClose` ([containers](./containers.md#sheet)), opened by the press in place of `onAct`. Give it through `sheetOf({ … })` from `lib/act`, which types the form's procedure. The root container's sheet outlet draws the sheet the press opens. A sheet no act opens is a `sheet` search param the route reads with the router.

| Import | From |
| --- | --- |
| `Act`, `IconAct`, `MenuEntry`, `sheetOf` | `@slotform/react-ui/lib/act` |
| `refusal(error)` | `@slotform/query/acts` |
| `useAttempt()`, `useDraft` | `@slotform/ui-core/react/acts` |
| `confirm(confirmation)` | `@slotform/ui-core/react/confirm`, for a decision no act starts |
| `toast` | `@slotform/react-ui/lib/toast` |

The pending look's delay is `--act-delay` (`tuned.actDelay`, `@slotform/ui-core/paint`).

## ActionBar

`@slotform/react-ui/components/action-bar`: the acts that close a block ([rules](./rules.md#a-records-decision-is-an-actionbar)), or that apply to the rows chosen in a list.

| Prop | Is |
| --- | --- |
| `acts` | `Act`s and `LinkAct`s in reading order, the one filled act last; a `LinkAct` (a Back, a way home) is an anchor, quiet unless it is the filled act |
| `chosen` | `{ count, of, noun?, onAll? }`: the bar is a chosen bar ([the chosen bar](#the-chosen-bar)) |
| `pending` | `{ sentence, until?, act? }`: the server works on a decision, and a pending bar stands in the bar's place at the bar's height, so nothing below it moves; `until` fills a track toward the end and shows the time left (unset, a spinner turns), and `act` is the one hairline act beside it |

```tsx
<ActionBar
  acts={[
    { label: "Decline", onAct: () => decline.mutateAsync({ id }), destructive: true, confirm },
    { label: "Approve", onAct: () => approve.mutateAsync({ id }), done: "Approved" },
  ]}
/>
```

One rule lays out every bar, by the width of the block it closes and never the viewport (the `acts` container): up to the auth column's width (a `Gate` step, a sheet on a phone) the acts stack across the block, one a row and the filled act on top; wider (a desktop sheet, a page's form) they stand at their own width at the block's end, the filled act last, wrapping to a further row only when the line cannot hold them. An empty state's act stands across a column at the empty width the same way.

The bar holds its acts' attempt (`node_modules/@slotform/ui-core/guide/acts.md#an-act-holds-its-attempt`), its rejection in the line under the acts. A blocked act waits for a touch: inert and silent until it is pressed, or until its form or sheet has taken input, then its reason stands in the line under the acts, at the filled act's edge. The line stands only while it says something, so it leaves with the reason.

A `Form`'s `submit` and `acts` and a `Sheet`'s foot draw this bar themselves; give a bar of your own only where no form or sheet stands, and for the rows a `Table` ticks.

## The chosen bar

An `ActionBar` with `chosen` in the `Pane`'s `foot` holds the acts that apply to a `Table`'s ticked rows ([table](./table.md#choosing-rows)).

| `chosen` field | Is |
| --- | --- |
| `count` | the rows ticked |
| `of` | the rows that can be ticked, yours to count |
| `noun` | a plural word naming them: "N of M promotable chosen" |
| `onAll` | hears the set to choose: `true` for every row that can be ticked, `false` for none |

The bar is one row at the body's column and start (the reading width, the body's width where the body holds wide content). At its start it reads "N of M chosen" with the numbers formatted ("48,210 of 48,210 chosen"), a select-all act while the ticked are fewer than `of`, and a clear icon while any are ticked. At its end the filled act stands, the last of `acts`, and the others are in a more menu before it. It draws nothing, nor does the foot, while no row is ticked or the table has no row to tick.

## Toasts

`toast(sentence, { tone, act })` queues a toast for what no act started. `tone` is how the thing it reports ended (`node_modules/@slotform/ui-core/guide/tone.md`). `act` is an `Act` or a `LinkAct` it offers (a route, a retry), never an undo. Only a page inside the `Shell` can call `toast()` or `confirm()`, since the `Shell` draws both.

A toast stands over the foot of the container, above whatever docks there: a `Pane`'s `foot` or open docked `sheet`, and on touch an open bottom `Sheet`, so it never covers a foot, a sheet's sentence or an act. Where nothing docks it stands over the page's end for its few seconds, and the `Pane`'s body takes its reach under the last line, so scrolling to the end brings that line clear of it. It swipes away and takes no press outside its own box.
