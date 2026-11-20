# Forms

A `Form` (`components/form`) takes the procedure it submits and the labels of the fields it shows; the procedure's input schema (`slotform generate` writes it to `.slotform/schema.ts`) gives everything else. This page is what a `Form` and its fields take, how each schema shape draws, and how it steps and commits; when a screen holds a `Form` is `rules.md`, and what both platforms share (the schema's checks, the server's refusal, a settings page, a form in a `Sheet` or a `Gate`) is `node_modules/@slotform/ui-core/guide/forms.md`.

```tsx
<Form
  act={orpc.requests.submit}
  given={{ organizationId: organization.id }}
  fields={{
    title: { label: "What should change?" },
    why: { label: "Why?", control: "prose" },
    kind: { label: "Kind of request" },
    dueDate: { label: "By when?" },
  }}
  submit={{ label: "Submit" }}
  onDone={(request) => navigate(`${base}/requests/${request.id}`)}
/>
```

## The form's props

| Prop | Is |
| --- | --- |
| `act` | the procedure the form submits: its input schema gives every field its control, its optionality and its issue line |
| `given` | the input keys the screen supplies (a scope id, a record id), sent and never drawn; a required key that is neither a field nor given throws |
| `fields` | the fields, keyed by the input's keys (a key the input lacks is a type error), in the order they stand ([a field's props](#a-fields-props)) |
| `groups` | `{ title, description?, fields, values?, empty? }[]` in place of `fields`: the fields under bands. A group's `values` are its fields' first values in place of the form's, and a selection of them is the group's own read: its fields paint while it waits, its failure or a missing record stands in their place, and `empty` is the sentence when it is empty, while the other groups and the bar stand |
| `values` | the fields' first values, for a form about a record: a selection paints the controls until its read lands and is the form's `read` unless one is given |
| `read`, `empty` | the form's frame read and its empty sentence |
| `onDone` | hears the output and the input it sent once the procedure resolves; a promise it returns keeps the submit pending, and the fields as sent, until it settles. Then, where the form stays (on a page, its submit going nowhere), the fields go back to `values`, and a sheet drops its edits as it opens again |
| `after` | a function of the input the fields make now (`given` and each field that holds a value, as the procedure would take it): the node it returns stands after the fields at the card inset, so a live preview of what the form would send (a bulk edit's before and after) is right with the first values, follows every change and starts over when a sheet reopens, and no screen holds the input in state |
| `can` | the ability the caller needs, `[action, subject]` (`can={["create", "request"]}`), asked in the organization of the route's scope: a caller who may not has the fields disabled and the submit blocked with the word `denied`, and the form paints, inert, until the ability's read lands |
| `submit` | `{ label, done, to, destructive }`: the bar's filled act's words (default "Save"), its toast, its route, and `destructive` for a form that rejects, abandons or closes something |
| `acts` | the other acts standing in the bar before the submit (a Cancel, a destructive Decline with `confirm`), each an act of any bar ([acts](./acts.md#actionbar)); a `Gate`'s form passes them through |
| `steps` | `true`: the form asks one step at a time ([steps](#steps)) |
| `commit` | `"submit"` (the default) or `"field"`: each field sends `given` and its own key as the viewer commits it, and the form draws no bar (`node_modules/@slotform/ui-core/guide/forms.md#a-settings-page-commits-by-field`); with `acts` they stand in a bar of their own under the fields, the last of them filled |

## A field's props

| Prop | Is |
| --- | --- |
| `label` | the field's name over its control, a short phrase; a label that is a question ("By when?") is its own blocked reason |
| `description` | a sentence under the control, a constant or a selection |
| `control` | what the schema cannot say: `mono`, `prose`, `source`, `code`, `secret`, `date`, `list`, `segments`, `lines`, `json`, `file` ([the schema decides](#the-schema-decides-the-control)) |
| `options` | the choices of a string the schema does not list (a read of records), or the labels of an enum's members; a function of the draft, `(draft) => options`, narrows them by the fields before it as the draft changes and may answer a read, so the pick paints while it waits; a chosen value no longer among them is cleared |
| `empty` | what a pick reads while it holds nothing: an optional pick's empty choice (default "None"), a required pick's placeholder (default "Choose"); say what empty means where "None" would mislead ("Any status") |
| `locked` | the field stands inert with this reason under it, as a row's `lock` does |
| `accept` | on a `file` field: the MIME types, families and extensions it takes |
| `name` | on a `file` field: the input's string key that receives the picked file's name, for an input of `{ file, fileName }` |

## The schema decides the control

| The schema says | The field draws |
| --- | --- |
| a string | a line of text (`control: "mono"` the line in the mono, `Input kind="source"`, for a machine name a person types: a path, a host, a flag, an identifier, so the value reads as the issue under it quotes it (`node_modules/@slotform/ui-core/guide/face-type.md`, **Type**); `"prose"` many lines, `"source"` many lines in mono, `"code"` the one-time code boxes (`Input kind="code"`, as many as the schema's fixed length: `z.string().length(n)`, else the field throws naming its key; the submit stays blocked until every box is filled), `"secret"` a masked line (`Input kind="secret"`: an API key, a token; the box is never filled: the secret is never read back. A secret the server holds is told in `values` by its masked form (the last characters, never the secret): the form draws no box for it but the sentence "Saved, ends in 1234" (the last four characters of the masked form, in the meta ink) with a quiet Replace, which opens the empty box with focus, and a quiet Remove that asks first and then sends the field alone as `null` where the schema takes it, else as the empty string (so the field must be optional or nullable); Enter in the box commits and never removes; omit it from `values` and the field stands as unset, and an untouched saved secret is left out of the input), `"date"` a date line; a `format: date` string is one already) |
| an enum, or a string with `options` | one choice: the Select (`control: "list"` the option list, a radio per option; `"segments"` the segmented row; both on a field that always holds a value, required or with a schema `default`, since neither has an empty choice, and over the schema's values or a fixed `options` list, never a read or a function of the draft, else the field throws naming its key) |
| a boolean | a switch |
| a number | a numeric line |
| a list of an enum, or of strings with `options` | a pick of several (`control: "list"` the option list, a checkbox per option) |
| a list of strings, numbers, booleans or `null` with `control: "lines"` | a text area, one item per line (each line trimmed, blank lines dropped); the array is sent, each line read as the item type the schema allows (`true`/`false` a boolean, `null` null, a number a number, else the text), and a line that fits none stands as the field's issue ("Line 3 isn't a value this list takes."); `values` joins the array with newlines; empty sends `null` where nullable, else `[]` |
| an object, a list of objects, or any value with `control: "json"` | a mono text area (`Input kind="prose" source`) holding the JSON text, parsed when the form commits (the submit, or the field's commit); a parse error stands as the field's issue, the parser's message and position; the parsed value is sent; `values` pretty-prints with two-space indent; empty sends `null` where nullable, else the key absent where optional (a required field has nothing to send) |
| a date (`date-time`) | a date line (`Input kind="date"`), sent as a `Date` |
| a string with `control: "file"` | a file pick (`Input kind="file"`) over the `accept` the field gives (JSON Schema has no form for it); the picked file is read into the string, as text, or as base64 where the schema entry is `contentEncoding: "base64"` (a `z.base64()`); `name: "fileName"` names the input's string key that receives the picked file's name |
| optional | the pick offers an empty choice; the field left empty is not sent (`null` where nullable), a pick committed empty by field included; in a submit form the word `optional` stands under its label, on a second line of the label column, in the meta ink; a form that commits by field marks no field, optional or required |
| a pick or a switch with a schema `default` (zod `.default()`) | always holds a value, so it is required: it starts on the default, offers no empty choice and carries no `optional` word; only a truly optional or nullable field says `optional` |
| a filled pick | its trigger is named "label, value" (WCAG 2.5.3: the name holds the words the trigger shows, so axe's label-content-name-mismatch passes); an empty one is named by its label |
| a pick whose options read failed or is missing | the sentence and Retry stand on one control-high line in the value column, in the trigger's place and level with the label, never a blank trigger with the line under it |
| required | the submit stays blocked while the field is empty, its reason naming the field by its label ("Give the project directory.", "Pick the region."), the words `giveField` and `pickField`; a value of the wrong type (a number that is not one, a date no calendar has) blocks it the same way, "Check the retry limit." (`checkField`) |

A shape no control draws (an object or a list of objects without `json`, a list of anything but an enum without `lines`, a union) throws naming the key, as does a `lines` or `json` hint the schema does not fit.

## Change marks

A field whose value differs from its first draws its change mark at its value line's start: `added` where it was empty and holds a value, `removed` where it held one and is empty (a switch's off is its empty), `changed` otherwise. The mark follows the same by-value edit the leave asks about, so a value put back drops it; the app passes nothing.

## Steps

`steps` asks one step at a time: a step is a group, or a field when the form has no groups. The open step's fields stand over the bar, whose filled act is Continue, blocked with its reason until every field in the step holds a value its schema accepts; the last step's act is the submit, and a step not reached yet is not drawn. Continue folds the step to one summary row (a check, the group's title or the field's label, then each answer in field order a middle dot apart, cut with an ellipsis, and an Edit act that unfolds the step and focuses its first control) and opens the next, whose first control takes focus. A refusal of a field in a folded step unfolds it. A form that commits by field takes no `steps`.

## The bar

A `Form`'s submit is always the bar's filled act, and a `Form` has no quiet form of it. The bar is an `ActionBar` the form draws itself ([acts](./acts.md#actionbar)). A submit that waits for a change is the blocked submit (`blocked`, a reason the viewer can act on).
