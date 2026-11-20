# Words

The words the molecules of both UI plugins speak on their own: the closed `Words` object and its
counted and slotted words, how a consumer's translation reaches every molecule, the formatters every
age, moment, figure and size is worded through, the one coarse clock ages tick on, the phone's
fallbacks where Hermes lacks an `Intl` API, and the text runs a part draws.

## Words

Every word a molecule draws on its own comes from `words`, a closed typed object with English
defaults (`ENGLISH`). Its keys are `WORD_KEYS`, `COUNTED_WORD_KEYS` and `BLANK_WORD_KEYS` in
`@slotform/ui-core/tokens`. `Words` requires every key and `wordsSchema` is a strict object, so a
translation that misses a word fails `tsc` and the schema, never the interface.

- A sentence that belongs to the consumer is a prop on the molecule that draws it (`placeholder`,
  `notice`, every `sentence`, every label), never a key.
- A word drawn with a number is a **counted word**, `{ one, other }`, each form spelling `{count}`
  where the number stands, drawn through `counted(word, count)`: `one` at a count of one, `other` at
  any other. It is never a function, since the words cross into the generated entry as a literal.
- A word drawn with values is a **blank word**, one whole phrase spelling each of its named blanks as
  `{name}` where the value stands, drawn through `filled(word, values)`. The schema rejects a
  translation that drops a blank. A connective is never composed around figures: the phrase holds
  them.
- A tab bar's count past the tab count's cap reads as `countOver` through `tabCount(words, count)`.

`words` is a plugin option beside `theme`. Each plugin contributes a `WordsProvider` through its
`providers` slot, which mounts the context (`@slotform/ui-core/react/words`) with the consumer's
`words`, and every molecule reads them through `useWords()`. With the option absent no provider is
generated and the context's English default applies.

## Ages and the clock

Ages and pending bars read one coarse clock: `useClock(read, until)` and `usePending(until)` in
`@slotform/ui-core/react/clock`, over `createClock` in `@slotform/ui-core/clock`, ticking once a second
while a reader holds it. A part that draws an age reads `now` from it, so the age ticks on its own.
`pendingShare(run, now)` in `./clock` is pure; its fill's motion is in
[value and fills](motion.md#value-and-fills).

## Formatters

Ages, moments and every other `Intl` formatter come from ui-core, so no word of them lives in `words`:
the platform's own relative-time and date words speak them in the reader's language.

- `formatterFor(kind, lang, options)` in `@slotform/ui-core/format` builds each formatter (`number`,
  `date`, `relative`, and `collate`, the collator a table's sort compares words with) once per kind, language and options at module scope: building one costs far
  more than formatting with it (Hermes most of all), and an age, a moment or a figure is formatted per
  row and per render. Both plugins read every formatter here; `lang` undefined is the platform's own.
- `new Intl.` appears in `format.ts` and, for `groupZeros`, in `scramble.ts`.
- `momentWords(iso, now, lang)` (`./format`) words an ISO moment as a reader reads it: the clock time
  alone today, the day's word and the time a day either side, the date and time within `now`'s year,
  and the year with them only in another. A platform with no relative words reads the day either side
  as its date; a moment that does not parse reads as itself.
- `initials(name)` (`./format`) is the letters an avatar draws without its image: the first letter of
  a name's first two words, parted by spaces, dots, underscores and hyphens, an email address read by
  its local part (`ada.lovelace@…` reads `AL`).
- `ageWords` (`./clock`) words a moment as its age from `now` ("2 minutes ago", "yesterday").
- `fileSize(bytes)` (`@slotform/ui-core/file`) words a file's size in the viewer's language: whole
  bytes below a thousand ("39 bytes"), then kilobytes, megabytes and gigabytes at one decimal below
  ten ("9.1 kB", "12 kB"). Both platforms read it, so one file reads the same.

### On the phone

Hermes ships part of `Intl`, so native-ui's `lib/age` and `lib/compact` fall back where
it lacks an API.

- `Intl.DateTimeFormat` with `dateStyle` and `timeStyle` is there (not on Android before SDK 24);
  `Intl.RelativeTimeFormat` is not. An age then reads as the moment a message's time reads as (the
  time alone today, else the date and time, its year only when it is not this year's), and the day
  either side of a moment reads as its date.
- A short age ("2 min", "16 sec") is the form a row's trailing age and an item header's meta read
  in; a moment after `now` keeps the long form. Whether `Intl.NumberFormat` words a unit is tested at
  runtime: an engine without the `unit` style ignores it and formats a bare number, or throws a
  `RangeError` on it, and both mean no unit, so the short age reads as the long one.
- A compact figure ("55K") is the mantissa in the device's language, at most one fraction digit, then
  K, M or B. A mantissa that rounds to 1,000 moves up a step, so 999,950 reads "1M". Hermes on iOS
  lacks `notation: "compact"`, which the web uses.

## Text runs

A **run** (`Run`) is a piece of a part's text:

- plain words;
- a quoted name (`quoted`): words given verbatim, in typographic quotes in the region's own role,
  drawn whole. A badge, an overline or a line cuts it by its own width or line count, a title wraps
  it, and the text, the accessible name and the cut tooltip hold all of it;
- a span of code (`code`): the inline code style. A row's whole title, or a fact list that is this one
  run alone, is one value that cuts in its middle keeping its start and end (`valueCut`); a later run
  wraps with the text around it;
- a run at strong weight (`strong`): the address a sentence names.

A name that wraps breaks an identifier (an address, a host, a dotted name) after its `@` and its dots,
never inside a word. A fact's copyable code is read to its end, as a definition is: whole on as many
lines as it takes, broken at a URL's or a path's separators first, then anywhere (a fingerprint), never
cut in its middle. Code in a sentence keeps a URL whole as one box, and a long command in brackets
keeps them on its line, cut with an ellipsis where it alone is wider than the line.

`@slotform/ui-core/runs` holds the words of a part and of a line of parts, free of any view: both UI
plugins draw a title, a fact, an overline and a sentence from it, so a test holds the structure of
what is drawn once.

## Scope

- The phone's short age keeps the long form fallback because Hermes' `Intl.NumberFormat` `unit`
  style is unverified on a device; it is dropped once a device run verifies it.
- The phone reads an age as a moment until Hermes ships `Intl.RelativeTimeFormat`, and words a
  compact figure by hand until Hermes on iOS ships `notation: "compact"`.

## In the code

- `packages/ui-core/src/tokens.ts`: `ENGLISH`, the word keys, `counted`, `filled`, `tabCount`.
- `packages/ui-core/src/schema.ts`: `wordsSchema`.
- `packages/ui-core/src/react/words.ts`: `WordsProvider` and `useWords`.
- `packages/ui-core/src/format.ts`: `formatterFor` and `momentWords`.
- `packages/ui-core/src/clock.ts`, `packages/ui-core/src/react/clock.ts`: `createClock`, `ageWords`, `pendingShare`, `useClock`, `usePending`.
- `packages/ui-core/src/file.ts`: `fileSize`.
- `packages/ui-core/src/runs.ts`: the runs a part draws.
- `packages/ui-core/src/roster/descriptors.ts`: the `Run` descriptor.
- `plugins/native-ui/src/index.ts`: the generated `WordsProvider` on the phone.
- `plugins/native-ui/src/ui/lib/age.ts`, `plugins/native-ui/src/ui/lib/compact.ts`: the phone's ages and compact figures over Hermes.
- `apps/showcase/src/roster/scenes/section-rows.ts`, `apps/showcase/src/roster/scenes/text.tsx`: the scenes that draw a copyable code fact and code in a sentence at 320.
