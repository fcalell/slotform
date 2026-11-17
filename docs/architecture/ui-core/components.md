# Collections and content components

The contracts of the components that hold a collection or a piece of content: `Table`, `Picker`,
`Toolbar`, the `Rules` editor, `Thread`, `BarChart`, the Stats meter, the stage rail, the file
controls and rows, `Image`, `Diff`, the canvas and the QR code. Each decides what it draws in a
framework-free module of `@fcalell/ui-core` (`list-state.ts`, `chart.ts`, `rules.ts`, `window.ts`
and the others below) that both platforms run, so one input draws the same rows, figures and cuts on
the web and on the phone, and each decision is tested without rendering. The frames, paint and
read shapes these components share are in [reads](reads.md); the acts and fields they hold are in
[acts](acts.md).

## Collections and lists

`list-state.ts` holds the decisions a collection (a Section's sheet, a `Table`, a `Picker` in
`fit: list`) and the Stats meter, `StepCount` and Stages states make before they draw.

Collections take data and draw their own rows (`Section`, `Table`, `Picker` in `fit: list`,
`BarChart`, `Thread`): `items` is a constant or a selection. A `Section`'s rows are descriptors
(`Row`: `RowItem` or `FileItem`, in `@fcalell/ui-core/descriptors`), and a row item whose
`children` is given makes the sheet a tree. A long collection windows on the web with no prop. A
paginated procedure's `.pages(input)` read gives the collection its more row (and, once it windows,
loads the next page as the end nears); a `paginated: "window"` procedure's `.window(input)` read
sizes a `Table`'s scroller to the total ([paging](reads.md#paging)).

`window.ts` holds how a long collection windows: from how many loaded rows it draws only those near
the scroller's view (`VIRTUAL_FROM`), how far past each edge of the view it keeps rows
(`OVERSCAN`), and the arithmetic that turns the rows a virtualizer placed into the children of the
box, rows and the spacers that stand in for the rest (`windowEntries`, `ranged`, `pagesCovering`). The web
runs it over TanStack Virtual; the arithmetic is in ui-core so it is tested without a DOM.

## Table

The grid where the density is desktop, a narrow container scrolling it sideways; on touch a sheet
of list rows with the sort a `Picker` above it. Below `tablet` the rows stand on a sheet.

### Items and forms

