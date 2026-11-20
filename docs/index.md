# Docs index

How Slotform is built: a reading list for each kind of task, then every page. The guide pages
(`packages/*/guide/`, `plugins/*/guide/`) hold how a consumer builds on Slotform and ship with their
package; this tree holds how Slotform itself is built.

## Reading lists

Read the pages listed for a task whole before proposing a change of that kind.

- **Any TypeScript change:** [conventions](architecture/conventions.md).
- **A plugin's slots, options or contributions:** [plugin authoring](architecture/plugin-authoring.md),
  [slot graph](architecture/slot-graph.md), [slot catalog](architecture/slot-catalog.md), and the plugin's page
  under [plugins](#plugins).
- **Generated files and codegen:** [codegen](architecture/codegen.md),
  [consumer project](architecture/consumer-project.md), [commands](architecture/commands.md).
- **The worker, procedures, auth or the client:** [runtime](architecture/runtime.md),
  [api plugin](architecture/plugins/api.md), [auth plugin](architecture/plugins/auth.md),
  [query plugin](architecture/plugins/query.md).
- **A deploy target or the database:** [cloudflare plugin](architecture/plugins/cloudflare.md),
  [node plugin](architecture/plugins/node.md), [db plugin](architecture/plugins/db.md).
- **A ui-core contract (tokens, roster, words, motion):** [ui-core](architecture/ui-core.md) and the
  page of the topic under [ui-core](#ui-core).
- **A web or phone component:** [ui-core](architecture/ui-core.md), [layout](architecture/ui-core/layout.md),
  [reads](architecture/ui-core/reads.md), [acts](architecture/ui-core/acts.md),
  [components](architecture/ui-core/components.md), and [react-ui plugin](architecture/plugins/react-ui.md)
  or [native-ui plugin](architecture/plugins/native-ui.md). The root `CLAUDE.md` names the guide pages
  and the showcase scenes a component change carries.
- **The showcase, Storybook or the test run:** [showcase](architecture/ui-core/showcase.md),
  [screens plugin](architecture/plugins/screens.md).
- **A manifest's `files`, `exports`, dependencies or peers:** [releasing](architecture/releasing.md).
- **A new consumer-facing option or surface:** [product](product.md).
- **Publishing:** [publishing](procedures/publishing.md).

## Pages

- [Product](product.md): what Slotform is for, the five pillars every decision is judged against.
- [Glossary](glossary.md): one definition per term.
- [Roadmap](roadmap.md): unbuilt work.
- [Architecture](architecture.md): the monorepo, its packages and plugins, the dependency graph.

### Architecture

- [Slot graph](architecture/slot-graph.md): the four slot kinds, contributing and deriving, ordering by data.
- [Slot catalog](architecture/slot-catalog.md): every first-party slot and spec type.
- [Plugin authoring](architecture/plugin-authoring.md): the `plugin()` contract, options, callbacks, templates.
- [Codegen](architecture/codegen.md): the AST and printers, the trust boundaries, artifact emit.
- [Commands](architecture/commands.md): each `slotform` command's procedure, prompts, plugin subcommands.
- [Consumer project](architecture/consumer-project.md): the generated repo, config, install modes, lint, the guide.
- [Runtime](architecture/runtime.md): the generated worker chain, its context, middleware and background handlers.
- [Conventions](architecture/conventions.md): package, build, folder and prop-naming rules, and where the environment is read.
- [Releasing](architecture/releasing.md): what is published, the version rule, peers, the check.

### ui-core

- [ui-core](architecture/ui-core.md): what ui-core is, its subpaths and the sharing line.
- [Tokens](architecture/ui-core/tokens.md): knobs, the token contract, contrast floors, density, emit.
- [Motion](architecture/ui-core/motion.md): the motion contract on both platforms.
- [Words](architecture/ui-core/words.md): the closed words, formatters and text runs.
- [Roster](architecture/ui-core/roster.md): the canon, descriptors, matrices, class sets and DESIGN.md.
- [Layout](architecture/ui-core/layout.md): Shell, Panes, Pane, Section, rows, overflow rules, headings.
- [Reads](architecture/ui-core/reads.md): the read model, frames, paint and the port.
- [Acts](architecture/ui-core/acts.md): acts, saves, forms, confirm, leave and fields.
- [Components](architecture/ui-core/components.md): Table, Picker, Thread, charts and the other content contracts.
- [Sound](architecture/ui-core/sound.md): track, player, dock and waveform.
- [Drag](architecture/ui-core/drag.md): drag, drop, reorder and follow.
- [Showcase](architecture/ui-core/showcase.md): the showcase app, roster scenes, Storybook, enforcement.

### Plugins

- [api plugin](architecture/plugins/api.md): the worker, procedures, wire contract, CORS, env.
- [auth plugin](architecture/plugins/auth.md): Better Auth options, runtime, clients, sessions, access.
- [query plugin](architecture/plugins/query.md): the TanStack Query binding, abilities, acts, reads.
- [db plugin](architecture/plugins/db.md): Drizzle over D1 or SQLite, push, deploy checks, seed, full-text indexes.
- [cloudflare plugin](architecture/plugins/cloudflare.md): the Workers target and its wrangler config.
- [node plugin](architecture/plugins/node.md): the Node server target, services, WebSockets, the bundle.
- [vite plugin](architecture/plugins/vite.md): the Vite lifecycle, dev server, CSP.
- [react plugin](architecture/plugins/react.md): the web bootstrap, router, providers, HTML shell.
- [react-ui plugin](architecture/plugins/react-ui.md): the web design system's plugin and components.
- [expo plugin](architecture/plugins/expo.md): the Expo target, generated configs, version gate.
- [native-ui plugin](architecture/plugins/native-ui.md): the phone design system's plugin and components.
- [screens plugin](architecture/plugins/screens.md): the screens workbench, fixtures, the test run.

### Decisions

- [An act carries its wiring](decisions/act-carries-its-wiring.md)
- [A drag is data](decisions/a-drag-is-data.md)
- [A form is derived from its procedure](decisions/form-from-a-procedure.md)
- [Moves land at once](decisions/moves-land-at-once.md)
- [A component is public when a consumer places it](decisions/public-roster.md)
- [Rows are data](decisions/rows-are-data.md)
- [The route scopes the client](decisions/scoped-client.md)
- [The player is composed](decisions/the-player-is-composed.md)

### Procedures

- [Publishing](procedures/publishing.md): the owner's release runbook.
- [Consumer version move](procedures/consumer-version-move.md): moving a consumer from a git pin to a version.
- [Consumer migration](procedures/consumer-migration.md): moving a consumer onto Slotform as it stands: Node floor, moved imports, renames, behaviour changes.
