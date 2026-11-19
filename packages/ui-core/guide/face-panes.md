# Panes and widths

How many Panes stand side by side and how wide each is, and how the phone stands the same pages without a sidebar. Part of the face [voice](./voice.md) decides.

## Widths

A Panes stands two Panes at most: the place's own, then a record's. Alone, the place's Pane takes the Panes; beside a record's it holds `list` (130 units of the space base), giving way to `region-min`, and the record's takes the rest, from `tablet` (768 px). A place's Pane that fills with a Canvas takes the spare space instead, the record holding `list`. The record's Expand act folds the place's Pane away so the record takes the Panes, and Collapse brings it back; below `tablet` only the record's Pane stands. A record linked from a record opens in its own place, never as a third Pane. Width follows content: a Table, a Diff, a code block, a Canvas, a chart, Columns and a Gallery span the Pane's body, and definition rows, forms and prose stand within `reading` (180 units) at its start, so no Pane or Section is told its width. Every width but `measure-short` is a count of the space base, so no font moves it; `measure-short` and running text (58 characters) count characters.

## Phone

No sidebar. The place's Pane's bar leads with the menu glyph where the sidebar would stand, and a
record's Pane (opened beside its list) leads with its Back, the menu glyph one back away. The place's Pane has no Back or Close, since the sidebar moves between places; a record's has Close on the desktop and Back below `tablet`, both returning to the place's Pane as it stood, its tab and filters kept. A record is read in a Pane; a sheet is for a task. The menu glyph opens the sidebar as a layer over the whole screen (the slate, the same rows, the groups listed first when it has them, a
close glyph at the bar's end), closed by a place, the close glyph or Escape. Rows at `row` (44 px on touch, at the default `size`), the
`body` (16 px on touch, at the default `size`); a row with facts takes two lines on touch: on the phone the first line is the name and the end group (the age, the switch or pick, the acts), the badges under both at the row's whole width, as Linear Mobile sets its row, a name wrapping to a third line before it is cut; a definition's value stands under its label
at the row's width, its acts on the value's line, and a label with no value (a switch's, an
act's) stands on one line with its end group, as a name does. The sheets stand at the `page` inset (16 px on touch, at the default `size`), a `section` apart (24 px at the default `size`); the toolbar is
one row, the search leading and the filters a glyph.
