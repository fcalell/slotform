# Product

`@fcalell/stack` is a full-stack framework: Hono + Cloudflare on the server, React on the web,
React Native on the phone. It ships everything a consumer needs to build and deploy a production
app (database, API, UI, tooling) so they only write business logic. Plugins wrap their domain and
coordinate only through a typed slot graph. Every design decision is judged against the five
pillars below.

## The consumer writes only business logic

Plugins wrap their domain (Drizzle, Hono, oRPC, Vite, Tailwind) and re-export only what is needed.
Consumers do not import `drizzle-orm`, `hono`, `zod`, `vite` or `tailwindcss` directly and install
none by hand (`stack init` and `stack add` write the build tools into the app's `devDependencies`),
and they do not hand-write glue code, boilerplate config or wiring. If a value can be generated,
inferred, defaulted or auto-wired, a plugin does it behind the scenes. A new consumer-facing option
is the last resort, not the first.

Accessibility is part of that: the roster's components carry the bar the
[voice page](../packages/ui-core/guide/voice.md) sets as its floors, native semantics with a name on
every control and keyboard behaviour, so a screen composed from them meets it with no consumer
code. One correct component covers every product and one broken component breaks every product, so
a choice that moves this behaviour (a primitive library dropped, a widget hand-built) is judged
against the bar first. Screen readers are not a target: nothing is built for one alone (an
announcement, hidden duplicate content, a sentence assembled only to be spoken) and nothing is
verified with one, since the names and roles the bar keeps already serve keyboard, voice control,
tests and agents, and the rest is cost no product has asked for.

## CLI orchestrates; plugins contribute independently

`@fcalell/cli` owns the lifecycle (init, dev, build, deploy), the slot graph engine and
`stack.config.ts`, nothing else. Codegen surfaces are typed slots defined on the owning plugin:
`api.slots.workerSource`, `cloudflare.slots.wranglerToml`, `vite.slots.viteConfig`,
`react.slots.entrySource` / `htmlSource` / `providersSource`, `expo.slots.entrySource`,
`nativeUi.slots.appCssSource`. CLI-level lifecycle slots (`cliSlots.artifactFiles`,
`cliSlots.devProcesses`, …) are the cross-cutting sinks every command consumes
([slot catalog](./architecture/slot-catalog.md)). Plugins never import each other to coordinate;
they contribute typed values to one another's slots and read shared values through derived slots.
Cross-plugin handoff happens through the slot graph, never through shared mutable state.

## Everything is opt-in and composable

A project can use just the UI, just the database, or the full stack. Plugins declare typed slot
contributions; the framework resolves dataflow once per command. There is no plugin firing order to
think about: data dependencies are the order, and the bug class of ordering surprises is
structurally dead ([ordering by data](./architecture/slot-graph.md#ordering-by-data)).

## Features live in the plugin that owns the domain; core stays domain-agnostic

`@fcalell/cli` does not know what fonts, auth or schemas mean. Typography options go on
`plugin-native-ui`; CORS on `plugin-api`; tables on `plugin-db`; HTML `<head>` metadata on
`plugin-react`; the deep-link scheme on `plugin-expo`. The top-level `app` field is strictly
cross-cutting identity (`name`, `domain`): values consumed by more than one plugin. A field that
only makes sense for one plugin's domain belongs on that plugin's options, not on `app`. Domain
types (`FontEntry`, `AuthProvider`) never leak into `@fcalell/cli`.

Quick test: if removing a feature would require changes to `@fcalell/cli`, the feature is in the
wrong place.

## Plugins share one contract

Every plugin, first-party or third-party, is built with `plugin()`, declares typed `slots`,
contributes typed payloads, and speaks the same AST-spec vocabulary
([plugin authoring](./architecture/plugin-authoring.md)). A third-party plugin
(`@acme/stack-plugin-widget`) composes with the official ones: same factory, same slot system, same
dependency rules. Extending the framework extends that shared interface; it never ships a new one.
