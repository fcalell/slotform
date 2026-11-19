# Figures: Stats and BarChart

The parts that draw numbers, each a card of its own: `Stats`, figures in cells, and `BarChart`,
columns over time or over buckets. The other blocks are [blocks](./blocks.md).

## Stats

Figures in cells. `items` are cells `{ label, value, line? }`, the `line` a sentence under the figure (a selection paints until its read lands). A cell whose `value` is a selection is the frame of that read, as a meter is: given no `Pane` `read` to hold it, a failed cell draws the failure mark, "This didn't load." and a retry on its own. Each cell is one of:

- plain, with a `unit` after the figure's last digit (the spare space stands after the pair).
- a link: `href` makes the whole cell a link; `counts` makes sub-counts links of their own. Never both.
- a meter: `bound` is the limit, so `value` is drawn as a share of it, with sub-counts (`counts`) but no `unit` or `href`. `mark` is a tick on the track where the fill turns amber; `goal` makes the bound a target reached, not a limit.

## BarChart

Columns over time, or over buckets (hours, plans, countries).

- `label`: what the chart counts, read aloud and never drawn.
- `items` and `bar`: the bars oldest first and the regions that read each (`key`, `value`, `parts`, `at`, `label`, `partial`, `selected`). `bar.label` names a bucket under its bar, in the time line's place: every bar is named when the names fit, and every second, third… one when they would touch (`bar.at` times a chart of moments instead); `bar.partial` hatches a bar whose period is not over; `bar.selected` stands the bar of the open record in the selection wash.
- `keys`: the names a bar's parts stack by, bottom first. Present, the chart is stacked and the names are its legend.
- `unit`: what the values count, drawn after the total. `{ one, other }` for a plural, `{ currency: "USD" }` for money.
- `level`: the bars are a level, not a flow (open flags per round): the head draws the last bar's value, never a sum.

From 50 bars the chart scrolls sideways at a fixed bar width and draws its times in place of the bucket names.

