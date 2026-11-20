# Forms

A `Form` is its procedure and its field labels: the procedure's input schema (`slotform generate`
writes it to `.slotform/schema.ts`) gives everything else. This page holds when a screen takes a `Form`
and how a form answers its schema and its server; its props are the platform's forms page.

## What is a `Form`

A value the viewer sends to a procedure is a `Form` over that procedure. A filter is a `Toolbar` pick
or search, and a local setting is a `Switch` in a row: neither is a `Form`. A form over no procedure
is a shortfall to report (`node_modules/@slotform/cli/guide/shortfall.md`), never a `Form` with
hand-drawn fields.

## The schema's own checks

A typed value the schema's own checks refuse (a string shorter or longer than its `.min` or `.max`,
one not in its format (`z.email()`, `z.url()`, `z.uuid()` and the other formats), a number under its
`.min`, over its `.max`, past its `.gt()`/`.lt()` or not whole for `.int()`) stands under its field
as the field's issue ("Use at least 3 characters.", "This isn't in the form this field takes.") once
the viewer leaves the field, and only then blocks the submit, so a value half typed is not called
wrong. A press of the submit while such an issue waits unseen sends nothing and shows every field's.
A `lines` or `json` field's issue waits the same. A `.regex()` is the server's to judge: the schema
drops its flags.

## The server's refusal

The server's refusal of a value (a `BAD_REQUEST` from the input schema) stands under its field until
the field changes, once, and the first refused field in the form's order takes focus, scrolled into
view. Where every issue names a field the form shows, the bar draws none of them; an issue on a key
the form does not show stands in the bar. The submit act is pending while the procedure runs, and any
other rejection stands in the bar.

The fields stay editable while it runs, and its answer reaches only the fields left as they were
sent.

The server words a machine name in a refusal between backticks
(``z.string().refine(known, "No project at `apps/billing`")``,
``new ApiError("BAD_REQUEST", { message: "No project at `apps/billing`" })``) and the field draws the
span as a `{ code }` run. An `error` a screen passes itself from a server message goes through
`markedRuns` from `@slotform/ui-core/form`.

## A settings page commits by field

A settings page is a `Form` with `commit: "field"`: it draws no bar, and each field sends `given` and
its own key when its control commits (a text on leaving it or on Enter, a switch or a pick on its
change, a file as it is picked). So every required key of the procedure that the form neither
`given`s nor shows throws; a form's own field may be required, since it sends itself.

A field holds its own save: its value stays while the save runs, the server's refusal stands under it
and the value falls back. `submit.done` is toasted per commit and `onDone` hears each output and
input; `submit.label` and `to` have no place without a bar, and the form asks nothing when its page is
left.

## A form in a `Sheet` or a `Gate`

A form in a `Sheet` is the sheet's `form`, the same props, and a pane's or an act's `sheet` takes it
too: its bar submits, `onDone` closes the sheet (an act's `sheet` closes itself), the sheet gives no
`submit` of its own, and the viewer's edits are dropped as it opens again.

A `Gate`'s `form` takes the same props too, drawn after the step's body with its bar across the
column. A `Gate` step that holds local state and submits nothing draws its controls as its
`children`.
