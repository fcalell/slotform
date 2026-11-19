# The canvas's opening view

Where a `Canvas`'s view stands as it opens, as its size changes and as its nodes change. Moving it is
[canvas-view](./canvas-view.md).

## At its words

A graph opens at its words (scale 1, the text floor, `FIT_FLOOR`) where that shows every node whole
across the pane and clear of the zoom stack. Where its drawing (cards, routes, a loop's arrow up the
side, edge chips) fits the space the stack and the `act` leave, it is centred there;
where no node stands in the stack's rows it is centred across the pane;
else it is framed at its anchor, the reader panning down. The anchor
is the first node in path order, or the first that is `running` or has `failed` (its `status` tone),
so a run opens where it is: the anchor stands whole, the graph's top at the space's top unless the
anchor needs the view moved up. A drawing that holds in the pane only without its edge chips is
framed without them, and an edge chip past the pane's side is the one thing the opening may cut:
every card and box (the loops' bands) stands whole across the pane, a pair from either side, and none
under the zoom stack, else the graph opens as its overview.

## As its overview

A graph that cannot open at its words opens as the overview: its glyphs, its boxes (the loops' bands,
their heads and the corridors up their sides) and the last glyph's name, fitted across the space the
stack leaves at the highest scale that holds them (just under the text floor where they fit there),
down to the overview's floor (half the node's size). Where it is also taller than the pane, it opens
lower, down to where its names still clear each other (with no named overview, to the lowest the
graph allows). A graph that holds only below the overview's
floor opens at that floor, never at its own size cut: its start against the space's start past the
stack, its top at the space's top, and the anchor kept whole in the pane and clear of the stack's
corner; the reader pans for the rest, and the last name in view may run past the pane's side.

## Opening again

Arrange lands on the same view, and so does a change of the canvas's size (a `Pane` beside it
opening or closing, a resize), unless a node is `selected`: then the view keeps its scale
and pans only as far as that node needs, so a step's sheet docked beside the canvas leaves its step
in sight. A node `selected` as the canvas mounts is set in view at once where the opening leaves
it out. A node brought into view is centred in the space the zoom stack and the `act` leave, and where that space is too
narrow, moved past the stack or above it: it never stands under the controls.

A change of the node set (an id added or removed) opens the view again on
the new graph once it is laid out, or, with a node `selected`, pans to that node as a resize does,
unless the viewer has panned or zoomed since the view was last the canvas's own (by any gesture or zoom
step; Fit, Arrange and a resize make it the canvas's again): then the
view stays where the viewer left it. A graph whose nodes carry positions is not laid out and never
opens again; a node added to it lands where the viewer looks ([editing](./canvas-editing.md)).
The canvas needs no `key` for a new set.
