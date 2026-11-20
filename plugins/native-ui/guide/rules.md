# Rules for the phone UI

Each phone `.tsx` obeys these rules. Its design system is the roster
(`node_modules/@slotform/ui-core/src/roster.ts`, each component's entry in `src/roster/<component>.ts`, web prop names; class sets, states and tokens in
ui-core's `DESIGN.md`) plus the app's own `ui/` directory (any `ui/` path segment); the rest
composes components and never restyles them. The rules both platforms share are ui-core's guide
pages (`node_modules/@slotform/ui-core/guide/<page>.md`).

## Pick the component first

Find the roster component that owns the shape: the container (`Shell`, `Pane`, `Gate`),
the rhythm (`Section`), the row (a `Section`'s `items`, a `Form`'s fields), the
control, the text role (`Text`). A `View` rebuilding one is drift. A route renders one `Pane`
(`panes.md`).

## Classes are geometry, on hosts only

A component takes no `class`, `className`, `classList` or `style`, nor uniwind's host class
channels (`colorClassName` and the rest): its props type declares each `?: never`. A class
belongs only on a `View`, `Pressable`, `ScrollView` or `Animated.View`, only for geometry: flex
plumbing, alignment, zero offsets, fill sizes, gap rungs. A fill, radius, border, shadow, weight,
tone, transition or state is a look, and a numeric dimension is never geometry. Copy never sits
in React Native's `Text`.

## Tokens only

Every colour, size, radius and spacing is a contract token, never an arbitrary value (`h-[34px]`),
a literal colour or raw pixels. Copy renders through `Text` (`body` or `meta`, a `{ strong }` run for emphasis inside it: `<Text>{["Signed in as ", { strong: email }]}</Text>`) or the molecule that owns its role (`title` is `Pane`'s and `Gate`'s, `heading` `Section`'s (one size everywhere, in a sheet too),
`figure` `Stats`'); colour comes through a component's props.

## A page outside the shell is a `Gate`

A page with no tab bar beside it (sign-in, a consent step) is a `Gate`, never a hand-built centred
`View`; a flow of two to four steps gives its `step`, never a hand-built bar or a row of dots. A first
run (no workspace yet, nothing to show) is a titled `Gate` like any step: the `title` says what is
missing, the `description` what the act makes, and the `children` are its `Button`s, the primary act
first and the secondary one a `<Button act="secondary" />`. It has no icon; the app's mark leads it.
There is no untitled form or `empty` on a `Gate`.

```tsx
<Gate title="Deploy your first app" description={["Connect a repository and Acme builds and deploys every push to main."]}>
  <Button label="Connect a repository" onAct={connect} />
  <Button act="secondary" label="Start from a template" onAct={fromTemplate} />
</Gate>
```

## Tone is one vocabulary

A status, a `Banner` and a `toast()` take one `tone`, and a status is a `StatusMark`
(`node_modules/@slotform/ui-core/guide/tone.md`).

## A form is its procedure and its field labels

A value the viewer sends to a procedure is a `Form` over it
(`node_modules/@slotform/ui-core/guide/forms.md#what-is-a-form`). One form among a screen's sections
is `Section > Form`, so every section's head-to-body gap stays the gap.

## Words and text sizes

A word a component draws on its own is `nativeUi({ words })`'s, every sentence is a prop, and every
string prop takes one of four sizes (`node_modules/@slotform/ui-core/guide/words.md`).

A word no line can break (a 300-character token, a URL) never pushes a row past the edge. React
Native's text does not shrink in a row, so each `Text` that stands in a `flex-row` decides: `shrink`
(`flex-1`, `min-w-0`) where its words may be long, `shrink-0` where it is a figure or a stand-in
that must hold.

## What the roster lacks

A shape that needs the app's nouns lives in `ui/`
(`node_modules/@slotform/ui-core/guide/rows.md#the-apps-ui`). A shape no component owns, or a look its
props cannot express, takes the nearest shape the roster draws: another component, a plainer layout,
a nicety dropped, named as a known limit. Only a bug, or a part the screen cannot ship without that
no composition delivers, is a shortfall (`node_modules/@slotform/cli/guide/shortfall.md`). Never a
call-site class, a wrapper that re-adds a look, a local copy of a Slotform component, or a host
carrying tokens.

## Done

`pnpm check` passes; the screen is checked on a device or simulator, light and dark.
