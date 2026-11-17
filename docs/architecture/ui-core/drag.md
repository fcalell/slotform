# Drag, drop and reorder

How a row is dragged to a place or another collection, how a collection reorders its rows, how the web
runs a drag over pointer events with its arithmetic in ui-core, the ways every drag has without a
pointer, and the follow: what a finger or pointer carries and how its release goes. Why a drag is data
is [a drag is data](../../decisions/a-drag-is-data.md).

## Drag and drop

A drag is data on both ends, as an act is. A row carries what it drags (`Dragged`: `{ kind, picked }`,
`picked` a `Picked`), so a ticked selection over a paginated read drags the whole query and
`selector()` of plugin-api takes it whole. A Table takes `drag: { kind }` and fills `picked` itself:
the ticks when the row is ticked, the row alone when not.

A drop is `Drop`, a place that takes a drag, as data:

- `accepts`: the kinds it takes;
- `label`: what releasing on it does, a short phrase ("Add to Chill"), which is also the entry the
  platform adds to the more menu of every row that carries a kind it accepts, so the drag has a way
  without a pointer;
- `onDrop(drag)`: hears what was dragged;
- `confirm`, `done`, `to` and `blocked`, as an act's
  ([act carries its wiring](../../decisions/act-carries-its-wiring.md)): `confirm` is asked first,
  `done` is toasted once `onDrop` resolves, `to` is the route taken after, a rejection toasts as a failed act
  does, and `blocked` is why it takes nothing at the moment.

A `PlaceSpec`'s `drop` is a Shell place (a board); a `RowItem`'s `drop` and a Table row region's `drop`
are rows of another collection.

## Reorder

A collection that orders its rows takes `reorder: { onMove(id, { index, after, before }), done? }`,
`after` and `before` the ids the row lands between (null at an end), which is all a fractional
position needs; the order it keeps is the consumer's. The rows show a move at once and keep it until
the data answers, and the held move goes with a refusal. `onMove` and `onDrop` run as acts do
(confirm, run, toast, go, a rejection toasted with Retry), and a drop lands at once like every block
move ([moves land at once](../../decisions/moves-land-at-once.md)).

## Without a pointer

No drag is the pointer's alone:

- Each drop standing that accepts a row's kind is an entry in that row's more menu, named by its
  `label`. A place's drop is an entry whether or not its row stands, and nothing is merged by label:
  places that share one are named by their paths, and a row and a place are one entry only where the
  row's `href` is the place's route.
- A collection that reorders adds Move up, Move down, Move to top and Move to bottom to every row's
  menu, and Alt with Up, Down, Home or End moves the focused row.

The drop's `label` is required for that reason: a drop with no way without a pointer does not
type-check. What a drag holds and where it is web only is in [limits](../ui-core.md#limits).

## Row acts

A row's own act (`RowItem.act`, a Table row region's `act`) is the one icon act at its end, with its
wiring. A Table draws it with the row's `more` in an acts column at the grid's end, frozen there.
Shift+Enter on the active row presses it (Enter too where the row opens nothing), and the Context Menu
key (or Shift+F10) opens the menu.

## Web drag

The web runs a drag over pointer events, never the browser's native drag: a native drag's source
unmounts with its row in a windowed collection (no `dragend`), has no finger on most phones and no
auto-scroll of a Pane's body. Pointer events keep going when the dragged row leaves the window of a
long collection, reach a finger and carry the scroller under the pointer.

`lib/drag` of react-ui holds the one drag that stands at a time in a module store, outside React; the
rows and the drops that take part read it through `useSyncExternalStore`. A drag runs this way:

1. A press on a row becomes a drag past `DRAG_SLOP`; a finger's becomes one after `DRAG_DELAY`, and a
   finger that moves sooner is a scroll. Only the pointer that started the press moves, drops or ends
   it: a second finger's touch and lift do nothing to the drag.
