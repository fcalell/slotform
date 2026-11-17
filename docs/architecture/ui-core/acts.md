# Acts, forms and fields

An **act** is a press that starts an attempt: a labelled act, an icon act or a link act, alone or in an
`ActionBar`. This page holds how an act runs, holds its pending state and draws its refusal, how a
blocked act gives its reason, how a control saves its value, and how a `Form` is built from a
procedure's input schema: its fields, its commit moments and the question it asks when it is left.
The model is framework-free in `@fcalell/ui-core`; the hooks over it are in `react/*`, and both UI
plugins draw from the same core, so the web and the phone hold, block and ask under one set of rules.

## Act model

Every act is the attempt it starts. A thenable that `onAct` returns holds the act pending until it
settles; a rejection draws the server's refusal when the server words one, else the generic
`actFailed` word.

`acts.ts` holds what an act is made of apart from how it is drawn and what runs it: whether an
`onAct` hands back its promise so the act can hold it (`isThenable`), an act as a region takes it
(`Offered`, made whole by `offered`), the attempt and save logic the hooks wrap (`startAttempt`,
`keepSave`), the marks a host leaves on a rejection it drew (`drew`, `wasDrawn`, `placed`,
`isPlaced`), and what a more menu holds (`moreMenu`, `endedItems`). It is pure, so the hooks and the
binding share one core.

`react/acts.ts` holds the hooks a host holds its acts' attempts with and a control its saves with, over
the binding's port ([the port](reads.md#the-port)), and `createActs`, which binds the act sequence
to a platform's toast and its way of opening a route.

An act that cannot run where it stands, with no reason to give, is **inert**: it is drawn in its
disabled form and says so. On the web the `ActInert` context sets it around an `ActionBar`'s other
acts while one act pends, a `Thread` composer's Send while its text is empty, and its desktop Stop
without `onStop`.

## Act press

`Button` is one act in three forms.

- **Labelled**, it runs: its label, a glyph before it and a count after it, pending after the
  press, blocked with a reason.
- **Link form**, with an `href`: an anchor to a route or an external URL that runs nothing, in an
  act's look or, with no `act`, in accent ink in the line it sits in (`inline`) or on the target
  height.
- **Icon form**, with `glyph`: the icon alone, the label its accessible name and its tooltip,
  square, no boundary at rest, a field's end at the `field` fit.

A press runs the act's wiring in one order: its `confirm` asked as a decision over the page
(declined, nothing runs), its `onAct`, its `done` toasted, then its `to` followed. A `sheet` opens in
place of `onAct` and closes on dismiss or once its submit resolves. The labelled and icon forms take
all four, and every host that draws an act hands them on.

## Link acts

A `LinkAct` goes to a route: on the web an anchor to `href` that the router follows in place, on the
phone a press that navigates. Every host that takes an `Act` for a labelled act (a Section's, a
Banner's, a row's, a toast's, a pending bar's, a canvas's, an empty state's) takes a `LinkAct` too,
and a menu takes one as an entry. A `Pane`'s missing shape's way back is one; it is no create act. A
`LinkAct` has no run, so it never pends.

On the phone, `Link` takes either kind of href and decides by its shape: an href from the app's root
is a route and navigates through expo-router; a scheme (`https:`, `mailto:`) or a protocol-relative
`//` is somewhere else, which the OS opens. On the web every route reader shares one listener
(`useRoute` in `lib/navigate.ts`), and a link's intent preloads its route: one delegated listener
for the page covers every anchor stack draws, and a pointer or focus that rests on an anchor for
TanStack's intent delay loads that route, so a pass across a list loads nothing. External, hash-only
and current hrefs have nothing to load, and a navigation never waits on a preload.

## ActionBar

`ActionBar` holds the acts that close a form, a sheet or a decision, or that apply to the rows
chosen in a list: a record's decision bar (Approve, Decline), a Gate's acts, a pane's own close.
`acts` are in reading order with the one filled act last (`danger` when it is destructive, a
hairline `destructive` otherwise); a `LinkAct` is an anchor, quiet unless it is the filled act. A
`Form`'s bar, a `Sheet`'s foot and the chosen bar the route gives a Pane's `foot` for a `Table`'s
ticked rows are all this bar.

Layout:

