# Choosing a node

How a viewer chooses a `Canvas` node or a group, the keys that walk them, the empty group, and the
`act` at the canvas's foot.

A canvas with no handler is read-only: it has no node button and no node moves. Pass `onSelect`
and each node is a button named by its text, in path order in the Tab order (with `onMove` it is one too: [editing](./canvas-editing.md)). Enter or Space
chooses it, Escape or a click on the ground calls `onSelect(null)`, and a node focused from the
keyboard pans into view. Hold the choice yourself and pass it back as `selected`; a change from
outside (a row in a list) pans to its node.

```tsx
const [selected, setSelected] = useState<string>();
<Canvas label="Journey" nodes={numbered} edges={edges} selected={selected} onSelect={(id) => setSelected(id ?? undefined)} />
```

A group's `head` is one line, cut at its end with an ellipsis: put what decides first (a round count before its qualifier), and keep it short enough for a phone's frame. A group is a box; with `onSelect` its head is a selectable control. The head is a button named
by its text (at least a target tall) that calls `onSelect(group.id)`, and `selected` may name a
group, which draws its box in the selection's outline (a heavier dashed line). The head
shows hover as a node does. Node ids and group ids share one
namespace. The head's band stands over the edges that cross it into the box, so no edge
strikes through its words. The box's body takes no pointer, so a drag from it pans, and a group does not move:
its box follows its holds. The heads take their Tab stops first, outer before inner, then the
nodes in path order. Under the text floor a head draws at its own size on screen and stays a stop.

A group holding no present node (an empty loop) is a leaf of the graph: the layout stands it in
its place in the path, as a box of its head and padding at a node's width, and an edge may name
its id as `from` or `to`, so its edges meet it. Its head is a button as any group's. It is no
node: it takes no port, no drag and no connection, and `onMove` never hears it. The layout
places it. When every node has a `position` no layout runs, and the empty groups stand in one row
below the nodes' bounds, left-aligned with them, in path order; an empty group takes no
`position`. A group that holds an empty group frames it, and an edge naming a group that holds a node is ignored.

An `act` stands at the foot's centre, an `Act` or a `LinkAct` (a `{ label, href }` is an anchor to a route); it adds, it never removes.
