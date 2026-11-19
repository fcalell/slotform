# Tone

One vocabulary names the state of everything a screen reports: a status, a `Banner` and a toast
take the same `tone`, and a status is one shape, the `StatusMark`, wherever it stands. `Tone` and
`StatusMark` are `@fcalell/ui-core/descriptors`.

## Tone is one vocabulary

A status, a `Banner` and a `toast()` name a tone with one prop, `tone`, from one set:

| Tone | Draws |
| --- | --- |
| `active` | news, the accent |
| `running` | the accent, a spinner where a status draws a mark |
| `waiting` | the meta ink |
| `idle` | the meta ink, a hollow dot |
| `done` | ok |
| `attention` | warn |
| `failed` | danger |

A `Banner` defaults to `active` and announces `failed` at once; `toast("Saved")` is `done`, and a
refusal is `toast(sentence, { tone: "failed" })`. A run in progress with a deadline is a `Banner`
with `until` (`tone="running"`, its `act` the cancel): the banner draws the time left and a line
along its foot that fills toward the deadline, and stops at 0:00.

## A status is a `StatusMark`

A status is one shape everywhere, a `StatusMark`, `{ tone, label? }`: a row's status fact, a row's
status title, a row's `{ tone }` leading and a pick option's `{ tone }` leading, a record head's
status fact, a table cell and a canvas node's `status`. The tone's own word is the default `label`,
drawn everywhere but in a leading, where the dot stands alone and the `label` is its accessible name.

A status, a chip, an avatar, a glyph, a count and a menu are not components a screen places: the
owner draws each from its data (a `Section` item's `facts` (a status, a chip), `leading`, `more`; a
`Toolbar`'s `chips`; a `Gate`'s `step`). How a row draws its facts is [facts](./facts.md).
