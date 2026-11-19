# Controls

A control is a field: it takes its `label`, plus the `description`, `optional` and `error` it draws placed alone, and no screen draws a control's name itself (`node_modules/@fcalell/ui-core/guide/controls.md` says which control a value takes and when a control draws its field). A control's `value` may be a selection: it paints the control, inert, until its read lands, and follows it until the viewer changes it. Save from `onChange` or, where a keystroke is no save, `onCommit`: return the save's promise and the viewer's value holds while it pends; a refusal puts it back with its reason. This page is what each control takes.

## The field's props

Every `Input`, `Picker` at its field fit, as a list or as choice segments, `Switch` and `Slider` takes these; placed alone (in a `Card`, a `Sheet`'s body, a `Gate`) it draws them around the control.

| Prop | Is |
| --- | --- |
| `label` | the field's name, over the control (a switch at the end of its label's line); in a `Form` or a `Toolbar`, and on a `search` or a `Picker` at `bar`, `row` or `pill`, the accessible name alone |
| `description` | a sentence under the control |
| `optional` | draws the word `optional` under the label |
| `error` | the line in the description's place, a sentence, words or runs (`["No project at ", { code: "apps/billing" }, "."]`), so a machine name in it stands boxed in the mono; a refused save's reason stands there too until the next change |

## Button

One act in three forms: labelled, `href` (a link) and `glyph` (the icon alone).

| Prop | Is |
| --- | --- |
| `label` | the visible text, and in the `glyph` form the accessible name and the tooltip |
| `act` | its kind: `primary` (the accent fill, the default), `danger` (the danger fill), `secondary` (a hairline), `destructive` (the hairline in danger ink), `quiet` (words in the meta ink). The `glyph` form takes `quiet` (the default), `destructive` or `primary` (a glyph on the accent fill, the act its bar is for: a player's Play). A link given an `act` is an anchor in that act's look; without one it is accent ink in the type of its line |
| `fit` | what it sits in: `body` (the default), `field` (full width under a field, or a glyph at a field's end), or `inline`, inside a sentence after its caption ("Didn't get the code? Resend"): its words in the accent ink, underlined, in the sentence's type; a rejection raises a failed toast, and blocked it stands inert in the meta ink |
| `icon` | leads the label, in the label's ink; the glyph in the `glyph` form |
| `count` | follows the label, in the label's ink |
| `wait` | the seconds left of a delay (a resend that opens in 30): inert while it is above zero, its count drawn and no reason under it; at zero the count's region stays hidden so the act keeps its width |
| `blocked` | why the act cannot run, a sentence: it is inert and says so under itself once pressed. The link form takes none |
| `onAct`, `confirm`, `done`, `to`, `sheet` | the act's wiring, run in that order (`node_modules/@fcalell/ui-core/guide/acts.md#the-wiring-is-data`) |
| `href` | makes it a link, an `<a href>`: a new tab, a copied link and a middle click work, a plain click opens the route through the router, and a rest preloads it |
| `glyph` | `true`: the icon alone |

## Input

What is typed or picked, by `kind`.

| `kind` | Is |
| --- | --- |
| `text` | a line of text, the default |
| `search` | a toolbar box with its glyph; it names itself |
| `secret` | a line masked as typed |
| `source` | a line in the mono for what a machine reads (a command, a path): at the field's own fit (placed alone, in a `Form`'s field) it wraps at any character, the box growing by its lines and Enter never starting a second; in a row's entry, a `Rules` term or a `Table` cell it stands at the bar fit, one line |
| `number` | a numeric line, with `unit` |
| `email` | an address line |
| `date` | a day (`<input type="date">`), the value `YYYY-MM-DD` |
| `prose` | many lines, in a box that grows from three |
| `code` | a one-time code, a box per digit |
| `file` | a file chosen or dropped |

A line of text scrolls inside its box and is cut with an ellipsis at rest.

| Prop | Is |
| --- | --- |
| `placeholder` | the hint while empty, never the field's name |
| `onChange` | hears every keystroke |
| `onCommit` | hears the value when the viewer is done: on leaving the field or Enter, only if it changed since focus; Escape puts back the value at focus. A `prose` input commits on leaving it alone, since Enter is a new line |
| `unit` | a `number`'s unit after the value, a word |
| `act` | an icon act at the field's end (copy, reveal, add), which Enter presses except in a `secret`, where Enter commits and only a press runs the act (a Remove) |
| `autoFocus` | focus on mount, the caret at the end, for a field that replaces what the viewer was reading; never one on a form that loads with the page |
| `source` | on `prose`: mono, indentation kept |
| `budget` | on `prose`: a word budget, the count drawn against it, in the error ink once over |
| `length` | on `code`: the digits, a box each |
| `onComplete` | on `code`: hears the code at its last digit. Return the check's promise: the boxes hold the code at rest, disabled under a spinner line, and a refusal stands under them with its reason |
| `accept` | on `file`: the MIME types, families and extensions (`["text/csv", ".har"]`); any other file never reaches `onChange` |

## Picker

A pick among options.

| Prop | Is |
| --- | --- |
| `options` | flat, or under group labels (`{ label, options }`). An option is `{ value, label, line?, leading?, chip?, recommended?, blocked? }`: its `leading` a status, an avatar or an icon, its `chip` after its label, its `line` under it, and `blocked` why it cannot be chosen while it is not in the value. An option whose value is `null` is the empty choice |
| `value` | the chosen value; an array picks several |
| `placeholder` | the hint while nothing is chosen. At `field` the label stands over the box; at `row` the hint is the generic word (`words.choose`) and the label stays the accessible name; at the other fits the label is the hint |
| `fit` | where it stands: `field` (the default), `bar`, `row` or `pill` open a popover (a sheet on touch); `list` stands the options in the page as rows; `segments` as one row |
| `act` | the act that makes a new option, ending the list under a hairline: an icon act that runs, a sheet it opens, or a link to where it is made |
| `headed` | at `list`, the body of a titled `Section`: it draws no field, the title naming it; it takes no `description`, `optional` or `error` of its own |
| `items`, `option` | at `list`, rows drawn from a read, a function per row region |
| `children` | at `list`, what stands under the first chosen option |

At `segments`, options `{ label, href }` are the tabs of a place and hold no value: the option whose `href` is the location's path, or its nearest parent, is selected, and a plain press opens its `href` in the router like a `Link`. A `Toolbar` takes the same array as `tabs`.

## Switch

Every boolean: `checked` and `onChange`, with the field's props. Placed alone the switch stands at the end of its label's line, the `description` or `error` under them.

## Slider

A number along a range. `value` runs from `min` to `max` in `step`s (1 unless set). `unit` is an Intl unit identifier (`minute`, `percent`) formatted after the value in the viewer's locale. `onChange` hears each value as it moves, `onCommit` the one the viewer lets go of (a key's step is one).
