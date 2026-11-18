# @fcalell/plugin-expo

The Expo/React Native target for `@fcalell/stack`. Generates the Metro config, the Expo app
config and the expo-router entry, and mounts a native app on the same worker
`plugin-api` generates for the web.

How it is built: [docs/architecture/plugins/expo.md](../../docs/architecture/plugins/expo.md).

## Install

```bash
stack add expo
```

`stack init` adds this too when you pick `expo` in the interactive picker.

## Guide

How to build on the plugin lives in `guide/`, indexed into a consumer's `.stack/guide.md`:
[`add-a-phone-screen.md`](./guide/add-a-phone-screen.md), the recipe;
[`routes.md`](./guide/routes.md), the expo-router files; [`options.md`](./guide/options.md), the
options and the root files; [`builds.md`](./guide/builds.md), the commands and `eas.json`;
[`phone-render.md`](./guide/phone-render.md), rendering the app on an emulator;
[`phone-capture.md`](./guide/phone-capture.md), capturing a phone screen;
[`api-client.md`](./guide/api-client.md), `src/lib/api.ts`;
[`native-auth.md`](./guide/native-auth.md), signing in on the phone; and
[`version-gate.md`](./guide/version-gate.md), `minNativeBuild`.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-expo` | `expo()`, `ExpoOptions`, `sdkVersions()` |
| `@fcalell/plugin-expo/client` | `createVersionGatedFetch()`, `onUpdateRequired()` |
| `@fcalell/plugin-expo/version-gate` | `versionGate()` |

## License

MIT
