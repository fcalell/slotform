# A shortfall in Slotform

A shortfall is one of two things, and nothing else:

- **a bug**: Slotform renders or behaves wrong for what it already offers;
- **a missing feature that matters**: an act, an option or a contract the app cannot ship
  without (a component, an option in a plugin, a feature of a procedure, a column type), which no
  composition of what Slotform provides delivers.

Anything short of that is not a shortfall: the app takes the nearest shape Slotform provides (another
component, a plainer layout, a nicety dropped) and names the compromise as a known limit. Polish
(a measurement off its pattern's range, a variant that would read better, a state Slotform draws
plainly) is never a shortfall.

Shortfall or not, nothing is rebuilt in the app: no host element with tokens, no local copy of a Slotform
module, no wrapper that re-adds what Slotform lacks. The app never writes into the Slotform checkout.

Before reporting a shortfall, check whether Slotform's latest release already has the part: the app's
version is the one `pnpm-lock.yaml` records for the `@slotform/*` packages, and npm may hold a newer
one (`pnpm outdated "@slotform/*"`). When it does, the fix is moving the version
(`pnpm update "@slotform/*"`, which moves every Slotform package together), proposed to the owner of
the app. When it does not, open an issue on the Slotform repository saying what is missing, the app
work that needs it, and why nothing Slotform ships provides it. Only the work that cannot ship
without the part waits for it.
