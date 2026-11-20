# Rows

A collection takes its rows as data: a `Section`'s `items` are `Row`s built from the records by one
`toRow` function, and nothing public draws a single row. `Row`, `RowItem`, `FileItem` and `Lock` are
`@slotform/ui-core/descriptors`; each platform's `components/section` exports `Row` widened to its
`Datum`s. What a row says of itself is [facts](./facts.md); how a platform lays a row out is its own guide:
the web's `section.md`, the phone's `node_modules/@slotform/native-ui/guide/rows.md`.

## Collections take data

Give `items` the selection mapped to rows, or an array for a constant collection. A titled `Section`
stands over its sheet, an untitled one is the sheet alone. A row is a row item or a file (a
`FileItem`, told by `"path" in row`). One `RowItem` shape is every row: it draws whichever regions it
fills, on one box.

```tsx
const toRow = (member: Member): Row => ({
  key: member.id,
  leading: { avatar: { name: member.name } },
  title: member.name,
  facts: [member.role],
  href: memberRoute(member.id),
});

<Section title="Members" items={members.at((rows) => rows.map(toRow))} />
```

A row with a `label` is a fact of the record, `{ label, title }`: the label in the meta ink in a
column as wide as the widest label of the Pane, the title its value, its `facts` the words under it.
So a record's facts are one `Section` of labelled rows. Give `wrap` where the value must stand whole;
a `{ code, copy: true }` title always does. A part that is no row (a `Slider`) stands in a `Card`.

## A row's fields

The platform widens `title`, `switch`, `pick`, `act` and `more` to its `Datum`s, so each may be a
selection.

| Field | Is |
| --- | --- |
| `key` | the row's React key, unique across the sheet, a tree's children included; the label's text, then the title's, when none is given, so a row whose title is no words (a selection, a status) gives its own |
| `change` | where the row stands in a change set (`added`, `changed`, `removed`, `unchanged`, `stale`): its mark at the row's start. Mark every row of a set, the untouched ones `unchanged`, so the titles line up |
| `label` | what the row is, in the aligned label column (a short phrase, or `{ code }` for a machine name): the row is a fact of the record |
| `leading` | the row's leading mark: `{ icon }`, a `StatusMark`, `{ avatar: { name, src? } }`, `{ mark, family, label? }` (a type's mark) or `{ check: { checked, onChange, blocked? } }` (a tick) |
| `title` | what the row names (`RowTitle`), truncating unless `wrap`: words or runs (a `{ code }` run bare in the mono, a `{ quoted }` run in typographic quotes, a `{ strong }` run at 500); `{ code, copy: true }`, a copyable identifier in the mono with its copy act; `{ absent }`, the word for no value ("None", "Any") in the meta ink; or a `StatusMark`, its tone's mark and word plain at the title's start |
| `facts` | what the row says of itself, one badge each ([facts](./facts.md)) |
| `line` | the one sentence under the title, runs that wrap whole |
| `trailing` | a value in the end group: `{ age, beside? }` (an ISO moment, worded short and ticking; `beside` a short value beside it, a size or a cost, whole or gone with it), `{ count }` or `{ value }` (a word, whole or gone on the web, whole on the phone) |
| `lock` | why the row cannot change here, a phrase or `{ reason, href }` ([the lock](./facts.md#the-lock)) |
| `entry` | `{ label, field, placeholder?, act, error? }`: an input and its act under the title, in the facts' place; give `facts` back once the act settles |
| `steps` | the steps of the work the row's act pends on, a `StatusMark` a line |
| `progress` | `{ value, max }`: a running task's bar ([progress](#a-running-tasks-progress)) |
| `dim` | the row stands off a highlighted path: its title in the meta ink, still a hit |
| `wrap` | the title is read whole: it wraps instead of truncating |
| `switch` | `{ checked, onChange }`: a setting that changes the row's fact in place, named by the label |
| `pick` | an `OptionPick` but `act`: a pick in the end group that applies at once |
| `act` | the row's one icon act at its end, an `IconAct` or an `IconLinkAct` ([links](./links.md#icon-acts)) |
| `more` | the row's other acts, in a menu after `act` |
| `href` | where the row goes when opened; the row is current at it and every address below it |
| `selected` | whether the row is current whatever its `href`: `true` for the open record, `false` for a second row of the same address |
| `onOpen` | opens what the row names |
| `drag` | `{ kind, picked }`: what a drag of the row carries, where the platform drags |
| `drop` | the drop the row is: what a drag it accepts does when released on it |
| `children` | the rows under it, which make the sheet a tree, one level in and folded by its fold act |
| `counted` | whether the head counts it: absent, a top-level row counts and a nested one does not; `false` for a top-level row that is no item (an add row), `true` for a nested row that is an item |
| `group` | the `key` of the Section's `groups` band it stands in |

| Shape | Fields |
| --- | --- |
| a band of `groups` | `{ key, label, act? }`, its `act` an icon act at its end |
| `FileItem`, a changed file of a review | `{ key, path, added, removed, seen?, change?, chip?, href?, onOpen? }`: its path, its line counts, whether the reviewer has seen it |

## A value is no list

A field that holds one thing (a unit, a file) is a value, no list: give its `Section` the row alone,
`items={toRow(unit)}`, not in an array, and its head draws no count. The count beside a titled
`Section`'s title is its loaded rows' and is a list's: a `Section` whose body is `children` (cards,
controls), or whose every row has a `label` (facts, a definition list), draws none, whatever its
`read` holds.

## One leading kind per sheet

The rows of one sheet share one `leading` kind or none, so their titles share one start: an avatar, a
glyph, a type's mark and a tick stand in one region at the avatar's size, a status in its dot's
space, and a row with no `leading` reserves none, so its title stands where the others' marks do.

A `leading: { tone }` draws the dot alone, its `label` its accessible name; a list whose rows say the
state nowhere else gives it as a status fact too. It is for a list whose every row has a state. Where
only some do (a read-only value among switches), the state is a status fact of the row, leading its
facts, and the leading is a kind every row has (a glyph) or none.

## A running task's progress

A row that shows a running task gives its `progress`, `{ value, max }`: the meter's bar as the last line of
the row's text column, starting at the text and never under the leading mark. It fills in the meta
ink and turns the good tone once `value` reaches `max`, never amber. The
bar takes no press, so the row's hit stays whole. Give it from the item's selector, so each refetch
moves the bar; a `max` of 0 or under draws none.

## The app's `ui/`

A shape that needs the app's nouns (`ProjectRow`, taking a `project`) lives in the app's `ui/`,
composes roster components only, never a host element with a look, and reads no data.
