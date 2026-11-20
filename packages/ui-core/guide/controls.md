# Controls

Both platforms draw every act with one `Button`, every typed or picked value with one `Input` and
every boolean with one `Switch`, and every control is a field that takes its `label`. Each
control's props are the platform's controls page (`node_modules/@slotform/react-ui/guide/controls.md`,
`node_modules/@slotform/native-ui/guide/controls.md`).

## One `Button`, one `Input`, one `Switch`

A `Button` is every act: labelled it runs `onAct`; with an `href` it is a link (in accent ink with
no other look given, `fit="inline"` for a run of a line of text); with `glyph` it is the icon alone,
its `label` the accessible name and, on a pointer, the tooltip.

An `Input` is every typed or picked value, chosen by `kind`: a line of text (`text`, the default,
`search`, `secret`, `source`, `number`, `email`, `date`), `prose` for many lines, `code` for a
one-time code, `file` for a file. A line of text scrolls inside its box and is cut with an ellipsis
at rest. A `source` line (a command, a path) at the field's own fit (placed alone, in a `Form`'s
field) wraps at any character instead, the box growing by its lines and Enter never starting a
second, so a command wider than a phone is read to its end. A `source` in a row's entry, a `Rules`
term or a `Table` cell stands at the bar fit, one line.

A `Switch` is every boolean. A choice among others in a `Table` or a list is the owner's selection,
never a control the screen places.

## Every control is a field

Every control takes its `label`; no screen draws a control's name itself. Placed alone (in a `Card`,
a `Sheet`'s body, a `Gate`) an `Input`, a `Picker` at its field fit, as a list or as choice segments,
a `Switch` and a `Slider` draw their field: the label over the control (a switch at the end of its
label's line), the word `optional` under the label with `optional`, and `description` or `error`
under the control, where a refused save's reason also stands until the next change. `error` is a
sentence, words or runs (`["No project at ", { code: "apps/billing" }, "."]`), so a machine name in
it stands boxed in the mono ([type](./face-type.md#type)).

A `Form` draws its own fields from their `label`s, and a `Toolbar` names its acts, so a control
there draws nothing around itself. Nor does a `search`, or a `Picker` at the `bar`, `row` or `pill`
fit: at `bar` and `pill` its label is the hint in its box, and at `row` the hint is the generic word
(`words.choose`) while the label stays its accessible name. A label is never a `Text` over a bare control, and a
`Section`'s title is the Section's, never its control's label.

A list an answer picks from heads as every other Section does: the `Section` is titled and its body
is one `Picker` with `fit="list"` and `headed`, which draws no field, the title naming it and the
Section's `description` describing it. `label` is the list's accessible name, the title's words, and
a `headed` list takes no `description`, `optional` or `error` of its own.

```tsx
<Section title="Reviews" description="Who signs off before a change ships.">
  <Picker fit="list" headed label="Reviews" options={reviewers} value={chosen} onChange={choose} />
</Section>
```
