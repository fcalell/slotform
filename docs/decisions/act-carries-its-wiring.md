# An act carries its wiring

An `Act` says what happens around its `onAct` as data: `confirm` (`{ title, sentence }`, asked
before it runs), `done` (the sentence toasted once it resolves), `to` (the route gone to once it
resolves) and `sheet` (the sheet it opens, with the props the act holds at the press, in the root container's [sheet outlet](../architecture/ui-core/acts.md#sheets-an-act-opens); an act that opens a sheet has no
`onAct`, the two being exclusive in the type; `sheetOf` types the sheet's form by its procedure). A `LinkAct` takes `blocked` and draws inert with its reason. The platform
runs them in one order ([act press](../architecture/ui-core/acts.md#act-press)). A consumer writes none of that by hand, and a
sheet with no act that opens it is addressed by a search param, never by an open flag in a
component's state.

**Why.** Measured on one consumer: every one of 28 confirms wrapped `onAct` in
`confirm({ title, sentence, act })`, 53 of 54 writes toasted the same `done` sentence shape after
`mutateAsync`, 22 navigated after, and 28 of 36 `useState(false)` flags existed only to hold a
sheet an act opens. Each is one shape repeated, so it is the act's data, not the screen's code.

**Trade-off.** The `Act` descriptor is the platform's one orchestration point, so an act that
needs an order the platform does not sequence (a toast before a confirm, two sheets) has no form
and is a shortfall to file, not a hand-wired exception. `sheet` is a platform widening of the ui-core
descriptor (ui-core imports no React), as `WithReads` widens a row.
