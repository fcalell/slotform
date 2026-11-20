# The test run

`slotform screens test` opens each screen in a headless browser, in five states and two modes (light
and dark), at 320, 1280 and 1920 px, and fails it on what this page lists. A failure names the
screen, the state and the mode. The shots a run saves are [shots](shots.md#screenshots).

The run fails a screen on

- an axe violation (every rule, the page-level ones and `target-size` included);
- a horizontal overflow at 320, 1280 or 1920 px (320 draws the touch density, 1280 and 1920 the
  desktop one, as a phone and a laptop do);
- a finding of the render walk, below;
- a console error or warning;
- a call the fixtures could not answer (no fixture, or a fixture that threw);
- a shift of the loading story ([read checks](read-checks.md#the-loading-shift));
- any of these with one read failed ([read checks](read-checks.md#each-read-failed)).

A story that holds no calls (data, error, empty, not found) is judged and shot by the same rule, so
an error story shows the failed shape: a failed query stays fetching through the client's one retry
(about a second).

A part that lays itself out after its first paint (the Canvas) marks itself `aria-busy` until it
is drawn, and the run waits for it. The run plays the paused finite animations to their end before each shot: a part that
fades in late is shot shown, never hidden.

## The render walk

One walk of the page's elements at each width, after the resize settles, reads what is drawn against
the contract's values: the page's own computed `--spacing-*`, `--text-*` and `--radius-*` at the
density it is in (inside a `Panes` that declares a `room` distance, the room's own values). It reports
a finding as `rule: element measured X, expected Y; fix: how`.

| Rule | A finding is |
| --- | --- |
| `type-size`, `type-sizes` | a visible text under 12 px; more than six distinct font sizes on the screen |
| `control-height` | a button, field, switch, combobox, tab or checkbox whose height is no size (control, target, row, icon-control) or formula over sizes a recipe spells (a one-time-code box's body line and two pads); where it sets a floor (`min-h-*`), a floor that is no token, or a height under it |
| `row-height` | a row, option, menu item or tree item under the row floor |
| `gap`, `inset` | a flex or grid container's gap or padding that is neither 0 nor a spacing token |
| `radius` | a corner that is no radius role or pill |
| `nested-radius` | a box inside a rounded box with an inset smaller than the outer radius whose radius is not the outer less the inset |
| `clip` | a box that clips (`overflow` hidden or clip) with more inside than it shows and no ellipsis or line clamp |
| `font-late`, `font-failed` | a font face still loading at the screen's first frame, or failed. A family's metric fallback face ("IBM Plex Sans Fallback", a `local()` system font the browser loads only for a glyph the family lacks, such as "→") is left out: a host without that system font fails it and the platform stack draws the glyph |
| `tabular-digits` | a text that is only a number (digits with separators, a sign, a percent, a currency symbol or a unit of up to three letters) in a proportional face without `tabular-nums` |
| `region-name` | a landmark region inside another of the same accessible name |
| `canvas-open` | a canvas, once it shows, with a node (`data-node`: its card, or its glyph under the text floor) cut at the pane's start by more than a pixel, or standing under its zoom stack. The pane's far side may cut a node where the graph is wider than the overview's floor holds, so it is not read; a node wholly outside the pane is the viewer's to pan to |
| `text-covered` | a visible text with a point on one of its lines under a box that is no relative of its element and draws there: a background, a picture, its own glyphs, or the edge of its border, outline or ring (a Banner's act standing over the last line of its sentence). The walk brings each text into view, samples points across its line boxes (`Range.getClientRects`, about every 12 px along and 3 px down) and reads them with `document.elementsFromPoint`, then puts the scroll back. Not covers: a box in a dialog, menu, listbox, tooltip or popover layer, a sticky box, a box that draws nothing at the point (a transparent overlay, a hit area), and a text that draws nothing itself (transparent ink or opacity 0, as a label held under a spinner). While a modal is open, the page behind it (and anything `inert`) is not read. A `pointer-events: none` layer is not in the hit test, so a decoration that lets the press through is not read |
| `align-dead` | a box in the flow, wider and taller than half a pixel, that draws nothing: no text (white space counts where the box preserves it, as a code line's indent), background, border, shadow or outline, no picture or control, nothing inside that draws (the empty end square of a row). Out-of-flow boxes, a window's spacer (`data-spacer`), pictures, controls, table cells and fully transparent boxes are not found; a box an animation reveals (a fade, a record's name in a touch bar) draws what it holds, its descendants included, though hidden until the animation shows it |
| `align-centre` | a row (a flex row with a row role, or the floor of a row token; a flex column that is one, a definition row, is measured on its first flex-row child, its label line, whose centre is the row's here) whose end items, the drawn leaves beside its label (a waiting row's label is its first filler, as the loaded row's is its first text; a spinner's glyphs are a mark, never the label), beyond its right edge and not in the text group below its first line, are more than 1 px off the vertical centre of the row's content box, inside its padding (a value on the label's line beside a chevron on the row's middle) |
| `align-baseline` | two bare texts of different sizes on one flex-row line whose baselines differ by more than 1 px (a count centred by its line box beside a heading). Texts inside a painted box or a control, an item of two lines and a nested row's own texts are left out |
| `align-grid` | any element whose computed `display` is `grid` or `inline-grid`: the layout is flex alone, so the phone mirrors it. The grids structure rule 1 allows are excepted, each by the element itself and never what it holds: the run of rows (`ROWS`, a sheet's or a Form's two-column grid, `grid-cols-[fit-content(var(--container-measure-short))_minmax(0,1fr)]`) and the subgrid on a definition row and the one on a form's group (`grid-cols-subgrid`) |

The walk leaves out what is not drawn: `display: none`, `visibility: hidden`, `aria-hidden`, a box under
a pixel wide or high, and what a pixel-wide clipping box holds. The headings it counts (`heading-one`,
`heading-order`) are the ones a reader gets: a heading under `display: none`, `aria-hidden` or `inert` is not
one, except while a modal Sheet is open, which hides the page behind it and leaves the page's own `h1`
the page's. It sees through `display: contents`.
Its named exceptions are listed in one place, `EXCEPTIONS` in the `screens` plugin's `walk.ts`, each with
its reason; a finding is fixed in the component or the screen, never baselined.

## Narrowing a run

With no flag the run covers the screens a file with uncommitted changes reaches, in every state, mode
and width. Flags narrow it on each axis and combine freely; the run prints what it covers first.

| Flag | Narrows to |
| --- | --- |
| `--screen <list>` | the screens named, instead of those a changed file reaches: a route id (`/_app/deploys`) or a screen's title (`deploys`, `Screens/deploys`), comma separated |
| `--state <list>` | some of `data`, `loading`, `error`, `empty`, `notFound` |
| `--width <list>` | some of `320`, `1280`, `1920` |
| `--mode <list>` | some of the app's modes (`light`, `dark`) |
| `--changed <ref>` | the screens a file changed since the git ref reaches (a batch committed in a worktree runs `--changed master`); beside `--screen` it keeps only the named screens that file reaches |
| `--all` | every screen |

A change under the `src/` of a workspace package the app links, outside the directories its source
exports serve, reruns every screen: it reaches no screen's module graph.

**The narrowed run is the check.** Choose the narrowest run the diff allows:

| The diff | Run |
| --- | --- |
| Nothing but a screen's own file (a route, its components, its fixtures) | the default: the screens it reaches; `--screen <it>` names them |
| A component or a screen's markup | the screens that use it (grep the app's routes for the component), `--screen a,b` |
| A loading form only | `--state loading` |
| An error, empty or not found form only | `--state error`, `--state empty`, `--state notFound` |
| A colour, an ink or a surface; no token, theme or layout change | `--mode light` (or the app's default mode) |
| Something behind one width variant (`touch:`, `page-tablet:`, a breakpoint) | that width: `--width 320` for `touch:`, `--width 1280,1920` for a `desktop:` or `wide:` |
| A new screen | all its states, the default look: `--screen <it> --mode dark --width 320,1920` |
| ui-core's tokens or theme, the app's CSS, a layout component (Shell, Panes, Pane, Section) or a dependency bump | the screens you are working on, `--screen a,b`; never every screen as a gate |

Combine the rows: a loading change on one screen's touch tree is
`slotform screens test --screen deploys --state loading --width 320 --mode light`.

## Limits

- `target-size` is axe's WCAG 2.2 rule, the rubric's target floor: a target under 24 px fails
  only when a 24 px circle on it meets another target, so a lone small control passes. The 44 px
  primary act on touch is judged, since the run is at desktop density.
- An open non-modal popup (a Menu, a Picker, a Pane's more menu) is judged like the
  rest of the page: the roster takes `aria-hidden` off Base UI's focus guards, so axe's
  `aria-hidden-focus` has nothing to flag and nothing is excluded.