2. The drag listens on the window and hit-tests `elementsFromPoint` for a drop (`data-drop`) or,
   within the dragging collection, the row under the pointer (`data-row`). The line lands on the half
   the pointer is in (`sideOf`).
3. Within `SCROLL_EDGE` of a scroller's edge it carries the scroller, whichever list holds it: the
   innermost scroller under the pointer whose band it stands in and that can still move that way, so
   one at its end passes the drag to the next one out. The speed is per second, not per frame
   (`SCROLL_SPEED` at the edge, the same at 60 and 144 Hz, a long frame counted as one at 60 Hz), and
   ramps up over `SCROLL_RAMP` from the pointer's entry into the band, so a row picked up inside the
   band does not scroll away at once (`edgeDepth`, `edgeSpeed`). The band's entry and steps are
   `bandAt`'s, which the canvas's edge pan shares.
4. Held over a folded branch for `DROP_HOLD` it opens the branch (`data-hold`).

The Shell's container host draws the label that follows the pointer and the line (`DragLayer`); a drop
under the drag takes `DROP_ON`. Every part `press` drags (a draggable `Row`, a `Table` that drags or
reorders) calls `useTouchHold` as it mounts: the first registers the one non-passive `touchmove`
listener on the window and the last to unmount removes it, so it stands before any touch with or
without the layer, and it stops the page scrolling under a finger's drag only while one stands. WebKit
ignores a `preventDefault` from a listener added after the touch began, and a finger's drag begins
after its hold. The canvas's lift is not `press`'s: d3-zoom holds that touch itself.

The pure parts are `@fcalell/ui-core/drag`, free of any framework and tested without a DOM: when a
press becomes a drag (`pressed`), which side of a row a pointer is on (`sideOf`), where a move lands
in an order (`moveOf`, `stepOf`), how deep a drag stands in a scroller's edge band and how far a frame carries it there (`edgeDepth`,
`edgeSpeed`), how
long a hold opens a branch (`DROP_HOLD`) and which drop a drag is accepted by (`accepts`).

## Follow

What a finger or a pointer carries moves 1:1 with it, with no easing, and only its release eases.
`@fcalell/ui-core/follow` decides it purely, so the web's pointer events and the phone's gesture
handler give the same answer: how far the held thing stands from rest (`position`), how fast it is
going (`velocity`) and where its release goes (`release`). Positions are measured toward `away`, the
direction the thing leaves in (1 toward the end of its axis, -1 toward the start); against it nothing
follows.

- Past `tuned.fling` toward `away`, in px per ms, a release carries on and leaves; past it the other
  way it goes back, however far it was carried.
- Slower than a fling, a release leaves when it was carried `tuned.reach` of its extent.
- Both are read at the release, so a tuned value is the next release's
  ([tuning record](motion.md#tuning-record)).
- A speed reads the last stretch of the pointer's path before the release, never its whole: a finger
  that stopped before it lifted is no fling.

On the phone, `useSwipe` (`lib/follow` of native-ui) is a swipe toward the inline end: the view moves
1:1 with the finger along its line and never against it; let go past the reach or flung, it carries on
out of the screen on `fast` `in` and hands over to `onAway`, else it settles back on `base` `out`. A
vertical pan is the screen's. gorhom's bottom sheet carries the sheet's own drag, and `released` is the
timing it settles and leaves on once let go (`base` `out`), read when the sheet opens so a tuned rung
is the next one's.

## In the code

- `packages/ui-core/src/drag.ts`: the drag's arithmetic.
- `packages/ui-core/src/follow.ts`: the follow's pure decision.
- `packages/ui-core/src/roster/descriptors.ts`: the `Drop` descriptor.
- `plugins/react-ui/src/ui/lib/drag.ts`: the web's one drag over pointer events.
- `plugins/native-ui/src/ui/lib/follow.ts`: the phone's swipe and the sheet's release timing.
