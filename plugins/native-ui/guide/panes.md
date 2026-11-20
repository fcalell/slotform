# Panes on the phone

A phone route renders one `Pane`, and the `Shell` draws the place around the router's stack. This
page is how a Pane stands on the phone: its two kinds, its bar, its record head and what docks at its
foot. What both platforms share is `node_modules/@slotform/ui-core/guide/places.md`; the props are
`containers.md`, "Pane".

## A route renders one Pane

A phone route renders one `Pane` and no place of its own: the `Shell` draws the place around the
router's stack, the container that draws the tab bar under the screen and reads none of it. A route
pushed in expo-router's stack renders its `Pane` alone: the stack animates the push and covers the
tab bar, so nothing marks a page as pushed:

```tsx
<Pane acts={[newProject]}>…</Pane>
```

A `Pane` is the place's or a record's (`node_modules/@slotform/ui-core/guide/places.md#two-kinds-of-pane`).
On the phone the record's route is pushed after the list's in the stack, and Back returns to the page
above. What a record's details held stays in its Pane, never a sheet. There is no `back`, `cover` or
`wide`: a `Pane` fills its route, and its body is one column.

## The bar and the head

The bar is one row: the leading act (the shell's switcher on the place's Pane, Back on a record's),
the trail and the name (a short phrase), then the `acts` (icon acts; a create act is one, an
`IconAct` with the `Plus` icon) and `more`. There is no filled act and no Details act. The title
truncates and keeps two fifths of the row; the acts fold by one rule
(`node_modules/@slotform/ui-core/guide/links.md#acts-fold-by-one-rule`), so order `acts` by weight, the
primary first. A title whose read failed, with no `.or` fallback, draws nothing: the bar keeps its
height, its back act and its acts, and the body line says why. The body scrolls under the bar and its
children stand a `section` gap apart at the page inset: never wrap sections in a `View` to space them.

The place's `Pane` gives no `title`, since the place's name titles it
(`node_modules/@slotform/ui-core/guide/places.md#a-places-name-is-its-title`). A record's `Pane` gives
`title`, the record's name as a selection of its read (`title={deploy.at((d) => d.commit)}`), and a
`record`, whose head opens the body with the title standing once, whole and wrapping, as the screen's
header. The head's facts are `node_modules/@slotform/ui-core/guide/facts.md#a-record-heads-facts`; its
overline is the record's project, key or cycle, never a place of the trail, which the bar holds. A
fact that opens a sheet is its words and a chevron, a button at the touch target; a linked fact is
its words underlined, its press reaching the touch target past the badge's line.

## A docked foot and a sheet

A field that stays in view while a `Pane`'s sections scroll under it (an ask box over a home's
sections) is the `Pane`'s `foot`: it docks under the body, above the tab bar; a `Table`'s chosen bar
(an `ActionBar` with `chosen`) docks there the same way, and a `Thread`'s input is a `Composer`. The
route gives the `foot`: the `Pane` decides it from its props, and nothing in its body hands anything
up. A `Thread` in a `Pane` with a `foot` leaves its own `composer` unset. A `Pane` or a `Thread`
takes `sheet` beside its `foot` or `composer` and docks it there while it is open; a `Sheet` placed
anywhere else is always the modal one. How each sheet stands is `containers.md`, "Sheet".

A column is a width and the region around it aligns it: a docked foot centres a chosen bar's column.
A `Sheet`'s body stands its sections a section apart, as a `Pane`'s body does.
