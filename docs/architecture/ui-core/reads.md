# Reads

How a UI part draws data that comes from a query: the framework-free read model in
`@fcalell/ui-core`'s `read.ts`, the hooks in `react/read.ts` that leaves and frames subscribe with,
which frame holds a read and draws its failure, busy mark and stale line, what a part paints while
its data is not here (`paint.ts`), the port the hooks ask of the binding that runs the reads, and
the scope ids a route hands every query. `@fcalell/plugin-query` is the binding
([query](../plugins/query.md)); `@fcalell/plugin-react-ui` and `@fcalell/plugin-native-ui` draw the
shapes. Where a frame stands on a page is in [layout](layout.md).

## Read model

What a read is at a moment is free of any framework: both platforms derive one phase and the flags
beside it from the same few fields of a query's result, and the derivation is tested without
rendering. A result of TanStack's `useQuery` satisfies `ReadResult`, but ui-core names only the
fields it reads, so it imports neither TanStack nor React.

### Read handle

- The **read** handle is one query by its key plus how its failure reads as "not found". A
  **selection** (`Selection`) picks from one read or several. The handle is pure, so the hooks in
  `react/read.ts` and the binding that runs the reads share one core.
- A **leaf** subscribes to a selection, paints it while its reads wait, and draws it once they land.
- The binding that runs a read gets the read's query by identity: two reads with one key are one
  query. The binding adds what it runs the query with (`@fcalell/plugin-query` merges its query
  options in as `options`).

### Read kinds

How a read's query behaves (`ReadKind`):

- `query`: a plain query.
- `pages`: an infinite query of stack's paginated envelope.
- `window`: a sparse window over a total whose pages load where the viewer scrolls; its value is the
  rows loaded from the start, and `useWindow` has the rest.
- `stream`: a query that stays fetching while it writes, so fetching with data is writing, never
  busy.

### Phases

- A frame's shape (`FrameShape`) is one of: `ready`, the loaded tree with its leaves real; `waiting`,
  the loaded tree with its leaves painted; `still`, the same, painted while the root is not asked for
  or waits for a connection, so nothing is coming yet; `empty`, the answer holds nothing; `failed` and
  `missing`, the read ended. A read that answers not found is `missing`, beside `failed`.
- A waiting page is the loaded tree painted, never a second tree, so a `Section` stands whatever its
  data holds and draws its `empty` when the answer holds nothing. No Section is gated on its data's
  length and none waits on a hand-built tree; the plugins' verify check `b-wait` holds that no
  waiting tree stands beside the loaded one.
- An address no route serves is drawn by stack, with the `notFound` word ([words](words.md)).
- What a leaf draws for one value (`Drawn`) is a constant or real data as given, or a selection with
  a read still to land, whose `value` is the placeholder's and whose `phase` (`DrawnPhase`) says why:
  `waiting`, asked for with no answer; `still`, not asked for or paused with no data, so nothing is
  coming (it paints still, with no sentence); `failed` and `missing`, the read ended (the failed
  sentence, `words.missing`).
- A leaf draws its paint while its read waits or stands still (`paints`). A leaf whose read ended
  draws its loaded-empty shape instead, no line for a text and nothing for a mark; the frame that holds
  the read says why, once.

### Conversation turn states

The turn an app writes into a conversation (`TurnForm`, from `turnOf`) is `none` where nothing is
being written, `waiting` for the first chunk, `writing` while chunks arrive, `written` once it
settles, `stopped` where the stream failed (or a refresh of it did, the partial value kept), and
`failed` where it failed or went missing before any text was written (a value that is null or the
empty string is no text). Waiting, stopped and failed are the read's states, so a turn draws them
only when it holds the read; under a frame that holds it, that frame says them once and the turn draws
its value alone.

### Placeholder and selectors

- The **placeholder** is the stand-in for data not yet there, shaped by nothing. It is every key of
  itself and callable, so a selector walks it to a value and takes its default branch: comparisons
  are false, lookups miss, `new Date` is the epoch, a number formats as 0, `map` and `filter` give it
  back. Nothing is frozen on the target, since a frozen function would pin `name` and `length` against
  the proxy's traps; the traps refuse every write instead.
