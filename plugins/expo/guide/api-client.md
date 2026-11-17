# The phone's API client

`src/lib/api.ts` is the phone app's typed client for the worker's procedures. `stack init` (or
`stack add expo`) writes it once and it is yours from then on; queries, mutations and cache
invalidation work as on the web (`node_modules/@fcalell/plugin-api/guide/client.md`).

```ts
// src/lib/api.ts
import { createClient } from "@fcalell/plugin-api/client";
import { createApiQueryUtils } from "@fcalell/plugin-query/tanstack-query";
import { createVersionGatedFetch } from "@fcalell/plugin-expo/client";
import type { AppRouter } from "../../.stack/worker";

const client = createClient<AppRouter>({
  url: `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787"}/rpc`,
  fetch: createVersionGatedFetch(),
});

export const orpc = createApiQueryUtils(client);
```

A screen imports `orpc` from it:

```tsx
const projects = orpc.projects.list.read({ organizationId });
```

`read` is `queryOptions` as a handle a `Pane`, `Section`, `Sheet` or `Form` takes as its `read`, and
a `List` or any part that shows a value takes as data; `useQuery(orpc.….queryOptions(…))` still
serves a region the app draws itself. Page: `node_modules/@fcalell/plugin-query/guide/reads.md`.

## The URL

Set `EXPO_PUBLIC_API_URL` in `.env` to the deployed worker's origin. Unset, the client calls
`http://localhost:8787`, the local worker under `stack dev`. An Android emulator or a physical
device has its own `localhost`, so the fallback reaches the worker only when something carries the
port over. A device on the LAN needs `EXPO_PUBLIC_API_URL` set to the machine's LAN address. An
emulator needs no URL when `adb reverse tcp:8787 tcp:8787` carries its port 8787 to the worker
([the render page](./phone-render.md)); without the reverse, set the variable. Expo inlines `EXPO_PUBLIC_*` variables into the bundle at
build time: never put a secret in one. A server chosen while the app runs
(typed at sign-in) is `url: () => server.url` (`createClient`) and `baseURL: () => server.url`
(`createAuthClient`): each is read on every use, so changing the address needs no restart.

## The version headers

`createVersionGatedFetch()` stamps the build number and platform on every request, whether or
not a floor is set, so the [version gate](./version-gate.md) can turn on later without a client
release. `@fcalell/plugin-expo/client` exports:

| Export | What it does |
| --- | --- |
| `versionHeaders()` | The two headers, read from `expo-application`'s `nativeBuildVersion` and `Platform.OS`; `{}` when either is unknown. Never throws. |
| `createVersionGatedFetch(base?)` | Wraps `fetch` (the global unless given): merges the headers into each request's own and signals `onUpdateRequired` subscribers on a `426`. |
| `onUpdateRequired(cb)` | Subscribes to the `426` signal; returns the unsubscribe function. |

The update wall itself is the app's screen: subscribe with `onUpdateRequired` where the app
decides how to show it, and route there.

```tsx
useEffect(() => onUpdateRequired(() => router.replace("/update")), []);
```

## Without `nativeUi()`

`nativeUi()` installs `@tanstack/react-query`, requires `query()` (which installs `@orpc/tanstack-query`), and wraps the app in the
`QueryProvider` the hooks need. An app on `expo()` alone installs both and mounts the provider
itself.