- **Web.** The width of the block it closes lays it out (the `acts` container). Up to the auth
  width its acts stack one per row across it, the filled act on top; wider, they stand at their own
  width at its end, wrapping to a further row with the filled act last. The stacking width is a rule
  of the block's width, never a measure of its acts (`actsStackedMax` in `overflow.ts`, the web's
  `acts-stacked:` container variant): a Gate step, an empty state's column and a sheet on a phone
  stand at or under it, a desktop sheet and a page's form stand wider.
- **Phone.** `fit` (the phone's alone) is `end`, the default, or `full`, one act per row at the
  field's height. A Pane's `foot` docks the bar; a `Form` or a `Sheet` keeps it in flow.

An act's `onAct` promise is the bar's run: while one pends, the others are inert, and a rejection
stands in the bar's line under the acts, the act ready again. A blocked act is silent until it is
pressed or its form or sheet has taken input; then its reason (the pressed act's, else the last
blocked act's) stands in the line under the acts, at the filled act's edge on the web. The bar
draws that line then and keeps it, so the act keeps its row and stretches as a live one does.

`chosen` makes it a chosen bar of one row: the count at its start, then the select-all act and
the clear icon, and at its end the more menu holding every act but the last, then the filled act. It
draws nothing while no row is ticked. On the phone the count stands over the acts at the bar's
start. `pending` stands a pending bar in its place at its own height.

## Blocked and pending acts

An act holds its own attempt. At the press it is inert; after `ACT_DELAY` ([paint](reads.md#paint))
its glyph and label hide under the spinner and its name is kept; a rejection is a failed toast with
Retry. A pending act keeps its rest look until the delay has run. `pending` is a host's state handed
down: the host holds the attempt, so a press calls the handler as it is. `line` draws a rejection under
the act instead (the public phone `Button` standing alone).

Pending and blocked acts stay focusable and ignore the press. Both are inert, so one look is
chosen: pending over blocked. A blocked act waits for a touch: inert and silent until it is pressed,
or until its form or sheet has taken input; then its reason stands under the act, or on the line of
the host that holds it. The filled act's reason, once its read ended, is the body's and draws on a
press alone. An icon act inside a disabled field is inert.

An act whose own datum waits is **painted**: its box filled, its content undrawn, inert. A
selection's shape is unknown until it lands, so its paint is a bare glyph. An act whose read ended
stands blocked with the sentence for its name, never a false yes. On the phone the act's ink
reaches its glyph and spinner through `Ink` ([Ink](../plugins/native-ui.md#ink)).

## Blocked reasons

`reason.ts` decides whether a blocked act's press still stands (`pressStands`): a press is kept as
the reason the act was blocked by when pressed, and it stands while the act is blocked by that same
reason. Unblocking, or a different reason, forgets the press in render, with no state to reset; the different
reason waits for its own press or the form's touch. Both plugins' blocked acts and their reason
hosts (an `ActionBar`, a sheet, a Section, a Banner, a `PendingBar`) read it.

The text props of an act or a link that a selection may stand in for are `ACT_TEXT` (a label that
counts, "Approve 3", and a reason from a read), and of an option `OPTION_TEXT`. Both platforms lift
them through `offered` in `acts.ts` where they draw an act given as a datum.

Once the read an act or a control depends on has ended (a frame's `form`, or a selection's
`phase`), `endedReason` in `read.ts` gives the reason it stands blocked under: the failed sentence,
or `words.missing`. There is none while the read waits, stands still or answered.

A molecule that keeps its row still (an `ActionBar`'s acts, a Section's head, a sheet's head, a
pending bar) is a **reason host**: it draws the reason on its own line and hands the act its press
through `ReasonHostContext` (`react/reason.ts`). The act calls it when pressed while blocked; the
host shows the reason from then on, or once its form is touched.

## Touched

A `Form` or a `Sheet` is **touched** once a field inside it takes input; fields call `touch` on
change. A blocked act inside shows its reason from then on, or once it is pressed; before either it
is inert and the reason is unshown. Touched is sticky; the form's edit, which its `leave` asks about
(see [Leave](#leave)), is by value: `edited` of `useFormModel`, a field holding a value other than its
first (`sameHeld`, each value read against its control's empty, a switch's off, and a pick of several
as a set), so a field put back un-edits the form while touched stays. `useEditedByValue` is
the leave's one writer, as that edit turns; a sheet's leave is its form's, since a bare control in its
body holds the app's value. An `ActionBar` presses the leave: the edit comes and goes with the act.

## Rejections

A rejection whose every sentence already stands where it belongs (a form's refused values, each
under the field it names) is marked `placed`: the host that ran the act draws no line and no toast
of its own for it, so the sentence stands once.

A `Form`'s fields stay editable while its submit runs, so the answer reaches only the fields left as
they were sent (`changedSince` between the draft at the send and the draft now): a refusal of a field
changed meanwhile is dropped, and a form that stays puts back only the unchanged fields, keeping what
was typed during the send. Where every refused field changed, no refusal stands and the bar says the
press failed, as for any rejection. A refusal hands focus to its first refused field in the fields'
order that can take it, a disabled or locked one passed over (`firstRefused`; the field model's `seek`,
set afresh per refusal and dropped when the form starts over): on the web the field's first tabbable
control, which scrolls it into view, on the phone its typing control.

An act refused before it was sent because the server is out of reach rejects with `Unreached`. The
host draws it as any failed press, the generic sentence with no Retry; the connection's own sentence
is the app's offline banner. The binding's side of an act's attempt is [plugin-query's acts](../plugins/query.md#acts).

## Confirm

The **decision queue** (`react/confirm.ts`): `confirm()` is called from anywhere and the Shell draws
the first decision as a sheet. Its act runs the work and the sheet leaves the queue once that
resolves; dismissing the sheet leaves it with nothing run. One decision shows at a time; a second
asked meanwhile waits its turn.

`ask()` is a decision whose answer the caller waits on: `true` once its act was taken, `false` when
it was dismissed (the way out, Escape, the scrim). With no host drawing the queue (a Shell or a
Gate) nothing can ask, so the answer is `true`.

## Control saves

A control that saves its value holds it through `useDraft`'s `change`. A plain edit is kept over a
selection until its read's key changes. A `save` that returns a promise holds the next value (a
constant's too) instead, and only the latest save's outcome counts (`keepSave`):

- **Resolved**, the hold waits for the refetch its invalidation started on this value's reads,
  then the value follows its datum unless edited since.
- **Rejected**, the value falls back to the datum and `failed` hears the error with a way to save
  the same value again.

`change` returns that save's promise, which never rejects (the rejection is `failed`'s to draw), so
an act that saves again holds the attempt.

## Field values

A field's value is its selection until the viewer edits it, the edit after. An edit belongs to the
read it was made over, so a selection over another read drops it (`draftFor`). A constant is the
app's own state: it passes through, so a value the app changes shows, and a plain edit has nothing
to keep.

## Fields

`Input` is what is typed or picked, by `kind`:

- a line of text: `text`, `search`, `secret`, `source`, `number`, `email`, `date`;
- `prose`: many lines in a box that grows from three, its `budget` counted under it;
- `code`: a one-time code, a box per digit over one input, checked when the last lands;
- `file`: the field box that chooses a file. Empty, its whole box is the act (a leading glyph and
  the `chooseFile` word); chosen, the name, the size and an act that removes it. The web's file box
  also takes a dropped file, ringed while one is over it. Its value and the refusal of a file of
  another type are in [file controls](components.md#file-controls).

Every control is a field, named by its `label`, with one drawer for them all (the `FormField`
body). Placed alone it draws its field: the name over the control a gap apart (`FIELD_ALONE`; a
toggle at the end of its name's line, `FIELD_ALONE_LINE`; a slider's head is its name; in a run of
rows, a `Card`, a line's name takes the run's label column, `FIELD_ALONE_ROW`), the word `optional`
under the name, and the `description` or the `error` (a refused save's reason, until the next
change) under the control.

Where an owner names it, the label is the control's accessible name and nothing is drawn around it.
The owners are a `FormField`'s children and a `Toolbar`'s acts, which set `FieldOwned`
(`react/field.ts`), and the fits that read the label in their box (`search`, a Picker's `bar`, `row`
and `pill`). A Picker `headed`, a list that is the body of a titled Section, is named by the
Section's title and draws nothing around it. A place's tabs are links, no control, and take none.

`FieldDisabled` hands a field's disabled state to the acts and controls inside it; a disabled
control answers no press.

A field's error is a sentence read whole. A long path in it, or a `{ code }` run, wraps inside its
box on a narrow screen at a slash, never inside a segment that fits a line, and never cut at its
end. A run that fits a line moves to it whole, one box and never two (a URL after "or"), and the
brackets around a long command stay on its line with it.

Field contexts each plugin's `lib/field.ts` sets:

- **Group label.** A `FormField` around a group of controls (a list Picker, a segments Picker)
  hands the group its label (the label's id on the web), which names the group. No field context
  reaches the controls inside, so each keeps its own name.
- **Toggle row.** On the web a toggle a row's label targets (a `FormField`'s checkbox form, a list
  Picker row) draws its box with no hit box of its own, so the box sits on the label's first line. A
  row that wraps the toggle in its label names it by its label line, so the row's other text (its
  mark) stays out of the name.
- **Row entry.** An `Input` a row draws with no `FormField` around it (a list row's entry, a `Rules`
  term's typed value) stands at the field's bar fit, named by `label`, and takes focus as it mounts
  when `focus` says the viewer's own act brought it.
- **Cell edit.** A `Table` cell's edit stands in the cell at the field's bar fit, named by the cell
  (its column, then its row); a number reads end-aligned in tabular figures, as the cell does. On the
  web the control is out of the tab order (the grid's cursor reaches it), and one mounted with
  `starts` is the edit the keyboard or a tap started, so it takes focus. On the phone the control
  mounts as the edit starts (a typed one focused, a pick with its sheet open) and `done` hears it end
  (the field left, the sheet closed).
- **Sheet name.** On the phone a typing control is named by the label of the `FormField` around
  it, else by the title of the `Sheet` it sits in bare, since a sheet holding a bare field (the prose
  `Input` it grows full height for) is that field's editor. The nearest wins, so a field in a sheet
  is named by its own label.

## Commit

`commitMoment()` (`commit.ts`) says when a typing control's value is final: the viewer leaves the
field, or presses Enter on a one-line field, having changed the value since the field took focus.
Escape puts back the value the field had then and ends the edit. Both platforms' `Input` drive one
per field, so an autosaving form commits at the same moments on the web and on the phone. On the web
`lib/commit.ts` gives the focus, blur and key handlers that drive it (`enter` for a one-line field);
Escape leaves the field when the control has an `onCommit`.

A typing control inside a bound `FormField` takes the field's value, its change handler and, when
the binding autosaves, what hears each commit. A form that commits by field hands each control
`commit`: a typed control (a line, a text area) calls it on leaving the field, any other control on
its change, and each returns the save's promise for the field to hold.

## Forms

A `Form` is its procedure and its field labels. `form.ts` holds what it is made of on both
platforms, with no React: the `FieldSpec` (how an input key draws), `FormFields`, `FormGroupOf` and
`FormSubmit` types, the derivation of one field from the procedure's input schema (the JSON Schema
`stack generate` writes to `.stack/schema.ts`, [schema](../plugins/api.md#schema)): its control,
whether it is required, the values it can take and their coercion, and the read of a picked file
(`readPicked`). `react/form.ts` holds `useFormModel`, the model of a form over its
procedure: its fields' state, what each field draws, the input they make and the submit. Each
platform maps a `FieldModel` to its own `FormField` and control.

### Props

- `act` is the procedure it submits and `fields` the input's keys it shows, in order, or `groups`,
  each a run of the form's rows under a band, the title at the heading role over the description.
- `given` is what the screen supplies and `values` the fields' first values (a selection paints
  them until its read lands).
- `submit` words the form's last row under a hairline across it, the bar whose filled act submits.
- `acts` stand in that bar before the filled act (a Cancel, a destructive Decline with `confirm`),
  run as any bar's acts; with `commit: "field"` they stand in a bar of their own under the fields.
- `onDone` hears the output and the input the form sent.
- `can` is the ability the caller needs, `[action, subject]` in the route's organization
  ([abilities](../plugins/query.md#abilities)): a caller who may not has the fields and the act
  disabled under the word `denied`, the form painted until the ability lands.
- A field with `locked` stands inert with the reason in the description's place.

### Field controls

Each field is drawn from the procedure's input schema:

| Schema | Control |
| --- | --- |
| string | a line of text |
| string, `source` hint | the mono text area (`Input kind=prose source`) |
| string, `code` hint | the one-time code boxes (`Input kind=code`, `length` the schema's fixed length, the submit blocked until every box is filled) |
| string, `file` hint | a file pick (`Input kind=file`, its `accept`) whose picked file is read into the string, text or base64 |
| date | a date line (`Input kind=date`) |
| enum | a pick |
| list of an enum | a pick of several |
| boolean | a switch |
| number | a numeric line |

A field's `control` hint draws what the schema cannot say: `lines` draws a list as a line per item
(blank lines dropped, each line read as the item type, a line that fits none the field's issue) and
`json` an object as mono JSON source (parsed at commit, a parse error the field's issue). A
`secret` control is a masked line; the showcase's `/keys` leaves the token out of the form's
`values` so it is never read back.

The control decides what a field's held value is (a switch a boolean, a file a `PickedFile`, a pick
a string or `null`, several picks a list, any other a string), which the descriptor union does not
follow: each control reads the value as its own.

A field the schema makes optional offers the empty choice and, in a submit form, says `optional`
under its label in the meta ink (a form that commits by field marks no field). A field it requires
blocks the submit while it is empty. A value of the wrong type blocks the submit naming the field
(`checkField`), and a saved secret left untouched is not sent.

A value the field sends as typed is checked against its schema entry before the send (`checked` in
`form.ts`, run by `toInput`): a string's `minLength` and `maxLength` (`fewestCharacters`,
`mostCharacters`) and its `format` (`badFormat`), a number's `minimum`, `exclusiveMinimum`, `maximum`
and `exclusiveMaximum` (`leastNumber`, `moreThan`, `mostNumber`, `lessThan`) and, for an `integer`,
that it is whole (`wholeNumber`). A format is checked by the `pattern` zod emits beside it, compiled
with the `u` flag (its flags are known), and `uri` and `jwt`, which zod emits with none, by a loose shape
as loose as the server's, so the client never refuses what the server takes. A bare `pattern` (`.regex`)
is not checked: the schema drops the regex's flags and the pattern may not compile under `u`, so it is
the server's. A value the control turns into another type (a moment sent as a `Date`, a list) is not
checked. A refused value is the field's issue, as a `lines` line or a `json` parse error is.

A typed field's own issue (a check, a `lines` line, a `json` parse) stands under it once the viewer has
typed and left the field, and from then on follows each change, so a value half typed is not called
wrong; only then does it block the submit, so the bar never gives a reason the field does not show. A
press of the submit while a typed issue waits unseen sends nothing: it leaves every field, so each
issue stands and blocks (`leftWith`), and the press ends as a placed rejection, with no line and no
toast. A press of the submit while it is blocked leaves every field the same: the model's
`bar.onBlocked`, which a form that submits gives (a form that commits by field has no submit, so none),
and the form's bar (`ActionBarBase`) calls on a blocked press of its filled act (a pointer, Enter, a
tap). The field's `leave` hears the field left: on the web focus leaving the field's row (not moving
within it), on the phone a typing control's blur.

### Rows and the bar

The field is a definition row: its label in the label column, as wide as the form's widest, its
control filling the value line, a switch at its end, and the description or the issue the server's
schema refused under the control, in error. In a form that commits by field it is a row of two
groups, the label over its description and the control at its own measure beside them. A refusal of
a field stands until it is changed.

The bar's filled act submits the form, and its other acts stand inert beside it while it runs:
pending after the act delay, a rejection in the bar's kept line under the acts (`error`), the act
ready again. The bar paints its filled act, inert, while the form's own read waits (a sheet's too),
and stands blocked with the failed sentence once that read failed or is missing; a group's read is
the group's and never reaches the bar. The form draws no busy mark of its own for an act that runs.

`commit: "field"` draws no bar: each field sends `given` and its own key when its control commits (a
text on blur or Enter, a switch or a pick on its change, a file as picked), draws its own refusal,
and `submit`'s `done` is toasted per commit. A settings page is such a form.

The form's `after` may be a function of the input the fields make, so a read drawn after the fields
follows the first values and the viewer's typing (the showcase's `/keys` draws the request it would
send).

### Where a form stands

A `Sheet`'s `form` and a `Gate`'s `form` take the same props as a `Form`; a `Gate` step over local
state draws its controls directly, with no `form`. A `Form` placed alone is a card of rows over its
bar. A Gate's `form` is a card of rows with its bar
after the card (web). A Sheet's `form` is rows flush on the sheet after the body's parts, its bar
stuck to the body's foot (web) or in the sheet's pinned foot (phone). The drawers a form is made of,
the field it draws for each key and the bar of acts that submits, are no app's to place.

## Leave

`createLeave()` (`leave.ts`) decides whether leaving a form asks, with one question per leave. A
`Form` holds one `Leave`: the form's edit by value writes it (`edit`, [touched](#touched)), the filled
act's press hands the edit to the act, and a leave attempt asks the viewer while the form stands edited: discard the edit, or keep
editing.
Both plugins' `Form` and `ActionBar` drive it, so the web and the phone ask under the same rules.

- **Web.** A leave is a router navigation, the back button, a reload or a closed tab. Bound to the
  router, its history asks before any navigation it makes (a push, a replace, the back button), the
  answer deciding whether it goes ahead, and the page's unload is held only while the form asks.
  Unbound, the unload is all the page can hold, since an act there loads the document.
- **Phone.** A leave is the back, a swipe or a navigate. The screen's `beforeRemove` is prevented,
  the decision queue asks, and a discard dispatches the action the navigation had. The question is
  the decision queue's, so the app passes nothing.

Every phone form stands in one base that holds the touched state its fields edit and the leave guard
where it asks once when its edited screen is left. The public `Form` and a `Gate`'s form hold their
own touched state and stand as a card; a sheet's form takes the sheet's, which its foot reads too,
stands flush on the sheet and asks nothing when it closes.

## In the code

- `packages/ui-core/src/acts.ts`: what an act is made of, run and save logic, rejection marks, `Unreached`, the more menu
- `packages/ui-core/src/react/acts.ts`: `createActs`, `useDraft` and the attempt and save hooks
- `packages/ui-core/src/roster/descriptors.ts`: `Act`, `LinkAct` and the typing control's field binding
- `packages/ui-core/src/roster/button.ts`: the act's three forms and its press order
- `packages/ui-core/src/roster/action-bar.ts`: the `ActionBar` contract
- `packages/ui-core/src/overflow.ts`: `actsStackedMax`, the widest block whose bar stacks
- `packages/ui-core/src/reason.ts`: `pressStands`, `ACT_TEXT`, `OPTION_TEXT`
- `packages/ui-core/src/react/reason.ts`: `ReasonHostContext`, `usePressed`
- `packages/ui-core/src/read.ts`: `endedReason`
- `packages/ui-core/src/react/touched.ts`: the touched state of a form or sheet
- `packages/ui-core/src/react/confirm.ts`: the decision queue, `confirm`, `ask`
- `packages/ui-core/src/react/field.ts`: `FieldDisabled`, `FieldOwned`
- `packages/ui-core/src/roster/input.ts`: the `Input` kinds and the field drawer
- `packages/ui-core/src/commit.ts`: `commitMoment`
- `packages/ui-core/src/roster/form.ts`: the `Form` contract
- `packages/ui-core/src/form.ts`: `FieldSpec` and the schema derivation
- `packages/ui-core/src/react/form.ts`: `useFormModel`
- `packages/ui-core/src/leave.ts`: `createLeave`
- `plugins/react-ui/src/ui/lib/form.ts`: `ActInert`
- `plugins/react-ui/src/ui/lib/field.ts`: the web's field contexts
- `plugins/react-ui/src/ui/lib/commit.ts`: the web's commit handlers
- `plugins/react-ui/src/ui/lib/leave.ts`: the web's leave guard
- `plugins/react-ui/src/ui/lib/navigate.ts`: the router's held navigation
- `plugins/react-ui/src/ui/components/form/index.tsx`: the web field descriptor and held values
- `plugins/native-ui/src/ui/components/button/base.tsx`: the phone act's attempt, pending and blocked looks
- `plugins/native-ui/src/ui/components/action-bar/base.tsx`: the phone bar's blocked reasons
- `plugins/native-ui/src/ui/components/pane/head.tsx`: a pane head's painted and blocked acts
- `plugins/native-ui/src/ui/components/form/base.tsx`: the phone form base
- `plugins/native-ui/src/ui/components/form/index.tsx`: the phone field descriptor
- `plugins/native-ui/src/ui/lib/field.ts`: the phone's field contexts
- `plugins/native-ui/src/ui/lib/leave.ts`: the phone's leave guard
- `apps/showcase/src/app/routes/_app/keys.tsx`: a form with a `secret` field and an `after` read
