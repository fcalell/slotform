# The query provider

`QueryProvider` from `@slotform/query/tanstack-query` holds the app's query client and the
port the read hooks of `@slotform/ui-core/react/*` and the UI components run on. With `query()` in
the config, the web app is already wrapped in it, and on the phone native-ui wraps it; never wrap
it again. A tree drawn outside the provider (a portal of its own) takes the port's
`carry(children)` inside a `PortProvider` from `@slotform/ui-core/react/port`. With no provider
above, a component given plain values still draws and an act runs as it is, while a read or a
`Form` throws naming `QueryProvider`.

## listen: the phone's network and focus

`QueryProvider` takes `listen`, `{ online?, focus? }` (`QueryListeners` from
`@slotform/ui-core/listen`), each given the manager's setter and returning its cleanup, for a
platform with no window events. native-ui passes the phone's, `listen` from
`@slotform/query/net` (`expo-network` and `AppState`), so a read pauses offline and
refetches when the app returns; the web needs nothing. Never pass `listen` in an app on native-ui.

**Check:** `pnpm check` passes.
