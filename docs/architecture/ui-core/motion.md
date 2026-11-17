# Motion

The motion contract both UI plugins draw from: the principles every motion answers to, the one table
of timing numbers, the moves a component may make and the class sets that spell them, how reduced motion
snaps them, the live tuning record and its write-back, and what each kind of change (a press, a
layer, a flow line, a block, a value, a wait, a navigation, a message) does on the web and on the phone.

## Principles

Every motion is a contract constant, never a component's own timing: a motion each component spells
for itself eases the same press three ways and leaves nothing to tune in one place.

- A motion explains one change or is cut.
- What a finger or pointer carries moves 1:1 and only its release eases ([follow](drag.md#follow)).
- A touch is answered within `instant`; nothing waits on an animation to take input.
- An error changes colour and gains its sentence, never shakes. A failed shape arrives as a loaded
  one does, with no shake.
- The focus ring snaps.
- A wide surface does not give under a press.
- The phone has no haptics.
- Reduced motion snaps every transition; two loops stay ([reduced motion](#reduced-motion)).

### What may animate

What may animate is a matter of cost. `transform` and `opacity` run on the compositor; colour,
`clip-path` and `filter` may transition, each explaining a change (`packages/ui-core/guide/voice.md`,
Motion). A box's size or place never animates through layout (`width`, `height`, insets, margins,
padding, gap, grid tracks, `font-size`): it moves by transform, or lands at once.

## One table of numbers

`MOTION_KNOBS` in `tokens.ts` is every timing the owner can tune: the one source the CSS emit,
`deriveTheme().motion`, the phone's live `tuned` record, the tuning page's sliders and the write-back
all read. A knob's `unit` is the CSS unit its variable takes (`""` for a scale).

- The duration rungs are one scale from a base of 200 ms: `instant` is press feedback only, the rest
  the 150 to 300 ms band a micro-interaction lives in. Three curves (`out`, `in`, `in-out`) ease them.
- The emit renders every knob as the CSS variable its table names.
- `deriveTheme().motion` carries them as numbers, so a platform that animates outside CSS (a native
  timing call) reads the same record the web renders as custom properties: each duration in
  milliseconds, each easing as its four cubic-bezier control values.
- The wait and act delays (`WAIT_DELAY`, `ACT_DELAY`, in `@fcalell/ui-core/paint`) and the
  scramble's tick are knobs of the same table.

## Reduced motion

`reducedMotionTokens` sets every duration rung and the scramble's tick to 0, and the web renders it
under `prefers-reduced-motion: reduce`. Each transition reads its duration through a rung's variable,
so none moves. Two loops stay:

- the spinner's turn, since a spinner that stops is a wait that looks over;
- the delays: the wait and act delays are not rungs, so they hold while the fades themselves snap.

On the phone reduced motion follows the system, which zeroes the Reanimated timings.

## Tuning record

`@fcalell/ui-core/paint` keeps `tuned`, the live tuning record of every knob: the phone's source for
a number the web reads from a CSS variable, applied on the next read as the variables are. A writer
goes through `tune` so readers are told; a reader that must follow a change reads `tuned[name]` as a
`useSyncExternalStore` snapshot over `subscribeMotion`. `loading` and `setLoading` hold the theme's
paint per glyph region the same way.

The phone app's `/motion` route (development only) generates one slider per knob, written to
`tuned` so the next animation played takes it, and a "Copy values" text dump of the changed knobs. `pnpm --filter @fcalell/ui-core motion:apply <file>` validates the keys and ranges,
refusing the whole file otherwise, rewrites only the default literals in `tokens.ts` and regenerates
`DESIGN.md`. A default changes only by that pass.

## Moves and move class sets

`MOVES` is the vocabulary of motion. A roster entry's `motion` names the moves its component makes
(required; `[]` for none; [roster entries](roster.md#roster-entries)). The class sets a move spells are
the motion constants `variants.ts` exports, composed into the class sets that make the move, so a component
never writes a motion of its own. They are the one place a class set carries an interaction state, a
transition-status attribute or an arbitrary property list, since a platform would otherwise overlay
them ([matrices](roster.md#matrices)).

## Press

Every class set a viewer points at or presses answers; a filled control gives (scales) on press, a wide
surface never.

- On the web a state's look eases in on `fast` and a press lands on `instant`. The transition never
  lists `outline`: the focus ring snaps in and out, and a key reads as a position.
- The phone has no hover, and `usePress` (`lib/motion` of native-ui) is its whole answer: the pressed
  wash lands at once and lets go over `fast`, and a filled control gives, scaling to `tuned.press` on
  the same two steps. `wash` is the opacity of an overlay in the wash's colour, `give` the scale of the
  control, `onPressIn` and `onPressOut` the Pressable's. The press scale is read when the press lands,
  so a tuned value is the next press's. The web's press classes leave the phone alone.
- A toggle drives its own value: on the phone a value from 0 to 1 as `on` turns, over a rung on a
  curve (a switch thumb's travel, a chevron's turn). It starts where `on` stands, so a control that
  mounts on draws its end without moving to it.
- A checkbox's mark grows from 0.6 with its opacity over `fast` and leaves over `instant`; a radio's
  dot grows from nothing the same way.

## Layers

What stands over the page enters on `base` `out` from where it belongs and leaves on `base` `in` the
way it came: the same properties over the same distances reversed, on transform and opacity. On the
web a Base UI popup carries `data-starting-style` on its mount and `data-ending-style` on its way
out; the `content-show` and `content-hide` keyframes time the rest. A popover drops a float from its
anchor (below it, else rising from the side it flipped to) and returns to it. A tooltip rests before
it shows, and a second one soon after shows at once.

## Flow lines and blocks

A **flow line**, a line that appears in flow (a blocked act's reason, a field's error, a checking line, a notice,
a stage's moment) fades in on `fast` `out` and pushes what follows at once; it leaves at once. On the
web the fade is the `paint-in` keyframes, a class the element carries while it stands, played as it
mounts. The phone fades its flow lines in Reanimated (`flowIn`), built where they mount so a tuned rung is
the next one's, and the web's classes leave it alone.

A **block** (a fold, a chip remove, a sheet close, a row the viewer adds or removes) lands at once,
its neighbours with it ([moves land at once](../../decisions/moves-land-at-once.md)). A block that
arrives on its own, which nothing the viewer did moved in, fades in on `base` `out` and pushes what
follows at once. `arrivals` (`@fcalell/ui-core/arrive`, with `useArrivals` in
`@fcalell/ui-core/react/arrive`) names the keys that arrived on their own: those the page did not
hold when it first drew them. Nothing is known before the first draw, so that draw has no arrivals;
every later key that was not known is one, whoever added it, so a row the server pushed fades in and
pushes at once, and one the viewer's act added fades in the same way.

The segmented control's selection ground switches at once and never cuts a label: it scrolls its
track.

## Value and fills

A measured value moves by transform, never by size: a fill is the full track scaled from its start, a
tick rides, a changing figure or mark swaps (`Swap`, `Roll`).

- A fill is its full track scaled by transform, never a width or a height: the site sets `--fill` (a
  share, 0 to 1), the fill moves on `slow` `in-out` and its level colour cross-fades on `base`. One
  that mounts grows from its start (`starting:` on the web), the start edge following the writing
  direction. On the phone a fill starts at `from` and follows `to`: one that mounts starts at 0 and
  grows from its start, and one that stands where it was does not move until its data does.
- A figure that changes while shown rolls (`@fcalell/ui-core/roll`): the old value leaves and the next
  one arrives from the side the change went to, one rule both platforms read.
- A pending bar's fill (`pendingShare`) animates by transform and, under reduced motion, steps with
  the clock ([words](words.md#ages-and-the-clock)).

## Wait and settle

A read that lasts shows its waiting shape after `WAIT_DELAY` ([timing](reads.md#timing)): the loaded
tree painted, each region breathing in one page-wide phase (`PULSE`), or the spinner where a wait has no
shape ([waiting paint](reads.md#waiting-paint)). A painted fill's whole animation is the appear fade
after `--wait-delay` (`paint-in`), then the breath on the fill's alpha (`pulse-fill`), one phase
across the page. Under reduced motion `--pulse-name` is `none`, so the fade snaps and the fill stands
still. The phone breathes in `lib/motion`.

The switch to the loaded shape lands at once: the painted shape is the loaded one's geometry, so
nothing moves and no transition runs ([moves land at once](../../decisions/moves-land-at-once.md)).

`theme.loading` is `{ text, figure, id }`, each `pulse` or `scramble` (omitted: all `pulse`; a shape
always pulses). It rides `ResolvedTheme.loading` to both plugins: on the web as `data-loading-*` on
the root, set by `themeModePlugin` before first paint; on the phone through the generated
`.stack/native-theme.ts`.

## Scramble and decode

When the theme scrambles a region's kind, the region paints generated characters in the filler's length
instead of the pulse (`@fcalell/ui-core/scramble`: `frame`, `decode`, `createTicker`, over the kind
`kindOf` of `@fcalell/ui-core/paint` gives a role). Every function is pure over the tick it is given,
so both platforms draw the same frame for the same region, and one ticker serves every region of a page.
A figure or id that waited then decodes by locking its characters across `slow`. `Decoded`
(`lib/region`) draws both forms as one instance. A wrapping region always pulses.

## Spinner

The spinner is a turning ring in the ink of its place, the size of the glyph it stands in for. It turns on
the contract's loop duration, linear and repeating, enters by a fade on `fast`, and keeps turning
under reduced motion.

On the phone a view takes no `currentColor`, so the place's ink is resolved and set as the border
colour; the arc's `border-t-transparent` is the top edge's own key and survives it. uniwind's free
build has no `animate-*`, so the turn is Reanimated's own loop on the UI thread. Where the theme
scrambles its text the busy glyph is three mono glyphs cycling at the tick, `···` under reduced
motion (`BUSY_STILL`): the mono face gives each one advance, so the box is three glyphs wide with no
measure.

## Navigate and stream

A path change lands at once: the router runs no transition, and a Pane that opens or closes stands in
its place from the first frame. On the phone a change of place fades the place's root in on `fast`:
places are peers, so nothing slides; a pushed screen is the stack's own animation.

As the viewer docks or folds the sidebar, the page takes its space at once and slides from where
it stood (`data-slide` on the container: `dock` from the strip's end, `fold` from the body's), its end
moving with the body's end, on the body's `base` `out` (`page-slide`). Each part of the page carries
it (the banner, the place, the foot), since the container, the column and `main` hold no transform.

A message that arrives at the end of a log after the first draw (the viewer's own or another's)
rises a `pair` as it fades in on `base` `out`, and pushes nothing but the end of the log, which
follows it. The web plays `stream-in`; the phone rises it in Reanimated (`streamIn`) from a `pair`
below its place. The act back to the newest message fades in rising a `pair` on `fast` `out` as
the reader scrolls away (its starting style), and leaves on `fast` `in` the same way back
(`data-leaving`); it stays mounted until it has gone.

## Web motion

The web owns the keyframe animations on top of the shared contract, timed by the contract's rungs
and curves, in react-ui's `globals.css`: `content-show`, `content-hide`, `page-slide`, `stream-in`,
`paint-in`, `pulse-fill`, `swap-in`, `swap-out`, `act-in` and `act-out`. `spin` is Tailwind's own,
which Tailwind emits beside the theme's `--animate-spin`.

## Phone motion

native-ui's `lib/motion` is the contract in Reanimated: one of the three curves, and a rung's
duration on a curve, read from the live `tuned` record at the call, so the tuning page's change
reaches the next animation played. Each entering animation (`flowIn`, `streamIn`, the place fade, the
checkbox mark) is built where it mounts, so a tuned rung is the next one's.

## Judging motion

`stack screens test` runs with `prefers-reduced-motion: reduce`, so a screen is judged at rest; the
design critique's motion pass is the run with motion on.

## In the code

- `packages/ui-core/src/tokens.ts`: `MOTION_KNOBS`, `MOVES`, the rung scale and the delays' defaults.
- `packages/ui-core/src/derive.ts`: `deriveTheme().motion`, the timings as numbers.
- `packages/ui-core/src/emit.ts`: the motion variables and `reducedMotionTokens`.
- `packages/ui-core/src/paint.ts`: `tuned`, `tune`, `subscribeMotion`, `loading`, `WAIT_DELAY`, `ACT_DELAY`.
- `packages/ui-core/src/variants.ts`, `packages/ui-core/src/variant-tables.ts`: the motion class sets (layers, flow lines, blocks, the painted fill).
- `packages/ui-core/src/roster/shared.ts`: the state transitions and the fill class set.
- `packages/ui-core/src/roster/thread.ts`, `packages/ui-core/src/roster/shell.ts`: the stream rise and the page slide.
- `packages/ui-core/src/arrive.ts`: `arrivals`.
- `packages/ui-core/src/roll.ts`: how a changing figure moves.
- `packages/ui-core/src/scramble.ts`: the scramble and decode.
- `plugins/react-ui/src/node/theme.ts`: the web's keyframe animation tokens.
- `plugins/native-ui/src/ui/lib/motion.ts`: the contract in Reanimated (`usePress`, `flowIn`, `streamIn`, the fills).
- `plugins/native-ui/src/ui/atoms/spinner/index.tsx`: the phone's spinner and busy glyph.
- `apps/phone/src/app/motion.tsx`: the phone's tuning page.
