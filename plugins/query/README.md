# @fcalell/plugin-query

Query plugin for the `@fcalell/stack` framework: the api's procedures as TanStack Query reads and acts. It holds the query client, the query utils over the typed client, the read builder, the org-rules ability, and the port that `@fcalell/ui-core`'s read hooks run on, so the UI plugins draw reads without depending on TanStack, oRPC or CASL.

**Stack:** TanStack Query 5 (`@tanstack/react-query`) + oRPC's TanStack Query utils (`@orpc/tanstack-query`) + CASL

## Install

```bash
stack add query
```

It requires `api`. The consumer declares `@orpc/tanstack-query` (the plugin's `dependencies`); TanStack Query comes with plugin-react on the web and with native-ui on the phone, which also brings the `expo-network` that `./net` listens to.

## Guide

Drawing the api's reads lives in `guide/`, indexed into a consumer's `.stack/guide.md`:
[`reads.md`](./guide/reads.md), [`pages-and-streams.md`](./guide/pages-and-streams.md),
[`acts.md`](./guide/acts.md), [`abilities.md`](./guide/abilities.md) and
[`provider.md`](./guide/provider.md). Building the typed client is plugin-api's `client.md`.

## Contributions

| Slot | Contribution |
|------|--------------|
| `react.slots.providers` | `<QueryProvider hold={holdFor}>` around the web app (`order: 2`) |
| `vite.slots.optimizeExclude` | `@fcalell/plugin-query/tanstack-query`, which imports `virtual:stack-schema` |
| `cliSlots.initDeps` | `@orpc/tanstack-query` |

On the phone, native-ui contributes the `QueryProvider` to `expo.slots.providers`, with `listen` from `./net`.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-query` | `query()` |
| `@fcalell/plugin-query/tanstack-query` | `QueryProvider` (the client and the port ui-core's hooks and the UI components run on), `createQueryClient()`, `createApiQueryUtils()`, `ApiQueryUtils`, `scoped()`, `useRead()`, `useAbility()`, and TanStack Query's `useQuery`, `useMutation`, `useInfiniteQuery`, `useSuspenseQuery`, `useQueryClient`, `QueryClient`, `QueryClientProvider`, `streamedQuery` (source, for the bundler) |
| `@fcalell/plugin-query/read` | `read()`, `streamRead()`, `StreamRead`, `withRead()`, `ensurePages()`, `holdOf()`, `withHold()`, `retryOnce()`, `isStreamQuery()`, `watchUnheld()` |
| `@fcalell/plugin-query/acts` | `issues()`, `refusal()`, `retries()`, `heldAct()`, `watchActs()`, `whenSettled()`, `guardReach()`, `Reach` |
| `@fcalell/plugin-query/scope` | `withScope()`, `scoped()` -- the registered scope merged into the utils' inputs |
| `@fcalell/plugin-query/ability-client` | `ability()`, `orgRules()`, `composeAbility()`, `fetchOrgRules()`, `ORG_RULES_QUERY_KEY`, `orgRulesQueryKey()`, `PackedRulesLike` |
| `@fcalell/plugin-query/listen` | `listenQueries()` -- TanStack's online and focus managers on the platform's listeners |
| `@fcalell/plugin-query/preload` | `preload()` -- a route's reads warmed before it mounts |
| `@fcalell/plugin-query/net` | `listen` -- the phone's network (`expo-network`) and foreground (`AppState`) for `QueryProvider listen` (source, for the bundler) |

The model these build on (`Read`, `Selection`, `Datum`, `combine`, the hooks) is `@fcalell/ui-core`'s `read`, `acts`, `scope` and `react/*` subpaths.

## License

MIT
