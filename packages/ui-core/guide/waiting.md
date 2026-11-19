# Waiting

While a read waits, a screen draws its loaded tree painted, never a second tree, an act paints by
its own datum, and a read that waits for a connection says so once. What holds a read is [frames](./frames.md).

## A waiting screen is the loaded tree

A page's outline comes from its route and its data fills it. A `Section` with `items` paints as many
rows as it last loaded, each in the shape its selector gives one record (a list row or a file row),
four (`PAINT_ROWS`) when it has not, so the Sections under it stand where the loaded ones will. A
painted part is inert and hidden from the screen reader. The switch from the painted shape to the
loaded one moves nothing, since the painted shape is the loaded one's geometry: draw nothing for it.

A `Section` stands whatever its data holds and draws its `empty` when there is none, never gated on
the data's length.

## A block that stands only with its data

A block that stands only with its data (a `Banner`) stands where it reads best, and what is under it
moves once when it arrives. Place it always and give its `sentence` a selection that answers
`undefined` when there is nothing to say: it draws nothing while the read waits and nothing then, and
the page moves once, by its height, when the banner arrives with its data. The shift check reports
that move and fails any other.

```tsx
<Banner tone="attention" sentence={usage.at((u) => (u.left < 10 ? "Few promotions left this month." : undefined))} />
```

## Acts and options paint by their own datum

A constant act is always live. An act given as a selection paints while its read waits, stands still
with no sentence when its read is not asked for, and is blocked once its read ended, with the failed
sentence (`words.missing` when missing). An act's `label` and `blocked`, and an option's `label`,
`line` and `blocked`, may be selections on their own:

```tsx
{ label: "Promote", blocked: usage.at((u) => (u.left === 0 ? "No promotions left" : undefined)), onAct }
```

The act or the options then paint, stand still or end as a selection of the whole would, so wrap
nothing in `.at(...)` for a reason. This holds where an act or options arrive as a datum: a `Pane`'s
`acts` and `more`, a `Section`'s `act` and `more`, a `Banner`'s `act`, and the `options` of a
`Picker`, a toolbar filter and a form's pick. A form's field hosts its control's save, so a refusal
draws in the field's line (a control standing alone toasts it), and a form's bar waits only on the
form's own read.

## Waiting for a connection

A held read that waits for a connection (paused) draws "Waiting for a connection." under the frame's
heading row with nothing to press, over its data when it has some. With no data, or not asked for
yet, the frame stands still: its loaded shape painted and inert with that line over it and no
sentence of its own, never the line alone and never painted rows with no line, and nothing breathes.

A `Pane` stands for a read the app holds itself (a session id that decides what its body draws) only
when it is given that read: a `Pane` with no `read` draws nothing of any read's state.
