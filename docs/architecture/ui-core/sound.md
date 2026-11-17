# Sound

How a record that plays is built on both platforms: the `Track` descriptor, the framework-free player
rules and store in ui-core, each plugin's one player store and the sound it is given, the `Dock` an app
mounts in a Shell's foot, its keys, and the waveform. Why the player is a store the app composes is
[the player is composed](../../decisions/the-player-is-composed.md).

## Track

A track is a descriptor (`Track`, with `Peaks`), so a record that plays is data on both platforms.

## Player

What both platforms run lives in ui-core, free of any framework and of the sound:

- `@fcalell/ui-core/player`: the player's rules (a time as worded, `trackTime`; the queue's
  neighbours, `neighbour`; `PREVIOUS_RESTART`, past which Previous returns to the track's start; the
  global `shortcut`s) and the store itself. `createPlayer` holds the track, its queue or
  `QueueProvider`, the play state, the volume, the clock and the rules that move them. It drives an
  `Output` the app passes through `connect`, and takes a `PlayerHost` for the kept volume and the
  frame. `windowQueue` is the `QueueProvider` for a list too long to hold.
- `@fcalell/ui-core/waveform`: a waveform's arithmetic, free of the canvas: the peaks reduced to the
  columns a width draws (`columns`), the moment a pointer or a key names (`momentAt`, `seekKey`) and
  the keyboard's steps (`SEEK`).

Each plugin's `lib/player` is one store over `createPlayer` that the app calls and reads, with
`connectOutput` to pass the sound once: the web's `audioOutput()`, the phone's from
`@fcalell/plugin-native-ui/audio/expo`. The store makes no sound of its own. On the phone the
device's own buttons set the volume, so the store keeps none, and the clock follows the frame.

## Dock

`Dock` is the player's dock, a roster part nothing mounts by default: an app gives a Shell's foot
`foot={<Dock />}`. It draws what the player holds and makes no sound. While a track is loaded it
stands under the place at the column's width, a hairline over the surface, and holds:

- the picture (a track with none, or one that did not load, stands as the tile's failed shape, so the
  name keeps its place);
- the name over its line;
- previous, play or pause (the primary glyph) and next;
- the elapsed time, the seek (the waveform where the track has peaks, else a slider) and the total;
- mute and volume, not on touch, where the device's own buttons set the volume;
- a close.

On the web the name, the transport and the seek share the bar's width by flex, so the transport
stands at its centre; on touch the transport and the name stand on one row and the seek on a second.
On the phone the dock is one bar with a hairline of progress along its top, and a press opens a
`Sheet` with the full player.

### Dock keys

While it stands the dock takes Space and the horizontal arrows anywhere that is not typing or a
control that takes those keys itself, and the system's media keys. On the web, Space and the
horizontal arrows are the page's while nothing that takes them has focus: a field's text, a control a
press activates (Space) or a widget that moves with the arrows. A Table's grid is the widget that
moves with the arrows (`role="grid"`), and takes Space, Enter and `x` only where it acts on them (it
ticks the row of a table that chooses): the key it takes arrives at the dock already prevented, and
Space on a cell of a table that chooses nothing is the dock's.

## Waveform

`Waveform` is a roster part nothing mounts by default. The web `Waveform` is a canvas that reads its
colours off its element once per mode. The phone would draw the same columns.

## Scope

The phone's `Waveform` is not built.

## In the code

- `packages/ui-core/src/player.ts`: the player's rules, `createPlayer` and `windowQueue`.
- `packages/ui-core/src/waveform.ts`: the waveform's arithmetic.
- `packages/ui-core/src/roster/dock.ts`: the `Dock` roster entry.
- `plugins/react-ui/src/ui/components/dock/index.tsx`: the web dock and its keys.
- `plugins/react-ui/src/ui/lib/player.ts`, `plugins/native-ui/src/ui/lib/player.ts`: each platform's player store.
