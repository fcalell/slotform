# Audio

Sound the phone plays is the player, never an audio call in a screen. The app passes the player one
output, calls `player` with a `Track`, and gives the `Shell` a `Dock` for its `foot`; the dock stands
above the tab bar while one is loaded, so the sound goes on through navigation, in the background and
on the lock screen. It is the web's player (`node_modules/@fcalell/plugin-react-ui/guide/audio.md`)
with the same store and commands, `@fcalell/ui-core/player`'s rules. A waveform on its own is a
`Waveform`. Nothing here mounts by default.

```tsx
import { audioOutput } from "@fcalell/plugin-native-ui/audio/expo";
import { Dock } from "@fcalell/plugin-native-ui/components/dock";
import { Waveform } from "@fcalell/plugin-native-ui/components/waveform";
import { connectOutput, player, usePlayer, windowQueue } from "@fcalell/plugin-native-ui/lib/player";
```

## Set it up

```tsx
connectOutput(audioOutput()); // once, at the module scope of the root layout

<Shell places={places} foot={<Dock />}>…</Shell>
```

`audioOutput` wraps `expo-audio`, an optional peer: an app that imports it adds `expo-audio` and its
config plugin, which carries background playback (the `audio` background mode on iOS, the
media-playback service on Android) and so takes a new native build; Expo Go plays in the foreground.
In a stack app, in `stack.config.ts`:

```ts
expo({
  configPlugins: [{ name: "expo-audio", options: { microphonePermission: false, recordAudioAndroid: false } }],
})
```

In an `app.json` app: `"plugins": [["expo-audio", { "microphonePermission": false, "recordAudioAndroid": false }]]`.

## Play a track

```tsx
const toTrack = (t: Song): Track => ({
  src: t.url,
  title: t.title,
  line: t.artist,
  image: t.cover,
  duration: t.seconds,
  peaks: { values: t.peaks },
});

<Section items={songs.map((s) => ({ key: s.id, title: s.title, onOpen: () => player.play(toTrack(s), songs.map(toTrack)) }))} />
```

- The commands (`play(track, queue?)` and the rest), `usePlayer()` and `usePlayerTime()` are the
  web's. A row draws its playing state by
  `usePlayer().track?.src === row.src`.
- The queue is a list, or a provider for a list too long to hold: over a window read,
  `windowQueue(read, { track, at })` fetches the rows beside the playing one through the read's own
  pages.
- The file and the picture are fetched from their addresses alone: an address behind a credential
  carries its own access (a signed URL), for the dock and for the lock screen.
- `track` of `windowQueue` may return a promise, for an address signed per track (give the track a `key`, since its address changes): it runs for each
  row of a page as the page loads, and a rejection fails that page, which the next press asks for
  again.
- The dock is one bar: the picture, the name over its line, play or pause (the primary glyph) and next,
  with a hairline of progress along its top. A press on the picture and the name opens a `Sheet` with
  the full player: the picture, the seek (a `Waveform` where the track has `peaks` and a length, a
  slider where not), previous, play or pause, next, and a Close that puts the
  player away. It has no volume: the device's buttons set it, and `setVolume` and `mute` act on the
  player only. An `image` given as a selection paints the picture until its read lands.
- The lock screen and the system's media controls show the title and the line, and the picture once
  the dock draws it (an `image` given as a selection once its read lands), and play, pause and seek drive the player. `expo-audio` does not report the system's Next and Previous, so
  those two are the dock's.

**Check:** the dock stands above the tab bar across a route change, with the audio uninterrupted,
and the lock screen shows the track.

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

It takes the web's props (`node_modules/@fcalell/plugin-react-ui/guide/dock.md`, "A waveform on its
own"): `label`, `peaks`, `duration`, `at`, `onSeek` and `fit`. It does not move itself: `at` is the
playhead, so a standalone waveform takes `usePlayerTime().time` or the app's own clock. A drag holds
the finger as the playhead and `onSeek` hears one second, on release; a screen reader's increment and
decrement seek five seconds at once.

**Check:** a drag on the waveform moves the playhead and seeks once on release, and the screen
reader's swipe up and down move it five seconds.