It takes `items`, constants or a selection, each column reading its cell from the item and `row` the
row's own regions. While the selection's read waits it paints `PAINT_ROWS` rows over the constant
header, each cell by its column's kind, inert. It is a frame of its items as a Section's sheet is:
its failed, missing and empty shapes and its stale and paused line are its own
([frames](reads.md#frames)). `label` is its accessible name (`aria-label` on the grid or the list,
`accessibilityLabel` on the phone), in place of the page's title naming it.

### Keyboard

A cell cursor is the grid's keyboard: the arrows move by a cell, PageUp and PageDown by a page of
rows, Home and End along the row, and with Ctrl the first and last cell. Enter opens the row from
any cell. Space and `x` tick the row when the table chooses, and Shift with an up or down arrow
ticks the rows it crosses; Space is not claimed otherwise. The cursor holds its record and its
column, not their places, so a row landing above it, a sort or a column hidden leaves it on its cell;
it keeps its place where the record or the column is gone, and on a window's row not loaded yet.

### Sort

It sorts in its own state (descending, ascending, off). A header sorts words from A, and figures and
ages largest and newest first, then turns over, then is off. A status column sorts by how much a
status asks of the viewer, mildest first, then by its label: what is done or live asks nothing, what
has not started waits, and what waits on someone, needs a look or failed asks more in turn. An empty
cell sorts last either way, as does a figure that is not finite (0/0) or an age that does not parse.
Words compare with the numbers in them read as numbers ("item 2" before "item 10"). `TONES`
lists the states, not their weight, so the weight is its own table (`STATUS_SEVERITY` in
`list-state.ts`).

### Cells and columns

- `onEdit` requires `onOpen`, and with `onOpen` the leading column never edits. A cell's edit is a
  control at the field's bar fit ([fields](acts.md#fields)).
- A row's `change` region draws the change mark ahead of the leading cell's name (a list row's change
  on touch), the kind's word its name.
- A row's `editable` region, false, draws its cells plain (no mark, no act); `locked` is the hold, its
  columns drawn with the lock.
- A `chip` cell is a label, on the column's `family`, or `{ label, family }` on its own.
- A column's `wrap` lets its text and `source` cells wrap and hyphenate, the row growing to the
  tallest cell, where the others truncate; on touch its cell is the row's `line`.
- A column of figures (`number`) with no `width` stands at half the short measure, an `age` column
  at its longest relative word, and a `chip` or `status` column at the short measure.
- A column's `hidden` starts it out of the grid. A table of eight or more columns, or with a hidden
  one, draws a columns menu (a check row per column after the leading one) in a bar over the grid at
  its end, and keeps the viewer's choice per table in the browser. The menu's last row, Reset,
  returns the columns to what the table declares. The bar over the grid also states a windowed
  read's total, formatted.

A **comparison** is a `Table` whose cells hold a value per column: the leading column names the fact,
a column follows for each compared thing, and a `chip` or `status` column carries a fact's mark or
verdict.

### Choosing rows

`choose` (`TableChoice`, controlled: `chosen` ids, `onChange` hearing the set a tick makes, the
consumer applying its rule) leads the grid with a tick column: a checkbox per row named by its
leading cell, and a head checkbox named by `chooseAll`, unchecked, mixed or checked over the rows
that can be ticked. A `blocked` row's tick is disabled and a `moved` row says why, each reason a line
under the leading cell, growing only that row to the two-line row. On touch the tick leads the row
(a list row's check) and the reason leads its facts.

The acts that apply to the ticked rows are no prop of the table. The route gives the Pane's `foot`
an `ActionBar` with `chosen` ([ActionBar](acts.md#actionbar)): "N of M chosen" at its start,
formatted (M the rows that can be ticked, which the route counts; named by `chosen.noun` where the
rows are not "chosen" bare), then select-all while a row is unticked and a clear icon while one is
ticked. The bar draws nothing while no row is ticked, gives way to a docked sheet, and stands at the
body's column and start. The grid draws no count: the chosen bar's is the count.

### Row acts, drag and reorder

A row's `act` and `more` regions draw an acts column at the grid's end, frozen there like the leading
column: the icon act, then the more act, each a cell cursor stop of its own column. Shift+Enter on
the active row runs its act from any cell (Enter does where the row opens nothing) and the Context
Menu key opens its more menu.

`drag` makes the rows draggable (a ticked row drags the whole pick, an unticked one itself) onto a
`drop` (a Shell place, a row of another collection), and `reorder` moves a row within the grid while
it is unsorted: the pointer lands it at a line (`DROP_LINE`), Alt with Up, Down, Home or End moves
the active row, and the more menu holds the same moves. A row that is a `drop` washes as selected
while a drag is over it. The mechanics are in [drag](drag.md).

The `selected` row is the open record, washed. The `current` row (what is playing, the step a run is
at) carries the current bar (`ROW_CURRENT_BAR`) at its start, on the grid's first cell, and is
`aria-current`; on touch it is a list row that is current, the bar and the wash.

The parts the phone's Table leaves out are in [ui-core's limits](../ui-core.md#limits).

### In the showcase

- `/requests` holds every request the deploys served, windowed: the table is as long as the total,
  loads the pages the scrollbar lands on, and sorts by the server. A column's key is the name the
  procedure sorts it by. The method and the id start hidden; the figure columns (took, served) stand
  narrow. The head tick chooses the search's whole result, and the delete takes that choice as it
  stands.
- The roster scene of tests by environment has two status columns, each cell the verdict of one
  environment. Below `tablet` a row says which environment each word is of ("Staging: Passing"),
  each its own status badge with its tone mark, the failing one's mark too.
- The roster scene of a destination's variables has an editable name, a few short columns and a
  long Description in a column that wraps. Below `tablet` the Description is the row's `line`,
  wrapping whole under the name, never a cut badge; the short columns stand as the row's facts.

## Picker

`Picker` is the one pick, of one option or several: `MultiPick` is the same component given an
array `value`, with two overloads typing each handler by its value. Outside a form it applies at
once. Its fits:

- **`field`**, the default, a field box, or **`bar`**, where the box fills its column: opens a popover of rows (a row list
  on touch), with a search field when there are more than `SEARCH_PAST` (6) options. An option may
  lead with its avatar, and one act (the act that creates an option) ends the list under a hairline.
- **`row`**, a row's trailing: its value and a chevron in a `WORD_ACT`. A value that carries a state
  is the compact state pill with its chevron inside at its end, the pill the trigger, as in a
  record's head.
- **`list`**: the options stand in the page, below.
- **`segments`**: a few options as one row of segments, below.

At the `bar` fit outside a rule's row (a toolbar's pick), a pick that is set reads its label, a colon
and its value ("Work type: Change"), so a value other filters could share is told apart. Unset, or
on its `null` option (the empty choice, "All kinds"), it reads its label alone in the placeholder's
ink. Every other fit, and a rule's term, whose row names it, reads its value alone. The collapsed
pick renders only what it shows: no part of it clips content (an ellipsis is the label's own cut),
and its name starts with its visible text (WCAG 2.5.3).

An option's `chip` draws after its label in the list and on the trigger. An option's `blocked`
reason stands in place of its `line` in the disabled ink and the option takes no pick (its box or radio
disabled in a list) until it is in the value.

`value` an array makes it a pick of several: the rows tick and the list stays open, and the box holds
one removable neutral chip per value. The chips are pills inset in their box, never edge to edge:
the roster scenes that hold one judge every chip run and log an error where a chip stands as tall as
its box or off its centre. The scenes' class sets mount as they are read, so that judge waits well past
the first paint.

### Reads

`value` and `options` are data. A selection paints the trigger, inert and its content undrawn, until
its read lands. A `value` whose read ended leaves the box empty and blocked: opening it says the
failed sentence and opens nothing. Options that have failed draw the failed sentence with Retry (or
`missing`) in a line under the trigger, which stays painted; the picker holds that read, so it needs
no frame and draws no busy or stale flag.

### List

`fit: list` draws check rows under group labels on a hairline card, a chosen option checked (the row
takes no wash); radio rows when `value` is one value or null, a radiogroup whose chosen ring holds
its dot. The recommended mark sits on its `line`, and the `children` under a chosen option at its
label's start. A list that is the body of a titled Section is `headed`: the Section's title names it
and it draws no field. Static `options` never paint. `items`, constants or a selection, paint
`PAINT_ROWS` rows while the read waits, in the regions `option` declares (a `line` under each label, a
label over the group), inert, and a `value` selection paints the boxes or rings. The empty shape is
the frame's (the Pane, Section, Sheet or Form that holds the read), and `items` that have failed draw
the failed sentence with Retry (or `missing`) in a line under the rows, the list holding that read
where no frame does.

### Segments

One segment is a choice (its `value`) or a link (an `href` and no value). A link segment is selected
while the location is its href or below it (the nearest parent wins) and opens when pressed. A
Picker holds choices or links, never both. A label is a word, up to the short measure. The chosen
segment stands under the selection wash. A track scrolls no further than its chosen segment needs
(one that stands whole at the track's start leaves the track at the start, the segments before it in
view), and fades at each edge that has more, so a segment at an edge is never cut with nothing to
say so. The segments frames judge their tracks' scroll and log an error where it breaks.

A Picker is a field as every control is ([fields](acts.md#fields)): the field fit, a list and choice
segments draw it alone.

## Toolbar

The tabs, the search, the filters, the acts and the applied filters' chips over a list.

- `tabs` are links, each a label and an href, drawn as a `Picker` in `fit: segments`; `tabs` is
  also the word that names the tab strip's navigation landmark.
- `filters` are data, each a `Picker`'s own props in a toolbar: a pick of one, set while `value` is
  a string, or of several, set while it holds any.

On the desktop fewer than `FOLD_FILTERS_AT` (3) filters stand inline as picks (a set one reads
"Label: value", an unset one or one on its `null` option its label alone), and that many or more
fold. At touch the toolbar is one row, so every filter folds. The value is one constant for both
platforms and no consumer's option. Folded filters stand behind one outlined Filters act with the
count of those set after its label ("Filters 2"), which opens the filters as labelled picks that
apply at once: a popover under the act at the column's width on the desktop, a sheet on touch, with
"Clear filters" at its end while any is set.

Each set filter of a folded toolbar is a removable neutral chip, "Work type: Change" (a pick of
several shows its one value, from two "Projects: 5 projects"), first in the chips row before the
toolbar's own `chips`. Removing one sets the filter to its empty value (`null`, `[]` for several), so
nothing set is hidden. The words are `filters` and `clearFilters`. `options` may be a read, as a
`Picker`'s: while it waits the chip paints, and once it ended it draws none (the picker's line says
why).

## Rules editor

`Rules` is the one molecule for inline-term rows. `rules.ts` holds the decisions a `Rules` editor and a `Picker` make before they draw: whether a term
is set (`termSet`, `pairSet`), a term's label (`termLabel`), whether a term is typed (`isTyped`) and
its mark (`marked`, with `PICKED_GLYPH`).

## Thread

A collection of messages from `items` through the `message` map, constants or a selection. While
the selection's read waits it paints `PAINT_TURNS`: an ask of yours, its bubble at the end, over the
other author's reply at the start.

- A message is a `Message` descriptor by its author. `you` and `other` take `name`, `attachments`
  (an attachment with `src` a thumbnail, one without a chip of its name, in one row over the bubble)
  and `from` (the provenance line before the time). `system` takes `onOpen` and `detail` (a
  `MessageDetail`: a row, one list row in a hairline card, a free act's code, or a fold its line
  opens).
- A reply's body is a `Prose`. `at` is an ISO moment each plugin formats in the document's language:
  the time alone today, "tomorrow" or "yesterday" and the time a day either side, the year only when
  it is not this year's.
- It is a frame of its items with its composer and reply kept: its failed and missing shapes stand in
  the log's place with the generic sentences, and its empty shape is one sentence (`empty`, else the
  generic one) centred in the log, so a thread whose items failed still sends.

The `composer` is the input under the log, or its `sheet` docked in its place while it is open:
stacked on the desktop, one row on touch. A thread among a Pane's sections that should keep the
input in reach gives no composer and the Pane's `foot` a `Composer`. `onAttach(files)` hears every
file the attach act chooses (and, on the web, a paste or a drop on the input); the consumer turns a
file into an `Attachment` and passes it back, a thumbnail with its remove act at its corner when it
has `src`. `onDetach(id)` removes an attachment. The notice's act carries its own pending, so the
input has no loading form. While `working`, Stop stands before Send (both icon acts on touch) and
Send still sends; the notice says what becomes of a message sent then. While a filling Thread's
reader is scrolled up, a secondary Latest act floats over the log above the composer.

Its `reply` is the turn being written, a read of the app's own that draws after the items from its
own subscription: waiting, a painted message; `streaming`, the message with its open Markdown drawn
in its own form; `error`, the partial message with the stopped line and its Retry.

The showcase's `/assistant` is a conversation: its history a read the Pane holds, a sent turn written
into the history as the server holds it (an empty one too) and its answer streamed in after it,
joining the history when it ends. The input is docked in the Pane's foot, inert until the history
answers. A message sent while an answer comes is answered next.

## Streaming Markdown

`closeOpenRuns` (`streaming.ts`) takes a reply that is still arriving and closes the runs left open
at its end, so an opened emphasis, strong, strike, code span, link or fence draws in its own form
from its first character, and the closing marker, when it comes, changes nothing already drawn. Two
rules keep a closer valid. A marker run at the very end that closes nothing is held back (cut from
what is returned), because the next character decides whether it opens a run: `**a *` draws as
`**a**`, `2 * 3 *` as `2 * 3`. The closers of the runs still open go before any trailing
whitespace, which is dropped, because a closer after a space closes nothing: `**bold ` and
`**bold **` both draw as `**bold**`.

## Charts

`chart.ts` holds what a `BarChart` decides before it draws.

### Regions

The fewest regions a plot is parted into is a week's days (`CHART_REGIONS`, 7). A series shorter than
that (a day's first hours near midnight, a run's first rounds) stands in the first of them, each bar
in a region as wide as it would have among seven, the rest of the plot its gridlines alone, so a lone
bar is never a slab across the plot. A series of more fills the plot, one region a bar.

### Axis

The axis scale (`chartScale`) is `BANDS` (4) even steps over the largest bar (`peaks`, each bar's
stacked height), each step the first whole multiple of its own magnitude. When every figure the
chart draws (`figures`, the bars' values and parts) is a whole number and that step falls under 1,
the step is 1 and the bands are the peak rounded up, so no tick reads 0.8 of a flag and none stands
above what the bars reach.

A **level** (a reading each hour, a share) takes `levelScale`: `BANDS` even steps around its
readings, not over zero, since a level's bars from zero stand near one height and flatten the swing
the chart is for (a day of 18.2 to 21°C on a 0 to 24 axis). The step is the first round step (1, 2
or 5 of a power of ten) that spans the readings in one band fewer than are drawn, and the next round
one while the bands do not hold them. The floor is a whole step under the lowest reading and the top
a step over the highest, so neither reading stands on the plot's edge, the readings centred between
them as the steps allow. Readings that never go under zero keep a floor at zero or over it. A level of
whole numbers (open flags) steps by 1 at least, so no tick reads a part of one. A flat series (one
reading) reads against a step a tenth of its own magnitude.

A unit whose figures never add up across bars is a share (`%`, `‰`) or a temperature (`°C`, `°F`,
any `°`). A chart counting in one is a level whatever its `level` leaves unsaid (`levelUnit`), so a
day of readings never heads with their sum.

The top tick, centred on the plot's top edge, reaches above it by half a meta line (`tickReach`).
The web reads it as `1lh / 2` of the body's meta line; the phone, with no `lh` unit, from the meta
line in px where it stands.

### Time labels

The strides a time line labels its bars at, finest first, are each a multiple of the one before
(`TIME_STRIDES`: 1, 2, 6, 12), so a time that stands at a wide stride stands at every narrower one,
and the labels stay evenly spaced as more of them fit. Past the last, each doubles (a day's hours by
2, 6 and 12; a month's days by 6 and 12).

### Head

`chartHead` gives the figures a chart's head draws: the sum of its bars (a flow, counts per day), or
with `level` their span, the lowest bar to the highest, and each key's span the same way (a level, a
reading each hour, open flags per round). A level's sum means nothing, and its last bar is the
thing's own reading, which its record already says: the span is what only the chart knows, and the
bars, standing on zero, flatten it. A level's figure that is one reading, its span's ends written
alike (one bar, a flat day), is the thing's own reading too, so the head draws no figure for it
(`spanFlat`).

## Stats meter

`Stats` is the figure component. `levelOf` gives the level a share of the max stands at: past the max, `over`; from `near`
(`METER_NEAR`, 0.9, or a meter's own mark), `near`; else `under`. A meter of a goal (tests passing of
all of them) reads the other way: full is `met`, the good tone, and anything short of it is `under`,
the neutral one, never near or over, since more of a goal is never a warning.

## Stages

`stagesShown` gives the stages a rail draws: all of them, or, once the rail has ended, those up to
the last done one, every stage after it giving way to the terminal row.

## File controls

The file `Input`'s value is a `PickedFile` (`{ name, size, type, blob(), src? }`): a file the viewer chose or dropped, the same on both platforms so one upload
serves both: the web wraps its `File` (`blob` resolves to it), the phone the document picker's asset
(`blob` reads its uri). `size` is in bytes and `type` a MIME type, empty when the platform knows
none. `src` is a local address the file can be drawn from before it is uploaded (an `Attachment`'s
thumbnail): on the phone the asset uri, set on every file and needing no revoke; on the web an
object URL that `Thread`'s composer's attach path makes for an image alone, which the consumer
revokes (`URL.revokeObjectURL`) when it detaches the attachment.

A file control's `accept` entries are a MIME type (`text/csv`), a MIME family (`image/*`) or an
extension with its dot (`.har`). A file matches when any entry does (`accepts`); no entries accept
every file. The web's file dialog narrows itself by `accept`, but a dropped file and the phone's
document picker can still bring any, so the control checks every file it is handed. A refused
file never reaches `onChange` and is drawn in the field's own error line.

The phone's document picker filters by MIME type alone, and an extension would hide files it
matches, so `pickerTypes` asks it for the MIME types when `accept` names nothing else, and for every
type otherwise.

## File rows

A file row's name is cut by `pathCut`. Its end (`tail`, never cut) is the extension and the
`NAME_LEAD` (3) characters before it (twice that without an extension), and its stem keeps its first
`NAME_LEAD` characters, so a short name never loses its start. `floor` is the least characters the
path shows of the name: the whole name when it is short, else its cut form (the lead, an ellipsis,
the tail). The name is the path after its last slash; the slash stays with the directory, so a path
whose directory has given way draws none.

Beside the name's floor, a file row's directory keeps `DIRECTORY_LEAD` (2) characters: its first and
the ellipsis after it ("d…"). The engine keeps a cut box's first character before the ellipsis, so a
one-character box draws a clipped sliver of the next glyph and no ellipsis; two read as cut. Both
platforms add it to the path's floor when the path has a directory.

## Image

`Image` is the one picture component, and `Gallery`, the pictures side by side, shares its tile and
full view. An `Image` is a picture a press opens full size: a square tile (`thumb`) or its container's width at its own
aspect down to a height cap (`content`, centred where the cap narrows it). A content picture's
`aspect` (width over height) is required: it fixes its box in every state, so nothing moves when the
bytes land. A thumbnail is square and takes none.

An address that is a selection paints its box until the read lands, and while the bytes are on their
way it is a skeleton at that box. Failed, it is an `ImageOff` glyph in the meta ink with the alt text
in meta under it (a thumbnail draws the glyph alone, the alt its name) and nothing to open. The full
view stands over the sheet base's scrim and focus trap, contain-fit inside the page inset, with a
lifted Close act.

## Code and Diff

`Code` and `Diff` (by line, and by word) share one frame, declared on `codeEntry` in
`roster/code.ts`: its head a strip-high bar with the copy and download acts.

A line of code may wrap at its spaces and after a run of the punctuation that ends a token (a
member's dot, a call's paren, a path's slash, a comma, an operator's last sign), so a line wider
than its box breaks between tokens. `tokenParts` (`line-diff.ts`) cuts a line into parts, each ending
at one such place; a platform joins them with its break opportunity (a web `<wbr>`, a zero-width
space on the phone).

## Canvas

`Canvas` draws graphs and is web only: its viewport is d3-zoom's and its layout elkjs's, both
carried by react-ui. `canvas.ts` holds the canvas's graph logic, pure and framework-free, so the web canvas and a
consumer that numbers or reads its nodes share one answer. Its inputs are structural, so a consumer
passes its own objects.

## QR code

`QrCode` draws a code a camera reads. `qrModules` (`qr.ts`) gives its modules as one SVG path, free
of any framework, so both platforms draw the same code. The encoding is lean-qr's (ISO 18004, no
dependencies of its own, pinned to an exact version in ui-core's manifest); the drawing is ui-core's.

## In the code

- `packages/ui-core/src/list-state.ts`: a collection's decisions, the status sort, the meter level, the rail's stages, the file row cut, the toolbar's fold count
- `packages/ui-core/src/window.ts`: a long collection's windowing
- `packages/ui-core/src/roster/table.ts`: the `Table` contract
- `packages/ui-core/src/roster/picker.ts`: the `Picker` contract and its segments
- `packages/ui-core/src/roster/toolbar.ts`: the `Toolbar` contract
- `packages/ui-core/src/rules.ts`: the `Rules` editor's and the Picker's decisions
- `packages/ui-core/src/roster/thread.ts`: the `Thread` contract
- `packages/ui-core/src/streaming.ts`: `closeOpenRuns`
- `packages/ui-core/src/chart.ts`: a `BarChart`'s regions, axes, time labels and head
- `packages/ui-core/src/roster/descriptors.ts`: `PickedFile`
- `packages/ui-core/src/file.ts`: `accepts`, `pickerTypes`
- `packages/ui-core/src/roster/image.ts`: the `Image` contract
- `packages/ui-core/src/line-diff.ts`: `tokenParts`
- `packages/ui-core/src/canvas.ts`: the canvas's graph logic
- `packages/ui-core/src/qr.ts`: `qrModules`
- `apps/showcase/src/app/routes/_app/requests.tsx`: a windowed `Table` sorted by the server
- `apps/showcase/src/app/routes/_app/assistant.tsx`: a streamed conversation
- `apps/showcase/src/roster/scenes/table.tsx`: the comparison and wrapping column scenes
- `apps/showcase/src/roster/scenes/picker.tsx`, `picker-segments.tsx`, `pane.tsx`: the scenes that judge a pick's chips, its tracks and its collapsed name