- A selector or `combine` function runs over the placeholder (a waiting slot picks over it, an idle or
  failed read's missing data included), so one that throws there is no bug in the data: its slot is
  the placeholder, silently. Over real data the throw is the app's.
- A selector run over the placeholder or the sample follows keys that are always there, so a walk
  that goes on while it finds one (`while (n.parent) n = n.parent`) never reaches an end. A run over
  either is given `WALK_LIMIT` (10,000) reads of them, far above what a selector reads for a record's
  shape: past it the run throws, which a guarded selector turns into the placeholder and a sample into
  none, as any other throw over a placeholder.
- A selection is never a plain object. TanStack's structural sharing (`replaceEqualDeep`, run over
  every `combine` result) rebuilds a changed plain object from its string keys, which drops
  `SELECTION`; an object on a prototype of its own passes through whole.
- `placeholderData` and `heldStandIn` are two constant functions, both returning the placeholder.
  TanStack compares a function `placeholderData` by identity between option sets, and the dev check
  reads them back off a query's observers: `placeholderData` marks an observer as a **painter** (a leaf
  that draws the read), `heldStandIn` as a **holder** (a frame, or a leaf that draws the failure
  itself).

### Read hooks

`react/read.ts` holds the hooks a leaf, a frame, a collection, a row and a control's options subscribe
to their reads with, over the binding's port ([The port](#the-port)); the model they plan with is
`read.ts`.

- A leaf makes one subscription (`useSelections`): each value that is a selection is read, the rest
  are constants. One observation covers any count of values, so the hook count is fixed. A read still
  to land draws from the placeholder and says so (`painted`). The plan is memoized by `values`'
  identity, which keeps `combine` stable (the binding re-runs it when its identity changes); the React
  Compiler gives a literal list that identity.

## Frames

A **frame** (a Pane, Section, Sheet or Form, and every collection that draws its own failure) is a
part that draws the shape of its reads. It draws from its non-quiet reads and from the value its
collection or leaf draws, painted or real; `more` says the drawn value is one page of several.

### Shape and flags

- The frame's shape comes from every non-quiet read of its own selection, held or not; a frame never
  reads its shape off a context. Busy, stale and paused come only from the read it holds, which draws
  them; a read an enclosing frame holds is drawn there.
- Only the shape, the count and the flags move the frame, never a value's change: a frame that holds
  the root renders on `busy`, `stale`, `paused` and `still`. The first read that failed
  with no data ends the frame (`failed`, or `missing` by its own `missing`), held or not. The frame
  stands still when any read is idle or paused with no data.
- `FrameState` carries the shape, the count (the length of a drawn list; undefined where none is drawn,
  while it waits or stands still, and while more pages remain), `busy` (a refetch or a retry runs), and
  `stale` and `paused` (the held read's last refetch failed, or it waits for a connection; false for a
  frame that holds none).

### Holding a read

- A frame **holds** at most one read: the first non-quiet read of its selection that no enclosing
  frame holds. The read it holds is the one whose busy mark and stale and paused line it draws, so a
  nested frame draws those only for what its ancestors do not hold. A `combine` under a read-less Pane
  holds its read; an `x.at()` under a holder of `x` holds none.
- A frame's further unheld reads are a mistake that `holdReads` names in dev by both keys: their
  failure still draws, since the shape comes from every read, but their flags do not.
