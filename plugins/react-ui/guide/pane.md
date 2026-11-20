# Pane

One column of a place, of two kinds, one of each at most: the place's own, titled by the place's name, and a record's after it, titled by the record's name (`node_modules/@slotform/ui-core/guide/places.md#two-kinds-of-pane`). This page is what a `Pane` takes, its record's head, its body and its foot; its bar is [pane-bar](./pane-bar.md), and the `Panes` that hold it are [shell](./shell.md#panes).

| Prop | Is |
| --- | --- |
| `title` | the record's name, a short phrase or a selection of its read, on a record's Pane; the place's Pane takes none, the place's name titles it |
| `record` | `{ overline, facts, description, image }`, the record's head, given with `title` |
| `noun` | the record's kind ("project"), for "Couldn't find this project." and the failed bar's name |
| `missing` | the sentence in place of the one `noun` words, when the read answers not found |
| `acts` | icon acts (`IconAct`, `IconLinkAct`) in the bar, the one used most first |
| `more` | the acts past them, in the bar's menu |
| `context` | a `Picker`'s props but `fit`, for a page read in a context the viewer picks (Live, a change set, a version), drawn as a pill after the title |
| `state` | the context's tone, a dot before the pick's label: `active` for Live, `attention` for a draft, `idle` for a version |
| `foot` | what docks under the body, the body scrolling under it |
| `sheet` | a task that docks in the foot's place while it is `open`; closing hands focus back to the foot's input |
| `read` | the frame's read (`node_modules/@slotform/ui-core/guide/frames.md`) |
| `empty` | what the page says when the `read` is empty, in place of the body; given only with `read` |
| `fill` | the body's one child is a filler, a `Thread` or a `Canvas`, that takes the free height |
| `children` | the Pane's sections, a sections gap apart |

```tsx
<Pane title={deploy.at((d) => d.commit)} record={head} noun="deploy">…</Pane>
```

## The record's head

The body opens with the record's name, whole and wrapping, between `overline` (the parts that place it, joined by a middle dot; never a place of the trail, which the bar holds) and `facts`, a `RecordFact` list (`node_modules/@slotform/ui-core/guide/facts.md#a-record-heads-facts`); the `description` stands as plain text under them, and the `image` (`{ src, alt }`: a person's photo, a product shot) is a square tile beside all of it at the top, painted while its `src` is a read, an `ImageOff` glyph where it failed or the address is empty. The overline is one text line cut with an ellipsis at its end; on touch the trail leads it, cut at its own start so the nearest place shows.

## The body

The body is a two-column grid: every `Section` and `Form` in it passes the columns down to its rows, so the labelled rows of one Pane share one label column, as wide as the widest label up to one short measure, past which a long label wraps at its words inside the column. The value column keeps a short measure at least, so a pick keeps its words; a labelled value with a description beside a pick or a switch keeps the description at the short measure, and stands the control under it at the line's end where both do not fit. A definition row and a form field stand label over value in a Pane narrower than `definitionsOneRow` (two short measures, the stack gap and the page inset: about 340 to 360 px at the default size), and label beside value from that width; the Pane's width decides, never the pointer. With `fill` the body is a flex column that gives the filler the free height, and its Sections keep their own label columns.

Width follows content: a `Table`, a line `Diff`, a code block, a `Canvas`, a `BarChart`, `Columns` and a `Gallery` mark themselves `data-wide` and span the body, while definition rows, forms and prose keep the reading width. Widths are voice decision 17 (`node_modules/@slotform/ui-core/guide/voice.md`).

A Pane with no `empty` leaves its empty read to its Sections, which draw their own. A record that is not there is `node_modules/@slotform/ui-core/guide/frames.md#a-record-that-is-not-there`; on the web its missing shape is an empty's one form, the sentence in the meta ink over the way back as an outlined button, both centred. The page for an unknown address is a record's Pane titled "Not found"; under a record's Pane it is that Pane's body, the missing sentence.

## The foot

The route gives the foot, so the Pane decides it from its props and nothing in its body hands anything up. A `Table`'s chosen bar is an `ActionBar` with `chosen` ([acts](./acts.md#the-chosen-bar)). A `Thread` that fills its Pane stands its composer at the foot itself; one standing among a Pane's sections keeps its composer under its log, and where the field should stay in reach however long the list (on touch, above the tab bar) the route gives the Pane the composer as its `foot` (`<Composer {...composer} />`) and the docked sheet as its `sheet`, and the `Thread` neither:

```tsx
const touch = useTouch();

<Pane title="Now" foot={touch ? <Composer {...composer} /> : undefined} sheet={touch ? question : undefined}>
  <Section title="Ask"><Thread items={lines} message={message} composer={touch ? undefined : composer} sheet={touch ? undefined : question} /></Section>
</Pane>
```

A docked `sheet` takes the foot over while it is open.
