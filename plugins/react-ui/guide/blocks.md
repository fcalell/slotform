# Blocks: text, code and pictures

The parts that read as a block in a `Section`'s body, and the pictures. [`Card`](./containers.md#card) names the ones that stand in a `Card`. `Stats` and `BarChart` are [figures](./figures.md), a `Waveform` is [dock](./dock.md) and a `Canvas` is [canvas](./canvas.md). This page is what each takes.

## Text

A paragraph in a type role. `kind`: `body` (the default) or `meta`, not named `role`, which is the ARIA attribute. Its `children` are words, links or runs: a `{ strong }` run is words at weight 500, a `{ code }` run a span of code.

## Prose

Markdown. `markdown` is the text: headings, paragraphs, lists, quotes, rules, inline code, links and fenced code.

## Code

Text in mono, split on newlines.

- `text`: the text. A selection paints lines until its read lands.
- `title`: what the text is (a file's name, the tool it goes into), in a head over it; it names the acts.
- `copy`: adds the copy act.
- `download`: adds a download act that saves the text as a file of this name (`download="recovery-codes.txt"`).
- `tail`: shows only the last lines, that many, behind an act that reveals the earlier ones: a log.

## Diff

Two texts compared. `label` is the file's path. Give `hunks`, or `before` and `after` with `by`: `line` (the default: code, each line marked and numbered) or `word` (prose: a removed run struck through and an added one underlined in place, in a card at the measure). A code diff spans the `Pane`'s body (`data-wide`).

## Stages

A rail of fixed states.

- `steps`: `{ label, state, at? }`. `state` is `done`, `current` or `later`; `at` is the ISO moment a done or current stage was reached.
- `ended`: `{ label, reason? }`, the terminal row that stands in place of every stage after the last done one.

## Image

A picture that opens full size on a press.

- `src`: the address; a selection paints the tile until its read lands.
- `alt`: what it shows; the failed shape's words and the full view's name.
- `fit`: `content` (the default; the container's width at `aspect`, capped in height) or `thumb`, a square tile.
- `aspect`: the width over the height (`16 / 9`), which the screen gives as it knows it before the bytes land. A `content` Image requires it; a `thumb` takes none.

```tsx
<Image src={cover} alt="Cover art" aspect={16 / 9} />
```

## Gallery

Pictures side by side (`node_modules/@fcalell/ui-core/guide/pictures.md` says when). `items` are the pictures, in the order the full view steps through them:

| Field | Is |
| --- | --- |
| `key` | tells the picture apart, kept while the list changes |
| `src` | the address; a selection paints the tile, inert, until its read lands |
| `alt` | what it shows: the tile's accessible name and the full view's name, a sentence |
| `aspect` | the width over the height (`16 / 10`) |
| `caption` | a line under the tile, cut to its width (a file's name, a page's address) |

Each tile stands a fixed height at its picture's `aspect`, held no narrower than three to four (a phone's page is cropped to its top, where its head is) and no wider than the container, and the tiles wrap a gap apart. A tile paints, waits and fails as an `Image` does. A press opens the full view on that picture, with Previous and Next beside it stepping through the others in the list's order (and the arrow keys).

```tsx
<Gallery
  items={shots.map((shot) => ({
    key: shot.path,
    src: shot.url,
    alt: `Screenshot ${shot.path}`,
    aspect: shot.width / shot.height,
    caption: shot.path,
  }))}
/>
```

## QrCode

A code a camera reads (`node_modules/@fcalell/ui-core/guide/pictures.md#a-code-a-camera-reads-is-a-qrcode`).

| Prop | Is |
| --- | --- |
| `value` | the text it carries (an address), a constant or a selection, which paints the tile until its read lands; never drawn nor read aloud |
| `label` | what it is for, its accessible name ("Code that adds a device") |

It draws its modules dark on a light tile in both modes, inside a four-module quiet zone, a square at its container's width down to the image cap and centred, so it is never cropped.