- **Holds** are the query hashes the frames above hold, identity only. A frame publishes to its body
  the hashes it and the frames around it hold (`FrameHolds`). Holds place flags (which frame draws a
  read's busy mark and its stale and paused line) and change no frame's shape. A frame that holds
  nothing passes its parent's holds on, and frames over the same keys share one identity (`holdsOf`).
- Sibling frames over one read, with none enclosing another (two Sections over one read), are no
  mistake: each holds it and each draws its failed shape, but its busy mark stands once, at the first of
  them to take it in mount order (document order for siblings), passing to the next when that one
  leaves (`createFlags`: `take` returns the release, `flags` says whether a frame draws the mark of a
  read).
- A frame makes one subscription (`useFrameRead`), the same observation a leaf makes, placeholder on,
  with `derive` run in `combine`, so the frame renders when its derived state changes (shape, count,
  flags) and never on a value change. `derive` must be stable (a module function), since its identity
  is the combine's. Its observers carry `heldStandIn`, which the dev check reads. It returns
  `holds` for its body to publish, `holding` (it holds a read), `flags` (it draws that read's busy
  mark) and `retry` (refetch the read it holds).
- The pure core is `planFrame`: the frame's selection planned like a leaf's, and `combine` deriving
  the frame's state. Its `query` looks up a read's query in the cache, because a plain observer's
  result says nothing of a next page being fetched, and the query's `fetchMeta` does.

### Busy mark

A frame's busy mark stands after its heading: a spinner while a read it holds refetches or retries,
shown after `WAIT_DELAY` so a refetch the server answers at once draws nothing. Its ink is its place's,
meta by default. A frame that holds no read and a frame with no heading draw none, and of sibling
frames over one read only the first draws it, so one refetch stands as one mark.

### What a frame draws

- In place of its body a frame draws the failed, missing and empty shapes in the frame's `fit`; ready,
  waiting and still are the loaded tree, its leaves painting.
- A collection that draws its items is a frame of them, whatever stands above it: the bar chart, the
  diff, the table, the thread and the Section's sheet each draw the failed shape with Retry, the missing
  shape and the empty shape in their own box with the generic sentence (a table's or thread's `empty`
  where given), and the stale and paused line above themselves while they hold their read. A frame
  above that holds the same read unmounts the Section's sheet when the read fails and alone draws the
  failure.
- While a collection's `items` read waits it paints its loaded shape, inert: `PAINT_ROWS` rows (a
  Section's sheet as title-and-facts rows with no link, a tree drawn flat; a table's rows in the
  columns it declares, the header constant over them, each cell painted by its column's kind and the
  slots run over the placeholder; below `tablet` the list painting the same records), `PAINT_TURNS`
  in a thread (an ask of yours and the other author's reply), and for a bar chart a figure's filler as
  the total, the legend standing with its figures painted, one painted plot box at its loaded height
  with the axis's lane kept, and two fillers for the time line.
- A thread's foot and its reply stand through its failed, missing and empty shapes, so a thread whose
  items failed still sends. Its failed and missing shapes stand in the log's place; its empty shape is
  one sentence in the meta ink over its act. With `replying` set it draws one waiting Message of the
  other author after the messages, replaced in place when the reply's item arrives and `replying`
  clears; the `reply` read draws its turn after them the same way, from its own subscription.
- A Section's empty shape under a `description` is its act alone, or the word for none.
- A row, a Stats cell and a meter are the frame of the selections they draw. When one failed and no
  enclosing frame holds that read, the label stays, the value slot shows the failure mark and the
  retry icon, the line under reads `readFailed` ("This didn't load.") and a press retries. A read an
  enclosing frame holds draws nothing of its own there. A failed row's end draws the retry icon in its
  own square, a spinner in its place once the retry has run `timings.actDelay`, so a retry the server
  answers at once never flashes one. A meter whose `value` or `bound` read ended stands empty (no
  share, no fill) in the same box.

## Missing and failed shapes

- Every empty `Pane`, `Section` and collection, a failed read and a missing one draw the same empty
  state: the sentence and the act. Its shape depends on the drawer that stands it (`fit`): a Pane's
  `page`, centred in what the body leaves, or a Section's or a collection's `frame`, a hairline frame
  (a collection's is one quiet sentence when only that is given). `fit` and `tone` are the drawers'
  alone and stay outside the plugins' exports. A Pane's missing shape is in
  [layout](layout.md#body).
- On the web, the failed shape and the missing shape of a Pane with no title are the heading that names
  the Pane, as the Pane's `h2`: the title of a record that is not there never lands, and a Pane's
  failed read fails its title's read with it. The missing shape offers the Pane's way back.
- The empty shape's sentence may be a read of its own (a selection of what the frame holds), subscribed
  in the empty shape and only there. A frame whose read failed has no such observer: one would mount on
  the failed read again each time the body changes shape and retry it, so the failed shape would never
  settle. The generic sentence stands until the selection lands.

## Failed, stale and paused lines

- Under a frame's heading row, a held read with data it could not refresh draws the stale line, with
  Retry (pending while it runs); one that waits for a connection draws the paused line, with nothing to
  press.
- Under a control whose options have ended stands the failed sentence with Retry, or `words.missing`;
  nothing stands while they wait, stand still or answered.

## Paging

A paginated procedure's `.pages(input)` read gives a collection its more row. A collection's last
row over a read that pages (a `pages` read, or a `window` read, whose rows load from the start) is
its **more row**: "Show more" while a next page remains, pressed by the viewer and
never by scrolling; the painted rows while it loads; "Couldn't load more" with Retry when it failed.
An empty first page that has more is not empty: the next page is fetched at once. Only the more row
renders on the next page's fetch; the frame is not busy then, and it draws no count while more
remains.

## Paint

**Paint** is what a part draws while its data is not here. `paint.ts` holds it free of any framework
(the filler text a slot paints, how many rows a collection paints, how long a read runs before the
paint shows), and both platforms run it, so a painted shape measures the same everywhere and the same
filler comes back for the same slot.

### Paint shapes

A part paints in one of three shapes (`variant-tables.ts`):

- `glyphs`: the filler the part would hold, filled: a text, figure or id slot's own line boxes, the
  ink transparent;
- `box`: the part's own box with its content not drawn (a mark or a block);
- `control`: a control's own box with its content invisible and the control inert.

Each component paints its own box, so the painted shape measures as the loaded one. A row slot run over
a painted item that throws on the filler (it reads a field the filler does not have) paints as the
item itself and never throws the page; the Table's rows go through it (`painting`).

### Timing

- `WAIT_DELAY` is how long a read runs before its paint shows (400 ms): a read the local server
  answers in a few milliseconds paints nothing. `ACT_DELAY` is how long an act runs before its pending
  look shows (300 ms), and `waitMin` how long a shown paint stays at least (0 ms). They are no
  consumer option, so an app has one rhythm for every paint; each is a motion knob
  ([motion](motion.md)) whose default `tokens.ts` holds and the tuning bench moves live (`timings`
  reads them).
- A first load's data waits a little longer (`paintWait`) when it comes `elapsed` ms after the fetch
  began: nothing while the paint has not shown, else until the paint has stood for `waitMin`.
  `QueryProvider`'s `hold` takes it.
- On the web a paint fades in after `--wait-delay` and then breathes on its fill's alpha. On the phone
  a painted part's opacity is the fade-in after `tuned.waitDelay` times the page's breath; the delay
  holds under reduced motion and the fade snaps. What follows the same delay without being painted (a
  busy mark) asks whether a paint shows yet (`timings.waitDelay`, an act's `timings.actDelay`), one
  timer only while painted.

### One breath

Every painted fill breathes in one phase, so a page breathes as one surface and never as a ripple of
parts out of step.

- On the web each painted fill starts its `pulse-fill` animation when it mounts, so fills mounted a
  moment apart would breathe out of step. Every pulse animation takes the document timeline's zero as
  its start, so its phase is the timeline's and all fills share one (`PULSE` in `globals.css`). A
  listener at the document in the capture phase sees every animation as it starts, whatever mounted
  it, with nothing per fill; the module evaluates once, so any page that can paint is aligned.
- On the phone the page's one breath is a share of the fill, 1 at its full and 0 at its low, turning
  over `tuned.pulse` on `in-out`. Every painted part reads this one value. It starts with the first
  painted part and restarts when the tuning page moves the knob or the system's reduced motion
  changes; it stands at full under reduced motion.
- A phone painted part is its host with the fill and the breath on its opacity: the part draws nothing
  but the fill while painted, so the box's opacity is the fill's alpha. The host that is not painted is
  the plain one, so a loaded list pays for no animated view. The root `Text` of a slot that holds
  `Painted` fillers fades in and breathes so the fillers inside breathe with it (nested text takes no
  opacity of its own).

### Waiting paint

- A role's waiting slot either pulses or is scrambled (`scrambled`): its kind's paint is the scramble
  and its slot is one line (a wrapping one always pulses). A part that is scrambled does not breathe,
  since its glyphs would dim; it only fades in. The platforms still their scramble under reduced
  motion.
- Which paint each glyph slot's waiting shape takes is module state (`loading`), set from
  `theme.loading` as the app starts (omitted, all pulse) and live by the bench, and read by every
  painted slot through `scrambled`.
- A figure or id of a read is one slot instance across the switch from its filler to its `text`, so it
  knows whether it waited: when the paint stood for `waitDelay` and the theme scrambles its kind, the
  text decodes as it arrives (otherwise it lands at once), and it rolls when `of`, its number, changes
  while shown. The layout is the loaded one from the first frame: the decode is paint alone.

## Clock

What a clock-read part draws (a `Banner`'s pending run with `until`, an age) is a function of its
times and now (epoch milliseconds) in `clock.ts`, so both platforms read one answer. Each plugin ticks
`now` from one shared coarse clock (`createClock`).

## Scope ids

- The URL names a route's scope by slug; the boundary that resolves it registers the ids
  (`ScopeBoundary` in `react/scope.ts`), and the binding's query utils merge them into the input of
  every call before the query key is built (`{ ...ids, ...input }`, an explicit id wins). The id stays
  in the key, so two scopes never share a cache entry.
- A layout puts the boundary where it has resolved the slug:
  `<ScopeBoundary ids={{ organizationId: organization.id }}>`, and under a project
  `{ projectId: project.id }`, which extends the outer ids.
- The registration is set while the boundary renders, because its children read the ids in their own
  render (a query key is built there), before any effect runs. It is set again on mount at the
  boundary's depth, so an outer boundary's effect, which runs after the inner's, never puts its own ids
  over them. On unmount the boundary releases its ids and the outer boundary's return.
- `scope.ts` imports no React: a client bundle holds one copy of the module, reached by package name.

## Sort

A read's sort reads one part of `.stack/schema.ts` (`SortSchema`): each procedure by dotted path with
its input as JSON Schema, whose `sort` property names the columns a procedure that declares `sort`
takes.

## The port

- The **port** (`ReadPort`) is what the read hooks and the components ask of the binding that runs
  the reads (`@fcalell/plugin-query`), which provides it around the app (`PortProvider`). The members
  that observe are hooks themselves, called at the hook's top level in a fixed order; the others are
  plain calls. There is one port per provider, its identity stable for the provider's life.
- With no provider above, the context's default answers: plain values draw, an act runs as it is and
  its failure reads as the generic sentence, and a member handed a read, a procedure or an ability
  throws naming the binding. There is no cache to warm.
- The query client's online and focus managers listen to `QueryListeners`, given by a UI plugin whose
  platform has no window events (the phone: the network and the app's foreground). Each listener
  takes the manager's setter and returns its cleanup. The phone wires TanStack's managers this way:
  `QueryProvider`'s `listen` takes `online` and `focus`, a `QueryListeners` from
  `@fcalell/ui-core/listen`.

## Dev checks

Dev checks read the query cache's own observers: a leaf that draws a read is an observer whose
`placeholderData` is `placeholderData`, and a frame (or a leaf that draws the failure itself) one whose
is `heldStandIn`. The checks run behind `dev()`; the bundler inlines `process.env.NODE_ENV`, so a
production build drops them.

## In the code

- `packages/ui-core/src/read.ts`: the read model, phases, frame state, turns, the placeholder, `planFrame`, holds, marks and dev checks.
- `packages/ui-core/src/react/read.ts`: the leaf, frame, collection, row and options hooks, `FrameHolds`.
- `packages/ui-core/src/react/port.ts`: `ReadPort`, `PortProvider` and the default port.
- `packages/ui-core/src/paint.ts`: fillers, `PAINT_ROWS`, `PAINT_TURNS`, the waits, `paintWait`, `loading` and `scrambled`.
- `packages/ui-core/src/variant-tables.ts`: the three paint shapes.
- `packages/ui-core/src/tokens.ts`: the defaults of the three waits.
- `packages/ui-core/src/list-state.ts`: the Table's rows over painted items.
- `packages/ui-core/src/clock.ts`: clock-read answers and `createClock`.
- `packages/ui-core/src/scope.ts`: the ambient scope registry.
- `packages/ui-core/src/react/scope.ts`: `ScopeBoundary`.
- `packages/ui-core/src/listen.ts`: `QueryListeners`.
- `plugins/query/src/listen.ts`: the binding's use of `QueryListeners`.
- `plugins/react-ui/src/ui/lib/paint.tsx`: the web paint and its one phase.
- `plugins/react-ui/src/ui/lib/read.tsx`: the web failed shape as a Pane's heading.
- `plugins/react-ui/src/ui/lib/empty.tsx`: the web missing shape as a Pane's heading.
- `plugins/native-ui/src/ui/lib/read.tsx`: the phone frame body, failed row end, empty shape, busy mark and the failed, stale and paused lines.
- `plugins/native-ui/src/ui/lib/empty.tsx`: the phone empty state and its `fit`.
- `plugins/native-ui/src/ui/lib/more.tsx`: the more row.
- `plugins/native-ui/src/ui/lib/paint.tsx`: painted hosts, the paint delay, painted text roots.
- `plugins/native-ui/src/ui/lib/motion.ts`: the page's breath and a painted part's style.
- `plugins/native-ui/src/ui/lib/slot.tsx`: a figure or id slot across paint and text.
- `plugins/native-ui/src/ui/components/`: the frames of their items (`bar-chart`, `diff`, `table`, `thread`, `section`, `stats`, and `parts/stats/meter.tsx`).
