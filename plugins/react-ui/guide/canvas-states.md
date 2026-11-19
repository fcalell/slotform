# Canvas states

What a `Canvas` node says of its state: off, a warning, a status, and the path a run took.

A node says its state in its own text or mark, never by colour alone.

- `off: true` draws the node quiet with the word "Off" in place of its line, and dims its edges. Under the text floor, where words drop, its glyph carries Off as a slash through its icon (and its name, the glyph's tooltip and accessible name, reads "<title>, Off").
  An off edge is never dashed: dashed means a handoff and nothing else. The switch for it lives
  in the node's sheet, not on the canvas. An off node ignores its `warning`.
- `warning` draws the node's border in the danger hue, a danger dot in its trailing column and
  its words in place of the line, in the ink a line has. The dot stays when the node is selected,
  which takes the border. Pass the first words only, and name the whole warning outside the canvas
  in a `Banner` and a `Section`'s `items`. A node with a `warning` and a `status` draws both marks.
- `status` is a `StatusMark` (`{ tone, label }`): a fact, so it is a badge (`node_modules/@fcalell/ui-core/guide/face-badges.md`, **Badges**) under the title,
  its tone's mark (the dot, a spinner while the state is `running`) inside it before its `label`,
  which stays in the meta ink; the title takes the node's whole width. The badge never breaks: the
  label keeps its whole word up to the short measure and is cut with an ellipsis inside the badge
  past it. The node's `line` (the `warning` in its place) is a sentence, so it is plain text under
  the badge, wrapping to a second line and cut at that one's end. Keep the label a word or two
  ("Paused", "Asks you first").
- `path` (`nodes`, `edges`, `at`) is what a run or a scenario took. A node the path leaves out
  is a hairline on the canvas's ground (an on-path or an `off` node is a filled card) and draws every part in the meta ink, its title at regular weight (the node is a button you can still choose, so its words stay readable), and no status or warning mark; an edge it leaves out dims, its label chip's words in the meta ink with it, and `at` is outlined
  as a selection is. On the path, off and off the path read apart: a filled card in the body ink, a filled card in the meta ink and the word "Off", a hairline in the meta ink. An edge is on the path by its own id, never by its ends.

A run over the workflow, with a status on the nodes it took:

```tsx
<Canvas
  label="Release run"
  nodes={nodes.map((node) => ({ ...node, status: statuses.get(node.id) }))}
  edges={edges}
  groups={groups}
  path={{ nodes: ["build", "check"], edges: ["a", "b"], at: "check" }}
/>
```

A state never moves a node or runs the layout again.
