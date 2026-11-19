# Sheets an act opens

A task an act starts in a `Sheet` is the act's `sheet`, data the press opens, and a sheet no act
opens is addressed by the route; neither holds an open flag in the screen. The `sheet` field is each
platform's `Act` from its `lib/act`, beside the wiring `@fcalell/ui-core/descriptors` gives every act
([acts](./acts.md)). A form inside the sheet is [forms](./forms.md#a-form-in-a-sheet-or-a-gate).

## An act opens a sheet

`sheet: { title, submit, form, … }` is a `Sheet`'s props but `open` and `onClose`, opened by the
press in place of running `onAct`. The two are exclusive and the types forbid both: an act that
opens a sheet has no `onAct`.

The press opens the sheet in the root container's sheet outlet with the props the act holds at that
moment, and it closes when the sheet is dismissed or its `submit` act or its `form` resolves; the
`submit` takes the same `confirm`, `done` and `to`. A sheet that opens from an act holds no
`useState(false)` flag in the screen. What changes while it is open reaches it through the reads it
holds (its `read`, the selections its parts draw), never through a value the act's render computed:
the props stay those of the press. The sheet takes nothing from where its act stands (a heading
level, a Pane, a disabled field), and the act's host closing or leaving (a menu, a row) leaves it
open.

Give the sheet through `sheetOf({ … })` from the platform's `lib/act`, which reads the procedure off
the form's `act`, so `onDone` hears that procedure's typed output and the fields are checked against
its input. An act's region holds acts of different procedures, which no type follows, so `sheetOf`
is where the procedure is typed and `sheet` is procedure-less after it. A `Pane`'s and a `Thread`'s
`sheet` is typed by its own form's procedure directly.

## A sheet no act opens

A sheet that no act opens (a deep link, a row that opens its record's sheet) is addressed by the
route: a `sheet` search param (`?sheet=invite`) the route reads with its router, its `open` the
param's presence and its `onClose` clearing it. The app holds no open flag for it.
