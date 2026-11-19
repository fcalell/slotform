# The container

The frame every page stands in: the container that holds a page, the sidebar beside it and the scope a page reads in. Part of the face [voice](./voice.md) decides.

## Container

The sidebar is a slate column (the dark calibration of the same tokens, pinned
dark in both modes) beside the canvas, the table; on the phone the same column is a layer
over the whole screen, opened by the menu glyph that leads the bar. A page is its bar across the top, on the
surface over a hairline, and its sections under it on the table at the page inset, a sections
gap apart; a section's label stands on the table and its rows on a sheet under it: the
surface, a 1 px edge, `rounded-sheet` corners (8 px at the default `radius`). On touch the same, at the touch inset.

## Sidebar

The `sidebar` is 55 units of the space base wide (220 px at the default `size`). Its first row is a bar as the page's (the same height, the same line): the
app's lockup in the glyph region, then the switcher (name at 500, an up-down glyph), so the
organization's name and the page title stand on one line. Items are `control` rows (32 px at the default `size`) at the body
size; groups carry a section label ([type](./face-type.md#type)); a group
that is a scope (the project) carries its own switcher as the row under its label, its places
following the pick; the places scroll between the bar and the footer group, which stay in
place, so none is ever clipped; settings and exits stand in the footer group. The current place carries the
current bar ([current](./face-surfaces.md#current)) and a 6 percent white wash. The mark stands on the Gates as a lockup. A sidebar
whose places name groups is a rail of `control` squares (a group's icon; the ungrouped places first, the footer places at its foot,
each with its label beside it, a press going to the group's first place) beside the column of the current place's group, which needs no heading of its own,
the app's switcher leading the rail; the rail's current entry takes the row's bar and wash. Hover or focus on an entry shows its group in the column; folded to its icons by
the act at its foot (each label then its tooltip), the sidebar opens over the page on hover or focus instead, each entry's label uncovered and that column sliding out beside it.

## Context

A scope the page reads in (an environment, a release, a saved version) is a pick in the bar: an outlined pill at the `control` height (32 px, 44 px on touch, at the default `size`) holding a dot in the scope's tone (the app's `state`; no tone carries a fixed meaning), its name and its chip at every width, the name truncating within its share of the bar and whole in its tooltip and accessible name.
