# Frames on the phone

How the phone draws a frame's missing, failed and empty shapes, a leaf's own selection, and an
address no route serves. What a frame is, and a record that is not there, is
`node_modules/@fcalell/ui-core/guide/frames.md`.

## Missing, failed and empty

On the phone the missing shape is the sentence in the meta ink in a hairline frame, then Back to the
page above as the hairline act with no plus. A failed `Pane` is the whole page with Retry as its one
act, and a missing one with its way back: its bar draws none of its `acts` and no more menu, but its
foot and docked sheet stand, since they answer to their own reads.

A `Pane`'s `empty` centres in what the body leaves, its act the filled one with the plus; a
`Section`'s always stands in a hairline frame, so it never reads as part of the head: the sentence at
the meta role, then the act, the hairline one. A `Section` with a `description` draws no sentence of
its own (its `empty` is typed `{ act }`): its frame reads the word for none ("None"), or holds the
act alone. A collection of its own read draws its own, generic one ("Nothing here yet."). There is no
`EmptyState` component to place. An `empty`'s act is the create act.

## Every leaf paints on its own selection

A `Slider`, a row, a form field's control, a `Prose`, a `Code`, a `Diff`, a `Thread` and a `Stats`
cell take a constant or a selection of the read. A text or mark leaf whose read ended draws its
loaded-empty shape, no line for a text and nothing for a mark, and the frame that holds the read says
why, once. A part of your own draws as it is: read what it needs with `useRead(selection)`, which is
`undefined` while the read waits. A control's value follows its selection until the viewer edits it
(`useDraft`), so typed text outlives a refetch. A control whose value's read ended stands in its box
with no value and is blocked like an ended act: a press or a keystroke changes nothing and says the
failed sentence (`words.missing` when missing) where that control says a refused save; a `Picker`
opens no list.

A row is the frame of the selections it draws, as a collection is its items' (a `Stats` cell is
`blocks.md`, "Stats"): when one failed and no frame above holds that read, a failed row keeps its
label, shows the failure mark and the retry icon in its end group, says "This didn't load." in the
facts' place, and loses its title; pressing it retries. Two unheld reads in one row are a dev
`console.error` (give the second `.or(fallback)` when it only names). A parts line (a record head's
`overline`, a message's `from`, a row's `facts`) drops a loaded part with no text before it joins, so
no separator dangles, and a line whose parts are all empty is not drawn.

## An address no route serves

It needs no route of yours: `stack generate` writes `+not-found.tsx` into the routes directory when
it holds none, a one-line re-export of stack's page, "Not found" with "Nothing is at this address."
(the `notFound` and `nowhere` words). It stands where expo-router stands the route, inside the root
layout: a `Pane` under a `Shell` whose act goes to the Shell's first place that is a route, a `Gate`
with Back to `/` under a layout with none. A `+not-found.tsx` of your own wins and is never
rewritten; to own the page, replace the file's contents with a default export composing a `Pane`
titled "Not found".
