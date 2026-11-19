# The phone's API client

`src/lib/api.ts` is the phone app's typed client for the worker's procedures. `stack init` (or
`stack add expo`) writes it once and it is yours from then on; queries, mutations and cache
invalidation work as on the web (`node_modules/@fcalell/plugin-api/guide/client.md`). The
starter it is written from is `node_modules/@fcalell/plugin-expo/templates/lib-api.ts`: a
`createClient<AppRouter>` whose `fetch` is `createVersionGatedFetch()`, wrapped as
`orpc = createApiQueryUtils(client)`. It imports `AppRouter` from `.stack/worker` type-only, so no
worker code (or its Node or Workers dependencies) enters the app bundle; the app's type-check
reads the type from the worker project's declarations (`.stack/types/`).

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
release. `createVersionGatedFetch(base?)` from `@fcalell/plugin-expo/client` wraps `fetch` (the
global unless given): it merges the two headers, read from `expo-application`'s
`nativeBuildVersion` and `Platform.OS` and left out when either is unknown, into each request's
own. On a `426`, `nativeUi()` draws the update wall
([the update wall](./version-gate.md#the-update-wall)); the app writes no code for it.

## Without `nativeUi()`

`nativeUi()` installs `@tanstack/react-query`, requires `query()` (which installs `@orpc/tanstack-query`), and wraps the app in the
`QueryProvider` the hooks need, and draws the update wall. An app on `expo()` alone installs both
and mounts the provider itself, and shows no update wall.
