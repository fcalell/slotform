# Links and icon acts

An act that only goes to a route is a link, a `LinkAct`; an act beside a heading or at a row's end
is an icon act; and acts that stand side by side fold by one rule. `LinkAct`, `IconAct` and
`IconLinkAct` are `@fcalell/ui-core/descriptors`. What an act that runs carries is [acts](./acts.md).

## A route act is a link

A labelled act that goes to a route is a `LinkAct`, `{ label, href }`, never an
`onAct: () => navigate(route)`. An act that does work first and then goes to a route is no link: it
carries `to` ([acts](./acts.md#the-wiring-is-data)).

Wherever a host takes an `Act` for a labelled act (a `Banner`'s, a `Toast`'s, an `empty`'s, a
`Canvas`'s on the web) it takes a `LinkAct`, and a menu (a `more`'s entries) takes `{ label, href }`
as an entry. So do a `Pane`'s `acts` (`IconLinkAct`), a `Section`'s and a row's `act`, a Section's
`empty` act, a band's icon act, and the act of a `Picker` or of the shell's switcher ("New
organization").

A link is drawn in the look of the act it stands for, and a press goes to the route through the
router. It runs nothing: it never pends and has no `destructive` or `quiet`. A `LinkAct` given a
`blocked` reason draws inert and gives the reason, as a blocked act does (a link whose page is
missing); in a `more` menu it is a link entry.

| `LinkAct` field | Is |
| --- | --- |
| `label` | the link's visible text, a short phrase that truncates |
| `href` | the route it goes to |
| `icon` | an `IconName` drawn with the label |
| `blocked` | why the link cannot be followed, a sentence: it draws inert with the reason |

## Icon acts

An act beside a heading or a title, or at a row's end, is an icon act: `IconAct`
(`{ icon, label, onAct }`), or `IconLinkAct` (`{ icon, label, href }`) for a route. A `Section`'s
and a row's `act` take nothing else; the act's words are its accessible name and, on a pointer, its
tooltip.

| Shape | Fields |
| --- | --- |
| `IconAct` | an [`Act`](./acts.md#the-wiring-is-data) whose `icon` is required: `icon`, `label`, `onAct`, then `confirm`, `done`, `to` and `blocked` as any act's |
| `IconLinkAct` | a `LinkAct` whose `icon` is required: `icon`, `label`, `href`, `blocked` |

## Acts fold by one rule

Acts that stand side by side fold by one rule, never by the space: the first stands and the rest
stand in the more menu, in their order, at every width.

- A `Pane`'s first `acts` entry stands at its icon and the rest lead its `more`, the act named More,
  its sheet on touch titled by the Pane's title (a record's name).
- A row's `act` is its one act and its others are its `more`, its sheet titled by the row.
- A chosen bar stands the first of choose-all and clear that applies.

Put the act used most first.

## Acts that stay functions

A `Sheet`'s submit, a `Form`'s submit, a `Rules` add, a chosen bar's acts, an `Input`'s act and a
`RowEntry`'s act stay function acts: each runs something over the surface it stands on (the task, the
selection, the typed value) or must pend it, which a way to a route does not. Whether an
`ActionBar`'s `acts` take a `LinkAct` is each platform's `acts.md`.
