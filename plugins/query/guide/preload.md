# Preloading a route

A route warms its reads before its components mount, so a screen opened from a list draws what
already landed instead of painting. `preload` starts the reads and never holds navigation.

Call `preload` (`@slotform/query/preload`) from the route's TanStack Router `loader`, which
gets the app's query client in its `context`. Write each handle once, as a function
both the loader and the component call, so the key is the same:

```tsx
const project = (id: string) => orpc.projects.get.read({ id });
export const Route = createFileRoute("/projects/$projectId")({
  loader: ({ context, params }) => preload(context.queryClient, project(params.projectId)),
  component: () => <ProjectPane id={Route.useParams().projectId} />,
});
```

`preload(client, ...selections)` starts each distinct read and returns at once, so navigation is never held;
the component builds its own handle and draws what landed, or paints and settles if it is still in
flight. A fresh read costs no request (`staleTime` decides), a `pages` read fetches its first page,
and a failed prefetch is dropped. Streams, idle reads (`skipToken`, `enabled: false`) and reads
whose input comes from another read's data are not preloaded. It warms the client it is given: on
the web the router's `context` carries the one `QueryProvider` holds, and on the phone a route
file exports `preload(client, params)`, and a press-in on a row, link, stat or fact that opens the
route calls it with the app's query client and the href's params, so there is no `loader`
(`node_modules/@slotform/expo/guide/routes.md`).

**Check:** `pnpm check` passes, and under `pnpm dev` opening the route requests its reads before its
components mount.
