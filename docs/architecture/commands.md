# CLI commands and procedures

The `stack` CLI surface and what each command resolves. There is no event lifecycle: each command
resolves a fixed set of root slots from the graph and acts on the result. What each command does
for an app, and its flags, is the consumer guide page
[`commands.md`](../../packages/cli/guide/commands.md); this page holds how each one runs.

## Consumer-facing surface

| Command | Purpose |
|---------|---------|
| `stack init [dir]` | Interactive project scaffold (pick plugins) |
| `stack add <plugin>` | Add a plugin to an existing project |
| `stack remove <plugin>` | Remove a plugin (checks dependents) |
| `stack generate` | Regenerate `.stack/` files from config |
| `stack dev` | Plugin-driven dev (processes, watchers, schema push) |
| `stack build` | Plugin-driven production build |
| `stack deploy` | Plugin-driven deploy (migrations, wrangler) |
| `stack <plugin> <command>` | Plugin subcommand (`stack db push`) |
| `stack plugin init <name>` | Scaffold a third-party plugin skeleton |

## Command steps

| Command | Roots resolved, in step order |
|---------|------------------------------------|
| `stack init`, `stack add` | write the plugins' packages and `pnpm-workspace.yaml` → `pnpm install` (again until every `requires` is installed) → `cliSlots.initPrompts` → render `stack.config.ts` → `cliSlots.initScaffolds`, `initDeps`, `initDevDeps`, `gitignore` → `pnpm install` → `generate` |
| `stack generate` | `cliSlots.artifactFiles` → write each `{ path, content }` → resolve `cliSlots.postWrite` → await each |
| `stack dev` | `generate` → `cliSlots.devProcesses` (spawned together) → `cliSlots.devReadySetup` (after every process is ready) → `cliSlots.devWatchers` (`fs.watch`) |
| `stack build` | `generate` → `cliSlots.buildSteps`, sorted by `phase` (`pre`, `main`, `post`; equal phases keep contribution order) → run in sequence |
| `stack deploy` | `build` → `cliSlots.deployChecks` (shown and confirmed) → `cliSlots.deploySteps`, sorted by `phase` → run in sequence |
| `stack remove` | the target plugin's `cliSlots.removeFiles`, `removeDeps`, `removeDevDeps` → patch the config → `generate` |
| `stack <plugin> <command>` | the plugin's own `commands[name].handler(ctx)` ([plugin subcommands](#plugin-subcommands)) |

### `stack init` and `stack add`

