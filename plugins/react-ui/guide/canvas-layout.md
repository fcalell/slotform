# Where the canvas stands

Where a `Canvas` places its nodes, where it stands in a `Pane`, and what it draws while its read
waits or answers no node.

## Where the nodes stand

Give no node a `position` and the canvas places them top to bottom in path order, loops inside
their group, the layers a bend, a chip's space and an arrowhead apart (about a node's height, so a
typical graph holds at a larger scale) and the nodes of a layer a card step apart. The parts of
a graph that no edge links (a group, or a loose node, with all an edge joins to it) stand side by
side; where that row is wider than the space the opening view has at the text floor, they wrap in
their order, each beside the last while the row holds it, else under it, so a narrow space holds
them in a column and no part opens wholly out of sight across. They wrap again as the canvas's
size changes, and the graph opens again on them. The places follow the nodes' measured heights: a
node that grows (a line that gains a second line after an edit) places the graph again, so each
layer keeps the space its chips need. With `onMove` it tells you each node's absolute position once, after it has placed
them: store those and pass them back as `position`. Give some nodes a position and you place
all of them; a node without one among placed ones lands at the centre of the view ([editing](./canvas-editing.md)).


## In the page

The canvas has no height of its own: it fills the region it stands in. Stand it as the body's
direct child of a `Pane`'s body (it spans it), never inside a component of your own that sizes it. It fills the
body edge to edge: it runs over the body's inset to the Pane's sides and its bottom edge, and to
its top edge when it is the body's first child. What stands above it (a record's head, a meta line, a
banner) keeps the inset, and the canvas's top edge then draws a hairline where it meets that
content. Below `tablet` it keeps at least half of the column it stands in: the column scrolls past
it, so a head and banners above it scroll away and never shrink it.

## Loading

`nodes`, `edges` and `groups` take a constant or a selection (`flow.at((f) => f.nodes)`). While a
selection's read waits the canvas stands its loaded ground painted: the dotted ground, the zoom stack
(with arrange where you gave `onMove`), inert, and in the middle three painted node cards at a step
node's measure (the node width and its card's height, a layer gap apart), laid by flex. A graph's own
nodes have no geometry before its data, so the painted cards stand for the nodes' measure and not their
places; nothing reads a box. It is the region the graph arrives in, so the page below the head does not
move when the nodes appear. The handlers and the `act` are
ignored meanwhile, and the surface draws no act, no node button and no drag. Give the canvas its
selection, not `nodes={[]}` for a wait: it reads as an empty graph. Its failed and empty read shapes
are the frame's, as for any collection.

A read that answers no node is the frame's empty shape, with the generic sentence. The canvas draws
no sentence of its own under a graph; a hint such as "Add a node" belongs in your page's head or its act.
