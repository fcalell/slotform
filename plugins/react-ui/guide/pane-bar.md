# The Pane's bar

The line over a `Pane`'s body: its trail, its title, its acts and its way back. What the `Pane` takes is [pane](./pane.md).

The bar holds the trail, the title, the context pick, the acts and the more menu on one line at every width. The first `acts` entry stands at its icon and the rest lead `more`, the act named More, its touch sheet titled by the Pane's title (`node_modules/@fcalell/ui-core/guide/links.md#acts-fold-by-one-rule`). The title keeps two fifths of the row.

The trail is the place's path in the `Shell`'s tree, which the `Shell` gives the Panes, so a route passes none: a record's Pane draws every place above the record's place, then that place, a slash, and the record's name; a place's own Pane deep in the tree draws the places above it, then its own name as its title; a top-level place's Pane draws its title alone. A place that is a page is a link and a folder is text. On the desktop the top place and the current one stay while the places between stand where the Pane is wide enough and fold into one `…` act where it is not. On touch the trail stands at the start of the record head's overline, or as the overline over a deep place's title.

The place's Pane has no Back or Close: the sidebar moves between places. A record's Pane has Close at the bar's end on the desktop and Back at its start below `tablet` of the place; both return to the place's Pane as it stood, its tab and filters kept, because the return route carries the address's query. Its Expand act folds the place's Pane away so the record takes the place, and turns into Collapse, which brings the list back. A Pane that opens from a press in another takes the keyboard on its first control.

A failed Pane is the whole page with Retry as its one act, and a missing one is the page with its way back (beside another Pane, its Back in place of Close): its bar draws none of its `acts` and no more menu, and names what is missing where its title's read ended (the `noun` capitalised, else "Not found"), keeping the record's place and the way back. Its foot and docked sheet stand, since they answer to their own reads.
