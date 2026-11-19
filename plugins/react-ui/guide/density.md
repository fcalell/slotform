# Density and the page

Which set of sizes draws where (desktop, touch and room), the page container a `Pane` reads its width
from, and the safe areas on a phone. The options and the mode are [reference](./reference.md).

## Density

Density is no option. The desktop set draws where the pointer is fine and the viewport is at
least `tablet` wide; the touch set draws everywhere else, so a narrow desktop window draws the
touch sizes and structure. A `data-density` attribute on `<html>` pins one: `desktop` or `touch`.
Sizes, spacing roles and type roles follow density on their own; a molecule whose structure
differs by density reads it itself.

A desktop window narrower than `tablet` with a fine pointer (a browser extension's popup, about
420 px) draws the touch set: width is the structure rule, and the pin is the supported answer. Set
`data-density="desktop"` on `<html>` for a page that stands in such a window, in its HTML or with
`document.documentElement.dataset.density = "desktop"` before the first render (the `no-density`
lint rejects the attribute as JSX, so it is never on an element of the app's own). The page
does not use the `Shell`, whose desktop form is a 220 px sidebar that a 420 px window cannot hold
beside a page: a pinned page is a `Gate` alone.

A screen read from across a room is the one set a page states, `distance="room"` on the `Panes` it
draws outside the `Shell` ([shell](./shell.md#panes); the
showcase's `/tv` page; the `Shell` takes none): that place sets `data-density="room"` on
itself, so the touch set at a 960 × 540 canvas scaled to the window draws inside it (`--room-unit`
holds the scale), with the touch structure. A layer that portals (a menu, a picker, a sheet) draws
outside that scope, which is why a room place's `Pane` takes no `more` or `foot`. A room page with
no data to show (signed out, the server not answering) draws its `Gate` inside the same `Panes`, so
the Gate fills it at the room set and stands its step in the middle of the screen (the showcase's
`/tv-offline`). Inside a room place the board takes the room's own forms: a `Pane`'s head stands a
`pad` off the top, on the table, over a bar of its own; a row whose only mark is a status fact draws
one line, the status after the facts at the end group's start, whole whatever its word, the facts taking
the space it leaves; a `Stats` strip is the rows' width, its cells sharing it in proportion, so it
reads as one column with the rows under it. The showcase's `/tv` draws the strips and `/tv-board`
thirty rows at 960 × 540.

## The page container

The place the `Shell` draws is the `place` size container and each `Pane` the `page` one. The place
decides which `Pane`s stand by its own width, never the viewport's ([shell](./shell.md#panes)), so a record keeps its space beside the sidebar at any window width. What stands
in a `Pane` reads the `Pane`'s width. On the desktop the place is a raised panel an `gap` gap from the canvas
at its top, end and bottom and against the 220 px sidebar (a dark slate column, pinned dark in both modes); on touch it fills the column.

## Safe areas

The touch places layer clears a phone's status bar and home indicator by itself: the document
sets `viewport-fit=cover`, and the layer pads its top and bottom by the safe-area insets. The Shell's column pads
its top by the safe-area inset, so a banner or a page's head clears a notch or a status bar.
