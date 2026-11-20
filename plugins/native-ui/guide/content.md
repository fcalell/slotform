# Content: lists and tables

The content that fills a `Pane`: a `Section` of rows, a `Table`, the `Toolbar` over a list and `Rules`. Each takes its data as props and, given a selection, is the frame of its own read (`node_modules/@slotform/ui-core/guide/frames.md`). The parts that read as a block (`Prose`, `Code`, `Stats`, `Image`) are `blocks.md`, and a `Thread` is `thread.md`.

## Section

A titled stretch of a page, over its rows (`items`) or its parts (`children`). Its head is one line at every width, the title keeping two fifths of it, ending in its `act` and then its `more`; a block's other acts (move, remove) stay on the head row beside the title, which never moves.

| Prop | Is |
| --- | --- |
| `title` | a short phrase, or a selection of the read the section holds. A Section with `items` and no `title` is the sheet alone |
| `description` | a sentence under the title, a constant or a selection: it paints where the sentence will stand, and a loaded `""` draws no line, so `description={report.at((r) => r.tally ?? "")}` keeps the head's height while it waits |
| `folded`, `onToggle` | the title folds the body; `folded` is the initial fold (`true` starts folded, later changes are not read), `onToggle` hears whether it is now open. The title stays the heading size folded or not |
| `act` | the head's one icon act (`IconAct`, or `IconLinkAct` for a route), which always stands |
| `more` | its other acts, an `Act[]` in a menu shaped as a row's `more`, destructive ones marked; a foldable section's `more` does not fold it |
| `items` | the sheet's rows, each a `Row` (`node_modules/@slotform/ui-core/guide/rows.md`), constants or a selection; one row given alone, not in an array, is a value, and the head draws no count |
| `groups` | the bands over the rows, `{ key, label, act? }` each, constants or a selection: a band over the rows whose `group` is its `key`, with its label, the count of its rows and its icon act. A lone band holding every row under the title's count draws none; rows with no group stand before the first band; a tree's group is its root rows'; a painted sheet draws none |
| `read` | with `children`, the body's read: the heading stays and the body's failed, missing and empty shapes stand in its place. With `items`, a read the rows depend on besides `items` and `groups` (the options of a row's pick): while it waits the rows paint, and its failure stands once in the sheet's place |
| `empty` | the sentence and the act that makes the first one; under a `description`, the act alone (`frames.md`, "Missing, failed and empty") |

The count after the title is the loaded rows' length of a `Section` with `items`, never drawn while the body waits. A file row's `change` draws the change mark ahead of its glyph, and its `chip` says why it is listed: the path yields to it down to its name's floor (the whole name when it is short, else its first three characters, an ellipsis and its end), and below that the chip's label truncates; the row never overflows sideways.

```tsx
const notes = orpc.notes.list.read();

<Section
  title="Notes"
  items={notes.at((rows) =>
    rows.map((n) => ({ key: n.id, title: n.title, facts: [n.edited] })),
  )}
  empty={{ sentence: "No notes.", act: { label: "New note", onAct: create } }}
/>
```

## Table

Records as rows and columns, a list of rows below `tablet` of the window (`collections.md`, "A table below `tablet`"). Its failed, missing and empty shapes are its own, and a paginated `items` paints its next page as rows in the same regions.

| Prop | Is |
| --- | --- |
| `items` | the records, constants or a selection that paints `PAINT_ROWS` rows until it lands |
| `columns` | the columns in order, the first the row's name; each is `{ key, label, kind?, cell, width?, sortable?, wrap?, locked?, hidden?, edit? }`, its `cell` reading the value from the item. `kind` is `text`, `source` or `number` (typed, `edit: "input"`), or `chip` (with `family`), `status`, `age` or `change` (read only). A `locked` column is read only, its lock in the head alone; the phone has no columns menu, so a `hidden` column stays out |
| `row` | the row's own regions, each read from the item: `id` (required), `href`, `editable`, `locked` (the columns the row locks: a lock after each such cell, the leading cell too), `warning` (what is wrong, drawn after its name) and `change` (its mark ahead of its name). The web's `act`, `more` and `drop` draw nothing on the phone |
| `label` | its accessible name, for a page that holds more than one table |
| `empty` | what it says in its own box when its `items` selection answers none, `{ sentence, act? }` as a `Section`'s, a constant from the parent: a screen with a filter on gives the sentence for it. Without it the generic sentence stands, with no act |
| `selected` | the open record's id, washed as selected, in the list form as in the grid |
| `current` | the id of the current row apart from the open record (what is playing): the current bar at the row's start, read as selected by the screen reader |
| `onOpen` | a press on a row |
| `onEdit(id, key, value)` | hears each committed edit of a cell whose column edits; return the save's promise. A table that edits also takes `onOpen`; below `tablet` the record it opens is where a cell edits |
| `choose` | the rows the viewer ticks: `chosen` (the ticked ids), `onChange` (hears the set a tick makes, which your rule turns into the set you hand back through `chosen`), and `blocked` and `moved`, each reading a row's reason from its item |

Below `tablet` each chosen row leads with its tick (a `blocked` or `moved` reason leading its facts); from `tablet` a tick column leads the grid with a head tick over the rows that can be ticked. The table draws no count. The acts on the ticked rows are the `Pane`'s `foot`, an `ActionBar` with `chosen` (`acts.md`, "ActionBar"), which the route gives only while a row is ticked.

## Toolbar

The strip over a list, taking its search, its filters and its applied chips as data and the other acts as `children`; the search stands on a row of its own. It reads none of its children: a search `Input` or a `Picker` passed as a child stands in the acts' row like any act, so the search and the filters go in their props. It draws no tabs on the phone: a place's tabs are a `Picker`'s link segments.

| Prop | Is |
| --- | --- |
| `search` | `{ value, onChange, placeholder? }`, the search box it draws. Absent, the strip has none |
| `filters` | the list's filters, each a `Picker`'s own props: `{ label, options, value, onChange }`, with `placeholder` and `act` too; `options` a list, flat or under group labels, or a read of one. A string `value` is set; `null` or absent is not, and the `null` option is the way to clear. An array `value` picks several (the entry carries `several: true`), set while it holds any, cleared to `[]` |
| `chips` | `{ label, family, onRemove }`, the app's own applied filters, removable chips in a row under the acts, after the filters' chips |
| `children` | the acts at the bar fit, never a filled act: the create act is the page's |

On the phone every filter folds, whatever their count: one outlined Filters act with the count of those set ("Filters 2") opens the labelled picks in a sheet. A pick applies at once (there is no Apply act, so `onChange` is where the list behind it updates), "Clear filters" ends the sheet while any is set, and each set filter is a removable chip in the chips row ("Work type: Change", "Projects: 5 projects"), so nothing set is hidden; removing the chip sets the filter to its empty value. Hold filters that more than one pick can set in one place (a URL's search parameters): clearing calls every filter's `onChange` with its empty value one after another.

## Rules

Rows of inline terms, each rule a card of stacked terms.

| Prop | Is |
| --- | --- |
| `rules` | a list of `{ id, terms, onRemove? }`; `terms` is a pair `{ from, to }` or a condition `{ field, operator, value }` (`field` a pick, `operator` the fixed words between) |
| a term | one of `{ pick }` (a pick of constants), `{ picks }` (a pick of several constants, the chosen values as removable chips) or `{ either }` (a picked option or a typed value, `{ picked }` or `{ typed }`, with a way back) |
| `add` | the act that ends the list |

A rule's picks are constants: its name and chips are worded from them.
