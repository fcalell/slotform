# Audio

Sound a viewer plays is the player, never an `<audio>` in a screen. The app passes the player one
output, calls `player` with a `Track`, and gives the `Shell` a `Dock` for its `foot`; the dock stands
under the place while a track is loaded, and the sound goes on through navigation. The dock and a
waveform on its own are [dock](./dock.md). Nothing here mounts by default: an app that plays no sound carries no audio.

```tsx
import { Dock } from "@slotform/react-ui/components/dock";
import { Waveform } from "@slotform/react-ui/components/waveform";
import { audioOutput, connectOutput, player, usePlayer, windowQueue } from "@slotform/react-ui/lib/player";
```

## Set it up

```tsx
connectOutput(audioOutput()); // once, before the app renders

<Shell places={places} foot={<Dock />}>…</Shell>
```

- `audioOutput()` is the browser's audio element as the player's `Output`, made when the first track
  loads. Another engine is an `Engine` (`(report) => Output`, `@slotform/ui-core/player`): the store
  tells it to `load`, `play` and `pause`, and it reports the sound's events through `report`.
- `player.play` and `player.load` throw until an output is passed, so a forgotten `connectOutput` fails loudly.
- `createPlayer` (`@slotform/ui-core/player`) makes a store over a `PlayerHost`; `lib/player` is the
  one the app calls, so there is one player per page.

## Play a track

A `Track` (`@slotform/ui-core/descriptors`) is the file and what is known of it:

```tsx
const toTrack = (t: Song): Track => ({
  src: t.url,
  title: t.title,
  line: t.artist,
  image: t.cover,
  duration: t.seconds,
  peaks: { values: t.peaks },
});

<Button label="Play" onAct={() => player.play(toTrack(song), songs.map(toTrack))} />
```

- Call `player.play` from a press: a browser holds back sound nothing asked for, and the track then
  waits paused.
- The second argument is the queue Next and Previous walk; leave it out and the track plays alone.
  The queue stays while the tracks played are in it. A track is the same track by its `key`, else its
  `src`.
- A queue too long to hold (a `Table` over a window read of tens of thousands of rows) is a
  provider: `queue` takes `{ next(current), previous(current) }` instead of a list, each
  returning the `Track` beside `current` (or `undefined` at an end), now or as a promise. The
  player asks it once as a track loads, so the dock knows whether a Next exists before it is
  pressed (it is shown until the provider answers there is none), and `ended` and the media keys
  walk the same way. A provider is kept while the tracks played are the ones it gave. Over a
  window read, `windowQueue` is the provider; it fetches the rows beside the playing one through the
  read's own pages, in its order and filter:

  ```tsx
  // useWindow: @slotform/ui-core/react/read
  const rows = useWindow(tracks)?.rows ?? [];
  <Table items={tracks} row={{ id: (t) => t.id }} onOpen={(id) => {
    const at = rows.findIndex((t) => t?.id === id);
    player.play(toTrack(rows[at]), windowQueue(tracks, { track: toTrack, at }));
  }} />
  ```
  `track` may return a promise, for an address signed per track (give the track a `key`, since its address changes): it runs for each row of a page
  as the page loads.
- `player.load(track)` cues it paused; `pause`, `toggle`, `seek(seconds)`, `skip(seconds)`,
  `setVolume(0..1)`, `mute()`, `playNext`, `playPrevious` and `close` do what they say.
- `usePlayer()` reads `track`, `playing`, `failed`, `volume`, `muted`, `queue`, `next` and
  `previous` (once a provider has answered), `queued` and `hasNext` with the same commands, so a row can draw its own playing state:
  `usePlayer().track?.src === row.src`. `usePlayerTime()` reads `{ time, duration }` and draws
  again on each frame while it plays: use it only where the time is drawn.

**Check:** the dock stands under the place across a route change, with the audio uninterrupted.
