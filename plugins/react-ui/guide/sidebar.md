# The sidebar

How the `Shell`'s sidebar draws: the rail of groups and the places' tree. What the `Shell` takes is [shell](./shell.md).

## The rail of groups

The rail and the column each lead with a switcher region at a Pane bar's height, the app's switcher in the rail's and the group's in the column's (empty for a group with none), so the column's switcher stands level with the app's and its first place level with the rail's first entry. A group whose places landed empty keeps its switcher, so its act can make the first, and the switcher draws its `placeholder` while it has nothing to switch to.

The rail's first entry is the ungrouped places, named and drawn by their first place; the others follow in `groups`' order. A press on an entry goes to its group's first place. Docked (the default), the rail stands with its labels and the column of the current place's group beside it, until the viewer folds it to the icons with the act at the rail's foot; the choice holds from one visit to the next, and the same act docks it again. As it docks or folds, the page takes its new space at once and slides from where it stood, its edge on the sidebar's end.

Hovering or focusing an entry shows its group's column: docked, in the column's place at once; folded, after a short dwell (so a sweep across the rail changes nothing), by opening the sidebar over the page, the rail's labels uncovered and the column sliding out from behind it, another entry's group then showing at once. The sidebar opens and shuts as one body on `base` `out`, by clip and transform alone, snapping under reduced motion. A pointer heading for the column keeps the group shown while it crosses other entries (a menu aim: the switch waits until the pointer rests or turns away). The column goes back (to the current place's group, or to the rail) once the pointer and the focus have left the rail and the column a moment, on Escape, or when the route changes. A menu the column opened (a switcher's), or a sheet one of its acts opened, holds it open, so a project can be switched, or an asset made, from the hover. A footer place's entry and the dock act expand nothing: on the folded rail each shows its label as a tooltip, and a footer place's entry goes to its place.

On touch the places layer lists the groups first; a tap shows that group's places with a way back to the list.

## The tree

A place with `children` is a branch (`node_modules/@fcalell/ui-core/guide/places.md#placespec`). A branch has a fold act at the end of its row; its children stand one `stack` space in per level. The browser keeps the viewer's open and folded branches per branch route; a branch they never chose is open when the current place is at or under it, else folded. The places on the path to the current one (its folded ancestors too) take the selected ink, while only the current one takes the wash and the bar.

Every run of places, flat or nested, the footer group included, is a WAI-ARIA tree with one tab stop (the current place's row, else the first):

| Key | Does |
| --- | --- |
| Up, Down | moves between the visible rows |
| Right | opens a folded branch, steps into an open one |
| Left | folds a branch, steps out to the parent |
| Home, End | the first and the last visible row |
| Enter | opens the place |
| Space | nothing |

A branch whose route is a spot (`#folder-7`) is no page: pressing it, or Enter on it, only opens and folds it. Only open branches mount their children, so a place inside a folded branch takes no pointer drop until the branch opens; how a drag reaches it is [drag](./drag.md).
