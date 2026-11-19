# Moving around the canvas

How a viewer pans and zooms a `Canvas`, and how the view travels. Where it opens is
[canvas-opening](./canvas-opening.md); a node zoomed out is [canvas-overview](./canvas-overview.md).

## Pointer and wheel

A plain wheel pans, Shift with a wheel that only scrolls up and down pans sideways, Ctrl or Cmd with
the wheel zooms (a trackpad pinch is a Ctrl wheel), and a drag pans, even from a node (with `onMove`
a drag from a node moves that node instead). The zoom stack at the bottom left zooms in, zooms out
and fits. A zoom step is a fifth of the scale, about the node last focused, which stays where it
stands, else about the pane's centre; a zoom about a node (a step or a glyph's press) keeps it whole
and clear of the stack. Fit shows the whole graph, centred clear of the zoom stack and the `act`,
never larger than its own size, and under the text floor where it must, down to the lowest zoom the
graph allows.

A group head whose box runs under the zoom stack or off the pane's start or end keeps its words in
view: they stand past the stack's column where the head stands in the stack's rows (else at the pane's
start, so a head above the stack has its box's whole width) and stop at the pane's end (truncating
there) while the band stays across the box. The stack and the `act` stay at the region's foot: a focus on a node out of
view pans the view to it and scrolls nothing. Zooming out by hand still goes under the floor, to the
overview and the glyph alone.

## On touch

The canvas draws the touch density's sizes at touch, and a phone pans and zooms the same
canvas. One finger drags the ground, and drags a node too, which pans (a node never moves under a
finger that is moving). Two fingers pinch. With `onMove`, a node held still for a moment lifts,
draws a 2 px outline in the selection's colour, scales to the lift scale with its float shadow fading in on `fast`, and follows the finger; releasing it calls `onMove` once. A
second finger landing on a lifted node drops it where it is. A lift never selects, and a tap on a
node selects it as a click does.

Every zoom button, the `act`, each glyph and each port is at least 44 px at the touch density, at
any zoom: a port's hit is drawn at that size whatever the scale.

## Motion

The canvas's viewport travels for the viewer's own acts: a zoom step, Fit, a reveal of a node chosen
from outside or reached by the keyboard, and a tap on a glyph travel on `base` `in-out`, by the
canvas's own frames (the layer and the dot grid together); quick presses add up, and a pointer, a
finger or a wheel taking over ends the travel where it got to. The opening view, Arrange's fit, the
view a resize opens again and the lowest-scale clamp land at once. A node answers on `fast` (its border and ink), a taken path's
tone (the edges, the chips, the words) cross-fades on `base`, and a node crossing the text floor
cross-fades with its glyph on `fast`: the card fades out and, inert, takes no pointer or key, and
the glyph fades in. A node that lands fades in at its place on `base`, and the graph fades in once
it is laid out. Under reduced motion every one of these lands at once.
