# Table

Records as rows and columns: a grid where the density is desktop, a list on touch. This page is what
a `Table` takes, its columns and row regions, the rows a viewer ticks, its keys and its form on touch. A narrow container (a list beside an open record) keeps the grid and scrolls it sideways under its frozen leading column.

| Prop | Is |
| --- | --- |
| `items` | the records: constants, a selection, or a window read (`orpc.x.list.window(input)`), which sizes the grid to its total and loads the pages the view covers |
| `columns` | the columns in order, the first the row's name ([columns](#columns)) |
| `row` | the row's regions, each read from the item ([row regions](#row-regions)) |
| `label` | its accessible name, for a page that holds more than one table; it also names the viewer's column choice |
| `empty` | what the table says in its own box when its `items` selection answers none, `{ sentence, act? }` (`act` an act that runs, or a `{ label, href }`): a constant from the parent, so a screen with a filter on gives the sentence for it; the `Toolbar` and the `Pane` above stand through it, and without it the generic sentence stands |
| `selected` | the open record's id, washed as selected |
| `current` | the id of the current row, apart from the open record (what is playing, the step a run is at): the current bar at the row's start and `aria-current`, never a fill; on touch the bar and the wash |
| `onOpen` | opens a record: a press on its row, or Enter on any of its cells but an editable one |
| `onEdit(id, key, value)` | hears each committed edit of a cell whose column has `edit: "input"`; return the save's promise and the cell holds the viewer's value while it pends, a refusal putting it back with its reason. A table that edits also takes `onOpen`, since a phone edits through the record it shows |
| `choose` | the rows the viewer ticks ([choosing rows](#choosing-rows)) |
| `drag`, `reorder` | rows dragged onto a drop, or moved within the grid while it is unsorted ([drag, drop and reorder](./drag.md)) |

## Columns

A wide table is columns as data and nothing else:

```tsx
const COLUMNS: TableColumn<Task>[] = [
  { key: "title", label: "Title", sortable: true, cell: (t) => t.title },   // the row's name: frozen, never hidden
  { key: "owner", label: "Owner", sortable: true, cell: (t) => t.owner },
  { key: "points", label: "Points", kind: "number", sortable: true, cell: (t) => t.points },  // a figure: narrow
  { key: "added", label: "Added", kind: "age", hidden: true, cell: (t) => t.added }, // starts out of the grid
];
```

| Field | Is |
| --- | --- |
| `key` | the column's key, unique in the table |
| `label` | its head, a short phrase that wraps between its words to a second line before it cuts |
| `kind` | `text` (the default), `source` (mono) and `number` edit; `chip`, `status`, `age` (an ISO moment) and `change` (`{ before, after }`) are read only |
| `cell` | reads the cell's value from the item: a string, a number, a `StatusMark`, a change, `null` for empty; a `chip` cell returns the label (on the column's `family`) or `{ label, family }` for a hue of its own |
| `family` | a `chip` column's chip family |
| `sortable` | its head sorts: words from A, figures and ages largest first, then turned over, then off; over a paginated read whose procedure declares `sort` the server sorts |
| `width` | `measure-short` or `1/4`; with none, a `number` column stands at half the short measure, an `age` column at its longest relative word ("59 seconds ago"), a `chip` or `status` column at the short measure, and a text column shares what is left, never under the short measure |
| `wrap` | its cells wrap and hyphenate instead of truncating; on touch the cell is the row's `line` |
| `edit` | `"input"`: its cells edit in place (`text`, `source`, `number`) |
| `locked` | read only in this table: its cells never edit and its head draws a lock |
| `hidden` | starts out of the grid; the leading column is never hidden |

When the columns outrun the page the grid scrolls sideways inside its card under the frozen leading column, never the page. A table with eight or more columns, or any hidden one, draws a columns menu at the end of a bar over the grid (a check row per column after the leading one, a Reset row at its end), and the browser keeps what the viewer chose per table, named by its `label` and its columns' keys, so it holds as a record opens beside it; where the device keeps nothing it holds for the visit. A windowed read's total stands over the grid, formatted.

## Row regions

| Field | Is |
| --- | --- |
| `id` | the row's id, unique in the table |
| `href` | the leading cell's link, so the row opens in a new tab |
| `editable` | `false`: its cells draw the plain value, no mark, no act, for a row that is simply not editable in place |
| `locked` | the column keys it draws read only with the lock, the hold of an open change set |
| `warning` | what is wrong with the row, after its leading cell's name |
| `change` | where the row stands in a change set, its mark ahead of the name |
| `act` | the row's one act at its end, with its wiring: an `IconAct` or an `IconLinkAct` (`node_modules/@slotform/ui-core/guide/links.md#icon-acts`) |
| `more` | its other acts, in a menu after `act` |
| `drop` | the drop the row is, as a `PlaceSpec`'s |

A table draws `act` and `more` in an acts column at the grid's end, frozen there like the leading column, and on touch as the list row's act and menu. Completing a task row is this:

```tsx
row={{
  id: (t) => t.id,
  act: (t) => ({ icon: "Check", label: `Complete ${t.title}`, onAct: () => complete.mutateAsync(t.id) }),
  more: (t) => [{ label: "Copy title", onAct: () => copy(t.title) }],
}}
```

## Choosing rows

| `choose` field | Is |
| --- | --- |
| `chosen` | the ticked ids |
| `onChange` | hears the set a tick makes: apply your rule to it and return the ruled set through `chosen` |
| `picked`, `onPick` | in place of `chosen` and `onChange` over a paginated read: a `Picked`, the ids or the query less the ids unticked, which the head tick sets to the whole query and a mutation takes whole (`selector()` of `@slotform/api`) |
| `blocked` | reads why a row cannot be ticked from its item, a short phrase under its leading cell |
| `moved` | reads why a rule moved a row's tick, the same way |

The acts that apply to the ticked rows are the `Pane`'s `foot`, which the route gives: an `ActionBar` with `chosen` ([acts](./acts.md#the-chosen-bar)), whose `blocked` reasons you read off your own `chosen`.

```tsx
const reach = rows.filter((row) => !held(row)).map((row) => row.id);

<Pane
  title="Changes"
  foot={
    <ActionBar
      acts={[publish]}
      chosen={{ count: ids.length, of: reach.length, noun: "promotable", onAll: (all) => setIds(ruled(all ? reach : [])) }}
    />
  }
>
  <Table items={rows} choose={{ chosen: ids, onChange: (next) => setIds(ruled(next)), blocked: held }} … />
</Pane>
```

## Keys

The grid is one Tab stop and its keyboard is a cell cursor: the arrows move by a cell, PageUp and PageDown by a page of rows (a row off the loaded window scrolls into view and its page loads), Home and End along the row and Ctrl with them to the first and last cell; the active row washes along its width.

| Key | Does |
| --- | --- |
| Enter | opens the active row from any cell (its `href` or `onOpen`); on an editable cell it starts the edit; where the row opens nothing it runs the row's `act` |
| Shift+Enter | runs the row's `act` from any cell |
| Context Menu, Shift+F10 | opens the row's `more` |
| Enter or Space on the acts cell | presses its act, else its menu |
| Space, `x` | with `choose`, ticks the active row |
| Shift+Up, Shift+Down | with `choose`, ticks the loaded rows the cursor crosses; turning back unticks them |
| Alt+Up, Down, Home, End | with `reorder`, moves the active row |

A key runs the act as a press does (confirm, run, toast, go). The act icons stay out of the Tab order. Without `choose` Space is not claimed: the grid leaves it unprevented, and a `Dock` takes it, which also skips a key the grid took (`preventDefault`) and the arrows while focus is in a `role="grid"`.

## On touch

A `Table` on touch is one row per record: each status column a status badge with its tone mark (the first leads the row's badges; several say their column, `Staging: Passing`), a column of changes and a column with `wrap` its `line` (several joined by "; "), a value longer than the short measure its `line` too, said whole with its column's label, and values of a kind that stands in several columns each saying their column. The sort's pick stands bare above the list.
