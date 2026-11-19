# Type and ink

The two faces, the type sizes and the inks text and marks stand in. Part of the face [voice](./voice.md) decides.

## Type

IBM Plex Sans for words, IBM Plex Mono for machine names. Sizes follow the `size` knob: `body` (13 px, 16 px on touch, at the default `size`),
`meta` and `caption` (12 px, 15 px on touch, at the default `size`), `heading` at the body size at 500, section labels at the caption size uppercase at 500 tracked 0.07 em in the meta ink, a record's
name at `title` (20 px, 24 px on touch, at the default `size`) at 500, `figure` (24 px at the default `size`) at 500.
A machine name (a field, an event, a key, a path, `status`) is always the mono, bare in a row, a
name and a field's typed value, boxed only inside a sentence; a human name (a project, a person, a
team like Billing) is words, in the sans wherever it stands. A label (a field's, a row's) is the body role in the meta ink: it names, and the value it names stands in the body ink.

## Ink

Text has two inks, body and meta, each read at the text floor ([Floors](./voice.md#floors)); a count, an absent word and an optional word stand in the meta ink, quieter than a title by their role (the caption size), never by a third grey. A third ink, the mark (`ink-mark`), is for what is no word (a separator, a chevron) and holds the non-text floor on the same grounds. Only a disabled control's text (`ink-disabled`) is below the text floor. Colour carries state and type, never hierarchy. A QR code keeps its light tile and dark modules in both modes, as a printed code does, since a camera reads dark on light.
