# Deploy a bundle

`slotform build` bundles the Node server into `dist/server/` beside the web client's `dist/client`, so
the box needs only `node` 24 or newer: no checkout, install or CLI. This page covers what the bundle
holds, how to run it, and the code idioms the build follows. Running from the source instead is the
server guide's [production](server.md#production).

`dist/server/` holds:

- `server.mjs`: the server, the generated worker, your `src/` and every dependency in one file
  (TypeScript, `link:` and workspace packages and `#/*` imports included);
- `migrations/`: the committed `.sql` files and the journal;
- `workers/` and `bin/`: worker threads and hand-run tools (below);
- `node_modules/`: only the packages with a native addon (`better-sqlite3`) and what they need to run.

The bundler is esbuild, a build tool the app declares in its `devDependencies` (`node()` writes it;
an older app adds it with `pnpm add -D esbuild`). Copy `dist/` to the box and run:

```bash
PORT=8788 DB_FILE=/var/lib/my-app/app.sqlite AUTH_SECRET=… APP_URL=https://example.com \
  node dist/server/server.mjs
```

- It runs from any working directory and finds the client beside itself; a relative `DB_FILE` is
  relative to where it is started.
- On the sqlite dialect it applies the committed migrations to `DB_FILE` before it listens (the
  ones `slotform db apply` applies, in the same journal; run twice it changes nothing), so there is
  no `slotform db apply` step. It runs no seed.
- Build on the box's platform: the native addon is the build machine's installed one, and
  `better-sqlite3`'s prebuilds for the other platforms ride with it.

## Files the build follows

Code that reads a file by a path relative to its own module (`new URL("./x", import.meta.url)`)
reads inside the bundle's directory, not the source's: keep such files out of the server, or copy
them with the build. Three idioms are the exception, because the build follows them.

- **A worker thread**: write the module's URL in the constructor,
  `new Worker(new URL("./scan-worker.ts", import.meta.url))` (a `fileURLToPath(...)` around the
  URL is the same). The build bundles that module on its own to `dist/server/workers/`; from
  source Node starts the `.ts` file. A URL held in a variable or built by a helper is not followed.
- **A directory of modules** (job kinds, importers): list it with `loadModules` from
  `@slotform/node/server`, never `readdir`, since the bundle has no directory to read. It
  answers each module's exports by file name without the extension. A test, a declaration and an
  `index` are not listed, and the argument must be the literal `new URL(..., import.meta.url)`.

  ```ts
  import { loadModules } from "@slotform/node/server";

  const kinds = await loadModules(new URL("../jobs/", import.meta.url)); // { scan: { default }, ... }
  ```

- **A tool run by hand** (a restore, a one-off repair): write it as `src/bin/<name>.ts`. Each module
  there (a test, a declaration and an `index` excepted) is bundled on its own, the way the server
  is, to `dist/server/bin/<name>.mjs`, run with `node dist/server/bin/<name>.mjs` on a box that
  holds only `dist/`. It sees what the server does: `link:` and workspace packages, `#/*`, the kept
  native addons, worker threads and `loadModules`. Add the folder's `.ts` file and rebuild; there is
  no option and no registry. `src/bin/` is Node code: keep it out of the web app's `tsconfig` and in
  the server's.
