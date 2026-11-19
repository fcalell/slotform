# Motion on the phone

How a phone part moves. The components carry all of it (`lib/motion`, `lib/swap`, `lib/follow`):
add no animation of your own to a part you draw, and every rung follows the system's reduced motion.

## A press

The phone has no hover: a press lands as a wash on `instant` and fades out on `fast` when the
finger lifts (`usePress`), and a filled control (a `Button`, an icon `Button`, a chip's remove, a segment, a tab) gives to
the press scale under it (a full-width `Button` answers and does not give). A `Switch`'s thumb
travels, a selection tick's mark grows from 0.6 with its opacity, an option's radio dot grows from
nothing, and a disclosure chevron or a sort arrow turns on `fast` (`useToggle`) instead of swapping glyphs. A `Picker` in `fit: segments` switches its selection wash to the chosen segment at once.

## A line and a block

A line that appears in flow (a blocked act's reason, a field's error, a
notice) fades in on `fast` (`flowIn`, the `entering` of a
`FadingText` or `FadingView`) and pushes what follows at once; it leaves at once, and where a line's
space is already held (a form bar's kept line) only its words fade in. A block (a `Banner`, a docked
sheet, a folded body, a chip, a list row)
that the viewer's act adds or takes out lands at once, what follows with it: an app's own act that
adds or removes a block sets its state and draws nothing for it. A block that arrives on its own (a
row the server pushed, a fact that appeared after the first draw) fades in on `base` (`blockIn`) and
pushes what follows at once; what the first draw held does not fade.

## A value

A value that changes while shown moves by transform, never by a size. A bound `Stats` cell, `BarChart`
and a `Gate`'s step count draw it: a fill is the full track scaled from its start (a bar from the
baseline) on `slow`, a stacked bar's parts lifted over one another, a meter's tick travelling, and a
rescaled axis moving every bar together while its tick labels cross-fade. A figure (a count, a share,
a total) rolls on `fast` when its data changes: the old
leaves and the new rises from the side the change went to, up for a larger number and down for a
smaller one. A mark (a status dot, a copy act's check)
cross-fades with a scale from 0.6 (`useValue`, `Roll` and `Swap`). None of it plays when a figure
or a mark first arrives, and a clock's tick switches at once.

## A push and a pop

A push and a pop are the consumer's `Stack` (the expo guide's root layout); a place's root fades in on `fast` as it mounts (`placeIn`).
A message that arrives at the end of a log rises a `gap` as it fades in on `base` (`riseIn`), the
Latest act rising in and falling out on `fast` (`sinkOut`).

## What a finger carries

It follows the finger 1:1 and only its release eases. A `Toast` follows a swipe
toward the inline end (`useSwipe`, a pan from `react-native-gesture-handler` that fails on a vertical
pull) and a bottom `Sheet` follows a pull down on its head (gorhom's own drag); past the reach (40% of
the screen's width or the sheet's height) or flung (0.5 px a ms) the release leaves, else it settles
back on `base` `out`. A part you draw that a finger should carry takes `useSwipe`; the decision is
`@fcalell/ui-core/follow`'s. Under the
system's reduced motion the finger still leads and only the release snaps.
