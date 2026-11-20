# Screen critique

The checklist a review of a screen runs, after the render walk (`slotform screens test`) has
checked sizes, gaps, radii, clipping and overflow. A critic that did not build the screen runs it,
reading the shot folder (`--shots`) and the source; it measures nothing, and an observed value is
what it sees. Each item is a yes/no question; an answer is `yes`, `no` or `n/a (why)`, and every
`no` carries its evidence: the shot and the element (its visible text) or the source `file:line`,
the observed value, the expected value from the rule, a one-line fix, and its severity (`blocking`
as The verdict defines, else `minor`). A `yes` names the one place that was checked. No item is
skipped; an item that cannot be answered says why.

The rules are the face pages [voice](./voice.md) lists, `structure.md` (S#) and `node_modules/@slotform/screens/guide/test-run.md`.

The checklist is three pages, every item answered:

- [Shape and rhythm](./critique-shape.md): items 1, 2, 3 and 7.
- [Words, hierarchy and marks](./critique-marks.md): items 4, 5 and 6.
- [States and the anchor](./critique-states.md): items 8 and 9.

## The verdict

A screen is `ship` unless a finding blocks its use, and `not yet` names that finding. A finding
blocks when the screen:

- shows a fact wrong, missing or contradicted (a count against its rows, a value of another
  record, a state its pill denies);
- hides the act the screen exists for, or leaves a state unreachable or unreadable;
- fails a floor of the render walk or the voice page's [Floors](voice.md#floors) (axe, overflow, a target, a contrast);
- cuts, clips or overlaps a word so it cannot be read.

Every other `no` is an improvement: listed after the verdict, as a composition or a roster
finding, and it holds no screen. A screen once `ship` is judged again only where its render
changed since that verdict; the critic gets the earlier verdicts and reads the changed shots.
The review closes when no screen holds a blocking finding, and its improvements go to the
maintainer.

## The report

One section per screen:

```
## <Screen title> (<route id>)
Verdict: ship | not yet (<the blocking finding>)
Shots read: <file names>
Source read: <files>

| Item | Answer | Severity | Evidence |
| --- | --- | --- | --- |
| 1a | yes | | data-1920.png: bar, kicker, name, pills, description, sections in order |
| 2a | no | minor | data-1920.png "Details": Requester, Area, Brand empty (3 of 8); expected absent facts say nothing; fix: drop a row whose value is null in `src/.../index.tsx:NN` |
```

Then, for the screen, the three findings that most make it read as unfinished, in order.
