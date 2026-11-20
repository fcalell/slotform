# Config

`slotform.config.ts` is the app's one config: its identity and the plugins that make it up. Every
generated file derives from it, so after an edit run `slotform generate` (`slotform dev` and
`slotform build` run it first).

```ts
// slotform.config.ts
import { defineConfig } from "@slotform/cli";
import { api } from "@slotform/api";
import { auth } from "@slotform/auth";
import { cloudflare } from "@slotform/cloudflare";
import { db } from "@slotform/db";
import { react } from "@slotform/react";
import { reactUi } from "@slotform/react-ui";
import { vite } from "@slotform/vite";

export default defineConfig({
  app: { name: "my-app", domain: "example.com" },
  plugins: [
    cloudflare(),
    db({ dialect: "d1", databaseId: "…" }),
    auth({ organization: true }),
    api(),
    vite(),
    react({ title: "My App" }),
    reactUi({ theme: { hue: { accent: 120 } } }),
  ],
});
```

## `app`

`app` holds only what more than one plugin reads:

- `name` (required): the worker's name, the default of `slotform init`'s auth cookie prefix prompt, the fallback `<title>`.
- `domain` (required): the production origins, `https://<domain>` and `https://app.<domain>`, and
  the URLs auth builds.
- `origins` (optional): replaces the derived CORS allow-list. A local origin in it (`localhost`,
  `127.0.0.1`, `*.localhost`) counts only in dev, unless the deploy target itself is local.

Anything one plugin alone reads is that plugin's option, never a field of `app`: the page title
is `react({ title })`, the API prefix `api({ prefix })`, the deep-link scheme `expo({ scheme })`.

## `plugins`

List every plugin the app uses; nothing is added implicitly, and order does not matter. A plugin
that needs another names it, and a missing one fails with the plugin to add:

| Plugin | Needs |
| --- | --- |
| `react()` | `vite()` |
| `reactUi()` | `react()`, `vite()` |
| `screens()` | `react()`, `api()` |
| `nativeUi()` | `expo()`, `api()`, `query()` |
| `auth()` | `api()`, `db()` |
| `db()`, `node()`, `query()` | `api()` |
| `api()` | one of `cloudflare()` or `node()`, unless its `server` option is set |

Each plugin's options are typed and defaulted; its guide pages list them. Add a
plugin with `slotform add <plugin>` rather than by hand: it also writes the plugin's starter files
and dependencies.

## Rules

- Keep `slotform.config.ts` erasable TypeScript: `slotform` loads it with a plain `import()` under
  Node's type stripping, so no enums, no parameter properties, and every relative import names
  its file's extension (`./theme.ts`).
- Never edit a generated file under `.slotform/` to change behaviour: change the config and
  regenerate.

**Check:** `slotform generate` exits cleanly, then `pnpm check` passes.
