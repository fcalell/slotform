# Frames

A region that reads is a frame: it holds one read and draws that read's failed, missing and empty
shapes in its own place, so a screen writes no loading or error branch. The read model is
`node_modules/@slotform/query/guide/reads.md`; how a frame waits is [waiting](./waiting.md).

## A region that reads is a frame

Give a `Pane`, `Section`, `Sheet` or `Form` (or one of a form's groups) its `read`: a read
(`orpc.deploys.get.read({ id })`), a selection of one (`deploy.at((d) => d.steps)`) or a `combine`
of several. A frame holds one read: the one read of its selection that no enclosing frame holds and
that is not quiet. A Section given a selection of the read its Pane holds draws nothing of that
read's state, and a second held read in one frame is a dev error naming both keys, so a region that
draws two reads is two frames and a leaf that needs both takes `combine`.

Sibling regions that draw one read each hold it and each fail in place, while its refetch draws one
busy mark, beside the first of them; a repeated line is accepted, and a read is never lifted into a
frame around its siblings. A read held by the app's own `useQuery` is no frame's; that region draws
its states itself.

## `or` is for enrichments

`or` falls back quietly and never fails a frame: `names.or("a board")` serves a name, a badge or a
lane order. A read whose rows, options, facts or text are drawn is never `or`.

## Failed, missing, empty

A frame draws the failed shape when its read fails, "This didn't load." with Retry, whatever failed,
and takes no sentence of its own for it. It draws the missing shape when the read answers not found,
and its `empty`, a `{ sentence, act? }`, when its own read is an empty array, `null` or `undefined`
on real data. The `sentence` may be a selection of the read the frame holds, which draws once it lands
and the generic sentence until then. A frame with no read has no `empty`; the read alone decides,
never a count the app checks.

A collection (a `Section` with `items`, `Table`, `Thread`, `BarChart`, `Canvas`, `Diff`) and an
option control (a `Picker` at any fit) given a selection show their own read's state in their own
box, whatever stands above them.

## A record that is not there

A record that is not there is the `Pane`'s own `read` answering not found (the procedure throws
`NOT_FOUND`), never a Pane's or a Section's `empty`. Give the frame the read itself, not a selection
of it, so its error arrives. The `Pane` fills its page with the missing shape: the sentence, then the
way back to the page above. The place's `Pane` has no way back and says the sentence alone, and a
`Section`, `Table` or `Form` whose read answers not found says the sentence alone, since the way back
is the `Pane`'s.

Give the `Pane` a `noun` (`noun="project"`) and the sentence names the kind: "Couldn't find this
project."; without one it is "Couldn't find this.". A record that has its own words for its absence
gives `missing` (`missing="No report for that month."`), which the page says in place of the noun's
sentence; the bar still names the kind by `noun`. A record opened by an address after it was removed
then needs no screen of its own.
