# Acts and saves

An act's `onAct` returns the promise of the work it starts, and the host that draws the act holds
the attempt and draws its rejection (`node_modules/@slotform/ui-core/guide/acts.md`). This page is
the query side: the mutation's promise, the refusal's sentence, and a value that saves as it changes.

```tsx
const create = useMutation(orpc.projects.create.mutationOptions());
const add = {
  label: "Add",
  onAct: () => create.mutateAsync({ name }),
};
```

- Return `mutateAsync`'s promise, never `mutate()`, and `.catch` nothing. `retries(error)` decides
  the toast's Retry: a refusal the server answered and an out connection (`Unreached`) have none.
- The sentence is `refusal(error)` from `@slotform/query/acts`, else the generic one.
  `refusal` is an `ORPCError`'s own message, capitalised and stopped, for a 4xx
  other than 401, 403, 404 and 429 whose message is neither blank nor the code's stock text
  (`new ApiError("BAD_REQUEST", { message: "That name is taken" })` reads "That name is taken.");
  anything else is `undefined`.
- An input the procedure's zod schema refused keeps the schema's sentences. `refusal` is the first
  issue's message (`z.string().min(1, "Enter a name")` reads "Enter a name."), and
  `issues(error)` from the same module is
  every issue as `{ path, message }` in the schema's order (`path` is `["address", "city"]` for a
  nested field, empty for the input as a whole), none for any other error, so a form says each
  on its field: `error={issues(error).find((i) => i.path[0] === "name")?.message}`.
- A mutation rejects with `Unreached` before any fetch while the browser is offline or a cached
  read's `meta.reach` says the server is out of reach (`ws.connection` from
  `@slotform/node/client`). A `mutationCache` you supply yourself must call
  `guardReach(client)` in its `onMutate`.
- Invalidation is not awaited, so what the act changed shows through the reads it refetches (their
  busy mark); there is no done mark.

In dev, `QueryProvider` checks the two ways an act goes unseen with `console.error`: a mutation an
`onAct` started that returned no promise (the act would read as done at once), and a mutation that
failed with nothing drawing it within a tick. A mutation with an `onError` of its own is exempt, so
a handler that catches a failure itself (`.catch(setError)` on the call, or the option) draws it
and the check stays quiet.

A host or control of your own holds an attempt with `useAttempt<K>()` (`@slotform/ui-core/react/acts`): `attempt(key, onAct)` calls `onAct`, and
`pending` (the key) and `failure` (`{ key, error }`, kept until the next attempt) follow its
promise, the newest attempt counting alone.

## A value that saves as it changes

`useDraft(datum, failed)` (`@slotform/ui-core/react/acts`, [reads](./reads.md)) saves through `change(next, save)`, a `save` that
returns a promise:

```tsx
const draft = useDraft(notify, (error, again) =>
  toast(refusal(error) ?? "Not saved.", {
    tone: "failed",
    act: retries(error) ? { label: "Retry", onAct: again } : undefined,
  }),
);
<input type="checkbox" checked={draft.value} disabled={draft.painted}
  onChange={(e) => draft.change(e.target.checked, () => save.mutateAsync({ notify: e.target.checked }))} />
```

While a save pends the draft holds `next`. Each change supersedes the one before and only the
latest's outcome counts: resolved, the hold waits for the refetch the write started, then follows
its datum unless it was edited since; rejected, it falls back to the datum and `failed` hears the
error with `again`, a way to save the same value. `change` returns the save's promise (never rejecting, since `failed` draws the
rejection), so an act that saves again holds the attempt. react-ui and native-ui's controls do all of
this: hand one the promise from `onChange`, or from `onCommit` for an `Input` or
`Slider`. A form field hosts its control's save: the field holds the draft and a refusal draws in
the field's own line. A control standing alone holds its own draft and a rejection is a toast with
Retry. Two saves in flight can reach the server out of order; a mutation that cares gives
itself a `scope`.

**Check:** `pnpm check` passes, and under `pnpm dev` a refused act shows its sentence and Retry.
