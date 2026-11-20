# Words and text sizes

A word a component draws on its own is the config's; every sentence the app shows is a prop, and
every string prop takes one of four sizes. The closed word set is ui-core's `WORD_KEYS`.

## Words are the config's, sentences are props

A word a component draws on its own comes from the UI plugin's `words` option (`reactUi({ words })`,
`nativeUi({ words })`), read with `useWords()` from `@slotform/ui-core/react/words`. Every sentence the
app shows is a prop.

## A text prop takes one of four sizes

Every string prop's doc ends in the size of text it takes and what the component does past it. The
sizes are fixed:

| Size | Is | Past it |
| --- | --- | --- |
| a word | one word: a state, a unit, a figure's noun | a region that bounds it (a chip, a row pick's value) holds the short measure, 20 characters, and truncates |
| a short phrase | a few words on one line: a title, a label, a name | takes the space its line leaves, then truncates with an ellipsis, or wraps where its doc says it wraps |
| a sentence | one sentence, in a region built to wrap: a description, a banner, an empty state, an error | wraps |
| text | running content of any length: markdown, a message body, code | wraps whole |

## Past the size

A component cuts or wraps past the size and never grows its region, so a sentence in a word region is
cut or crowded: a sentence as a chip's `label` loses everything past 20 characters, a sentence as a
status's `label` is cut with an ellipsis inside its badge when the line is out of space, and a
sentence as a labelled row's `title` wraps whole under its label. Give a region the size its doc
names, and put a sentence in the prop that takes one (`description`).

A string that is an identifier cuts in its middle, keeping its start and its end: a
`{ code, copy: true }` title of one word over eight characters, and a title or a fact list that is
one `{ code }`. A string that is no text (an `href`, a `src`, an id, a key, a file name, an Intl unit)
is documented by what it is.
