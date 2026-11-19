# Facts

What a row or a record's head says of itself is one list, `facts`, each element one fact drawn as one
badge; a sentence is the row's `line`, never a fact. `Fact` and `RecordFact` are
`@fcalell/ui-core/descriptors`; the row that holds them is [rows](./rows.md).

## A fact is a badge, a sentence is text

A row's `facts` stand in the order given, each one fact:

| Fact | Its badge |
| --- | --- |
| words: a string or a run | the text; a middle dot inside it is text, never a separator |
| a status, `{ tone, label? }` | its tone's mark and its word; the first leads the badges |
| what is wrong, `{ warning }` | the warn glyph and its phrase |
| a chip, `{ family, label }` | its family's dot (none for neutral) and its value |
| a ring, `{ ring, label }` | the outlined circle with a filled centre (never a chip's solid dot) and its label; a ring that does not hold draws nothing |
| a flag, `{ flag, label }` | its glyph and its label, given only while it holds |

Each badge is a box that never breaks inside, a `badge` gap from the next across and down with no
separator between them, whole badges wrapping to the next line. Only a glyph carries colour; the
badge's words stay in the meta ink. A badge too long for its line is cut with an ellipsis inside it,
its full text the accessible name. Give the status first, then a warning, then the rest, and give no
fact that only restates the row's glyph (a status of the same tone as its `leading`, a flag of what
the row's icon already says).

A cut fact cannot be read on touch, where no tooltip reveals the rest, so anything a viewer must read
to its end is a `line` or a `wrap` title, and a fact is a word, a count, an age or a short phrase.
**A sentence goes in the row's `line`, never in `facts`**: a remedy, a schedule, an error, what a
setting does. `line` is one text (`Run | Runs`, so it holds a `{ code }` or a `{ strong }` run) after
the badges, in the meta ink at the meta role, wrapping whole at every width, so a row with a `line`
is at least two lines; an empty `line` draws nothing.

A lone `{ code }` fact is no badge: it is the row's value, bare in the mono, cut in its middle on one
line and whole where the facts stand under the title. A row's `title` that is a status is its tone's
mark and word, plain, never a pill.

## Quiet marks

A ring or a flag with `words: false` is no badge: its glyph stands alone in the row's end group, ahead
of the trailing value, its `label` the accessible name and, on a pointer, the tooltip. A quiet fact
(where the content came from, a kind) so takes no line at any width, and a press on its glyph
reaches the row.

## The lock

`lock` names why a row cannot change here (a short phrase, or `{ reason, href }`): a badge right after
the status, its glyph and its reason, a link with an `href` and inert without one. A locked row takes
no act or open, and its switch stands disabled. It stays a prop, never a fact, because it changes what
the row does.

## A record head's facts

A record head's `facts` are a `RecordFact`: the facts a row's list holds (`Fact`) and what only a head
acts on.

| Head fact | Draws |
| --- | --- |
| `{ label, onOpen }` | its own control pill, since it acts: it opens a sheet |
| `{ label, href }` | a linked badge, no chevron |
| `{ pick }` | its own control pill, since it acts (a status that moves) |
| `{ count, label }` | one badge, the figure beside its word |

The pills stand at the badge's height, their hit boxes reaching the target past the line, so the
facts line is one height whichever kinds of fact a head holds, waiting or loaded. A mark with
`words: false` stands at the end of the name's first line, as a row's stands in its end group, and
takes no place in the facts line; a head with no name keeps it in the facts line. A `{ code }` run in a
head's fact is the mono inside its badge.

The head's overline is a text line, never facts: one line, its parts a middle dot apart, cut with an
ellipsis at its end.
