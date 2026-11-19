# The dock and the waveform

The `Dock` draws what the player plays under the place, and a `Waveform` draws a track's peaks as a
seek slider, in the dock or on its own. The player and its tracks are [audio](./audio.md).

## The dock

It draws the picture, the name over its line, previous, play or pause (the primary glyph) and next
(the first and last only where there is a queue), the elapsed time, the seek, the total, mute with a
volume slider and a close. The name, the transport and the seek share the bar's width by flex, so the
transport stands at its centre. An `image` given as a selection paints the tile until its read lands. A track with no `image`, or one that fails to load, draws the tile's
failed shape, so the name keeps its place. The seek is a `Waveform` where the track has `peaks` and a
slider where not. On touch the transport and the name stand on a first bar and the seek on a second,
with no volume: the device's own buttons set it. Volume and mute are kept from one visit to the next.

While it stands the dock takes Space and the horizontal arrows anywhere that is not typing or a
control that takes the key itself (a `Table`'s grid takes them where it acts on them), and the
system's media keys and lock screen drive the same player. The system's media controls show the
name and the line, and the picture once the dock draws it (an `image` given as a selection once its
read lands). A `Dock` takes no props.

## A waveform on its own

```tsx
<Waveform
  label="Seek the track"
  peaks={{ values: song.peaks }}
  duration={song.seconds}
  at={time}
  onSeek={player.seek}
/>
```

`peaks.values` is one 0..1 magnitude per value, or with `paired: true` each pair a stretch's
lowest and highest sample (-1..1); an array or a typed array, at any resolution. `fit="bar"`
stands at the control height (in a `Toolbar`-height bar); the default stands at the waveform size
in a `Pane` or a `Card`. It does not move itself: `at` is the playhead, so a standalone waveform
takes `usePlayerTime().time` or the app's own clock. A drag holds the pointer as the playhead and
`onSeek` hears one second, on release; the keys seek at once.

**Check:** a drag on the waveform moves the playhead and seeks once on release, and Left and Right
move it five seconds.
