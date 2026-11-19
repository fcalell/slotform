# Drag, drop and reorder

A drag is data: a row says what it carries, a place or a row says what it takes, a collection says whether it orders its rows; the press, the label that follows the pointer, the line, the scroll, the held order and the keys are the platform's. Web only.

| Prop | On | Is |
| --- | --- | --- |
| `drag` | a `Table` | `{ kind }`: a row carries `{ kind, picked }`, the whole pick when the row dragged is ticked (over a paginated read the query), the row alone when not |
| `drag` | a `Section` row | `{ kind, picked }`, the row's own |
| `drop` | a `PlaceSpec`, a `Section` row, a `Table`'s `row.drop` | `{ accepts, label, onDrop, blocked?, confirm?, done?, to? }`: `accepts` a kind or several; `label` required, as it is also the row's menu entry; `onDrop(drag)` runs as an act does |
| `reorder` | a flat `Section`, a `Table` while unsorted | `{ onMove(id, { index, after, before }), done? }` |

```tsx
// A table of tasks: its rows drag, and the ticked ones drag together.
<Table columns={COLUMNS} items={tasks} row={ROW}
  drag={{ kind: "task" }}
  choose={{ chosen, onChange: setChosen }} />

// A place in the sidebar takes them. `drag.picked` is a `Picked`: the ids, or the query less the ids
// unticked, which `selector()` of plugin-api takes whole.
const places: PlaceSpec[] = boards.map((p) => ({
  label: p.name, icon: "ListChecks", route: `#${p.id}`, group: "Boards",
  drop: {
    accepts: "task",
    label: `Add to ${p.name}`,
    onDrop: (drag) => addTasks.mutateAsync({ board: p.id, tasks: drag.picked }),
    done: `Added to ${p.name}`,
  },
}));

// A collection that orders its rows:
<Section items={queue.at((rows) => rows.map(toRow))}   // toRow gives each row `drag: { kind: "task", picked: { ids: [id] } }`
  reorder={{ onMove: (id, to) => move.mutateAsync({ id, after: to.after, before: to.before }), done: "Queue updated" }} />
```

- **Payload.** A drop hears `onDrop(drag)` and runs as an act does: its `confirm` asked, `done` toasted, `to` gone to, a rejection toasted with Retry. A drop with `blocked` takes nothing and its menu entry is blocked. `PlaceSpec<Q>`, `Row<V, Q>` and `RowRegions<T, Q>` take the read's query as `Q`, so `drag.picked` is the `Picked<Q>` a `selector()` mutation takes whole, with no cast.
- **Reorder.** `after` and `before` are the ids the row lands between (null at an end): a fractional position is `between(after?.position, before?.position)`, and the order is yours. The rows show the move at once and keep it until the data answers; a refusal puts them back. One row moves at a time: a ticked set drags to a drop and is never moved as a set.
- **Pointer.** The press that moves a row (4 px; a finger after a 400 ms hold, one that moves sooner scrolls the page) drags it, and goes on while the dragged row leaves the window of a long collection. A line in the accent marks where a reordered row lands, a place that takes the drag washes as selected under the ring, the scroller under the pointer (the Pane's body, the sidebar's places, any list) scrolls near its edges, a drag held over a folded sidebar branch that a place inside takes opens it, and Escape cancels. Nothing animates: the drop lands at once.
- **Keyboard and menu, the floor.** Every drop standing that accepts a row's kind is an entry in that row's more menu (its `label`); a collection that reorders adds Move up, Move down, Move to top and Move to bottom to every row's menu, and **Alt with Up, Down, Home or End** moves the focused row (the active row of a grid, any control of a list row). A sidebar place's drop is an entry whether or not its row stands, a folded branch's children included. Nothing is merged by label: places that share one are each named by their path (`Add to Warm-up (Sets › Warm-up)`, `Add to Warm-up (Archive › Warm-up)`); a row and a place are one entry only where the row's `href` is the place's route.
