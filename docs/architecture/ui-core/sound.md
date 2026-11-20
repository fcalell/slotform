# Sound

How a record that plays is built on both platforms: the `Track` descriptor, the framework-free player
rules and store in ui-core, each plugin's one player store and the sound it is given, the `Dock` an app
mounts in a Shell's foot, its keys, and the waveform. Why the player is a store the app composes is
[the player is composed](../../decisions/the-player-is-composed.md).

## Track

A track is a descriptor (`Track`, with `Peaks`), so a record that plays is data on both platforms.

## Player

What both platforms run lives in ui-core, free of any framework and of the sound:

- `@slotform/ui-core/clock` holds `trackTime`, a time as the dock words it (`3:07`, `1:02:03`).
- `@slotform/ui-core/player`: the player's rules (the queue's
  neighbours, `neighbour`; the global `shortcut`s; the dock's seek, `dockSeek`: the length and, where it is known, the peaks a waveform draws in place of a slider) and the store itself. `createPlayer` holds the
  track, its queue or `QueueProvider`, the play state, the volume, the clock and the rules that move
  them (Previous returns to the track's start past `PREVIOUS_RESTART`, 3 seconds in). It drives the
  `Output` that the `Engine` the app passes through `connect` makes, and takes a `PlayerHost` for the kept volume and the
  frame. `windowQueue` is the `QueueProvider` for a list too long to hold.
- `@slotform/ui-core/waveform`: a waveform's arithmetic, free of the canvas: the peaks reduced to the
  columns a width draws (`columnCount`, `columns`), each column's box and the playhead's place on
  the device's pixels (`columnBoxes`, `headAt`, at the widths `COLUMN` holds), the moment a pointer
  or a key names (`momentAt`, `seekKey`) and the keyboard's steps (`SEEK`).

Each plugin's `lib/player` is one store over `createPlayer` (made in `lib/player-store`) that the app calls and reads, with
`connectOutput` to pass the sound once: the web's `audioOutput()`, the phone's from
`@slotform/native-ui/audio/expo`. The store makes no sound of its own. On the phone the
device's own buttons set the volume, so the store keeps none, and the clock follows the frame.

## Dock

`Dock` is the player's dock, a component nothing mounts by default: an app gives a Shell's foot
`foot={<Dock />}`. It draws what the player holds and makes no sound. While a track is loaded it
stands under the place at the column's width, a hairline over the surface, and holds:

- the picture (a track with none, or one that did not load, stands as the tile's failed shape, so the
  name keeps its place);
- the name over its line;
- previous, play or pause (the primary glyph) and next;
- the elapsed time, the seek (the waveform where the track has peaks and a known length, else a
  slider) and the total;
- mute and volume, not on touch, where the device's own buttons set the volume;
- a close.

On the web the name, the transport and the seek share the bar's width by flex, so the transport
stands at its centre; on touch the transport and the name stand on one row and the seek on a second.
On the phone the dock is one bar with a hairline of progress along its top, and a press opens a
`Sheet` with the full player.

### Media controls

The output shows the loaded track on the system's media controls (the web's media session, the
phone's lock screen): `Output.load` stands its name and line with no picture, and `Output.cover`
gives the picture's address. The store's `cover` is the one rule for the picture: each platform's dock
hands it the cover as its tile draws it (`image` read as a selection is), and the store passes on the
address once it has landed and is not empty, once per address, drops one for a track no longer
loaded, and gives it again to an output connected later. The picture reaches the system while a dock
stands; the name and the line whenever a track is loaded. The output owns the controls' acts too:
play, pause and seek act on the sound, as `expo-audio` lets the lock screen act on its player, and
previous and next ask the store (`PlayerReport.step`), which holds the queue, each standing as
`Output.steps` says: previous with a queue, next while a track follows. `expo-audio` reports no
system previous or next, so on the phone those two are the dock's alone. Each plugin's store lives in
`lib/player-store`, outside its exports, so the dock reaches `cover` and an app does not.

### Dock keys

While it stands the dock takes Space and the horizontal arrows anywhere that is not typing or a
control that takes those keys itself ([media controls](#media-controls) are the output's). On the web, Space and the
horizontal arrows are the page's while nothing that takes them has focus: a field's text, a control a
press activates (Space) or a widget that moves with the arrows. A Table's grid is the widget that
moves with the arrows (`role="grid"`), and takes Space, Enter and `x` only where it acts on them (it
ticks the row of a table that chooses): the key it takes arrives at the dock already prevented, and
Space on a cell of a table that chooses nothing is the dock's.

## Waveform

`Waveform` is a component nothing mounts by default. On the web it is a canvas that reads its
colours off its element once per mode. On the phone it is an `Svg` of the same columns:
`columns(peaks, count)` for the count its width holds, with a played layer over a rest layer. The
played layer is clipped to the playhead's share, so a tick moves one clip and redraws no column. Both
take the same props. A drag holds the playhead and seeks once on release, through the same track drag
as the phone's `Slider`. A screen reader's increment and decrement move it by `SEEK.step`. The phone
dock's full player draws it where the track has peaks and a known length, else the slider.

## In the code

- `packages/ui-core/src/player.ts`: the player's rules, `createPlayer` and `windowQueue`.
- `packages/ui-core/src/waveform.ts`: the waveform's arithmetic.
- `packages/ui-core/src/roster/dock.ts`: the `Dock` roster entry.
- `plugins/react-ui/src/ui/components/dock/index.tsx`: the web dock and its keys.
- `plugins/react-ui/src/ui/components/waveform/index.tsx`, `plugins/native-ui/src/ui/components/waveform/index.tsx`: each platform's `Waveform`.
- `plugins/native-ui/src/ui/lib/adjustable.ts`: the track drag and the screen reader's steps the phone's `Slider` and `Waveform` share.
- `plugins/react-ui/src/ui/lib/player-store.ts`, `plugins/native-ui/src/ui/lib/player-store.ts`: each platform's player store and its host.
- `plugins/react-ui/src/ui/lib/player.ts`, `plugins/native-ui/src/ui/lib/player.ts`: the commands and hooks an app calls, and the web's `audioOutput`.
- `plugins/native-ui/src/ui/audio/expo.ts`: the phone's output over `expo-audio`.
