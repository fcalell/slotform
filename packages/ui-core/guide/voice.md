# Voice

The look of every Slotform app, decided once. The mechanics (density, hierarchy, what a row and a
record hold) come from one anchor; the face is our own, drawn as a specimen before any component
takes it. Each line of the face is the decision, never a range. The floors at the end are checked by
looking at the render.

## The anchor, for mechanics only

Linear's web app sets the density and the hierarchy: one-line rows, a panel on a canvas, a bar
over each page, bands over groups, a record's name in the body. Its pinned screens are read for
how much a row carries and where things stand, never for colour, type, corners or rules:

| Pattern | Screen |
| --- | --- |
| List grouped with bands, counts and pills | https://mobbin.com/screens/0ac97560-1aef-4907-a356-8c18c749437b |
| Record: name, facts, description, sub-list, activity | https://mobbin.com/screens/1ea32209-1221-46de-b4ad-875a8f1b5777 |
| Settings: a titled column of grouped rows | https://mobbin.com/screens/f3134ca3-b7e5-47ab-a283-92ce2db403db |

## The face: a drafting table

The face is decided on its pages: [the container](./face-container.md),
[Panes and widths](./face-panes.md), [surfaces and controls](./face-surfaces.md),
[type and ink](./face-type.md), [rows and bands](./face-rows.md),
[record and pills](./face-record.md), [badges](./face-badges.md) and
[motion and drag](./face-motion.md).

## Floors

A floor is a minimum a screen is judged by, each stated here once. Most are checked by looking at the
render at 320 and 1920 in dark; the render walk holds every width and both modes. The token pair that
meets each is in [tokens](../../../docs/architecture/ui-core/tokens.md#contrast-floors).

- **Text.** The faintest text ink reads 4.5:1 on the table, the sheet, a group, a selected row and the
  neutral state's ground, in both modes.
- **Badge words.** 4.5:1 on the badge's fill on the canvas, the sheet and a group in both modes
  (`badge.test.ts`), the fill a step from its ground.
- **Non-text.** 3:1 for a control's glyph, a mark ring and `ink-mark`. A control's edge at rest is the
  hairline: its label and its fill tell it apart.
- **Disabled.** A disabled control's text (`ink-disabled`) stands under the text floor, at about 3:1,
  which WCAG exempts.
- **Strong edge.** `edge-strong` holds 3:1 on every soft ground in both modes (`edge.test.ts`).
- **Body.** On touch and in a room the `body` (16 px on touch, at the default `size`) is the size
  below which iOS Safari zooms a field on focus, and no `size` knob lowers it.
- **Row and control.** A row and a control are at least `row` and `control` (32 px, 44 px on touch, at the default `size`) tall; a
  control is never under the hit target.
- **Hit target.** Every control is a target of 24 px, the floor the test run checks (axe `target-size`), and the design's
  hit target `TARGET_PX` (28 px on desktop, 44 px on touch, 44 room units in a room, the room unit being `u`).
- **Overflow.** None, at 320 and at 1920 in dark.
- **Keys.** Tab reaches every control with a visible ring; Escape closes a layer and returns focus;
  there is no console error.

## How the face is held

The face lives on the specimen (the showcase's `Specimen` story): every control, pill, tab,
field, row, band, the container and the player's dock, light and dark, on one page. A change to a class set or a
token is judged on the specimen first, as one family, and reaches a screen only after. A screen
is then shown beside the anchor's screen of its pattern with one question, which looks better;
"theirs" is answered with the three largest differences, each a composition finding (the app's)
or a specimen finding (Slotform's). The owner answers; no number replaces the eye.
