# Acts

An act is data: its `onAct` returns the promise of the work, and what happens around the work
(asking first, a toast, a route, a sheet) is fields of the act, which every host that draws it runs
in one order. `Act` is `@slotform/ui-core/descriptors`, and each platform's `Act` from its `lib/act`
adds `sheet`. A route act is a link: [links](./links.md).

## An act holds its attempt

Every act's `onAct` returns the promise of the work it starts: `onAct: () => save.mutateAsync(v)`,
never `mutate()`. The act renderer holds the attempt, so the app passes no `loading` and reads no
`isPending`:

- the act is inert at the press, draws its pending look only after `tuned.actDelay` (300 ms; the
  delay is no option), and is ready the moment its promise settles;
- a host takes over its acts' attempt: a form's or sheet's bar pends one act and the rest stand
  inert;
- a rejection is drawn by the host, in its line (a bar's line, a `Sheet`'s, a standing `Button`'s
  under itself) and otherwise in a failed toast whose Retry runs the whole act again. A refusal the
  server answered (a 4xx other than 408 and 429, `retries(error)` false) draws no Retry, as the same
  act would be refused again. The sentence is `refusal(error)` from `@slotform/query/acts`,
  else "That didn't go through." (`words.actFailed`). `.catch` nothing: a handler that catches a
  rejection to toast it draws it twice;
- an act pressed with no connection is refused at the press: it rejects with `Unreached`, nothing is
  sent and nothing queues for later, and the host draws "That didn't go through." where its failure
  goes, with no Retry; the connection's reason is the offline banner's, said once.

## The wiring is data

An `Act` carries, beside its `label` and `onAct`:

- `confirm: { title, sentence }` is asked first, as a decision over the page whose act wears the
  act's own `label` and `destructive`; declined, nothing runs. The app calls no `confirm()` or `ask()`
  for an act it draws (`confirm()` stays for a decision no act starts).
- `done: "Saved"` is a sentence toasted once `onAct` resolves; a rejection toasts the error's
  sentence as a failed toast, as it does without it. `toast()` is for what no act started.
- `to: route` is gone to once `onAct` resolves and `done` is toasted, through the router a `LinkAct`
  goes through: `async () => { await remove.mutateAsync({ id }); navigate("/deploys"); }` is
  `{ onAct: () => remove.mutateAsync({ id }), to: "/deploys" }`.
- `sheet` opens a `Sheet` with the press in place of running `onAct`: [sheets](./sheets.md).

| `Act` field | Is |
| --- | --- |
| `label` | the act's visible text, a short phrase that truncates; the accessible name where only the `icon` draws |
| `onAct` | the work, returning its promise |
| `icon` | an `IconName` drawn with the label, or alone in an icon-only region |
| `blocked` | why the act cannot run, a sentence: it stands inert and its host draws the reason |
| `destructive` | it removes or ends something: a bar draws it in the danger fill as its filled act and as the hairline in danger ink otherwise, and its `confirm` wears the same |
| `quiet` | words in the meta ink with no hairline (a resend), unless it is a bar's filled act |
| `confirm` | a `Decision`, asked first |
| `done` | the sentence toasted once `onAct` resolves |
| `to` | the route gone to after `done` |
| `sheet` | each platform's: a `Sheet`'s props but `open` and `onClose`, opened in place of `onAct` |

| `Decision` field | Is |
| --- | --- |
| `title` | the decision's heading, a short phrase |
| `sentence` | what it asks, a sentence |
| `cancel` | the way out's words ("Keep editing"), the `cancel` word unless given |
| `confirmName` | `{ value, label, blocked }`: the name the viewer types before the act enables (a name the act removes), the field's label, and the act's reason until the two match |

## One order

The order is fixed: confirm, run, toast, go. Every host that draws an act (a `Button`, a form's or
sheet's bar, a `Section`'s head, band, rows and empty shape, a `Pane`'s bar, a `Banner`, a `Toast`, a
menu, an `Input`'s or `Picker`'s act, a `Sheet`'s submit) runs it, so the sequence is the same
wherever the act stands. An act that needs another order (a toast before a confirm, two sheets) has
no form: file the shortfall (`node_modules/@slotform/cli/guide/shortfall.md`), hand-wire nothing. A
retry after a failure runs the work again (`onAct`, `done`, `to`), not the confirm.
