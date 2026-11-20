# Shots and audits

How a review that shoots screens holds motion still, and how it audits them with axe. The run that
shoots an app's screens is `node_modules/@slotform/screens/guide/test-run.md`.

## Shots at rest

A review that shoots screens (`slotform screens test` does, and so may an app's own browser driver) holds
motion still with the one setup Slotform's own run uses: emulate `prefers-reduced-motion: reduce` (every
rung is 0 ms and the pulse stills; CDP's `Emulation.setEmulatedMedia` with the feature
`prefers-reduced-motion: reduce`, which `slotform screens` sets). The spinner keeps
turning under it, which is no motion a shot can hold; a driver that wants it still too injects, once
per page, unlayered:

```css
*, *::before, *::after { transition: none !important; animation: none !important; }
```

That rule does not reach an animation that carries state rather than motion. One is a scroll-driven
animation that decides whether something stands (a record's touch-bar name, `touch:record-name-waits`,
hidden until the head's name has scrolled under the bar): it has no duration for reduced motion to
zero, and a shot with it off would show only its fallback, the name always standing. Such an
animation is written `!important` in a cascade layer (the component's utility is in `utilities`), and
an important declaration in a layer beats an unlayered important one, so the setup above leaves it
running without knowing its name. A driver injects its rule unlayered, never into a `@layer`, and a part
that adds an animation that carries state does the same.

The marks that change are no such animation: a swapped mark's old one and an act's fading glyph are
hidden in their own style and animate `from` their rest, and the new mark and the pending spinner
animate `from` hidden, so a setup that turns animations off draws the new mark and the spinner alone,
never the old one under it, and an old mark whose removal a busy page delays is already invisible. A
part that adds an exit writes it so (a `from` keyframe over an end state in its style), never a `to`
keyframe that leaves the part standing once animations are off.

## Auditing with axe

Run every axe rule, as Slotform's run does: the page-level ones (`region`) and `target-size` included, nothing excluded for an open popup (`node_modules/@slotform/screens/guide/test-run.md`, "Limits").
