# The canvas

A graph the viewer reads or walks, a workflow or a journey, is a `Canvas`, never a hand-built
diagram of `div`s and lines. It takes data and draws the nodes, the arrows between them, the
boxes around groups and the zoom stack.

```tsx
import { Canvas } from "@slotform/react-ui/components/canvas";
```

## The data

A node is a `CanvasNode` (`id`, `icon`, `role`, `overline`, `title`, `line`, and a trailing `number` or
`count`), an edge a `CanvasEdge` (`id`, `from`, `to`, an optional `label`), a group a
`CanvasGroup` (`id`, `head`, `holds`: node ids and group ids). All come from
`@slotform/ui-core/descriptors`. The canvas draws `number` over `count` and never invents a number.
A node's `line` wraps to a second line and is cut at that one's end, so a list in it (a trigger's
callers, a gate's answers) keeps more than its first words; the node is as tall as its lines.

A **workflow** loops, answers back upstream and hands work to someone else. An edge into an
earlier node is drawn up the side, an edge that skips a layer runs down a column beside the nodes
it passes, never behind one, and an edge with `handoff: true` is dashed, with the handoff
glyph beside its label: dashed means a handoff and nothing else. A label stands beside its edge's
own stretch, near its source; a label never prints over another, under a node or over a loop's
border or head: one that would meet another label, a node's box or a group box's border moves down its
stretch past it, or beside it where the stretch cannot hold both.

```tsx
<Canvas
  label="Release flow"
  nodes={[
    { id: "build", icon: "Hammer", overline: "Build", title: "Make the change", line: "Edits the files" },
    { id: "check", icon: "ShieldCheck", overline: "Check", title: "Run the checks", count: 3 },
    { id: "ship", icon: "Send", overline: "Handoff", title: "Hand over" },
  ]}
  edges={[
    { id: "a", from: "build", to: "check" },
    { id: "b", from: "check", to: "build", label: "red" },
    { id: "c", from: "check", to: "ship", label: "green", handoff: true },
  ]}
  groups={[{ id: "loop", head: "Until green", holds: ["build", "check"] }]}
/>
```

A **journey** branches and rejoins, and numbers its steps. Take the numbers from the library, in
the order the canvas reads and the keyboard walks:

```tsx
import { pathOrder } from "@slotform/ui-core/canvas";

const numbers = new Map(pathOrder(nodes, edges).map((id, index) => [id, index + 1]));
const numbered = nodes.map((node) => ({ ...node, number: numbers.get(node.id) }));
```

## What a node is

A node says what it is in the graph with its `role`, which sets its shape and its tone from the
design's tokens, never from a colour of the app's. `step` is the default, today's plain card.

| `role` | Draws | For |
| --- | --- | --- |
| `start` | a pill in the accent tone (accent-tinted ground and edge, accent icon) | where the graph begins: a trigger, an entry |
| `step` | the plain card | work that happens |
| `decision` | a card with its icon in a diamond, a stronger edge | a branch; its answers are the labels on its out-edges, its line the subject they answer |
| `wait` | a card in the attention tone (attention-tinted ground and edge, attention icon) | something waits for a person here |
| `call` | a card with a double edge (a second hairline a step outside the first) and, with an `href`, an open act | another graph runs here |
| `end` | a pill in the quiet tone (muted ground, muted words) | where a path stops |

A `call` node's `href` (a `Route`) draws a small open act at the card's end, an arrow named
"Open" and the node's title, which goes to that graph and never chooses the node; pressing the
node's body still does. The act is the card's sibling and draws only while the node draws its card:
under the text floor the glyph carries no act.

Every tier shows the role: under the text floor and the overview floor the glyph takes the role's
shape and tone too (a pill is a circle, a decision a diamond, a call keeps its double edge), so an
overview you zoomed out to still reads. A role's look is its own shape and tone only: `off` draws
the node quiet over its role (the shape stays, the tone steps back to the plain card's), a
`warning` still replaces the line and takes the outline, a node off a run's `path` dims as it
did, and the selection's outline is the accent's ink, which is stronger than the start's edge.

## Its other pages

- [Moving around](./canvas-view.md): pan, zoom, touch and the view's motion.
- [The opening view](./canvas-opening.md): where the view stands as it opens.
- [The overview](./canvas-overview.md): the glyphs under zoom 1.
- [Where it stands](./canvas-layout.md): the nodes' places, the canvas in a `Pane`, loading.
- [Editing](./canvas-editing.md): moving, landing and connecting nodes.
- [States](./canvas-states.md): off, warning, status and a run's path.
- [Choosing a node](./canvas-choosing.md): selection, groups and the `act`.

## Check

`pnpm check` passes, and the canvas is read in light and dark at desktop and touch density, with
one node chosen and with none.
