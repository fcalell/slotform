# Waiting on the phone

A waiting screen is the loaded tree, a block that stands only with its data is always placed, and an
act paints by its own datum (`node_modules/@slotform/ui-core/guide/waiting.md`). This page is how the
phone paints, scrambles and says a refetch.

## The paint

Each leaf draws its loaded tree with filler in place of its text, at the loaded heights, in the
`skeleton` colour (`PAINT`: filler glyphs for text, the component's own box for a mark or a control).
A painted row draws no `chip`, a waiting description and a waiting meta line are one clipped line,
and a waiting `Prose` is one paragraph of four clipped lines (`PAINT_ROWS`), so a long text lands
taller by the lines past them. Nothing shows for 400 ms (`tuned.waitDelay` in `@slotform/ui-core/paint`):
the paint stands undrawn in its place, so the screen keeps its height, then it fades in over the
`base` rung and breathes: the painted part's opacity moves between full and 55 % over the `pulse`
(1600 ms), every part of the screen on one shared value, so a screen breathes as one surface. Reduced
motion keeps the delay, snaps the fade and stills the fills. A text region breathes on its root
`Text`. A read the local server answers in a few milliseconds draws none. Only a frame that holds a
read is busy to assistive tech (`accessibilityState`), while it first waits, never on a refetch.

## The scramble

The theme can paint a kind of glyph region by the scramble instead of the pulse (`theme.loading`:
`text`, `figure` and `id`, each `pulse` or `scramble`; a shape, a sentence and a paragraph always
pulse), set once at startup in the generated `.slotform/native-theme.ts` (`setLoading`). A scrambled
region is a memoised nested `Text` over the page's one clock (`useSyncExternalStore` over the ticker,
so a tick renders that text alone), its characters generated Latin in the ink of the `Text` that
holds it, no fill under them; the root `PaintText` fades in and does not breathe, which it knows from
the `fills` prop (the role its filler stands for), so give a `PaintText` its `fills` whenever it holds
a `Painted` of a one-line role. A phone cannot clip a nested text, so a scrambled region's width is
its generated characters', held by the tabular or mono face for figures and ids; it is a still bar
under the system's reduced motion. A figure or id of a read that showed its scramble arrives by
locking its characters from the reading start across `slow`: draw the region through `Decoded`
(`lib/region`), which draws both its forms (its `PaintText` filler while `painted`, then the text) so
it remembers it waited, where it is a figure or an id of a frame's own part; a collection's cells and
text arrive by the settle's crossfade. Where text scrambles, the busy glyph (`Spinner`) is three mono
glyphs cycling at the tick, `···` under reduced motion.

## A refetch

After the first answer the frame that holds the read says what the read does, and the data stays. A
refetch is a spinner after the heading (the Pane's title, a Section's title and count, a Sheet's
title, a form group's legend; a frame with no heading shows none), shown after `tuned.waitDelay` so a
fast refetch draws nothing; only that frame renders for it, never its body. A refetch that failed
(stale) is the line "Couldn't refresh." with a quiet Retry, pending while it runs; it stands, as the
paused line does, under the heading row (a Pane under its top bar, a Section after its description, a Form at its top).
