# Reads

`orpc.*.read(input)` is `queryOptions` as a `Read` handle: the same input (`skipToken` included),
the output typed, and how its failure reads as not found. For a query of your own,
`read(options, { missing, kind })` from `@fcalell/plugin-query/read` makes it:
`missing` tells the error that reads as not found (default `isNotFound`) and `kind` is `"query"`,
`"pages"` or `"stream"` ([pages and streams](./pages-and-streams.md)). A read is its own selection;
`read.at(fn)` selects from it, and `combine([a, b], fn)` (`@fcalell/ui-core/read`) selects from
several. Which region holds a read and draws its failure is
`node_modules/@fcalell/ui-core/guide/frames.md`.

```tsx
const deploy = orpc.deploys.get.read({ id });
const title = deploy.at((d) => d.commit);
const summary = combine([deploy, orpc.usage.read()], (d, u) => `${d.commit}: ${u.used}`);
<Section read={deploy} title="Steps">
  <List items={deploy.at((d) => d.steps)} row={{ key: (s) => s.id, title: (s) => s.label }} />
</Section>
```

## Selectors run over a stand-in

A selector runs over a stand-in while its reads wait, are idle or have failed with no data, so
write it plainly (`d.steps.length`, `d.name`); one that throws there paints its slot, silently, and
one that throws over real data is yours. Every key of the stand-in is the stand-in, so a walk that
follows a key while there is one (`while (n.parent) n = n.parent`) has no end over it: a run is
given 10,000 reads and throws past that, which paints the slot. Bound a walk by the data (a visited
set, a depth), or stop it on `isStandIn(n)` (`@fcalell/ui-core/read`), which also finds the list
sample a waiting row is shaped from.

A component takes a `Datum<T>`, a constant or a selection, and draws a selection it cannot answer
yet as its painted shape, and only while the read waits: a leaf whose read ended draws nothing, and
the frame that holds the read says why. Your own code never sees the stand-in:

- `useRead(selection)` (`@fcalell/plugin-query/tanstack-query`) is the value, or `undefined` while
  the read waits, is idle or failed.
- `useDraft(datum, failed)` is a field's value: it follows its selection until the viewer edits it,
  then holds the edit; a selection over another read drops the edit. A constant passes through
  unchanged. `ended` is `"failed"` or `"missing"` while the value's own read has ended: a control
  stands with no value and refuses its changes. Saving a change is on [acts and saves](./acts.md).
- A component of your own builds on `useSelections` (a leaf's subscription) and
  `useFrameRead(read, derive)` (a frame's, with a module-level `derive`), both from
  `@fcalell/ui-core/react/read`, and on `lift(value, keys)` for a constant whose props hold
  selections.

## What a frame draws

A frame draws more than the first wait of its read, all of it from the frame's `read`, so write
nothing for it: a spinner after the heading while the data stays and a refetch runs (`busy`),
"Couldn't refresh." with Retry when a refetch failed (`stale`), and "Waiting for a connection." when
the read is paused offline. A read the app has not asked for yet (`enabled: false`, `skipToken`)
paints still, as a paused one does.

A row (`Row`, a `Stats` meter) takes no `read`: given a read no frame above holds, it draws its own
failed shape (label kept, "This didn't load.", a retry icon), and given one a frame above holds,
nothing of its own. In dev a read that fails with no data while a leaf draws it and no frame holds
it raises `console.error`: give its Pane, Section, Sheet or Form `read`. A read you hold with your
own `useQuery` is not checked.

A query made with `read()` (and a channel made with `channelRead`) holds its first answer once the
paint has shown, until the paint has stood for the minimum (`QueryProvider hold`); a refetch or a
later page is never held. A query built without `read()` is not held.

**Check:** `pnpm check` passes, and the screen paints, then shows its data under `pnpm dev`.
