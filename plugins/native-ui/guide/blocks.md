# Content: text, figures and pictures

The parts that read as a block in a `Section`'s body. `Stats` and `BarChart` draw a card of their own; a `Prose`, `Stages` or `Image` stands in a `Card`. `Waveform` is `audio.md`, and the phone has no `Canvas`. A picture is an `Image`, never React Native's; pictures side by side are a `Gallery`, and a code a camera reads is a `QrCode` (`node_modules/@fcalell/ui-core/guide/pictures.md`). A known sequence with a position in it (Submitted, In spec, In build, Live) is `Stages`, never a `Section` of rows or a status per line; a feed of what happened is no rail. A strip of counts is `Stats`, never a row of `Text`, and one figure is a one-item `Stats`.

## Text

A paragraph in a type role. `kind`: `body` (the default) or `meta`. Its `children` are words, links or runs: a `{ strong }` run is words at weight 500, a `{ code }` run a span of code.

## Prose

Markdown. `markdown` is the text: headings, paragraphs, lists, quotes, rules, inline code, links and fenced code.

## Code

Text in mono, split on newlines.

| Prop | Is |
| --- | --- |
| `text` | the text; a selection paints lines until its read lands |
| `title` | what the text is (a file's name, the tool it goes into), in a head over it; it names the acts. A command or a machine name is a `{ code }` run |
| `copy` | adds the copy act |
| `download` | adds a download act: the text is written to the cache as a file of this name (`download="recovery-codes.txt"`) and handed to the share sheet, from which the phone saves it to Files |
| `tail` | shows only the last lines, that many, behind an act that reveals the earlier ones: a log |

## Diff

Two texts compared, always unified on the phone.

| Prop | Is |
| --- | --- |
| `label` | the file's path |
| `hunks` | the hunks; their ranges are never drawn: lines left out between hunks are one elided row (a meta-ink ellipsis in the mark column, the context git writes after the ranges in the code column) |
| `before`, `after`, `by` | the two texts, compared `by` `line` (the default: code, each line marked and numbered, an added or removed block standing where git's indent heuristic puts it) or `word` (prose: a removed run struck through and an added one underlined in place with a dotted `ok` underline beside its wash, so the edit reads without colour and never as a link) |

## Stages

A rail of fixed states.

| Prop | Is |
| --- | --- |
| `steps` | each a `Stage` (`@fcalell/ui-core/descriptors`), `{ label, state, at? }`: `state` is `done`, `current` or `later`; `at` the ISO moment a done or current stage was reached |
| `ended` | `{ label, reason? }`, the terminal row that stands in place of every stage after the last done one |

```tsx
<Stages steps={request.stages} ended={request.rejection} />
```

## Stats

Figures in cells, two cells to a row. Zeros are counts, drawn. Each `items` entry is a `StatSpec`, one of three kinds:

| Kind | Takes |
| --- | --- |
| plain | `label`, `value`, `unit` (after the figure's last digit), `line` (the sentence under the figure) |
| a link | `href` makes the whole cell a link, a chevron at its label's end; or `counts`, each a `CountLink` with its own `href`, a standalone link on the target height. Never both |
| a meter | `bound`, the limit: the label over the share in percent as its figure, over a bar that fills by the share, amber near full and `danger` over, then its `line` or `counts`; no `unit` or `href`. `mark` is a tick where the fill turns amber; `goal` makes the bound a target to reach (tests passing of all of them): the fill stays in the meta ink short of it and turns the good tone once it is reached, never amber |

A cell's `label`, `value`, `bound` and `line` are constants or selections. A `value` selection paints the figure, inert and no link, while the label, unit and line stand as given; a `line` paints only while its own read waits. A cell whose `value` is a selection is the frame of that read: with no frame above holding it, a failed cell draws the failure mark, "This didn't load." and a retry in the figure's place, the sentence under its bar, and pressing it retries.

```tsx
<Stats items={[
  { label: "Projects", value: projects.length, href: "/projects" },
  { label: "Tests", value: 1284, counts: [{ label: "failing", value: 3, href: "/tests/failing" }] },
]} />
```

## BarChart

Columns over time. It draws its failed and empty shapes; while `items` waits the total and the legend's figures are painted, the plot is one painted box at the loaded height and the time line two painted words.

| Prop | Is |
| --- | --- |
| `label` | what the chart counts, read aloud and never drawn |
| `items`, `bar` | the bars oldest first and the regions that read each: `key`, `value`, `parts` (by `keys`), `at`, `label`, `partial` (hatches a bar whose period is not over), `selected` (the open record's bar in the selection wash) |
| `keys` | the names a bar's parts stack by, bottom first: the chart is stacked and the names are its legend |
| `unit` | what the values count, after the total: `{ one: "flag", other: "flags" }` for a plural, never a bare plural; `{ currency: "USD" }` for money, exact ("$30.97"), the axis whole when its step is, and no word after it |
| `level` | the bars are a level, not a flow (a reading each hour, open flags per round): the head draws their span, the lowest bar to the highest ("18.2–21°C"), never a sum, and the plot each reading as a dot against an axis a step under the lowest and over the highest. A span that is one reading draws no figure. A unit that never sums (`%`, `°C`) is a level unless `level` is `false` |

Give every bar its `at`: the first and the last times stand centred under their bars, kept whole inside the plot, and the ones between at even strides where the line holds twice the longest time. Each bar stands in its region, at least seven (`CHART_REGIONS`), so a series shorter than a week stands in the first of them. `bar.label` names buckets no time names (plans, countries), every bar where the names fit and every second or third where they would touch, in the time line's place. A flow's head sums the bars and its bars stand on zero.

## Image

A picture that opens full size on a press, over the scrim and under any toast, with a Close act, the system's back and a press on the scrim. It draws its own failed form: the failed shape says the `alt`, and a `thumb`, too small for a sentence, draws the glyph alone, the `alt` its name.

| Prop | Is |
| --- | --- |
| `src` | the address; a selection paints the tile at the loaded height until its read lands |
| `alt` | what it shows, a sentence: the failed shape's words and the full view's name |
| `fit` | `content` (the default; the container's width at `aspect`, capped in height) or `thumb`, a square tile beside the lines that say where it came from |
| `aspect` | the width over the height (`16 / 9`). A `content` Image requires it: its box holds that aspect waiting, failed and loaded, the picture cover-cropped to it, so nothing moves when the bytes land. Store the picture's width and height with its address. A `thumb` takes none |

```tsx
const shot = orpc.deploys.shot.read({ id });

<Image src={shot.at((s) => s.url)} alt="Latest preview" fit="thumb" />
<Image src={shot.at((s) => s.url)} alt="Latest preview" aspect={16 / 9} />
```

## Gallery

Pictures side by side that open full size, Previous and Next in the full view stepping through them in the list's order. Each tile stands a fixed height at its `aspect`, held no narrower than three to four and no wider than the container, its caption cut to its width under it; the tiles wrap a gap apart, and each paints, waits and fails as an `Image` does.

| Prop | Is |
| --- | --- |
| `items` | each `{ key, src, alt, aspect, caption? }`: `src` a constant or a selection, `caption` a file's name or a page's address |

## QrCode

A code another device scans, inside a four-module quiet zone, a square at its container's width down to the image cap and centred, so it is never cropped. It takes no press.

| Prop | Is |
| --- | --- |
| `value` | the text it carries (an address), never drawn nor read aloud; a selection paints the tile at that square until its read lands |
| `label` | what it is for ("Code that adds a device"), its accessible name |
