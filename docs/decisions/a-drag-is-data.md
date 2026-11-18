# A drag is data

A row says what it drags (`drag: { kind, picked }`, or `drag: { kind }` on a Table, which fills
`picked` from its ticks), a place or a row says what it takes (`drop: { accepts, label, onDrop }`, on
a `PlaceSpec`, a `RowItem` and a Table row slot), and a collection says it orders its rows
(`reorder: { onMove }`). The platform runs the rest: the press that becomes a drag, the label that
follows the pointer, the line a reordered row lands at, the scroll near an edge, the held order,
the act's sequence (confirm, run, toast, go) on a drop and a move, and the keyboard. A consumer
writes no pointer handler and no drag state.

**Why.** A drag is the one interaction a consumer would build by hand without it: native drag events or a
library per list, its own state for what is held, its own auto-scroll, its own line. On a 50,000-row
library that is three things at once that a hand-built one gets wrong: the dragged row leaves the
window (a native drag's source unmounts with it and the browser sends no end), the pick is a query
and not ids, and a finger has no native drag at all. Pointer events held in one module store survive
the unmount, carry a `Picked` as it is, and a held finger is the same press; the cost is the hit
test and the scroll, written once. The payload is the `Picked` of a selection because a mutation
already takes it whole (`selector()`), so a drop is `mutate({ tasks: drag.picked })`.

**No drag is the pointer's alone.** A drop's `label` is required, because the platform turns it into
a menu entry, so what a drag does by pointer a menu does by keyboard
([without a pointer](../architecture/ui-core/drag.md#without-a-pointer)). An optional label fails: a
drop that is only its `onDrop` has no menu entry, so the keyboard cannot reach it, and a dev warning
on the missing label is a floor nobody keeps.

**Trade-off.** A move shows at once and the read's own order replaces it, so a consumer that
updates nothing leaves the viewer's order in place until the data changes; a refusal puts it back
and toasts. The order is the consumer's (`after` and `before` are what a fractional position needs,
`index` what an integer one does). What a drag cannot do, on each platform, is in
[ui-core's limits](../architecture/ui-core.md#limits).
