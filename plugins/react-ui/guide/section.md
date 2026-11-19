# Section

A titled stretch of a page, over its rows (`items`) or its parts (`children`): what a `Section` takes
and how its rows draw. What a row carries is `node_modules/@fcalell/ui-core/guide/rows.md`.

| Prop | Is |
| --- | --- |
| `title` | a short phrase, or a selection of the read the section holds; a Section with `items` and no `title` is the sheet alone |
| `description` | a sentence under the title |
| `folded` | makes the title fold the body, and is the initial fold (`true` starts folded, `false` open; later changes are not read); the title stays the heading size folded or not |
| `onToggle` | hears whether it is now open |
| `act`, `more` | the head's one icon act and its other acts in a menu; a foldable section's `more` does not fold it |
| `items` | the sheet's rows, `Row`s (`node_modules/@fcalell/ui-core/guide/rows.md#a-rows-fields`), a constant or a selection |
| `groups` | the bands over them, `{ key, label, act? }`, a row's `group` naming a band's `key`; a constant or a selection |
| `reorder` | lets the rows be moved ([drag, drop and reorder](./drag.md)) |
| `read` | the read of a Section over parts (`children`); a Section with `items` frames its own selections and takes none |
| `empty` | what it says when empty, `{ sentence, act? }`: the sentence in the meta ink over its act as an outlined button (a `LinkAct` too), both centred; a Section with a `description` takes an `empty` of its `act` alone |

`Row` is `import type { Row } from "@fcalell/plugin-react-ui/components/section"`. A `Section` never stands in a `Section`, and its title is one size (the heading) everywhere, a sheet's body and a fold included.

A `Section` with `items` is a frame of its rows' reads: `items` and `groups` each take a constant or a selection, so the sheet paints until they land and a failure of either stands once in the sheet's place. A second read the rows depend on is the `Pane`'s or an enclosing frame's (`node_modules/@fcalell/ui-core/guide/frames.md`). A row's `pick` whose `options` are a selection of another read paints blocked while the options wait or after they failed, and the sheet says "This didn't load" with Retry once, over the rows.

## How a row draws

The badges follow the title on its line where the row is one line, without wrapping, the last one that does not fit cut with an ellipsis, and stand under the title where it is two (on touch, wherever the row has a status, a warning, a lock, a chip or a mark with words, and a row with only words below the row's one-line width); under a `wrap` title they wrap freely. A cut badge shows the cut text in a tooltip on a pointer, and a fact that is one `{ code }` run among others is cut in its middle with its tail whole. In a room place, a row whose only mark is a status keeps it at the end group's start after the words. A blocked tick's reason is the first badge, plain.

`title: { code, copy: true }` is a copyable identifier, cut in its middle where it is too long for its space; with `wrap`, and in a fact whose `label` stands before it, it stands whole on as many lines as it takes, at a path's or URL's separators first, then anywhere. A lone `{ code }` fact, where the facts stand under the title, wraps whole at a path's slashes first, so a long path keeps its file's extension.

A Section over a tree counts its top-level rows; `counted` says otherwise for one row.
