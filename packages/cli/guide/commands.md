# Commands

`slotform` runs every step of the app's lifecycle; the plugins in `slotform.config.ts` decide what each
step does. Run a command from the app's root. Every command but `init` and `slotform plugin init`
takes `--config <path>` (default `slotform.config.ts`), a plugin's own commands included, and
`-h`/`--help` prints a command's usage and flags.

| Command | Run it when |
| --- | --- |
| `slotform init [dir] [--plugins <csv>] [--domain <d>] [-y] [--force]` | Starting an app. It writes `package.json` and `pnpm-workspace.yaml`, installs, scaffolds the project, then runs `generate` |
| `slotform add <plugin>` | Adding a plugin: it installs the plugin, asks its questions, writes its files, patches the config and regenerates. A plugin that takes the place of one the app has replaces it: `slotform add node` on a cloudflare app switches the server target to node, after asking |
| `slotform remove <plugin> [-y]` | Dropping a plugin no other plugin requires: it lists the files it deletes and asks (`-y` skips the question and is required without a terminal), removes them and the dependencies no remaining plugin declares, patches the config and regenerates |
| `slotform generate` | After editing `slotform.config.ts`, or when `.slotform/` is missing. `dev` and `build` run it first |
| `slotform dev` | Working on the app: every plugin's dev process (the worker, the Node server, Vite) runs in one terminal, and the watchers regenerate as files change. In a terminal it shows a task list beside the selected process's output (`↑`/`↓` or `j`/`k` select, `u`/`d` or Page Up/Down scroll, `g`/`G` or Home/End jump to the top and the newest line, `r` restarts the selected process, `o` opens its URL, `q` or Ctrl+C stops); run without one, as an agent's shell runs it, it prints each line prefixed with its process's name. Metro is not one: it runs under `slotform expo dev` (`node_modules/@slotform/expo/guide/builds.md`) |
| `slotform screens dev [--port 6006]` | Designing or changing a web screen: it serves every route in each of its query states from `src/app/fixtures.ts`, with no backend (`node_modules/@slotform/screens/guide/screens.md`) |
| `slotform build` | Building for production. It refuses a linked app: run `slotform unlink` first |
| `slotform deploy` | Shipping: it builds, shows each pre-deploy check, asks to proceed when run in a terminal, runs each check's action (a migration), then deploys |
| `slotform link <checkout>` | Trying a Slotform fix that is not released: it installs every Slotform package from the built Slotform checkout at `<checkout>` and keeps the committed `package.json`, `pnpm-workspace.yaml` and `pnpm-lock.yaml` in `.slotform/link/`. Run it again after rebuilding the checkout. Commit none of the linked files |
| `slotform unlink` | Done with the checkout: it puts the three files back and installs from the lockfile. `slotform add` and `slotform build` refuse a linked app, so unlink first |
| `slotform <plugin> <command>` | A plugin's own command, such as `slotform db push` |

The app's `package.json` scripts wrap them (`pnpm dev`, `pnpm build`, `pnpm run deploy`,
`pnpm generate`), and `pnpm check` type-checks
and lints the app. `pnpm check` is the check every change ends with.

## Updating Slotform

`package.json` holds a caret range of one version for every `@slotform/*` package, and
`pnpm-lock.yaml` records the version installed. `pnpm update "@slotform/*"` moves them all to Slotform's
latest release together. Never edit a spec or the lockfile by hand.

**Check:** every `@slotform/*` entry in `pnpm-lock.yaml` names the same version.

## What `init` writes

- `package.json` and `pnpm-workspace.yaml`, then the install of every `@slotform/*` package at the
  CLI's version.
- `tsconfig.json` (and, for an app with a worker, `tsconfig.app.json`, `tsconfig.worker.json`
), `biome.json`, `.editorconfig`, `.gitignore` and `slotform.config.ts`, each only when
  missing, and the line in `CLAUDE.md` that imports `.slotform/guide.md`. A plugin a picked plugin requires is picked with it. When a plugin needs exactly one
  of several (the API needs a server target, cloudflare or node), init asks which; init run
  with flags or without a terminal, and `slotform add`, take the plugin's default, cloudflare for
  the API.
- For an app (`vite` or `expo`) with a worker (`api` or `db`), the app and the worker are two
  projects under a solution `tsconfig.json` with no files of its own, so `check-types` is
  `tsc -b`. Type-check with `pnpm check` or `tsc -b`, never `tsc --noEmit`: on the solution it
  checks nothing and passes.
- Each plugin's starter files, such as `src/schema/index.ts` or `src/app/routes/index.tsx`. A file
  that exists is never overwritten.

## What `generate` writes

Everything under `.slotform/` is generated and gitignored: never edit it, change the config or the
source it reads and regenerate.

- `.slotform/guide.md`, the index of this guide: one line per page, saying when to open it.
- `.slotform/biome.json`, the lint rules the plugins ship for the app's source, which the app's
  `biome.json` extends: `pnpm lint` needs it, so run `slotform generate` first in a fresh clone.
- Each plugin's generated files: the worker entry, the Vite or Metro config, the stylesheet, the
  typed routes.

**Check:** after `slotform generate`, `.slotform/guide.md` lists a domain for every plugin in the
config that ships pages.
