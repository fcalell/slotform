# Rules for the web UI

Every app `.tsx` follows these rules. The design system is the roster
(`node_modules/@fcalell/ui-core/src/roster.ts`, each component's entry in `src/roster/<component>.ts`; cells, states and tokens in ui-core's `DESIGN.md`)
plus the app's own `ui/` directory (any `ui/` path segment); everything else composes components
and never restyles them.

## Pick the component first

Find the roster component that owns the shape: the container (`Shell`, `Pane`, `Gate`),
the rhythm (`Section`), the row (a `Section`'s `items`, a `Form`'s fields), the
control, the text role (`Text`). A host element that rebuilds one of these is drift. A composed
region is data its molecule renders, never nodes. A shape no component owns takes the nearest one the
roster draws (`node_modules/@fcalell/cli/guide/shortfall.md`).

A Pane stands in a place, as the place's own or a record's (`node_modules/@fcalell/ui-core/guide/places.md#two-kinds-of-pane`).
A record opens beside its list and its tabs stay in its Pane: the record's route is a child of the list's,
the list's route renders an `<Outlet />` after its Pane, and the record's one inside its Pane's body.

```tsx
// routes/projects.tsx: the place's Pane, then whatever record is open
<><ProjectsPane /><Outlet /></>
// routes/projects/$project.tsx: the record's Pane; the tab routes render inside its body
<Pane title={project.at((p) => p.name)} record={head} noun="project" acts={[edit]}>
  <Tabs /><Outlet />
</Pane>
```

A place whose body is one record (a project's overview, a settings record) is the place's Pane, titled by
the place; the record's name shows in the sidebar's switcher. The `Shell`: [shell](./shell.md); a `Pane`: [pane](./pane.md).

## One `Button`, one `Input`, one `Switch`

The controls and their fields: `node_modules/@fcalell/ui-core/guide/controls.md`; their props: [controls](./controls.md).

## Tone is one vocabulary

A status, a `Banner` and a toast take one `tone`, and a status is a `StatusMark`: `node_modules/@fcalell/ui-core/guide/tone.md`. A message the viewer must read again is a [`Banner`](./containers.md#banner).

## Sound is the player's

A track a viewer plays is `player.play(track)` (`lib/player`), never an `<audio>`, a `new Audio()` or a
seek slider built by hand: [audio](./audio.md).

## A route act is a link

A route act is a `LinkAct`, and side-by-side acts fold by one rule: `node_modules/@fcalell/ui-core/guide/links.md`.
The check flags an `onAct` that only calls `navigate(...)` (`no-navigate-act`). A link draws as an `<a href>`
in its act's look ([controls](./controls.md#button)).

## A record's decision is an `ActionBar`

Acts that stand together at the end of what they decide (a record's Approve and Decline, a step's
Back and Continue, a pane body's Discard and Save) are one `ActionBar`, never `Button`s the screen
lines up: [acts](./acts.md#actionbar).

## A form is its procedure and its field labels

A `Form`'s props: [forms](./forms.md); what both platforms share: `node_modules/@fcalell/ui-core/guide/forms.md`.

A screen stands one filled act (`node_modules/@fcalell/ui-core/guide/face-surfaces.md`, **Controls**), and a `Form`'s submit is always one. So a `Form`
beside the Pane's filled act lives in a sheet the Pane's act, or a row's, opens; a `Form` in the Pane's
body is the Pane's one decision, and the Pane gives no filled act. Settings with no decision are
`commit: "field"`, with no bar.

## A `Section` never stands in a `Section`

A parted page is `Section`s in a `Pane`, a parted form is `groups`: [section](./section.md).

## Collections take data

Rows are data: `node_modules/@fcalell/ui-core/guide/rows.md`; what a row says of itself: `node_modules/@fcalell/ui-core/guide/facts.md`.
A list of things is a `Section` of `Row`s ([section](./section.md)), records read across columns a `Table`
([table](./table.md)).

## Drag, drop and reorder

A drag is data, on the web only: [drag](./drag.md).

## Pictures side by side are a `Gallery`

Which component draws pictures, and a code a camera reads: `node_modules/@fcalell/ui-core/guide/pictures.md`; a `Gallery`'s and a `QrCode`'s props: [blocks](./blocks.md#gallery).

## A region that reads is a frame

A region that reads is a frame: `node_modules/@fcalell/ui-core/guide/frames.md`; how it waits, and how an act paints by its own datum: `node_modules/@fcalell/ui-core/guide/waiting.md`.

## An act holds its attempt

Acts, their wiring and their order: `node_modules/@fcalell/ui-core/guide/acts.md`; a sheet an act opens: `node_modules/@fcalell/ui-core/guide/sheets.md`; the web's act types, the `ActionBar` and toasts: [acts](./acts.md).

## Words are the config's, sentences are props

A word a component draws on its own comes from `reactUi({ words })`: `node_modules/@fcalell/ui-core/guide/words.md`.

## A text prop takes one of four sizes

The four sizes and what a component does past them: `node_modules/@fcalell/ui-core/guide/words.md#a-text-prop-takes-one-of-four-sizes`.

## The app's `ui/`

A shape that needs the app's nouns: `node_modules/@fcalell/ui-core/guide/rows.md#the-apps-ui`.

## What the check enforces

`pnpm check` fails the lint rules on the app's own sources (the directory its routes sit in), from
`.stack/biome.json` (`node_modules/@fcalell/cli/guide/commands.md`). The rules are `LINT_RULES` in `plugins/react-ui/src/node/lint.ts`, each a
`plugins/react-ui/lint/<rule>.grit` whose header states what it forbids. The rest stays a rule a
reviewer holds.
