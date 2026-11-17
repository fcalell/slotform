# Docs index

How `@fcalell/stack` is built: a reading list for each kind of task, then every page. The guide pages
(`packages/*/guide/`, `plugins/*/guide/`) hold how a consumer builds on stack and ship with their
package; this tree holds how stack itself is built.

## Reading lists

Read the pages listed for a task whole before proposing a change of that kind.

- **Any TypeScript change:** [conventions](architecture/conventions.md).
- **A plugin's slots, options or contributions:** [plugin authoring](architecture/plugin-authoring.md),
  [slot graph](architecture/slot-graph.md), [slot catalog](architecture/slot-catalog.md), and the plugin's page
  under [plugins](#plugins).
- **Generated files and codegen:** [codegen](architecture/codegen.md),
  [consumer project](architecture/consumer-project.md), [commands](architecture/commands.md).
- **The worker, procedures, auth or the client:** [runtime](architecture/runtime.md),
  [plugin-api](architecture/plugins/api.md), [plugin-auth](architecture/plugins/auth.md),
  [plugin-query](architecture/plugins/query.md).
- **A deploy target or the database:** [plugin-cloudflare](architecture/plugins/cloudflare.md),
  [plugin-node](architecture/plugins/node.md), [plugin-db](architecture/plugins/db.md).
- **A ui-core contract (tokens, roster, words, motion):** [ui-core](architecture/ui-core.md) and the
  page of the topic under [ui-core](#ui-core).
- **A web or phone component:** [ui-core](architecture/ui-core.md), [layout](architecture/ui-core/layout.md),
  [reads](architecture/ui-core/reads.md), [acts](architecture/ui-core/acts.md),
  [components](architecture/ui-core/components.md), and [plugin-react-ui](architecture/plugins/react-ui.md)
  or [plugin-native-ui](architecture/plugins/native-ui.md). The root `CLAUDE.md` names the guide pages
  and the showcase scenes a component change carries.
- **The showcase, Storybook or the screen run:** [showcase](architecture/ui-core/showcase.md),
  [plugin-screens](architecture/plugins/screens.md).
- **A manifest's `files`, `exports`, dependencies or peers:** [releasing](architecture/releasing.md).
- **A new consumer-facing option or surface:** [product](product.md).
- **Publishing:** [publishing](procedures/publishing.md).

## Pages

- [Product](product.md): what stack is for, the five pillars every decision is judged against.
- [Glossary](glossary.md): one definition per term.
- [Roadmap](roadmap.md): unbuilt work.
- [Architecture](architecture.md): the monorepo, its packages and plugins, the dependency graph.

### Architecture

- [Slot graph](architecture/slot-graph.md): the four slot kinds, contributing and deriving, ordering by data.
- [Slot catalog](architecture/slot-catalog.md): every first-party slot and spec type.
- [Plugin authoring](architecture/plugin-authoring.md): the `plugin()` contract, options, callbacks, templates.
- [Codegen](architecture/codegen.md): the AST and printers, the trust boundaries, artifact emit.
- [Commands](architecture/commands.md): each `stack` command's procedure, prompts, plugin subcommands.
- [Consumer project](architecture/consumer-project.md): the generated repo, config, install modes, lint, the guide.
- [Runtime](architecture/runtime.md): the generated worker chain, its context, middleware and background handlers.
- [Conventions](architecture/conventions.md): package, build, folder and prop-naming rules.
- [Releasing](architecture/releasing.md): what is published, the version rule, peers, the check.

### ui-core

- [ui-core](architecture/ui-core.md): what ui-core is, its subpaths and the sharing line.
- [Tokens](architecture/ui-core/tokens.md): knobs, the token contract, contrast floors, density, emit.
- [Motion](architecture/ui-core/motion.md): the motion contract on both platforms.
- [Words](architecture/ui-core/words.md): the closed words, formatters and text runs.
- [Roster](architecture/ui-core/roster.md): the canon, descriptors, matrices, cells and DESIGN.md.
- [Layout](architecture/ui-core/layout.md): Shell, Panes, Pane, Section, rows, overflow rules, headings.
- [Reads](architecture/ui-core/reads.md): the read model, frames, paint and the port.
- [Acts](architecture/ui-core/acts.md): acts, saves, forms, confirm, leave and fields.
- [Components](architecture/ui-core/components.md): Table, Picker, Thread, charts and the other content contracts.
- [Sound](architecture/ui-core/sound.md): track, player, dock and waveform.
- [Drag](architecture/ui-core/drag.md): drag, drop, reorder and follow.
- [Showcase](architecture/ui-core/showcase.md): the showcase app, roster scenes, Storybook, enforcement.

### Plugins

- [plugin-api](architecture/plugins/api.md): the worker, procedures, wire contract, CORS, env.
- [plugin-auth](architecture/plugins/auth.md): Better Auth options, runtime, clients, sessions, access.
- [plugin-query](architecture/plugins/query.md): the TanStack Query binding, abilities, acts, reads.
- [plugin-db](architecture/plugins/db.md): Drizzle over D1 or SQLite, push, gates, seed, full-text indexes.
- [plugin-cloudflare](architecture/plugins/cloudflare.md): the Workers target and its wrangler config.
- [plugin-node](architecture/plugins/node.md): the Node server target, services, WebSockets, the bundle.
- [plugin-vite](architecture/plugins/vite.md): the Vite lifecycle, dev server, CSP.
- [plugin-react](architecture/plugins/react.md): the web bootstrap, router, providers, HTML shell.
- [plugin-react-ui](architecture/plugins/react-ui.md): the web design system's plugin and components.
- [plugin-expo](architecture/plugins/expo.md): the Expo target, generated configs, version gate.
- [plugin-native-ui](architecture/plugins/native-ui.md): the phone design system's plugin and components.
- [plugin-screens](architecture/plugins/screens.md): the screens workbench, fixtures, the test run.

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
