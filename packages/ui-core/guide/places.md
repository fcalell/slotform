# Places and Panes

A screen stands in a place, and a place holds `Pane`s of two kinds. This page holds what both
platforms share about the kinds, the place's title and the `PlaceSpec` that names a place; how a
platform lays its Panes out is its own guide: the web's `shell.md` and `pane.md`, the phone's
`node_modules/@slotform/native-ui/guide/panes.md`.

## Two kinds of Pane

A `Pane` is one of two kinds: the place's own, titled by the place's name, and a record's, titled by
the record's name. A route renders its `Pane`s and no place of its own: the `Shell` draws the place
around them and reads none of them. A list and the record it opens are two routes, each rendering its
own `Pane`. A record the open record links to opens in its own place (its own list and record), never
as a further `Pane` beside the two.

Reading a record happens in a `Pane`; a `Sheet` is only for a task (create, edit, decide,
acknowledge).

## A place's name is its title

The place's name is the place's `Pane`'s title at every density. A place that draws one section of a
larger area is named with the section's name (`Repos`, not `System`), which the sidebar item or the
tab carries; the app never picks another title for the phone.

A `Section` with `items` and no `title` standing directly in a `Pane`'s body stands a page inset
under the bar's hairline, where a titled `Section`'s title stands a gap over its body: the `Pane`'s
title is a bar over a hairline, the section's a line of the body, and a list that should read as a
section's own wants a `title`.

## `PlaceSpec`

A place the `Shell` lists is a `PlaceSpec` from `@slotform/ui-core/descriptors`: data, never a node.

| Field | Is |
| --- | --- |
| `route` | the place's address |
| `label` | its name (a word; truncates): the sidebar's or the tab's label and the place's `Pane`'s title |
| `icon` | an `IconName`, a Lucide glyph's PascalCase name |
| `count` | a figure beside the label |
| `group` | the group it stands in, a `GroupSpec`'s `label` |
| `end` | the footer group |
| `drop` | the drop the place is: a drag of a kind it accepts, released on it, runs its `onDrop` |
| `children` | the places under it, which make it a branch |

`PlaceSpec<Q>` takes the read's query as `Q`, so a `drop`'s `drag.picked` is the `Picked<Q>` a
`selector()` mutation takes whole. A group's `places` and a switcher's `options` are constants or
selections. A branch is a place of its own (route, count, `drop`) and nests to any depth. The web
sidebar draws the tree; the phone's tab bar draws the top level, and its rules page says how a nested
place is reached there.

```tsx
const places: PlaceSpec[] = [
  { label: "Boards", icon: "ListChecks", route: "/boards", children: [
    { label: "Teams", icon: "Folder", route: "#teams", children: [   // a folder: no page, folds and opens
      { label: "Web", icon: "ListChecks", route: "/boards/web", count: 12, drop },
    ] },
  ] },
];
```
