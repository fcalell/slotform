# Surfaces and controls

The rules that part regions, the corners, the one family of controls, the mark of the current item, the accent and the empty shape. Part of the face [voice](./voice.md) decides.

## Rules

Regions part by a hairline in the edge colour (the ink at about 15 percent); no
rule is heavier. Rows stand on hairlines inside their sheet. A sheet is the surface, a
1 px edge, rounded corners, and every part of a Section's body is one of its own: a list's or a
group's rows flush on it, a form's fields as rows too (the label in its column, the control
filling the rest, the value under its label in a Pane too narrow for both, [record](./face-record.md#record); the bar the last row; where each field commits itself the row is its label over its
description beside the control at its own measure, the short measure for a line and a toggle's own
width, so the row is as tall as its two lines and a short value does not fill it), a table's rows, a stats strip (its cells split by
hairlines), a chart, and anything else (prose, a control alone, a comparison) at a sheet's inset in a
`Card`, which a stats strip and a chart never stand in (a box in a box); a control over a
list (a toolbar, a segmented filter) stands bare on the table over its list's sheet; a list outside a section is a sheet
of its own; the Section itself draws nothing. Nothing else is a card. Shadows only on layers (popover,
sheet, toast), soft, never offset.

## Corners

`rounded-control` (6 px at the default `radius`) on a control, a pill and a row's wash; `rounded-sheet` (8 px at the default `radius`) on a sheet, a card, a popover
and a centred sheet; a dot and an avatar are round. No pill is fully rounded.

## Controls

One family: every outlined control (button, picker, field, pill, tab track) shares
the hairline edge of the sheets at the `control` height (32 px, 44 px on touch, at the default `size`), the body line and the gap above and
below, darkening to the strong edge under the pointer; a
focused field swaps its edge for the accent (the keyboard adds the ring). The only filled
control is the primary act (the accent, white type), at most one per bar. A chosen tab carries a 2 px ink underline, no fill. A checked
switch, box or radio fills with the accent.

## Current

What is current carries a 3 px accent bar at its start: the open row (a tree's
child at its rail), the sidebar's place, the tab bar's tab (on its top). Selection is never a fill of the accent.

## Accent

One blue (hue 264), on the primary act, the current bar, the focus ring, links and
checked controls. Status hues are fixed: `ok` green, `warn` amber, `danger` red.

## Empty

One shape everywhere: one sentence in the meta ink, centred, over its act as an
outlined button across a column at the empty width (an act bar at or under the auth width), at a sheet's inset where the rows would stand (inside the list's or
form's own sheet, or on a sheet of its own where no part draws one: a section's or a pane's
empty read). Absent facts say nothing. A first run is a Gate.
