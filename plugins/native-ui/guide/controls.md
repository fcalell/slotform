# Controls

Which control a value takes is `node_modules/@slotform/ui-core/guide/controls.md#one-button-one-input-one-switch`. A control is a field: it takes its `label`, plus the `description`, `optional` and `error` it draws placed alone (`node_modules/@slotform/ui-core/guide/controls.md#every-control-is-a-field`). A control's `value` may be a selection: it paints the control, inert, until its read lands, and follows it until the viewer changes it. This page is what each control takes and how it saves.

## A control that saves

A control that saves as the viewer changes it returns the save's promise from `onChange` (`Switch`,
`Picker` at any fit, a row's `switch` or `pick`) or from `onCommit` (`Input`, and `Slider`, whose
`onChange` hears each step and whose `onCommit` the value it is let go on). The control shows the
viewer's value, a selection's or a constant's, while the latest save pends and then follows its datum
once the refetch the write invalidated has landed, so nothing flickers back and no saving mark is
drawn. Each change supersedes the one before; a refusal puts the value back and draws its reason in
the field's error line when the control is a form field's (`switch`, `slider`, `picker`, `options`,
`segments`), which the field hosts, else in a failed toast whose Retry saves the same value again
(none for a refusal the server answered). A `code` `Input`'s `onComplete` returns the check's promise.

## Button

One act in three forms: labelled, `href` (a link in accent ink that runs nothing: a route of the app goes through the router, an external URL the OS opens) and `glyph` (the icon alone, its `label` the accessible name and never a tooltip, since the phone has no pointer). An act that is out of reach for a while (a resend after a code is sent) takes `wait`, never a `blocked` reason that grows its row: pass it every tick, `0` once it is live. A `Button` is never wrapped in a context of the roster's own to be inert.

| Prop | Is |
| --- | --- |
| `act` | its kind: `primary` (the accent fill, the default), `danger` (the danger fill), `secondary` (a hairline), `destructive` (the hairline in danger ink), `quiet` (words in the meta ink). The `glyph` form takes `quiet` (the default) or `primary` (a glyph on the accent fill, the act its bar is for: a player's Play) |
| `fit` | `body` (the default) or `field`, full width under a field; the link form takes `body` or `inline`, a run of the line it sits in |
| `icon`, `count` | a glyph leading the label; a figure after it, in the label's ink |
| `wait` | the seconds left of a delay (a resend that opens in 30): inert while above zero, its count drawn and no reason under it; at zero the count's region stays hidden so the act keeps its width |
| `blocked` | why the act cannot run, a sentence: inert, and said under itself once pressed |
| `onAct`, `confirm`, `done`, `to`, `sheet` | the act's wiring (`acts.md`) |

## Input

What is typed or picked, by `kind` (`node_modules/@slotform/ui-core/guide/controls.md#one-button-one-input-one-switch`).

| Prop | Is |
| --- | --- |
| `placeholder` | the hint while empty, never the field's name |
| `onChange` | hears every keystroke |
| `onCommit` | hears the value when the viewer is done, on leaving the field or on the keyboard's return, only if it changed since focus; a `prose` input commits on leaving alone, since return is a new line |
| `unit` | a `number`'s unit after the value, a word |
| `act` | an icon act at the field's end (copy, reveal, add); the keyboard's return presses it, except in a `secret`, where return commits and only a press runs the act |
| `autoFocus` | focus on mount with the caret at the end of the text, for a field that replaces what the viewer was reading, never one on a form that loads with the page |
| `source`, `budget` | on `prose`: mono with indentation kept; a word budget, the count drawn against it, in the error ink once over |
| `length`, `onComplete` | on `code`: the digits, a box each; hears the code at its last digit. Its returned promise holds the boxes at the code, the input inert, and a spinner and the checking line stand under them at once, with no delay; a refusal stands in the control's own line under the boxes until the next digit |
| `accept` | on `file`: the MIME types, families and extensions (`["text/csv", ".har"]`); any other file never reaches `onChange` and is said in the control's own line under its box, in a form or out of one, cleared on the next pick |

```tsx
<Input kind="file" value={file} onChange={setFile} accept={["text/csv"]} />
```

## Picker

A pick among options. An option that cannot be chosen now carries `blocked`, a short reason that replaces its `line` in the disabled ink: it takes no press and keeps its place. Once the option is in the value it draws and acts as any chosen one and stays removable, so `blocked` never traps a value.

| Prop | Is |
| --- | --- |
| `options` | flat or under group labels (`{ label, options }`); each option is `{ value, label, line?, recommended?, leading?, chip?, blocked? }`. `leading` is a glyph, a status's tone or an avatar, drawn as a row's; `recommended` is a badge under the label; `line` plain text under it. An option's `label`, `line` and `blocked` may be selections. An option whose `value` is `null` is the empty choice: `onChange` hears `null` for it |
| `value`, `onChange` | one value, or an array that picks several; `onChange` hears the value or the set, and its promise holds the viewer's value |
| `placeholder` | the hint while nothing is chosen. At `field` the label stands over the box; at `row` the hint is the generic word (`words.choose`) and the label stays the accessible name; at the other fits the label is the hint. The label also titles the sheet |
| `fit` | `field` (the default), `bar` (filling its column) or `row` (a row's trailing value) open a row list; `list` stands the options in the page as rows; `segments` as one row |
| `act` | the icon act that makes a new option, ending the list |
| `headed` | at `list`: the list is the body of a titled `Section` that heads it, so it draws no field and takes no `description`, `optional` or `error` |
| `items`, `option` | at `list`: options from a read, constants or a selection, through a function per row region (`value`, `label`, `line`, `recommended`, `blocked`, `group`); while the read waits it paints four rows in the shape the map declares, and a failed or missing read is the sentence with Retry in a line under the control. Static `options` never paint |
| `children` | at `list`: what the first chosen option opens, under it |

At `list` a set draws check rows, one value or `null` radio rows. At `segments` every segment keeps its natural width and never cuts a label: where they do not fit (five at 320) the track scrolls sideways with no indicator, and the chosen segment scrolls into view on mount and on change. Segments given an `href` and no value are the tabs of a place, `{ label, href }` each with no `value` or `onChange`: the one whose `href` is the route's path or its nearest parent is chosen, and a press opens its `href`.

## Switch

Every boolean: `checked` and `onChange`.

## Slider

A number along a range. `value` runs from `min` to `max` in `step`s (1 unless set). `unit` is an Intl unit identifier (`minute`, `percent`) formatted after the value in the device's locale. `onChange` hears each value as it moves, `onCommit` the one the viewer lets go of.
