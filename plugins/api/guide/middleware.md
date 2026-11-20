# Worker middleware

Two optional files hold plain Hono middleware, and the worker mounts both on its own:

| File | Runs | Sees |
| --- | --- | --- |
| `src/worker/middleware.ts` | after CORS and logging, before the plugin context is built | the request only |
| `src/worker/middleware.context.ts` | after the context is built, before any route | `slotformContext(c)` |

Put a guard that needs no database in the first, so it rejects before the worker pays for a db
client. Put anything that needs `db` or `auth` in the second, including a raw Hono route outside
the RPC tree (a multipart upload, a webhook), which then reaches the same clients the procedures
use. Type the context with the generated `WorkerContext`.

A raw route answers under a prefix the worker owns, since the deploy target forwards only those
paths to it (the dev server proxies them, the deployed assets let them reach the worker first;
anything else is the web client's fallback). Mount it under the api prefix (`/rpc` by default,
`api({ prefix })`): this middleware runs ahead of the RPC tree's own handler and its JSON-only
gate. `/api/auth` and `/mcp` are other plugins' prefixes.

```ts
// src/worker/middleware.context.ts
import type { WorkerContext } from "virtual:slotform-procedure";
import { isForbiddenOrigin, slotformContext } from "@slotform/api/runtime";
import { createMiddleware } from "hono/factory";

export default createMiddleware(async (c, next) => {
  if (c.req.path === "/rpc/photos" && c.req.method === "POST") {
    if (isForbiddenOrigin(c)) return c.json({ code: "FORBIDDEN" }, 403);
    const { db } = slotformContext<WorkerContext>(c);
    // store the upload with db
  }
  await next();
});
```

## Rules

- Export Hono middleware as it is, `(c, next) => …` or `createMiddleware(…)`, never wrapped: the
  worker tells it by its two parameters from a function that adds to the context.
- Neither file imports from `src/worker/routes/`, and `WorkerContext` comes in with `import type`:
  the generated `.slotform/procedure.ts` imports these files back, so either import is a cycle.
- Every raw route that changes state calls `isForbiddenOrigin(c)` first. The RPC tree gets its
  CSRF guard from its JSON content type on a `POST` (a `GET` reaches queries only and has no
  body); a multipart upload has no such guard. It refuses a request whose browser `Origin` is off
  the CORS allow-list and passes one with no `Origin` (a browser cannot forge that cross-site, and
  the native client sends none).

## Renamed cache headers

A procedure's response carries `x-slotform-reads` and `x-slotform-writes` (`SLOTFORM_READS_HEADER`,
`SLOTFORM_WRITES_HEADER` from `@slotform/api/procedure`). A worker replacing hand-rolled code
whose deployed clients parse other names mirrors them in `src/worker/middleware.ts` until those
builds are gone:

```ts
// src/worker/middleware.ts
import { SLOTFORM_READS_HEADER, SLOTFORM_WRITES_HEADER } from "@slotform/api/procedure";
import { createMiddleware } from "hono/factory";

const LEGACY: Record<string, string> = {
  [SLOTFORM_READS_HEADER]: "x-sw-reads",
  [SLOTFORM_WRITES_HEADER]: "x-sw-writes",
};

export default createMiddleware(async (c, next) => {
  await next();
  for (const [current, legacy] of Object.entries(LEGACY)) {
    const value = c.res.headers.get(current);
    if (value) c.header(legacy, value);
  }
});
```

Request headers have no such mirror: expo's version gate reads only `x-slotform-client-build` and
`x-slotform-client-platform`, so a build stamping other names is never walled. Ship a release that
stamps the current names before raising a floor.

**Check:** `pnpm check` passes, and the route answers under `pnpm dev`.
