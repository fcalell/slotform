# Content: toolbars, rules and threads

The `Toolbar` over a list, `Rules` and a `Thread`. Each takes its data as props and, given a selection, is the frame of its own read. A `Section` of rows is [section](./section.md), a `Table` [table](./table.md), the drags between them [drag](./drag.md), and the parts that read as a block [blocks](./blocks.md). This page is what each takes.

## Toolbar

The strip over a list.

- `tabs`: `{ label, href }` views, the one the location selects marked.
- `search`: `{ value, onChange, placeholder? }`. Absent, the strip has none.
- `filters`: a `Picker`'s own props (`label`, `options`, `value`, `onChange`; an array `value` picks several). Two or fewer stand beside the acts on the desktop; three or more fold behind one Filters act that counts those set; on touch every filter folds.
- `chips`: `{ label, family, onRemove }`, the applied filters of the app's own, in a row under the strip.
- `children`: the acts at the bar fit, never a filled act: the create act is the page's.

## Rules

Rows of inline terms. `rules` is a list of `{ id, terms, onRemove? }` with `terms` a pair (`from`, `to`) or a condition (`field`, `operator`, `value`); `add` is the act that ends the list.

## Thread

A conversation: `items` drawn through `message`, over a `composer`.

- `message`: regions each reading only its item: `key`, `author`, `name`, `body`, `at`, `attachments`, `from`, `streaming`, `onOpen`, `detail`.
- `composer`: `value`, `onChange`, `attachments`, `onAttach`, `onDetach`, `placeholder`, `notice`, `working`, `onSend`, `onStop`, `disabled`. An attached image's file carries `src`, an object URL to draw it from before it is uploaded; it stays until you revoke it (`URL.revokeObjectURL(file.src)`) once you drop the attachment. A `file` `Input`'s file carries no `src`.
- `sheet`: docks in the input's place.
- `replying`: a reply from the other author is on its way; the loaded log ends on a waiting message of theirs until it is cleared.
- `reply`: the turn being written, a stream the app declares (`node_modules/@slotform/query/guide/pages-and-streams.md`). It draws after the items and steps aside once the last item has its key.
- `empty`: the sentence, and the act that makes the first message.

```tsx
<Pane title="Chat" fill>
  <Thread
    items={log}
    message={{ key: (m) => m.id, author: (m) => m.who, body: (m) => m.text }}
    composer={{ value: draft, onChange: setDraft, onSend: send }}
  />
</Pane>
```

Where the composer docks in a `Pane`'s foot: [pane](./pane.md#the-foot).
