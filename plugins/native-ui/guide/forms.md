# Forms

A `Form` takes the procedure it submits and the labels of the fields it shows; the procedure's input schema (`stack generate` writes it to `.stack/schema.ts`) gives everything else. When a screen takes a form, its checks, the server's refusal, a settings page and a form in a `Sheet` or a `Gate` are `node_modules/@fcalell/ui-core/guide/forms.md`. This page is what a phone `Form` takes and how each field draws.

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

## Form

| Prop | Is |
| --- | --- |
| `act` | the procedure the form submits: its input schema gives every field its control, its optionality and its issue line |
| `fields` | the fields keyed by the input's keys (a key the input lacks is a type error), in the order they stand, each a field below |
| `groups` | in place of `fields`: `{ title, description?, fields, values?, empty? }[]`, the fields under bands. A group's `values` are its fields' first values in place of the form's, and a selection of them is the group's own read: its fields paint while it waits, its failure or a missing record stands in their place, and `empty` is the sentence when it is empty, while the other groups and the bar stand |
| `given` | the input keys the screen supplies (a scope id, a record id), sent and never drawn; a required key that is neither a field nor given throws |
| `values` | the fields' first values (a form about a record): a selection paints the controls until its read lands and is the form's `read` unless one is given. A field's value is a selection the viewer's edit replaces |
| `commit` | `submit` (the default), the bar's filled act sending every field; or `field`, a settings page with no bar |
| `submit` | `{ label, done, to, destructive }`: the filled act's words (default "Save"), the toast once it resolves, the route it goes to, and `destructive` for a form that rejects, abandons or closes something |
| `onDone` | hears the output and the input it sent; a promise it returns keeps the submit pending until it settles. Then, where the form stays (on a page, its submit going nowhere), the fields go back to `values` |
| `acts` | the other acts in the bar before the submit (a Cancel, a destructive Decline with `confirm`), each an act of any bar; with `commit: "field"` they stand in a bar of their own under the fields, the last of them filled |
| `can` | the ability the caller needs, `[action, subject]` (`can={["create", "request"]}`), in the organization of the route's scope: a caller who may not has the fields disabled and the submit blocked with the word `denied`, and the form paints, inert, until the ability's read lands |
| `read` | what the fields hold, read once for the form's frame: the fields paint while it waits and its failure stands in their place. The bar waits only on the form's own read (a group's never reaches it): it paints while that read waits and is blocked once it failed or is missing, its sentence drawn on a press and never at rest |
| `steps` | `true`: the form asks one step at a time (below) |
| `after` | a function of the input the fields make now (`given` and each field that holds a value, as the procedure would take it): the node it returns stands after the fields at the card inset, a live preview of what the form would send that follows every change and starts over when a sheet reopens, so no screen holds the input in state. In a `Sheet` the bar follows it, pinned in the foot |
| `empty` | the fields' sentence when the `read`'s selection is empty |

## A field

| Field prop | Is |
| --- | --- |
| `label` | the field's name over its control (a short phrase; wraps) |
| `description` | under the control, a sentence or a selection of one |
| `control` | a hint the schema cannot say, named as the `Input` that draws it (the table below); a hint the schema does not fit throws naming the key |
| `options` | the choices of a string the schema does not enumerate, or the labels of an enum's members; a function of the draft, `(draft) => options`, narrows them by the fields before it, may answer a read so the pick paints while it waits, and clears a chosen value no longer among them |
| `empty` | what a pick reads while it holds nothing: an optional pick's empty choice (default "None"), a required pick's placeholder (default "Choose"); say what empty means where "None" would mislead ("Any status") |
| `locked` | the field stands inert with this reason under it, as a row's `lock` does |
| `accept` | on a `file` field: the MIME types, families and extensions it takes (JSON Schema has no form for it) |
| `name` | on a `file` field: the input's string key that receives the picked file's name, for an input of `{ file, fileName }` |

| The schema says | The field draws |
| --- | --- |
| a string | a line of text. `control: "mono"` the line in the mono (`Input kind="source"`), for a machine name a person types (a path, a host, a flag, an identifier), so the value reads as the issue under it quotes it; `"prose"` many lines; `"source"` many lines in mono; `"code"` the one-time code boxes (`Input kind="code"`), as many as the schema's fixed length (`z.string().length(n)`, else the field throws naming its key), the submit blocked until every box is filled; `"secret"` a masked line (`Input kind="secret"`: an API key, a token), never filled, since the secret is never read back; `"date"` a date line. A `format: date` string is one already |
| a saved secret | a secret the server holds is told in `values` by its masked form (the last characters, never the secret): no box but the sentence "Saved, ends in 1234" in the meta ink, a quiet Replace that opens the empty box with focus, and a quiet Remove that asks first and sends the field alone as `null` where the schema takes it, else as the empty string (so the field must be optional or nullable). Enter in the box commits and never removes; omitted from `values` the field stands as unset, and an untouched saved secret is left out of the input |
| an enum, or a string with `options` | one choice, the Select. `control: "list"` the option list, a radio per option; `"segments"` the segmented row. Both need a field that always holds a value (required, or with a schema `default`) and choices that are the schema's or a fixed `options` list, never a read or a function, else the field throws naming its key |
| a boolean | a switch |
| a number | a numeric line |
| a list of an enum, or of strings with `options` | a pick of several; `control: "list"` the option list, a checkbox per option |
| a list of strings, numbers, booleans or `null` with `control: "lines"` | a text area, one item per line (trimmed, blank lines dropped); each line is read as the item type the schema allows (`true`/`false`, `null`, a number, else the text), and a line that fits none is the field's issue ("Line 3 isn't a value this list takes."); `values` joins the array with newlines; empty sends `null` where nullable, else `[]` |
| an object, a list of objects, or any value with `control: "json"` | a mono text area (`Input kind="prose" source`) holding the JSON text, parsed when the form commits; a parse error is the field's issue, the parser's message and position; `values` pretty-prints with two-space indent; empty sends `null` where nullable, else the key absent where optional |
| a date (`date-time`) | a date line (`Input kind="date"`), sent as a `Date` |
| a string with `control: "file"` | a file pick (`Input kind="file"`) over the field's `accept`; the picked file is read into the string, as text, or as base64 where the schema entry is `contentEncoding: "base64"` (a `z.base64()`) |
| optional | the pick offers an empty choice; the field left empty is not sent (`null` where nullable), a pick committed empty by field included. In a submit form the word `optional` stands under its label in the meta ink; a form that commits by field marks no field |
| required | the submit stays blocked while the field is empty, its reason naming the field by its label ("Give the package directory.", "Pick the region."; a label that is a question, "By when?", is its own reason), the words `giveField` and `pickField`; a value of the wrong type blocks it the same way ("Check the retry limit.", `checkField`) |
| no control fits | an object or a list of objects without `json`, a list of anything but an enum without `lines`, or a union throws naming the key |

## The bar and the leave

The bar holds its acts' attempt. A blocked act waits for a touch: it is inert and silent until it is pressed, or until its form or sheet has taken input, and then the bar draws its `blocked` reason (the pressed act's, else the last blocked act's) under the acts at meta size, in a line drawn only then and kept after, so a blocked act takes no space before it is touched.

A form that stands edited (a field holding a value other than its first; a value put back is no edit) asks once, "Discard your edit?" or Keep editing, when its screen is left (the back, a swipe, a navigate that removes it), so the app writes no `usePreventRemove` guard of its own. Pressing the filled act ends the edit, so an act that navigates is never asked, and a rejected act puts the edit back.

A field whose value differs from its first draws its change mark at its value line's start: `added` where it was empty and holds a value, `removed` where it held one and is empty (a switch's off is its empty), `changed` otherwise. The mark follows the same edit the leave asks about, so a value put back drops it.

## Steps

With `steps` a step is a group, or a field when the form has no groups. The open step's fields stand over the bar, whose filled act is Continue, blocked with its reason until every field in the step holds a value its schema accepts; the last step's act is the submit, and a step not reached yet is not drawn. Continue folds the step to one summary row (a check, the group's title or the field's label, then each answer in field order a middle dot apart, cut with an ellipsis, and an Edit act that unfolds the step and focuses its first control) and opens the next, whose first control takes focus. A refusal of a field in a folded step unfolds it. A form that commits by field takes no `steps`.
