# Editing the canvas

How a `Canvas` reports a drag, an arrow key, Arrange, a node that lands and a link drawn between two
nodes, and why each one sticks only when you store it.

Editing is controlled: the canvas reports and holds nothing of yours. `onMove(id, position)`
reports a node's position when a drag ends or an arrow key moves it, once for each node when the canvas lays them out or
Arrange runs, and once for a node that lands. **Store each one and pass it back as `position`**:
that is what makes a drag, Arrange and a landing stick, and a position you do not store is
forgotten on release.

- **Move.** With `onMove` a node follows a drag at once, with no long press and no handle, and
  the edges and group boxes follow it, and it stands over the nodes it crosses. A drag never
  selects. Held near the canvas's edge, a dragged node or a dragged link pans the view toward that
  edge, faster the nearer it is, and the node stays under the pointer, so a node or an in port out
  of sight is reached without letting go. A node that can move is a button in the Tab order: an
  arrow key moves the focused node a quarter of the dot grid's pitch (4 px), and Shift with an
  arrow one pitch (16 px), each reported through `onMove` as a drop is. Every position a move
  reports is in whole pixels. Arrange joins the zoom stack, the
  way to lay the graph out again without dragging: it ignores every position, reports each
  node's, and fits the view.
- **Landing.** A node added without a `position` among placed ones lands with its centre at the
  centre of the view, and `onSelect` is called with its id. Two added at once land on one
  another. Without `onMove` it is drawn there and nothing is reported.
- **Connect.** With `onConnect` each node shows an in port at its top and an out port at its
  bottom. Dragging an out port to an in port calls `onConnect(from, to)`, and releasing on the
  ground calls `onConnect(from, null)`: open whatever you offer for a dropped link (your sheet).
  The in port under the pointer fills with ink while the link is dragged, so the release has a
  visible target, and a forward edge ends just above an in port, clear of its ring. A release over
  a node's body, a control or outside the canvas reports nothing, and a link from a node to itself
  is reported: refuse it when you save. The canvas never adds the edge; add it to your own data and
  pass it back in `edges`.
- A canvas with neither handler has no drag, no Arrange and no port. Connecting without a
  pointer is your own sheet: the ports are not focusable. A `path` does not gate editing and a
  port keeps its ink on a dimmed or marked node: a run you want read-only is a canvas given
  neither handler.
