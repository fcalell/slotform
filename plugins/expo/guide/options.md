# The phone app's config

`expo()` in `slotform.config.ts` makes the app a phone app: `slotform generate` writes its Metro config,
its Expo app config, its entry and its route types into `.slotform/`. Every native setting is an
`expo()` option; the root files only point Expo at the generated ones.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `port` | `8081` | The Metro dev server's port. |
| `routes` | `{ appDir: "src/app" }` | The expo-router directory. `false` turns file routing off: no entry, no route types, and the app owns its own entry. |
| `scheme` | the slug of `app.name` | The deep-link and OAuth redirect scheme. |
| `easProfiles` | `["development", "preview", "production"]` | The EAS build profiles, matching `eas.json`. |
| `updateChannel` | `"production"` | The default EAS Update channel. |
| `configPlugins` | `[]` | Expo config plugins for native modules: `{ name, options?, dependencies? }`. |
| `minNativeBuild` | both platforms `0` | The oldest native build the API serves; see [version gate](./version-gate.md). |
| `appStoreId` | none | The numeric App Store id; the update wall's iOS store link ([the update wall](./version-gate.md#the-update-wall)). |

```ts
expo({
  scheme: "acme",
  configPlugins: [
    {
      name: "expo-camera",
      options: { cameraPermission: "Scan a code to join a project." },
      dependencies: { "expo-camera": "~58.0.14" },
    },
  ],
});
```

A native module reaches the app only through `configPlugins`: `name` is the config plugin's id
(usually its package), `options` pass through verbatim into the app config's `plugins` array, and
`dependencies` are written into `package.json` by `slotform init` and `slotform add`. In an app already
set up, `slotform generate` writes the config plugin but not the dependency: install the package too. A new
config plugin takes a new native build.

## What the app config holds

`.slotform/app.config.cjs` carries `app.name` as the name, its slug, the scheme, version `1.0.0`,
portrait orientation, `userInterfaceStyle: "automatic"` and phone-only iOS
(`supportsTablet: false`). The iOS bundle
identifier and the Android package are `app.domain` reversed plus the slug (`example.com` and
`my-app` give `com.example.myapp`); when the domain's last label already is the slug, the slug is
not repeated (`acme.app` and `acme` give `app.acme`). The store URLs are the Android package's Play
Store page and, with `appStoreId`, the App Store page. `expo-router` is always the first config
plugin while routing is on.

## The root files

`slotform init` (or `slotform add expo`) writes these once; `slotform remove expo` deletes them.

- `app.config.ts` and `metro.config.js` re-export `.slotform/app.config.cjs` and
  `.slotform/metro.config.cjs`. Leave them as they are: change the config through `expo()`.
- `babel.config.cjs` holds `babel-preset-expo`, which carries the transform the entry's
  `require.context` needs, and the React Compiler (`target: "19"`) over your code and the
  `@slotform` packages under `node_modules`, the set the web compiles, so write no `useMemo`,
  `useCallback` or `React.memo` for speed here either. It is `.cjs` because the app's
  `package.json` is `type: module`.
- `eas.json` is yours: see [builds](./builds.md).
- `src/lib/api.ts` is yours: see [the API client](./api-client.md).

`package.json`'s `main` is `.slotform/entry.tsx`, the expo-router root that wraps the routes in the
providers the plugins contribute. `.expo/`, `ios/` and `android/` are gitignored: the native
projects are regenerated, never edited.
