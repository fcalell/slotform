# The canvas's overview

What a `Canvas` node draws under zoom 1, on every input: its glyph, the glyph's name, and the group
heads and edges around it. Zooming is [canvas-view](./canvas-view.md).

On every input, pointer and finger alike, a node under zoom 1 is its glyph: the icon in a
box of the density's `control` size, its border the state's (a selection or a warning), its
status as a dot on the box's top right corner, and a warning as a danger dot on its bottom right
corner, each seated on the rounded corner (half of it over the box) so neither covers the icon. From zoom 1 down to half the glyph
carries the node's `title` beside it, on one line at the meta size (12 px or more), in body ink at 500, cut at the
short measure, on the canvas's own ground so an edge never strikes through it; the name is
drawn at the same size at any zoom, so the overview never shows text under the 12 px floor.
Under half the glyph stands alone, with the `title` as its tooltip (the native `title`, so the cut-text tooltip leaves it its own). A name cut at the short measure, and a group head cut to the box's width, show whole in the cut-text tooltip when the pointer rests on them. A graph whose nodes stand too
close for their names to clear each other at half raises that zoom to the lowest at which they
clear, and one that cannot clear them under zoom 1 has no named overview: the glyph alone. Group
heads stay under zoom 1, drawn at their own size on screen (a button a target tall, the meta role's size, cut to
the box's width), and the nodes below a head move down by what it grew, so no head or box covers a
node outside its group; edge labels draw nothing. A click, a tap or Enter on a glyph or its name
zooms to that node at its own size about its centre, which stays where it stood (under the finger) unless the node would then pass the canvas's edge, when the view shifts just far enough (a page inset in) to hold the whole node, and chooses nothing.
Edges and group boxes follow the glyphs, so an edge ends on its glyph, and zooming out stops
where two glyphs would stand closer than two `gap`, so the edges between them still draw.
Give each node its own `title`: beside the icon it is the overview's only mark of one node of a
kind from another. Keep `warning` and `status` words short and put the detail in your
sheet: a glyph shows the mark, and the words are one tap away.
