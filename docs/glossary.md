# Glossary

One definition per term the docs use as a defined word: what it is in a sentence or two, the words
to avoid for it, and a link to the page that owns it. How a thing is built lives on that page, never
here. A term means only what this page says; a page that uses a word in a second sense is a defect
to fix, and a new term enters this page in the change that introduces it.

## Framework

- **plugin**: A self-contained feature unit built with `plugin()` that owns one domain: its config
  schema, its slots, its contributions, and optionally commands, callbacks and a worker runtime.
  [architecture](architecture.md#plugins)
- **consumer**: An app built on stack, configured by its `stack.config.ts`. The showcase and the
  phone app in this repo are private consumers. Avoid: stack app.
  [consumer project](architecture/consumer-project.md#config)
- **`app`**: The config's top-level field for cross-cutting identity (`name`, `domain`), holding only
  values more than one plugin reads; anything one plugin's domain needs is that plugin's option.
  [consumer project](architecture/consumer-project.md#config)
- **slot**: A typed, named value a plugin owns, which other plugins contribute to or derive from;
  the only way a value crosses from one plugin to another. [slot graph](architecture/slot-graph.md#the-four-slot-kinds)
- **slot kind**: One of the four ways a slot combines what it is given: `list`, `map`, `value` or
  `derived`. [slot graph](architecture/slot-graph.md#the-four-slot-kinds)
- **`list` slot**: A slot whose contributions are concatenated into one list.
  [slot graph](architecture/slot-graph.md#the-four-slot-kinds)
- **`map` slot**: A slot whose contributions are merged by key, a duplicate key being an error
  unless the slot declares how to merge it. [slot graph](architecture/slot-graph.md#the-four-slot-kinds)
- **`value` slot**: A slot that takes one contribution in place of its seed.
  [slot graph](architecture/slot-graph.md#the-four-slot-kinds)
- **`derived` slot**: A slot computed from other slots, which takes no contribution.
  [slot graph](architecture/slot-graph.md#the-four-slot-kinds)
- **slot graph**: The set of every slot and the edges between them, resolved once per command; it is
  the framework's only coordination mechanism, and its data edges are the execution order.
  Avoid: event lifecycle, hooks. [slot graph](architecture/slot-graph.md#slot-graph)
- **slot catalog**: The registry of every first-party slot and the payload shapes they carry, one
  table per owning plugin. [slot catalog](architecture/slot-catalog.md#slot-catalog-and-spec-types)
- **contribution**: A value one plugin pushes into another plugin's slot; a contribution that gives
  nothing is skipped. [slot graph](architecture/slot-graph.md#contributing-and-deriving)
- **derivation**: A slot's value computed from other slots it names as inputs.
  [slot graph](architecture/slot-graph.md#contributing-and-deriving)
- **spec type**: A shape a slot's payload carries, such as a file to scaffold or an AST node.
  [slot catalog](architecture/slot-catalog.md#spec-types)
- **`requires`**: A plugin's declaration that a sibling plugin, or exactly one of several, must be in
  the config. It says presence only and never sets order. [slot graph](architecture/slot-graph.md#requires)
- **deploy target**: The plugin that runs the worker in dev and deploys it: plugin-cloudflare or
  plugin-node. Avoid: server target. [architecture](architecture.md#plugins)
- **worker**: The server program stack generates from what the plugins contribute, run by the deploy
  target. [runtime](architecture/runtime.md#the-generated-worker)
- **`.stack/`**: The directory of a consumer that holds every generated file; nothing in it is edited
  by hand. [consumer project](architecture/consumer-project.md#project-structure)
- **generate**: The command (`stack generate`) that resolves every artifact, writes it under
  `.stack/` and runs the hooks that follow; every other command runs it first.
  [commands](architecture/commands.md#stack-generate)
- **artifact**: A file `generate` writes from a slot's value. [codegen](architecture/codegen.md#artifact-emit)
- **guide page**: A page a package ships under `guide/` on how a consumer builds on stack, read at the
  version the consumer installs. [consumer project](architecture/consumer-project.md#the-guide)
- **guide index**: `.stack/guide.md`, the list of every guide page of the consumer's plugins, each
  with the trigger that says when to open it. [consumer project](architecture/consumer-project.md#the-guide)
- **gap**: A bug or missing feature a consumer cannot ship without, filed as an issue on stack and
  never worked around in the consumer. [consumer project](architecture/consumer-project.md#designing-screens)
- **version rule**: Every public stack package carries one version and is released together, and
  stack packages depend on each other by a caret of it. [releasing](architecture/releasing.md#the-version-rule)
- **release check**: `pnpm release:check`, which packs every public package and proves the tarballs
  install and build in fresh consumers, publishing nothing. [releasing](architecture/releasing.md#the-check)
- **runbook**: A page under `procedures/` that holds manual steps the owner follows.
  [publishing](procedures/publishing.md)

## Data and server

- **procedure**: One typed endpoint of the API, built with the `procedure` factory in a route file,
  with its input, output, scope and the entities it reads and writes.
  [plugin-api](architecture/plugins/api.md#procedure-factory)
- **client**: The typed RPC client an app calls procedures through. [plugin-api](architecture/plugins/api.md#client)
- **wire contract**: What travels between the worker and its clients: how a call is encoded, which
  calls go as GET, the entity headers and how not found is answered.
  [plugin-api](architecture/plugins/api.md#wire-contract)
- **entity**: A name for a piece of state a procedure reads or writes: a table, or state outside any
  table that the consumer names. [plugin-api](architecture/plugins/api.md#entities)
- **reads / writes**: The entities a procedure declares it reads and writes, which drive cache
  invalidation. [plugin-api](architecture/plugins/api.md#entities)
- **cache invalidation**: A read's answer refreshing on its own when a mutation that writes one of its
  entities succeeds. [plugin-api](architecture/plugins/api.md#cache-invalidation)
- **scope**: A tenancy level a procedure runs inside, such as an organization or a project, whose id
  the procedure takes in its input. [plugin-api](architecture/plugins/api.md#scope)
- **scope boundary**: The point in a route's layout that resolves the URL's slug to scope ids and
  registers them, so every call beneath carries them with no code on the screen.
  [the route scopes the client](decisions/scoped-client.md)
- **scope key**: The input key a scoped procedure takes its scope's id under (`organizationId`,
  `projectId`). [the route scopes the client](decisions/scoped-client.md)
- **tenancy**: The request context's capability that resolves a scope's chain of rows and the caller's
  membership, answering nothing where any part is absent. [plugin-auth](architecture/plugins/auth.md#scopes)
- **access control**: The consumer's statements of which roles may take which actions on which
  resources in an organization. [plugin-auth](architecture/plugins/auth.md#access-control)
- **ability**: What the caller may do, built from its org rules and an optional record layer, and
  asked with `can`. [plugin-query](architecture/plugins/query.md#abilities)
- **org rules**: The caller's rules in one organization, from its role there, read as an ambient read.
  [plugin-query](architecture/plugins/query.md#abilities)
- **session**: The signed-in caller of a request. A device key and an MCP access token stand in for
  one. [plugin-auth](architecture/plugins/auth.md#sessions)
- **device key**: A key that lets a headless machine act as a user with no browser sign-in.
  [plugin-auth](architecture/plugins/auth.md#devices)
- **local origin**: A local-dev hostname the worker trusts as an origin in dev.
  [plugin-api](architecture/plugins/api.md#local-and-dev-origins)
- **refusal**: A rejection the server worded for the viewer, drawn where the act that caused it
  stands. [plugin-query](architecture/plugins/query.md#acts)
- **background handler**: Consumer code the worker runs outside a request: a scheduled job or a queue
  consumer. [runtime](architecture/runtime.md#background-handlers)
- **push**: How local dev applies the schema: written straight into the local database, with no
  migration. [plugin-db](architecture/plugins/db.md#local-dev-push)
- **deploy gate**: A check a deploy runs before it builds or migrates, which stops it on a placeholder
  database id, an unmarked destructive migration or schema drift. [plugin-db](architecture/plugins/db.md#deploy-gates)
- **seed**: The data a consumer declares for its database, written idempotently.
  [plugin-db](architecture/plugins/db.md#seed)
- **main listener**: The node server's listener for the app's own origins: it admits the Host of one
  of them or the bound address. [plugin-node](architecture/plugins/node.md#hosts-and-listeners)
- **further listener**: A named node listener beside the main one, admitting the Host of the origin
  its `originVar` env var holds. [plugin-node](architecture/plugins/node.md#hosts-and-listeners)

## Design system

### Contract

- **design contract**: What both UI plugins render from: tokens, motion, words, matrices and the
  roster, held as data in `@fcalell/ui-core`.
  [ui-core](architecture/ui-core.md#what-it-is)
- **sharing line**: The rule that decides what ui-core holds and what each plugin holds: what both
  platforms can take is ui-core's. [ui-core](architecture/ui-core.md#the-sharing-line)
- **overlay**: Classes a plugin composes over a shared cell for what differs by platform or by
  interaction state: display, alignment, position, hover and focus.
  [ui-core](architecture/ui-core.md#the-sharing-line)
- **token**: One named value of the contract (a colour, a size, a space, a radius) that a part draws by
  its role. A consumer never sets one. [tokens](architecture/ui-core/tokens.md#the-contract-as-data)
- **knob**: One of the six values a theme sets (`hue.accent`, `hue.cast`, `radius`, `fonts`, `size`,
  `defaultMode`); every token derives from them. [tokens](architecture/ui-core/tokens.md#knobs)
- **theme**: The knobs and the starting mode an app gives both UI plugins.
  [tokens](architecture/ui-core/tokens.md#knobs)
- **mode**: Light or dark. [plugin-react-ui](architecture/plugins/react-ui.md#modes)
- **mode script**: The script that sets the mode before first paint, from the viewer's stored choice,
  else the theme's `defaultMode`, else the system preference.
  [plugin-react-ui](architecture/plugins/react-ui.md#mode-script-and-csp)
- **contrast floor**: The least contrast a text ink holds on the hardest ground it stands on, in both
  modes. [tokens](architecture/ui-core/tokens.md#contrast-floors)
- **density**: The set of type, spacing and sizes a screen draws in, `desktop` or `touch`, decided by
  the pointer and the width, never by a knob. [tokens](architecture/ui-core/tokens.md#density-and-room)
- **density rule**: The one query that picks a screen's density: `desktop` where the primary pointer
  is fine and the viewport is at least `tablet` wide, `touch` everywhere else.
  [plugin-react-ui](architecture/plugins/react-ui.md#density)
- **room**: The density set a screen read from a distance declares (a television, a wall display):
  the touch set scaled to the screen. [tokens](architecture/ui-core/tokens.md#the-room)
- **type role**: A named text style (body, title, meta and the rest) carrying its size, ink and family;
  the only way a part sets type. [tokens](architecture/ui-core/tokens.md#type-roles)
- **measure**: A width counted in characters, which follows the type it is read in.
  [tokens](architecture/ui-core/tokens.md#widths)
- **unit width**: A width counted in the spacing base, which the font cannot shift.
  [tokens](architecture/ui-core/tokens.md#widths)
- **canon**: The binding names every component shares: one name per concept, composed regions as
  descriptors, no style props, icons by name. [roster](architecture/ui-core/roster.md#the-canon-and-the-closed-props)
- **descriptor**: A composed region given as typed data (an act, a row, a status, a fact), which the
  component that owns it draws. [roster](architecture/ui-core/roster.md#descriptors)
- **roster**: The list, as data, of every component both UI plugins ship, with the props, cells,
  tokens, moves and states of each. [roster](architecture/ui-core/roster.md#the-roster)
- **roster entry**: One component's line in the roster. [roster](architecture/ui-core/roster.md#roster-entries)
- **component**: A piece of the roster a consumer writes into a screen tree: a frame, a Section, a
  Table, a Form, a control, a figure, a picture or a text. [a component is public when a consumer places it](decisions/public-roster.md)
- **atom**: A component of the roster's `atom` layer, which other components draw by composing it.
  [roster](architecture/ui-core/roster.md#the-roster)
- **molecule**: A component composed of atoms and descriptors that draws its own cells.
  [roster](architecture/ui-core/roster.md#matrices)
- **part**: A piece a component draws from its data (a row, a mark, an act, a field), with no roster
  entry and no public export of its own. [a component is public when a consumer places it](decisions/public-roster.md)
- **matrix**: A component's table of cells by axis, held as data both platforms read.
  [roster](architecture/ui-core/roster.md#matrices)
- **axis**: One dimension of a matrix, what a component is given (act, family, checked, error).
  [roster](architecture/ui-core/roster.md#matrices)
- **cell**: One entry of a matrix, or a single named constant: the platform-invariant classes a part
  draws. [roster](architecture/ui-core/roster.md#class-sets)
- **variant**: A component's pick of one value per axis of its matrix.
  [roster](architecture/ui-core/roster.md#variants)
- **tone**: The one vocabulary of state a status, a banner and a toast name.
  [roster](architecture/ui-core/roster.md#status-and-chips)
- **status**: A work state drawn as its tone's mark beside its word, the same everywhere it stands.
  [roster](architecture/ui-core/roster.md#status-and-chips)
- **chip**: A data value's tag, an outlined pill with a dot in its family's hue.
  [roster](architecture/ui-core/roster.md#status-and-chips)
- **fact**: One thing a list says of a thing, in the order given: words, a status, a chip, a warning or
  a boolean mark. [roster](architecture/ui-core/roster.md#facts)
- **change mark**: The mark of where a record, row or field stands in a change set (added, changed,
  removed, unchanged, stale). [roster](architecture/ui-core/roster.md#marks)
- **`DESIGN.md`**: The contract emitted from ui-core in the DESIGN.md format and shipped in the package;
  never edited by hand. [roster](architecture/ui-core/roster.md#designmd)
- **words**: Every word a component draws on its own, a closed typed object with English defaults that
  a consumer translates whole. [words](architecture/ui-core/words.md#words)
- **counted word**: A word drawn with a number, in a form for one and a form for any other count.
  [words](architecture/ui-core/words.md#words)
- **slot word**: A whole phrase with named places where values stand.
  [words](architecture/ui-core/words.md#words)
- **text run**: A piece of a part's text: plain words, a quoted name, a span of code or strong words.
  Avoid: run, on its own. [words](architecture/ui-core/words.md#text-runs)
- **parts line**: One text of parts a middle dot apart, which never breaks at a separator: a record
  head's overline, a message's provenance. [plugin-react-ui](architecture/plugins/react-ui.md#text)
- **move**: One motion a component may make, named in its roster entry.
  [motion](architecture/ui-core/motion.md#moves-and-move-class-sets)
- **line**: A line of text that appears in flow (a blocked act's reason, a field's error, a notice): it
  fades in and pushes what follows at once, and leaves at once.
  [motion](architecture/ui-core/motion.md#flow-lines-and-blocks)
- **block**: A box a change adds to or removes from the flow (a fold, a chip, a sheet, a row): it lands
  at once, and fades in only when it arrives on its own. [motion](architecture/ui-core/motion.md#flow-lines-and-blocks)
- **anchor screen**: The pinned screen of the anchor product a consumer's screen is stood beside and
  judged against. [consumer project](architecture/consumer-project.md#designing-screens)

### Layout

- **root frame**: The frame a page stands in whole: the `Shell` or the `Gate`. It hosts toasts and
  confirmations. [layout](architecture/ui-core/layout.md#gate)
- **Shell**: The root frame of an app's signed-in pages: the sidebar on the desktop, the tab bar on
  touch, and a column that holds the current place. [layout](architecture/ui-core/layout.md#shell)
- **place**: A destination the Shell lists: a route with its name, icon and group, on the sidebar and
  the tab bar. [layout](architecture/ui-core/layout.md#places)
- **branch**: A place with places under it, which opens and folds in the sidebar.
  [layout](architecture/ui-core/layout.md#places)
- **Gate**: The root frame of a page outside the Shell (a sign-in, a consent step): one centred column
  holding the step. [layout](architecture/ui-core/layout.md#gate)
- **Place**: What the Shell's column holds: a row of at most two Panes, the place's own and a record's.
  [layout](architecture/ui-core/layout.md#place)
- **Pane**: A column of the Place, the place's own or a record's: a bar, a body that scrolls and an
  optional foot. [layout](architecture/ui-core/layout.md#pane)
- **foot**: The region docked under a body: a Pane's field, selection bar or docked sheet, or the
  Shell's dock. [layout](architecture/ui-core/layout.md#foot)
- **Sheet**: A layer that holds a task (a form, a decision, an acknowledgement); a record is read in
  its Pane, never in a Sheet. Avoid: modal, dialog. [layout](architecture/ui-core/layout.md#sheet)
- **Section**: A titled part of a Pane's body: a heading over either its parts or a sheet of rows.
  [layout](architecture/ui-core/layout.md#section)
- **sheet of rows**: A Section's body when it is given rows: the rows on one card, a hairline between
  them. [layout](architecture/ui-core/layout.md#sheet-of-rows)
- **collection**: A component that takes rows as data and draws them: a Section's sheet, a `Table`, a
  `Picker` as a list. [components](architecture/ui-core/components.md#collections-and-lists)
- **comparison**: A `Table` whose cells hold a value per column: the leading column names the fact
  and a column follows for each compared thing. [components](architecture/ui-core/components.md#cells-and-columns)
- **level**: A chart figure that swings around a value (a reading each hour, a share), drawn on an
  axis around its readings, never from zero. [components](architecture/ui-core/components.md#axis)
- **row**: One box on a sheet, whatever it holds, with one form everywhere: a leading slot, a text
  group and an end group. A row is a descriptor, never a component. [layout](architecture/ui-core/layout.md#rows)
- **text group**: The title or label of a row over its description or facts line.
  [layout](architecture/ui-core/layout.md#text-group-and-end-group)
- **end group**: What stands at a row's end, a line centred on the row.
  [layout](architecture/ui-core/layout.md#text-group-and-end-group)
- **card**: The surface inside a hairline edge at the card radius.
  [layout](architecture/ui-core/layout.md#cards)
- **column cell**: A measure-wide column that keeps a field at the reading width inside a wider
  region. [layout](architecture/ui-core/layout.md#foot)
- **overflow rule**: A rule that decides a part's form from its structure, never from a measure of its
  content; for acts, the first stands and the rest go into the more menu.
  [layout](architecture/ui-core/layout.md#overflow-rules)
- **more menu**: The menu the acts that do not stand fold into. [ui-core](architecture/ui-core.md#subpaths)

### Reads

- **read**: A handle on one query by its key, plus how its failure reads as not found.
  [reads](architecture/ui-core/reads.md#read-handle)
- **read kind**: How a read's query behaves: a plain `query`, `pages` that load on demand, a `window`
  over a total, or a `stream` that stays fetching while it writes. [reads](architecture/ui-core/reads.md#read-kinds)
- **selection**: A pick from one read or several, which a part draws.
  [reads](architecture/ui-core/reads.md#read-handle)
- **datum**: A value a part takes that is either a constant or a selection.
  [rows are data](decisions/rows-are-data.md)
- **leaf**: A part that subscribes to a selection, paints it while its reads wait and draws it once
  they land. [reads](architecture/ui-core/reads.md#read-handle)
- **frame**: A part that draws the shape of its reads (a Pane, Section, Sheet or Form, and every
  collection that draws its own failure). [reads](architecture/ui-core/reads.md#frames)
- **frame shape**: What a frame's reads are at a moment: `ready`, `waiting`, `still`, `empty`, `failed`
  or `missing`. [reads](architecture/ui-core/reads.md#phases)
- **hold**: A frame's claim on one read, the one whose busy mark and stale and paused line it draws;
  holds change no frame's shape. [reads](architecture/ui-core/reads.md#holding-a-read)
- **painter**: A leaf that draws a read. [reads](architecture/ui-core/reads.md#placeholder-and-selectors)
- **holder**: A frame, or a leaf that draws a read's failure itself.
  [reads](architecture/ui-core/reads.md#placeholder-and-selectors)
- **ambient read**: A read no frame holds by design (the org rules), whose failure leaves what it gates
  painted and inert. [plugin-query](architecture/plugins/query.md#reads)
- **placeholder**: The stand-in for data not yet there, shaped by nothing, that a selector runs over
  while its read waits. [reads](architecture/ui-core/reads.md#placeholder-and-selectors)
- **paint**: What a part draws while its data is not here; a part so drawn is painted.
  [reads](architecture/ui-core/reads.md#paint)
- **paint shape**: One of the three ways a part paints: `glyphs`, `box` or `control`.
  [reads](architecture/ui-core/reads.md#paint-shapes)
- **more row**: A collection's last row over a read that pages, pressed to load the next page.
  [reads](architecture/ui-core/reads.md#paging)
- **port**: What the read hooks and the components ask of the binding that runs the reads.
  [reads](architecture/ui-core/reads.md#the-port)

### Acts

- **act**: A press that starts a run: a labelled act, an icon act or a link act, given as data with
  what happens around it. [acts](architecture/ui-core/acts.md#act-model)
- **run**: The work an act starts, from its press until what it returned settles.
  [acts](architecture/ui-core/acts.md#act-model)
- **link act**: An act that goes to a route and runs nothing, so it never pends.
  [acts](architecture/ui-core/acts.md#link-acts)
- **icon act**: An act drawn as its icon alone, its label its accessible name.
  [acts](architecture/ui-core/acts.md#act-press)
- **inert**: Drawn in its disabled form and ignoring the press, while still focusable.
  [acts](architecture/ui-core/acts.md#act-model)
- **pending**: An act whose run has not settled. [acts](architecture/ui-core/acts.md#blocked-and-pending-acts)
- **blocked**: An act that cannot run, with a reason it shows once pressed or once its form is touched.
  [acts](architecture/ui-core/acts.md#blocked-and-pending-acts)
- **reason host**: A component that keeps its row still and draws a blocked act's reason on a line of
  its own. [acts](architecture/ui-core/acts.md#blocked-reasons)
- **touched**: A Form or Sheet once a field inside it has taken input.
  [acts](architecture/ui-core/acts.md#touched)
- **rejection**: A run that failed, drawn by the host that ran it unless its sentences already stand
  where they belong. [acts](architecture/ui-core/acts.md#rejections)
- **decision queue**: The queue of confirmations a root frame draws one at a time as a Sheet.
  [acts](architecture/ui-core/acts.md#confirm)
- **save**: A control keeping its new value through a promise until the value's reads refresh, and
  falling back to the datum when it fails. [acts](architecture/ui-core/acts.md#control-saves)
- **commit moment**: When a typing control's value is final: leaving the field, or Enter on one line,
  having changed it. [acts](architecture/ui-core/acts.md#commit)
- **Form**: A component made from the procedure it submits and its field labels; its fields, controls
  and checks are derived from the procedure's input schema. [acts](architecture/ui-core/acts.md#forms)
- **leave**: The question a Form asks when a viewer leaves it edited: discard the edit or keep
  editing. [acts](architecture/ui-core/acts.md#leave)
- **ActionBar**: The row of acts that closes a form, a Sheet or a decision, or applies to the chosen
  rows. [acts](architecture/ui-core/acts.md#actionbar)
- **drag**: A row carrying what it moves to a place or a row that takes it, given as data on both ends.
  [drag](architecture/ui-core/drag.md#drag-and-drop)
- **reorder**: A collection moving one of its rows to a new position.
  [drag](architecture/ui-core/drag.md#reorder)
- **follow**: What a finger or pointer carries, moving 1:1 with it until its release eases.
  [drag](architecture/ui-core/drag.md#follow)
- **track**: A record that plays, given as a descriptor. [sound](architecture/ui-core/sound.md#track)
- **dock**: The player's bar an app mounts in the Shell's foot. [sound](architecture/ui-core/sound.md#dock)

## Screens and checks

- **gate**: `pnpm check`, the repo's per-change check: type-check, tests and Biome, writing nothing.
  A change is complete only once it passes. [conventions](architecture/conventions.md#build-and-exports)
- **showcase**: The private consumer in `apps/showcase` that shows the web components, holds the roster
  frames and is the first user of the screens workbench. [showcase](architecture/ui-core/showcase.md#the-app)
- **roster frame**: The showcase's drawing of one roster component in one cell and state, which
  Storybook draws as a story. [showcase](architecture/ui-core/showcase.md#roster-frames)
- **self-judging frame**: A roster frame that checks its own edge and logs an error where it breaks.
  [showcase](architecture/ui-core/showcase.md#roster-frames)
- **story**: One Storybook entry: a roster component in a state, or a screen in a state.
  [showcase](architecture/ui-core/showcase.md#the-roster-in-storybook)
- **screens workbench**: The Storybook host plugin-screens runs that serves every route of an app in
  each state its queries can take, from fixtures, with no backend. [showcase](architecture/ui-core/showcase.md#the-screens-workbench)
- **fixture**: A typed answer the workbench gives a procedure, plus the example route params and
  search a screen is drawn at. [plugin-screens](architecture/plugins/screens.md#how-a-screen-is-served)
- **state**: One of the forms the workbench forces a screen's reads into: data, loading, error, not
  found or empty. [plugin-screens](architecture/plugins/screens.md#states)
- **frame route**: A route the api and auth plugins serve for the app's frame (the scope lookup, the
  caller's rules), which answers from its fixture in every state.
  [plugin-screens](architecture/plugins/screens.md#what-a-state-applies-to)
- **session read**: The read of the signed-in session, which answers data in every state, since the
  auth guard hangs on it. [plugin-screens](architecture/plugins/screens.md#what-a-state-applies-to)
- **test run**: `stack screens test`, which opens each screen in every state and fails it on an axe
  violation, an overflow, a render walk finding or a console error. Avoid: screen run.
  [plugin-screens](architecture/plugins/screens.md#test-run)
- **floors**: The test run's checks at each width (320, 1280, 1920): overflow and the render walk.
  [showcase](architecture/ui-core/showcase.md#enforcement)
- **render walk**: One pass over a drawn page that checks what it draws against the contract's own
  values. [plugin-screens](architecture/plugins/screens.md#render-walk)
- **walk rule**: One check of the render walk, a pure function with a canary.
  [plugin-screens](architecture/plugins/screens.md#render-walk-rules)
- **walk exception**: A place the contract itself draws off a walk rule, named with its reason.
  [plugin-screens](architecture/plugins/screens.md#render-walk-exceptions)
- **shift check**: The test run's check that no Section moves between its waiting and loaded shapes
  beyond what the Sections above grew by. [plugin-screens](architecture/plugins/screens.md#loading-shift-comparison)
- **finding**: A failing check, which stays failing until the component is fixed.
  [showcase](architecture/ui-core/showcase.md#enforcement)
- **changed run**: A test run narrowed to the screens a diff reaches.
  [plugin-screens](architecture/plugins/screens.md#changed-runs)
- **shoot**: `stack screens shoot`, screenshots of chosen screens judged by the test run's own page
  checks. [plugin-screens](architecture/plugins/screens.md#judging-shoot-and-drive)
- **shared browser**: The one Chrome every screens command on the machine uses.
  [plugin-screens](architecture/plugins/screens.md#shared-browser)
