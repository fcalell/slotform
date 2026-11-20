# Rows on the phone

How a row stands on the phone, which is always compact. The `Row` and its fields are
`node_modules/@slotform/ui-core/guide/rows.md`, what a row says of itself
`node_modules/@slotform/ui-core/guide/facts.md`, and the row's face
`node_modules/@slotform/ui-core/guide/face-rows.md`. A `Section`'s own props are `content.md`.
`Row` is `import type { Row } from "@slotform/native-ui/components/section"`.

## A row's two groups

A row's facts line stands under its title, never after it, and a row with a fact, a `line` or a
`progress` is two lines. A row is a text group (the title over the facts line) and an end group (a
trailing value, a switch, a pick, the act, the copy act, the more menu and a tree's fold, in order). A row of one line centres the end group on the row; a row of two lines without a label
stands it on the title's line and runs the facts line the row's whole width under both (an entry and
the steps keep it centred on the row). The text group keeps two fifths of the row; the end group takes
the rest, its value cut to it, but for an age or a count, which stand whole, and a control, which
stands whole and takes the text group's floor, its title truncating instead. A labelled row whose
value has a description beside a pick or a switch keeps the description at the short measure at
least, and stands the control under it at the line's end where both do not fit. A row that opens
is one hit, and what its end group holds that is a target of its own keeps its target size. A row
with nothing at its end reserves no space for one, so give `more` only to the rows that have acts.

## Fact rows, entries and trees

A fact row (a row with a `label`) stands the label in the body role and the meta ink over the value,
which takes the row's whole width, since a label column would leave an email or a domain no space. A
row with a label and nothing else to say (a switch, a pick or an act at its end) draws the label as
its text, on the line the end group shares. A badge cut with an ellipsis cannot be read on the phone,
where no tooltip reveals the rest, so anything a person must read to its end is a `line` or a `wrap`
title. A linked `lock` is a press target of its own inside the row's, reaching the touch target by a
hit slop. A row's entry puts its act under the input at the line's end where the line is too narrow
for the input at the short measure and the act. A tree draws a rail per level and its fold act last
in the end group; the fold act's expanded state is the branch's accessibility state, and the phone
has no keyboard focus to rove. Never indent rows with a class or a nested sheet of your own.

A row's `change` is a glyph in the kind's ink in a lane at the row's start, named by the kind's word.
A row's running task is `node_modules/@slotform/ui-core/guide/rows.md#a-running-tasks-progress`.

## The sheet

A sheet draws a full-width hairline once between its rows, with no gap and no inset, and the painted
rows match; a tree's rails run unbroken. A row is one form everywhere, at the card's inset and the row radius (the card's
clip rounds only its outer corners).