`stack init` first writes `package.json` (only when missing) and `pnpm-workspace.yaml`, with every
`@fcalell/*` spec taken from the CLI's table, and installs; in an app inside stack's own workspace
the specs and the install differ ([consumer project](./consumer-project.md#installing-stack)). It
installs before anything else because a plugin loads only once installed, and its `requires` is
known only once loaded ([installing the requires closure](#installing-the-requires-closure)).

The scaffold then runs in the app's installed `@fcalell/cli`, imported from the app's root, which
need not be the copy that started `init`: slots match by identity, and the installed plugins import
the app's copy. It writes the CLI-owned base files (the tsconfigs, `biome.json`, `.editorconfig`,
`.gitignore`, each only when missing), then runs the real `generate` path against the config it
wrote, the same code `stack generate` runs. `generate` precedes the format, because the app's
`biome.json` extends the generated `.stack/biome.json`. It then formats what it wrote and makes
`CLAUDE.md` import `@.stack/guide.md`: the file is created with that line when missing, and the line
appended when absent ([consumer project](./consumer-project.md#the-guide)).

### `stack generate`

`generate` resolves every artifact file, writes it, then runs the `postWrite` hooks. The rules it
writes each file by (one trailing newline, one content per path, atomic and skip-unchanged) are in
[codegen](./codegen.md#artifact-emit). One artifact is the CLI's own, `.stack/guide.md`, rendered
from `cliSlots.guide` ([consumer project](./consumer-project.md#the-guide)). A `postWrite` hook runs
after the files land: plugin-cloudflare's runs `wrangler types` once `.stack/wrangler.toml` is
written.

### `stack dev`

`stack dev` runs under a `generate` from another process (a second `stack generate`, `pnpm check`'s
codegen), so `generate` writes each file for a reader that is watching it. A regenerate that
changes nothing fires no watcher, and neither wrangler nor Vite reloads. A changed file is never
read empty or partial: wrangler that reads `.stack/wrangler.toml` truncated sees a config with no
`main` and exits with "Missing entry-point", and the dev worker on :8787 would stay dead while Vite
lives on. A changed file still reloads wrangler and restarts Vite in place; the supervisor's restart
policy is not the answer to a regenerate.

Each `devProcesses` entry has a restart policy, `restart`:

- `"never"` (the default): an exit is terminal; the supervisor reports it and stops the process.
- `"on-crash"`: restart only on a non-zero exit or a signal; a clean exit (code 0) stops.
- `"always"`: restart on any exit, for a long-running daemon.

Most long-running processes (vite, wrangler) want `"on-crash"`. The default is `"never"` because
most contributions are short-lived shell commands, where a surprise restart is wrong.
`maxRestarts` caps the attempts (default 3); past it the supervisor reports the final exit and
stops.

`stack dev` owns its processes' lifetime. Each `devProcesses` entry runs in a process group of its
own, and a stop signals the whole group, so what a launcher starts stops with it (`npx wrangler
dev` runs npm, wrangler and workerd). SIGINT, SIGTERM, SIGHUP (the terminal closed) and anything
that throws once a process is up, a failed `devReadySetup` step included, stop every process:
SIGTERM, then SIGKILL to the groups still running after three seconds. The terminal's signals reach
the processes only through `dev`, so a `dev` killed with SIGKILL leaves them running.

A `devWatchers` entry skips directory events. macOS FSEvents emits a directory-level event, keyed
by the directory's name (the watch root reports under its own basename), beside every per-file
event. A directory name carries no file identity, so the `ignore` filter cannot apply to it, and a
watcher whose handler writes into an ignored path would loop. The per-file event the directory
event accompanies still fires the handler.

`stack dev` shows its processes in one of two views, chosen by the terminal, with no flag. When
stdin and stdout are both TTYs (and `TERM` is not `dumb`) it takes the alternate screen and draws
turbo's layout: a task list, each process with its state (starting, ready, exited, restarting) and a
last `stack` row for the CLI's own log, beside the selected task's output. The keys:

| Key | Does |
|-----|------|
| `↑`/`↓` (`j`/`k`) | select a task |
| `u`/`d` (Page Up/Down) | scroll |
| `g`/`G` (Home/End) | the top, the newest line |
| `r` | restart the selected process |
| `o` | open its URL |
| `q`, Ctrl+C | stop |

`r` relaunches the process whatever its `restart` policy, with a fresh restart budget, an exited one
included; a second `r` before the old child exits sends its group SIGKILL. `o` opens the first URL
on the process's ready line (vite's `Local:` moves when its port is taken), else
`http://localhost:<defaultPort>`, and the pane's header shows it. Raw mode makes Ctrl+C a key, so it
stops through the same path as SIGINT. Anywhere else (CI, an agent, a pipe) the view prints each
line prefixed with its process's name.

Every message the CLI and the plugins log during `dev` goes through the view: `generate`, the plan
and the watchers take its `log`, so a plugin logs through `ctx.log` and never writes to the terminal
itself. The processes stay on pipes, so their own hotkeys (wrangler's, Vite's) are off in both
views, and `r` and `o` stand in for the ones used most. Under the screen each process gets
`FORCE_COLOR=1`, unless `NO_COLOR` or `FORCE_COLOR` is set, and `readyPattern` is matched with the
colour codes stripped. The screen drops every escape sequence but colour from a line, cuts it to the
pane's width, and keeps the last 2000 lines per task. Leaving it prints the errors logged during the
session again, since the alternate screen takes its log with it.

## Installing the requires closure

A plugin's `requires` is known only once it is loaded, so `stack init` writes `package.json` with
the picked plugins and installs, again, until every plugin a picked one requires is installed too.
`stack add` installs the plugin, then each plugin it requires that the app lacks. What a
requirement means is in [slot graph](./slot-graph.md#requires).

The closure (`resolveRequiresClosure`, shared by both commands) is transitive: picking `auth` pulls
`db`, and `db`'s own requirements in turn. It returns the selected names plus every required
sibling, deduped, each plugin's named requirements ordered before it. A name outside the
first-party list (a third-party plugin) passes through as a leaf.

One-of requirements (api's server target) settle after the named closure, so a plugin any selected
plugin names meets them whatever the visit order. One still unmet is asked by interactive `init`
and takes the first of its `oneOf` under flags, without a TTY, and in `stack add`, whose closure
starts from the app's plugins so a one-of the app already meets adds nothing. The default lives in
the requiring plugin's declaration, so the CLI names no domain. `init` validates the finished
closure, so a selection meeting a one-of twice fails before the scaffold.

`stack add` of a plugin meeting a one-of the app already meets takes the place of the plugin meeting it
(`stack add node` on a cloudflare app). It asks first when interactive, and removes the displaced
plugin through `remove`'s cleanup before installing, so a dependency both bring survives. It never
runs `remove`'s dependents check, since the added plugin meets the requirement.

## Prompts

Each plugin's `cliSlots.initPrompts` contribution (a `PromptSpec`) carries the plugin's name and an
ask function that returns its answers, keyed by plugin name; `priors` holds the answers already
collected from earlier plugins, in topological order. `stack init` and `stack add` run each through
the same adapter, passing a minimal ctx that exposes `prompt`.

The adapter is backed by `@clack/prompts`. A cancel exits the process, so a handler never checks for
a cancel sentinel. With `{ nonInteractive: true }` (CI, `stack init --plugins ...`) it renders
nothing and resolves at once:

- `text(msg, { default })` returns the default, or an empty string;
- `confirm(msg)` returns `false`;
- `select(msg, options)` returns the first option's value;
- `multiselect(msg, options)` returns an empty array.

So a non-interactive run takes each plugin's sensible default (db's placeholder `databaseId`).

## Removing a plugin

`stack remove` refuses while a sibling has a requirement the plugin meets; a one-of is met by
exactly one plugin, so that plugin is the one being removed. The check needs plugin metadata, so it
runs only when discovery succeeds; in the degraded path, where the plugin's module fails to load,
the consumer is trusted.

What it removes comes from two sources. The slot graph, when the plugin loaded, gives its
contributed `removeFiles`, `removeDeps` and `removeDevDeps`. The plugin's `__package`, always known
from the consumer's config, is pruned from `package.json` in every case, so the package itself goes.

`removeFiles` entries are deleted with `rm -rf` semantics, directories included. Some are the
consumer's own trees (`src/app/`, `src/migrations/`), so each path must lie inside the project
([codegen](./codegen.md#path-containment)) and the list is confirmed before anything goes. In the
degraded path the list is empty, and the consumer cleans up by hand once the workspace is fixed.

## Plugin subcommands

A plugin registers subcommands with the `commands` field of `plugin()`, and the CLI routes
`stack <plugin> <command>`:

```bash
stack db push           # Push schema to local database
stack db generate       # Generate migration files
stack db apply          # Apply pending migrations
stack db reset          # Reset local database
stack db create         # Create a Cloudflare D1 database and print its id
stack db check          # Check migrations for schema drift and destructive changes
stack db seed           # Seed the database from src/schema/seed.ts
```

A subcommand runs after the slot graph is built, and its handler receives a `CommandContext`:

```ts
interface CommandContext<TOptions> {
  options: TOptions;                   // typed from the plugin's schema
  cwd: string;
  resolve<T>(slot: Slot<T>): Promise<T>;
  generate(): Promise<void>;
  log: { info, warn, success, error };
  prompt: { text, confirm, select, multiselect };
}
```

`resolve(slot)` reads any slot value with no hand wiring (the resolved CORS list to pass to a
sub-process). `generate()` runs `stack generate`'s own function in process, against the same config
and `cwd`: every artifact is written and every `postWrite` hook has run when it resolves. A command
that reads generated files calls it first instead of spawning the CLI; `resolve` keeps answering
from the graph built before the call.

`stack plugin init <name> [--package <pkg>] [--dir <dir>]` scaffolds a third-party plugin: a
`plugin()` skeleton and a runtime stub exported from `./runtime`
([conventions](./conventions.md#plugin-folder-structure)). The package name defaults to
`stack-plugin-<name>`. The result publishes under any npm name, and a consumer adds it to
`stack.config.ts` like any built-in plugin. The CLI handles `plugin` ahead of plugin-subcommand
routing, so a plugin named `plugin` never collides with it.

## Screens

`stack screens dev [--port 6006]` runs `ctx.generate()` (the route tree, the stylesheet, the screens
files and the story files must exist), then Storybook on the config directory `.stack/screens/`,
whose Vite config is `.stack/screens.vite.config.ts`. The story files in `stack-screens/` at the app
root, one per route, are its stories. The Storybook packages are the app's own (`stack add screens`
writes them as `devDependencies`, see [consumer project](./consumer-project.md#from-npm)); the
handler runs the `storybook` the app installs and the config resolves its framework and addon from
the app. The handler resolves no slot: both screens files are `generate` artifacts,
`screens.slots.viteConfig` and `storybookMain`. A Storybook of the app's own that draws components
(the showcase's roster) runs on a third config, which no command serves
([a Storybook that draws components](./plugins/screens.md#a-storybook-that-draws-components)).

`stack screens test [--all | --changed <ref>] [--shots <dir>]` runs `ctx.generate()` and then the
app's own Vitest on `.stack/screens.vitest.config.ts`, adding `--changed` (with the ref when given)
unless `--all` ([test run](./plugins/screens.md#test-run), [changed runs](./plugins/screens.md#changed-runs)).
It runs on `.stack/screens-test/`, the same Storybook config plus the checks
(`@fcalell/plugin-screens/checks`): axe with every rule on (`region` and `target-size` included),
no horizontal overflow at 320, 1280 and 1920 px (`horizontal overflow at <w>px: scrollWidth <n>`),
and no `console.error`, `console.warn` or window `error`. A test is a story, named for the screen's
title, the state and the mode (`Screens/projects/$id`, `Data, dark`). With `--shots`, the checks
also save a PNG of each story at each width into the directory
([screenshots](./plugins/screens.md#screenshots)).

`stack screens test` also takes:

- `--full`: a shot grows the page to all it holds, up to 16384 px; without it a shot is the 800 px
  viewport.
- `--open <control text>`: after a story draws, the checks press the control with that text or
  accessible name through the provider's `press` command, wait for it to settle, then judge and
  shoot with it open ([screenshots](./plugins/screens.md#screenshots)); a screen with no such
  control fails, naming it.
- `--search <query>`: the search every screen is drawn at, in place of the fixtures' example.

The run's browser is the [shared Chrome](./plugins/screens.md#shared-browser), through the `chrome()` Vitest provider
(`@fcalell/plugin-screens/browser`); a missing Chrome fails before anything is generated, with one
line.

`stack screens shoot --url <app> --route <a,b> [--width 320,1920] [--mode dark] [--shots <dir>]
[--full] [--open <text>] [--settle <ms>] [--cookie name=value] [--sign-in <url>]` opens each route of
a running app in a tab of the shared Chrome (reduced motion, scale 1, touch under 768 px) and waits
until the page is quiet: no request in flight, nothing `aria-busy`, `--settle` ms at most. An event
stream, an `EventSource` and a response with its headers in for 1.5 s and its body open do not count
as in flight, and a page still busy at the cap is shot with a note, not a finding. It then judges
the page ([judging shoot and drive](./plugins/screens.md#judging-shoot-and-drive)) and writes
`<dir>/<route-slug>-<width>-<mode>.png` (`-open-<slug>` before `.png` with `--open`); it
prints the findings like the test run and exits non-zero on any. `stack screens drive <plan.json>
--url <app>` runs a plan `{ each, steps }` over the same page and judgement; its steps are `goto`,
`open`, `key`, `type`, `fx`, `shot`, `offline` and `scroll`, and any other fails the plan before it
runs. The plan's path comes right after `drive`.

`stack screens serve [--port <n>] [--entry <file>] [--keep]` runs the app's real server on throwaway
state, for `shoot --url` and `drive --url`. It runs `ctx.generate()`, makes a scratch directory in
the OS tmp dir (`stack-serve-<random>`, so two runs never collide), builds the web client into it
with the app's own `vite build --outDir`, adds the `screens.slots.serveEnv` contributions to the
run's env, runs the `screens.slots.serveSteps` (db: the database migrated from `src/migrations/` and
seeded from `src/schema/seed.ts`), and starts the first `screens.slots.serveTargets` entry on a free
port (or `--port`). The target serves the worker wrapped in `fixtureControls` of
`@fcalell/plugin-screens/serve`, with the `screens.slots.serveControls` modules
([serve](./plugins/screens.md#serve)). It then runs the app's `src/app/seed.ts` (`defineServeSeed`) with a client signed in through
`/fixture/link`, prints one line, `stack screens serve: <url>`, writes `{ url, pid }` to
`<scratch>/serve.json` and stays in the foreground. SIGINT or SIGTERM stops the server and deletes
the scratch directory unless `--keep`, which prints the directory instead. With `--entry <file>`
the command still owns the directory, the port and the line, but runs `node <file>` with
`STACK_SERVE_DIR` and `STACK_SERVE_PORT` (and the env of the steps and contributions) in place of a
target, and takes the file listening on the port as ready. Any step or seed that throws stops the
run with its error.

`stack screens browser` starts the shared Chrome and returns, and the Chrome stays until
`stack screens browser stop` ends it ([shared browser](./plugins/screens.md#shared-browser)).

A story's forced state (loading, error, empty, not found) answers a query only; a mutation always
answers from its fixture (or `no fixture for <path>`). The kind is the HTTP method: stack's client
sends a query as `GET` and a mutation as `POST` ([runtime](./runtime.md)), so the answerer reads it
off the request, with no header of its own.

## In the code

- `packages/cli/src/cli.ts`: argument parsing, `stack plugin init`, plugin-subcommand routing.
- `packages/cli/src/commands/init.ts`: `stack init`, its install loop and scaffold.
- `packages/cli/src/commands/add.ts`: `stack add`, the one-of replacement.
- `packages/cli/src/commands/remove.ts`: `stack remove`, the dependents check and cleanup.
- `packages/cli/src/commands/generate.ts`: `stack generate`.
- `packages/cli/src/commands/dev.ts`: `stack dev`, the supervisor and the watchers.
- `packages/cli/src/commands/build.ts`, `packages/cli/src/commands/deploy.ts`: `stack build`,
  `stack deploy`.
- `packages/cli/src/commands/plugin.ts`: the third-party plugin scaffold.
- `packages/cli/src/lib/dev-view.ts`: the two dev views.
- `packages/cli/src/lib/proc.ts`: a supervised process, its group and restarts.
- `packages/cli/src/lib/discovery.ts`: `resolveRequiresClosure`.
- `packages/cli/src/lib/prompt.ts`: the prompt adapter.
- `packages/cli/src/lib/create-plugin.ts`: `CommandContext`.
- `packages/cli/src/specs.ts`: `ProcessSpec`, `BuildStep`, `DeployStep`, `PromptSpec`.
