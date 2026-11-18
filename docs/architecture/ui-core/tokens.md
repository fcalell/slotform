# Tokens

The token contract of `@fcalell/ui-core`: the six knobs a theme sets, the token values they move,
how the derivation holds every contrast contract at any hue, the density sets and the room, the
type, spacing, size and width scales, the reset that keeps an off-contract utility from compiling,
the `cn()` merge config and the token records each plugin renders. The emitted `DESIGN.md` lists
every resolved value ([DESIGN.md](roster.md#designmd)); this page holds how they are made and why.

## The contract as data

The contract is closed and held as data in `tokens.ts`; the emitted `app.css` carries exactly those
values. The derivation keeps one base per scale, so every number is explainable, and a consumer moves
the knobs and never a token. A part draws a token by its role, and which tokens a component may draw
is its roster entry's ([token ownership](roster.md#token-ownership)).

## Knobs

A theme sets a knob and never a token. There are six knobs; every other value is a token value and moves
only with it. A per-scale knob or a per-token override would let a consumer re-tune a system it did
not design, and every measured pair would need re-checking by hand, so neither exists; a second
primary fill is a theme decision, never a call-site value.

| Knob | Default | Moves |
| --- | --- | --- |
| `hue.accent` | 264 | the accent-bound roles: `accent`, `accent-soft`, `accent-ink`, `accent-edge`, `ring`, `selected-outline`, `act-accent` with `act-accent-hover`, `act-accent-press` and `act-accent-pending`, `toggle-on` and `toggle-on-hover`. The three status hues, the hued chip families and the avatars are fixed |
| `hue.cast` | `hue.accent` | the hue every neutral carries: `canvas`, `surface`, `group`, `band`, `raised`, the three hairlines, `scrim`, the three inks, the washes, `skeleton`, `switch-off`, `fill-disabled`, `fill-neutral` with the neutral chip's soft and ink, and the light shadows. It never reaches the accent, the status trio, the hued chip families or the avatars |
| `radius` | 6 | the control's corner radius in px, 0 to 12; the layers derive theirs from it (`radiusPx`, [radius](#radius-hairline-and-focus-ring)) |
| `fonts` | `sans` "IBM Plex Sans", `mono` "IBM Plex Mono" | the two families as `--font-sans` and `--font-mono` ([fonts](#fonts-and-advances)) |
| `size` | 13 | the desktop body in px, 12 to 18, the one base every scale derives from: the type roles, the spacing roles and the sizes follow it at every density (`bodyOf`), so a denser or a roomier interface is one number |
| `defaultMode` | unset | the mode a viewer with no stored choice starts in, ahead of the system preference; unset, the system decides |

`hue.accent` and `hue.cast` are in `[0, 360)`. An unset cast is the accent's hue, so an accent alone
tints the chrome toward it. The cast reaches every neutral through the `"cast"` hue marker at the
chroma the token values fix per role and mode, so it tints the chrome and moves no contrast. Chroma is
never a knob: it decides whether a cast is a tint or a colour, so only the hue is one. Density is no
knob either: the pointer and the width decide it ([density and room](#density-and-room)).

Both UI plugins take the same `theme` object, the knobs and the mode the app starts in; omitted, the
calibrated defaults apply, and a consumer with both platforms passes one object to both.

## Colour tokens

A colour is one of:

- a light and a dark OKLCH value;
- an alias of another role;
- a `veil`: a role at an alpha, what `color-mix(in oklch, role α, transparent)` draws;
- a `mix`: a role mixed toward another in OKLab, what `color-mix(in oklab, role, toward amount)`
  draws, `black` standing in for the shade. A mix names one `toward` for both modes or one per mode.

A literal or a `mix` may carry `grounds` per mode, a contrast contract against named grounds; on a
`mix` the mix is where the search starts ([derivation](#derivation)).

Colour roles are named for the place they draw: surfaces, three inks, the accent family, status
families, chip families, avatars, washes, act fills and the switch set. A neutral wears the cast's
hue at the chroma declared for it, a constant per role and mode.

## Derivation

`deriveTheme(theme)` resolves the knobs into final values, one string per token. A contrast contract
is one a role keeps at any accent or cast hue: the derivation moves the role's lightness from the
declared one (a literal or a `mix`) in 0.005 steps away from each ground until every contract holds,
re-clamping the chroma at each step. Each ground is the luminance a contract measures against.
Every contract is measured on the painted 8-bit sRGB value (each gamma-encoded channel rounded to
0..255), the colour a browser paints and a contrast checker reads, and on nothing else: the unrounded colour can pass a floor its painted colour misses by a rounding. A
green accent's link then stays readable on a group where the blue one is at the declared lightness
already. `under` names a veil over the ground, composited as a browser draws a translucent fill over
an opaque one (an alpha blend of the two 8-bit colours in gamma sRGB, the result painted in 8
bits): a label on a pressed part. The token values carry the held
value at its own hue.

A declared value keeps its chroma inside sRGB at the same lightness, so a re-hued accent keeps its
luminance and contrast and loses saturation at a hue the gamut cannot carry, never clipping to
another colour. The token values are in gamut, so at the default hue nothing moves. The
contracts the token values carry include `accent-ink` on `group` and on `accent-soft` at 4.5:1, the dark
`accent` on `group` at 3:1 and `act-accent-pending` at 3:1 under `on-act-accent`; they hold on the
painted colour at every hue of either knob (`derive.test.ts` sweeps both knobs over 0..359).

The conversions are Björn Ottosson's reference matrices for OKLCH, OKLab and sRGB (`oklch.ts`,
internal, no subpath). The derivation mixes in OKLab (a hover fill toward black, a pending fill
toward its label), clamps a re-hued accent's chroma into the sRGB gamut, and converts the shadows to
sRGB because React Native's `boxShadow` parses no oklch. `derive.test.ts` measures the contrast
contracts on the painted colour through the same matrices, with a luminance of its own.

`deriveTheme().motion` carries the motion scale as numbers ([one table of numbers](motion.md#one-table-of-numbers)).

## Surfaces and ink

Surfaces step in CIE L*: light canvas 96.9 under surface 100 and over group 93.8; dark canvas 3.7,
surface 8.0, group and raised 13.0. The dark table is a full step under the sheet and a step off
black (rgb 12 13 15), so it reads as a drawn ground, never as the screen switched off.

Text has two inks, `ink-body` and `ink-meta`. A third ink is a mark, not text: `ink-mark` (a
separator, a chevron, a neutral dot) holds the non-text floor of 3:1 on the canvas, the surface and
the group, and on a selected row, in both modes. `ink-disabled` is the one text ink below the floor,
about 3:1, which WCAG exempts for a disabled control.

The accent is a blue between Linear's indigo and Vercel's blue, whose hue the neutrals wear unless
the cast names another. `accent-ink` is the accent itself in light and lightens in dark, so a link
and a ring read on the near-black ground. The dark status tones are capped at L 0.75 like the chip
marks, and their lightness is spread so they separate under protanopia and deuteranopia.

The neutral state's ground (`waiting`, `idle`) has no hue to tell it, so it stands apart by
lightness: in light a step under a disabled act's fill and the grey chip (L 0.92 against about 0.96
and 0.94 on the sheet); in dark a step over the sheet, a tile and a disabled fill (0.33 against
0.21, 0.25 and 0.26). It is never the veil a disabled act wears nor the sheet an outlined pill stands
on. It is opaque, so it reads the same on every ground.

## Contrast floors

The grounds a mark stands on are the table (`canvas`), the sheet and the card (`surface`), a tile
(`group`) and a selected row, and a floor is measured against the hardest of them in each mode.

- The faintest text ink holds 4.5:1 on the table, the sheet, a tile and a selected row (the shell's
  selected place included), and on the neutral state's ground, which it is the ink of, in both modes.
- A badge's words are the meta ink on the meta ink's own tenth, laid over the ground the row stands
  on: the text floor holds on every ground, in both modes, and the badge's ground is a step away from
  the one under it (`badge.test.ts`).

## Interaction colours

- Hover and press move a fill 12 % and 22 % away from its label, so the label only gains contrast:
  both filled acts wear a white label in both modes and move toward black. The danger act in dark is
  a deep red of its own, since the danger ink holds no light label.
- Pending is inert and recedes 30 %: a filled act toward its label in light and toward the page in
  dark, held at 3:1 under its label, where the spinner draws. A labelled act's fill takes no ground
  floor in any state: its label names it.
- A toggle on (a switch's track, a checked box, a slider's fill) has no label to carry it, so it is a
  boundary at 3:1 on every ground, and its hover moves away from the ground: darker in light,
  lighter in dark.
- A QR code keeps its light tile in dark mode, as a printed one does: a camera reads dark modules on
  a light ground, and some readers fail an inverted code. Its modules are the light mode's body ink
  ([QR code](components.md#qr-code)).

## Chart colours

The six chip families' hues and the lightness each mark takes alternate between neighbours, so the
set separates by lightness as well as hue; light marks are floored at L 0.50 and dark marks capped
at L 0.75.

A chart series' fill is the chip hue at about 60 % of the mark's chroma, its lightness the nearest to
the mark's that holds 3:1 on `surface` and `group` (light: the lightest that holds; dark: the
darkest). A chart's series take the `chart-<hue>` fills in `CHART_SERIES` order: the chip hues, then
the neutral grey. One series takes the first. The seventh is the neutral family's grey, in the cast
hue at the neutrals' chroma, at the lightness that holds 3:1, because no seventh hue stands outside
the accent's 215 to 290 band that the six hues leave free. A meter's level turns on `METER_NEAR`.
Both platforms read these, so they draw the same colour for a value.

## Edges

The dark hairline is two tokens, since the dark ladder spans more than one hairline can straddle:
`edge` over canvas and surface, and `edge-raised` inside a group and a lifted layer. In light both
are one hairline. `edge-strong` is a control's boundary under the pointer and a mark's ring at 3:1;
at rest a control's edge is the hairline.

A part names `edge` and the ground it stands in decides what it draws, so no part picks between the
hairlines:

- A raised ground (`RAISED_GROUNDS`: `group`, `raised`) re-points the hairline for everything inside
  it to `edge-raised` (`RAISED_GROUND_TOKENS`).
- A soft ground (`SOFT_GROUNDS`: `accent-soft`, `ok-soft`, `warn-soft`, `danger-soft`,
  `chip-neutral-soft`, the tones a banner and a state pill stand on) is no edge for a hairline (a
  tenth or a soft tint from the canvas), so it re-points it to `edge-strong`, the one boundary that
  holds 3:1 on every one of them (`SOFT_GROUND_TOKENS`). A quiet act on a banner is then an edge.
  `edge.test.ts` holds the strong edge at 3:1 on every soft ground, in both modes, a veiled ground
  over each ground it can lie on.

The web scopes both by class on the grounds' fill classes (`.bg-<ground>` for each listed ground), after the mode
scopes, so a ground that is also a mode scope still re-points. Native wraps a raised surface's
content in `RaisedGround` and only a banner's in `SoftGround`, uniwind `ScopedVariables` resolving
each `var()` in the mode, since they take a value and never a `var()`.

## Density and room

Density is decided by the pointer and the width, never by a knob. Where the primary pointer is fine
(a mouse or a trackpad) and the viewport is at least `tablet` wide the web draws the `desktop` set;
everywhere else it draws the `touch` set, the 44 px world, so a desktop window narrower than `tablet`
draws touch. `themeTokens` seeds the touch set on both platforms and the web overrides it with the
desktop set, so no class set carries a density class. `data-density` on the web root pins any set on any
device: it is how the showcase and a board address a density, and the one supported answer for a
narrow fine-pointer window. Density moves the type scale, the spacing roles and every size (plus
`hairline`); in `room` it moves the radii, the widths, the hairline and the ring too. Native is touch
and room only.

One type scale at every density does not fit both a mouse and a finger, and a `fine:` variant in a
class set puts an interaction condition in a shared class set that native cannot read. So a value that flips by
density is an overlay over the desktop class set, never a matrix value. Structure follows width in CSS
wherever CSS can. A molecule whose structure (not a token) follows density reads it through the web's
`touch:` custom variant, which applies exactly where the touch set draws (a `data-density="touch"`
pin, or no `desktop` pin where the pointer is not fine or the viewport is narrower than `tablet`), or
through `useTouch` where the tree differs; native has no variant, since it always draws the touch
structure.

The three scales density moves are numbers in `scales.ts`: px on the desktop and touch sets, canvas
units on the room set. Each follows the body size, which the `size` knob sets (`bodyOf`); every
function takes the knob last and defaults to the default knob. They depend on nothing else, so native,
which scales the room set at runtime, reads them without the theme.

### The room

`room` is the one set a screen declares (the `Panes`'s `distance: "room"`), because no media query
detects the viewing distance of a television or a wall display. It is the touch set drawn on
`ROOM_CANVAS` (960 × 540) and multiplied by the room unit
`u = max(1px, min(100vw / 960, 100dvh / 540))`, never a hand-tuned ladder. Native computes the unit
from the window's size (`roomUnitFor`). At 1920 × 1080 `u` is 2 px, so the body is 32, the title 44, a control 88
and a row 96. The unit takes the tighter axis, so a portrait or ultrawide screen stays inside the
canvas, and it is never under 1 px, so a small window keeps the touch set at least.

`roomTokens` is the room set as one record both platforms scale: the type roles, spacing roles and
sizes of `densityTokens`, plus what is a constant at the other densities and scales with the room,
the radii (the `radius` knob's, in canvas units), the fixed widths and the hairline. Each value is the
canvas units its token holds and `scale` turns them into the platform's value: on the web a `calc`
over `--room-unit`, on native the number times the unit. The type, the space and the sizes follow the
`size` knob. The `ch` measures stay as they are. In the room only, `display` is 5
times the body and `page` is the ten-foot safe area ([spacing](#spacing)).

Breakpoints stay px, so a room place holds one structure: it draws its last Pane alone and holds one
column of `Columns` and `Stats`. Focus is the ring, scaled, with no scale transform. A room app runs
dark. `vw` ignores browser zoom, so a room size does not zoom: the screen is read, never zoomed. A
`calc` size is fractional.

## Type roles

Two rules decide which role a piece of text takes. Size follows structure, never emphasis: the
primary line of anything is `body`, a secondary line is `meta`, and emphasis inside a line is weight
500 (`strong`), never a size change. A size role names a place, once:

- `title`: a page's or a record's name, once per page or record;
- `heading`: a section's or a card's name, never inside a row;
- `caption`: text inside a small component (a chip, a key hint), never a sentence;
- `code`: what a machine reads;
- `figure`: a count's number in a strip of them, between `display` (one per screen) and `title`.

There is no label role: a field label and a row's leading cell are `body` at 500, a table header is
`meta` at 500, menu and picker items are `body`.

A role's `size` is a ratio of the body size, rounded to the pixel; its `leading` a ratio of the size,
its line box rounded to the even pixel (a tie rounds up). Tracking is in em and density-invariant.
Ink is a colour role, family a font role. `tabular` draws the figures at one width: a display and a
figure are stats. A type-role class set carries its ink, family and figures ([class sets](roster.md#class-sets)).

The body size per density is the knob's on the desktop; touch and the room keep the token values' ratio
to the desktop, `max(16, round(size × 16 / 13))`, never under 16, the input size below which iOS
Safari zooms a field on focus (`bodyOf`).

## Spacing

One base, `SPACE_BASE`, 4 px at the default `size` knob (`4 × body / 13`); every role is a multiple
of it, picked per density, so a density moves roles up and down one ladder and invents no value.
The base follows the body size, so the knob moves every role with the type (`spacingOf`).

Six roles, by use:

- `gap`: between the siblings of a row (a glyph and its label, a label and its value, act and act, a
  dot and its word), and above and below a row's line, which is how a row gets its height;
- `badge`: between the badges of a facts line, across and down, one rung at every density (a badge's
  inline inset is the `gap`);
- `pad`: a box's inset (a control's inline padding, a sheet, a card, a popover);
- `stack`: between the parts of one block (the fields of a form, a title block and its list);
- `section`: between the blocks of a page;
- `page`: the page inset.

Rows in a list abut on their hairlines. A role never takes a width's name: `w-*` reads the spacing
role first, which would shadow the width.

Touch is the same roles one rung looser, except the float inset, the acts gap and the badge gap,
which hold, and the page inset, which a phone narrows. Room is the touch set with the page inset at
the safe area of the ten-foot canvas, 48 canvas units (12 rungs) all round: one `page` role serves
both axes, so it costs the canvas height 42 units over the 27 the guidance allows top and bottom.

## Sizes and hit target

Heights and squares sit in the `--spacing-*` namespace, so a class set names them as it names a role
(`min-h-control`, `size-icon`). The scale is generic: a size names a measure every component may
stand on, never one component's part. There are eleven:

- `control`: the body line and the gap above and below it, at least the target (a button, a field,
  a pick, a nav row, a segment);
- `row`: the same measure as a row's floor (`min-h-row`), never its height: a row is its lines and
  the gap above and below them, so one that wraps grows;
- `target`: the hit floor;
- `line-body`: one body line box;
- `hairline`: a box's border, which an act inside it reaches across;
- `icon-meta`, `icon`, `icon-control`: an icon sized by what it sits beside (meta or caption text,
  body text, the inside of a control); `icon` is `body × 7 / 6` rounded to even, the other two one
  even step either side;
- `dot`: half the meta icon, a mark inside a line of text;
- `figures`: four tabular figures at the code size (a diff's number columns, a file row's count lanes);
- `measure`: the width of running text, so a meta line, a paragraph and a form share one width.

Every size is derived from the type and the space (`sizePx`), so the `size` knob moves them all. The
one declared value is the target, the hit floor of a pointer or a finger, which no knob moves: 28 on
the desktop, over WCAG's 24, and 44 on touch, so the room set holds 44 of 960, the 32 the ten-foot
guidance asks, and 88 at 1920. A component's own measure (a switch's track, an avatar, a docked
sheet's floor, a text area's three body lines) is a sum or multiple of these in its class set, never a
size of the scale, so the size knob moves every component with the type.

## Widths

Widths come in two kinds:

- A **measure** is a count of characters (`MEASURES`: `measure-short`), `ch` on the web, so it
  follows the type it is read in and the `size` knob. Native reads no `ch` (uniwind has none), so
  `nativeMeasureTokens` declares it in px at `SANS_ADVANCE` of the touch body size, rounded up, a
  label's own size lost. In the room native scales that px with the room instead of following the type (`roomMeasureTokens`).
- A **unit width** is a count of `SPACE_BASE` (`WIDTH_VALUE`, px through `widthPx`), a px the font
  cannot shift (a `ch` width moves when the font loads), which the `size` knob moves with the body
  and no density does: a phone keeps the desktop's toast.

The unit widths are the lifted layers, each at its pattern's range (a layer never stretches to its
container), the regions of a container (the sidebar, a split's list column, the auth column, an empty
state's column) and a canvas node's. A split's list holds the `list` width and its record pane takes
the rest, never under `region-min` ([Pane](layout.md#pane)). `column` is a board column's width and
the range of the filters popover. `node`, 60 units, is the width the Canvas's layout reads off the
rendered theme as a number.

A width name never repeats a size name: `max-w-*` reads `--spacing-*` first.

## Fonts and advances

The theme names the families; each plugin's `fonts` option carries the files. Each family stack is
the family, then its metric fallback face, then the platform's fallback stack. `fallbackFace(family)`
names the metric fallback once (the family name plus ` Fallback`): a local platform font sized to the
family's box, so the swap moves nothing. The web plugin declares it beside the family's own
`@font-face` and the stack names it second; a platform that declares no such face skips the name.

Sizes counted in figures are px at an advance, never `ch`, since native has no `ch` unit:

- `SANS_ADVANCE`: IBM Plex Sans's tabular figures, 600 over its 1000 em (0.6). The measure of running
  text derives from it at each density's body size, and native's short measure at the touch body
  size. A named sans with a wider "0" overflows them.
- `MONO_ADVANCE`: IBM Plex Mono's 600 over its 1000 em. `figures` derives from it; a named mono with
  a narrower advance fits inside it, a wider one does not.

## Radius, hairline and focus ring

The radius is spent by role: chip, control and row at the `radius` knob; badge one under it (a soft
box inside a line of text); card (a sheet on the canvas), popover and sheet (a centred sheet too) a
third more, rounded up (3 → 4, 6 → 8, 9 → 12), so a layer stays rounder than what stands on it;
`full` on round parts only (DESIGN.md's Shapes table names them). A radius is density-invariant: it names the role, not the size.

One hairline width serves region edges, row splits and field boundaries. The focus ring is `ring`,
drawn outside the box at an offset so it never covers the control's own edge; inside a list it is
drawn inward. A bordered box that takes typing or choosing rings on its edge instead: the offset is
the hairline pulled back, so the ring is centred on the 1 px edge.

## Icon strokes

An icon's stroke is `ICON_STROKE`, in units of Lucide's 24-unit grid, so it scales with the icon.
`line` (2) is an icon's own weight, Lucide's default. `mark` (3.5) is the weight of a mark that
carries meaning at the meta icon size (a checkbox's tick or dash, a change mark's glyph), where
`line` draws 1.17 px at 14 px and straddles two pixel rows at partial coverage; `mark` is 2.04 px at
14 px, the meta icon size at either density. Both platforms pass it as the glyph's `strokeWidth`; no
component spells a stroke literal.

## Layers and shadows

The layers over the page, lowest first, each one step above the one before it and the first one step
above the page's own (the root's 0, the page column a stacking context of its own, so a part lifted
inside the page stays in it):

1. the Shell's sidebar, floating its rail and expanded column over the page;
2. a sheet with its scrim;
3. a popover (a picker's list opened from a sheet's field);
4. the toasts, so a toast raised while a sheet or a confirm is open is seen and its dismiss pressed.

A stacking order inside one component is its own structural class, never a layer. The roster's
`LAYERS` are the component tiers, a different concept ([roster entries](roster.md#roster-entries)).

There are two shadow elevations, spent on lifted layers only: `float` (a popover, a menu, a picker, a
toast) and `modal` (a dialog, a sheet, a command palette). Each is a tight contact shadow plus a soft
ambient one, tinted with the cast in light; in dark the lift is carried by the raised step and the
hairline, so the shadow is pure black at a higher opacity.

## Tailwind reset

Eleven theme namespaces reset to `initial`, so an off-contract utility compiles to nothing:
`--color-*`, `--radius-*`, `--text-*`, `--leading-*`, `--tracking-*`, `--shadow-*`, `--font-*`,
`--container-*`, `--breakpoint-*`, `--transition-duration-*`, `--ease-*`. `tablet:` and `desktop:`
are the only viewport variants.

The reset leaves three things live:

- the numeric `--spacing` base, because dimension utilities derive from it, so no build check can
  tell a role from a numeric; the matrices pin their class-set strings verbatim instead;
- the `--font-weight-*` ladder, because the roles name their weights;
- a bare `duration-150`, because Tailwind turns a number into milliseconds without reading the theme.

The ownership rule and the closed props keep a numeric off a call site: a look the matrices do not
cover is a matrix class set or a consumer primitive under `ui/`, never a class on a call site
([the canon](roster.md#the-canon-and-the-closed-props)).

## Composing with cn

`cn()` merges class inputs and resolves Tailwind conflicts, last wins. tailwind-merge knows nothing
of the contract's scales, so `text-title` reads as a colour and `p-pad` as an unknown class, and two
members of one scale both survive a merge. `cn` registers six contract scales under `theme`, from the
driving token lists themselves: the type roles as font sizes and again as leading, the tracked roles
as tracking, the radius roles, the spacing roles plus the sizes, and the widths as containers.
Registering under `theme` puts them where the default config already looks, which reaches all sixteen
`rounded*` groups, where an added class group names a single one. Two members of one scale then
collapse to the last (`min-h-row` and `min-h-control`), and a type role beside a colour leaves both
standing. Native's `cn` is the same function; uniwind compiles the merged `className` as it would a
hand-written one, so it costs nothing at runtime.

A type role owns its size, its leading and its tracking, so a later role clears all three: the config
declares `font-size` as conflicting with both `leading-` and `tracking-`. tailwind-merge alone
conflicts `font-size` with `leading` alone, which leaves a stale `tracking-title` riding body text.
**Compose the type role before any later size class, never after.** The conflict runs one way, so
`cn("leading-title", "text-body")` returns `text-body` alone.

## Emit

Emission (`./emit`) returns token records keyed by full custom-property name, never CSS text: a
record validates per key, needs no escaping and keeps ui-core free of `@fcalell/cli`. Each plugin
renders them.

- `themeTokens` is the `@theme` record. It carries the light colours and the touch density set: in
  Tailwind v4 a property declared only inside a variant block generates no utility, so without them
  `bg-canvas` and `min-h-control` would not exist. Which mode and density seed it never shows: each
  platform switches every value through the active scope's variables, since a non-inline `@theme`
  utility reads its variable. Each type role renders twice from one resolved value: the Tailwind v4
  modifier, so `text-title` carries its own leading on the web, and the standalone namespace, so
  `leading-title` exists on its own.
- `rootTokens` holds the values that are neither utilities nor per mode, rendered on the root outside
  `@theme`: the hairline and the focus ring's width and offset, which a platform's base rules read;
  the layers' stacking order, which a layer reads as `z-(--layer-<layer>)` because Tailwind's `z-*`
  reads no theme namespace; and the light shadows, seeded so the root carries them ahead of any mode
  scope.
- `modeTokens` is one mode's colours and its two shadows. The web keys modes on `.dark`, with `.light`
  restoring below it.
- `densityTokens` is one density's set: the type scale, the spacing roles and the sizes.
- `roomScope` is what the web declares under a room scope: the unit, then every room value as a
  `calc` over it, then the focus ring's width and offset, which the web's base rule reads (native
  draws no ring).
- `shadowUtilities` holds the declarations of each elevation utility, each reading its mode's
  variable. The `--shadow-*` theme namespace does not resolve into React Native's `boxShadow`, so each
  plugin wraps these in `@utility` itself.
- `reducedMotionTokens` ([reduced motion](motion.md#reduced-motion)).

The emitted `app.css` carries every contract utility whether or not a source spells it
(`@source inline()` patterns per utility family, about 7.5 kB gzipped), because Tailwind reads source
text.

## In the code

- `packages/ui-core/src/tokens.ts`: the token values as data, the knob defaults, the scales' declared values, the reset namespaces, `fallbackFace`.
- `packages/ui-core/src/scales.ts`: the type, spacing and size scales as functions of the `size` knob (`bodyOf`, `spacingOf`, `sizePx`, `widthPx`).
- `packages/ui-core/src/derive.ts`: `deriveTheme`, the contrast holds and the gamut clamp.
- `packages/ui-core/src/oklch.ts`: the OKLCH, OKLab and sRGB conversions, internal.
- `packages/ui-core/src/emit.ts`: the token records each plugin renders.
- `packages/ui-core/src/cn.ts`: `cn()` and its tailwind-merge config.
- `packages/ui-core/src/badge.test.ts`, `packages/ui-core/src/edge.test.ts`: the badge text floor and the strong edge on every soft ground.
- `plugins/native-ui/src/types.ts`: the native plugin's `theme` option.
