# Thread

A conversation: `items` drawn through `message`, over a `composer`. This page is what a phone
`Thread` takes, its messages' regions and how its composer attaches files; where its input docks is
`panes.md`, "A docked foot and a sheet".

## How it stands

Given a selection it paints two turns until its read lands (`PAINT_TURNS`); its failed and missing shapes stand in the log's place, and its composer and reply stand through each. In a `Pane`'s body it takes the free height, its log scrolls and its input docks at its foot; among sections it stands at its content's height. It stands as the body's direct child, never inside a wrapper of the app's that is no flex column, and a part above it (a `Banner`, a `Section`) is its sibling, a section from it.

| Prop | Is |
| --- | --- |
| `message` | regions each reading only its item: `key`, `author` (`you`, `other`, `system`), `name`, `body`, `at`, `attachments`, `from`, `streaming`, `onOpen`, `detail` |
| `composer` | `value`, `onChange`, `attachments`, `onAttach`, `onDetach`, `placeholder`, `notice`, `working`, `onSend`, `onStop`, `disabled`; Send and Stop are icon acts, so the field keeps its width beside the paperclip |
| `sheet` | a `Sheet`'s props, docked in the input's place while `open`; closing it returns focus to the input. A `Pane`'s `foot` takes the input on its own, a `Composer` with the same props |
| `replying` | a reply the app does not stream is on its way: the log ends on one waiting message of the other author; clear it in the render that adds the reply's item |
| `reply` | the turn being written, a stream read the app declares (`node_modules/@fcalell/plugin-query/guide/pages-and-streams.md`) |
| `empty` | one sentence in the meta ink over the act that makes the first message |

| Message region | Is |
| --- | --- |
| `from` | where a `you` or `other` message came from (`"via email"`, `"Front desk"`), before its time: a text line, a middle dot between the parts, never badges |
| `attachments` | `Attachment`s, `{ id, name, src? }`: an image draws as a thumbnail, a file as a chip |
| `streaming` | an `other` reply still growing: a marker left open at its end (an emphasis, a strong run, a code span, a link, a fence) draws in its own form from its first character; a finished reply leaves an unmatched marker as text |
| `detail` | under a system line, exactly one of `row` (a row item's fields, its `title` a `Run`, in a hairline card opening its record, its `facts` badges), `code` (a free act's code under its verb) or `fold` (lines the line opens in place); never a row or a `Code` between the messages |

The `reply` draws after the items from its own subscription: waiting for the first chunk it is one waiting message, then the message with `streaming` set, then the message. A stream that fails after some text keeps the partial message and says "The reply stopped." with Retry; one that fails before any text says "This didn't load." with Retry, which runs the stream again. It steps aside once the last item has its key, and `null`, `undefined` and the empty string are no turn.

The composer's `onAttach` hears `PickedFile`s: the paperclip opens the photo library or the files. A paste brings nothing, since React Native's `TextInput` hands over no pasted image. Turn each file into an `Attachment` and pass it back through `attachments`; a picked file's `src` is the asset's uri, set on every file the photo library and the file picker hand over, a local address to draw it from before it is uploaded, so nothing needs revoking.

```tsx
<Pane title="Chat">
  <Thread
    items={log}
    message={{ key: (m) => m.id, author: (m) => m.who, body: (m) => m.text }}
    composer={{ value: draft, onChange: setDraft, onSend: send }}
  />
</Pane>
```
