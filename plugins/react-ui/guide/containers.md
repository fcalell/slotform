# Gate, Sheet, Banner, Columns and Card

The containers past the `Shell` and the `Pane`: the `Gate` outside the shell, the `Sheet` over a page, the `Banner` over a column, the `Columns` and `Card` that arrange its sections. This page is what each takes and how it lays out; the `Shell` is [shell](./shell.md), the `Pane` [pane](./pane.md), and which container a screen needs is [rules](./rules.md).

## Gate

A page outside the shell: one centred step.

| Prop | Is |
| --- | --- |
| `title` | the page's one `h1` |
| `description` | a meta line, runs allowed (`{ strong }` for an address) |
| `step` | `{ at, of }`, the onboarding count between the mark and the title |
| `banner` | a `Banner` under the title, at the column's width, so a verdict stands with the content it is about |
| `children` | the body ahead of the form: a `Picker` at `list`, `Section`s of rows, controls |
| `acts` | `Act`s and `LinkAct`s (a Back, a way home) in reading order, the filled act last, drawn as an `ActionBar` under the body at the auth width, across the column with the filled act on top |
| `form` | a `Form`'s props ([forms](./forms.md)): its fields a card and its bar after the card |

A Gate holds one bar, its `acts` or its `form`'s. A step with a `form` gives its alternatives as the form's `acts`; a resend is a caption with an inline act (`Button` at `fit="inline"`) in the form's `after`.

## Sheet

A task over the page: a create, an edit, a decision, an acknowledgement. A record is read in a `Pane`, never in a sheet.

| Prop | Is |
| --- | --- |
| `open`, `onClose` | its holder owns both; an act's `sheet` takes the rest (`node_modules/@slotform/ui-core/guide/sheets.md`) |
| `title` | the heading, which names it |
| `description` | the sentence under it |
| `back` | a function, a second page's way back, first in the head (on touch in the close act's place) |
| `submit` | the act that completes the task, an `Act` with its `blocked`, `confirm`, `done` and `to`, or `{ label }` alone, which acknowledges |
| `read` | the body's read: while it waits the body and the submit paint, inert; its failure stands in the body's place, the submit blocked |
| `empty` | the body's sentence when the `read` is empty |
| `children` | the body's parts, ahead of the `form`, at the card inset |
| `form` | a `Form`'s props ([forms](./forms.md); in a sheet, `node_modules/@slotform/ui-core/guide/forms.md#a-form-in-a-sheet-or-a-gate`): its `after` follows its fields with the form's bar after it, pinned to the sheet's foot, so the submit never ends above the preview |

The submit stands in the foot after the body, so it follows the fields it submits: after Cancel on the desktop, alone on touch, where the close act leads the head. A `submit` with no `onAct` (`{ label: "I saved them" }`) acknowledges what the sheet shows: its press closes the sheet, and no Cancel stands beside it.

A `submit` that cannot run says why with `blocked: "the reason"`, a sentence the viewer can act on ("Write the trigger's words."): the submit stands blocked, and its reason stands in the foot's line under the acts, at the submit's edge, once the viewer presses it or the sheet has taken input, never before. A sheet with no foot (no `submit`) ends on its last part, which keeps a sections gap under it, so a banner that closes a sheet stands off its bottom edge.

## Banner

A sentence over a column (the `Shell`'s `banner`, a `Gate`'s, a Pane's section): a verdict, a caution, a run in progress.

| Prop | Is |
| --- | --- |
| `sentence` | the text beside the glyph, words or runs (a `{ code }` stands boxed in the mono); a selection that waits or answers `undefined` draws no banner |
| `tone` | `active` (news, the default), `attention`, `failed` (announced at once) or `running` (`node_modules/@slotform/ui-core/guide/tone.md`); a selection paints the glyph in the news tint until it lands |
| `act` | the one act at the line's end, an `Act` or a `LinkAct` (an anchor), drawn as the hairline Button, whose outline shows because the banner's soft ground re-points `edge` to the strong edge; a blocked act's reason stands on the banner's own line under it |
| `until` | with `tone="running"`, when the run ends: the time left after the sentence, a line along the foot that fills toward it, the clock stopping at 0:00, and the `act` as the cancel |

A banner that stands only with its data is always placed, its `sentence` a selection that answers `undefined` when there is nothing to say, so the page moves once, by its height, when it arrives.

## Columns

Sections side by side. `fit`: `board` (the default) stands each at the column width in a row that scrolls sideways; `half` stands two to a row from the Pane's desktop width and stacks them below it.

## Card

A surface for one part of a `Section` that draws none (a `Prose`, `Stages`, `Image` or `Slider`, as `children`). A `Form`, a `Table`, a `Stats` and a `BarChart` are cards already.
