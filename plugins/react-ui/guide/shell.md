# Shell

The container of the app: a sidebar of places on the desktop, the column alone on touch. A Shell whose places name groups draws the sidebar as a rail of groups beside the group column; one that names none draws the one sidebar. How the sidebar draws, its rail and its tree, is [sidebar](./sidebar.md); the `Panes` it holds are below.

## Props

- `places`: the places in order, each a `PlaceSpec` (`node_modules/@slotform/ui-core/guide/places.md#placespec`); the current route's is selected. The sidebar's places scroll between the switcher bar and the footer group (the places with `end`), which stay fixed; with groups the footer places stand at the rail's foot as icon links.
- `groups`: `{ label, icon, switcher?, places? }`, named by a place's `group`; a place naming a group `groups` does not list throws. A group's `places` are a constant or a selection that returns the whole tree: while it waits the heading draws over painted place rows, all inert, and once it failed or is missing the group draws the compact failed or missing shape with Retry in the rows' place. The `icon` is the group's entry on the rail, the `label` its accessible name there, shown beside the icon while the rail is docked or open, and the heading of its places on the touch layer; a `switcher` leads the group's column, and draws under the heading on the touch layer.
- `switcher`: what the app is looking at and what it can switch to, an `OptionPick` (`label`, `options`, `value`, `onChange`, `placeholder`) whose `options` and `value` are constants or selections, and whose `act` ("New organization") ends its list under a hairline: an act that runs, a sheet it opens, or a link. While a selection waits the switcher paints its avatar and name and keeps its chevron, inert; a value no option matches, or a read that ended, draws the switcher with no name, never its own label as one. With groups it leads the rail, its name and chevron beside its mark while the rail is docked or open, its mark alone on the shut strip; its open menu holds the rail open.
- `banner`: a `Banner` over the column.
- `foot`: a part under the place across the column, whatever the route (a `Dock`, [dock](./dock.md)); without one the Shell draws nothing there.
- `children`: the route's `Pane`s: the place's own, then a record's.

## Panes

`Panes` (`components/shell`) holds a place's Panes. The `Shell` draws it and gives it the current place's name, so a route inside a `Shell` writes none.

| Prop | Is |
| --- | --- |
| `distance` | `"room"`: the place is read from across a room and draws the room set ([density](./density.md)); only its last Pane stands |
| `title` | the page's `h1`, drawn apart from sight; a room page with no `Shell` states it once (`<Panes distance="room" title="Deploys">`) |
| `children` | the place's Pane, then a record's |

The place holds two Panes at most, the place's own, then a record's, and throws on a second of a kind. The place's Pane alone fills the place; with a record open it holds `list` (520 px at the default theme `size`) and the record takes the rest. A place's Pane that fills with a `Canvas` is the place's main object: it takes the spare space and the record holds `list`. Below `tablet` of the place only the last Pane stands.

The page's one `h1` is the Panes's, the label of the place the sidebar marks current (the app's name where none is). Every `Pane`'s title is an `h2` and its `Section`s start at `h3`, whether the `Pane` stands alone or beside others, so a route passes no level. A `Gate` in a room `Panes` is its own `h1`.
