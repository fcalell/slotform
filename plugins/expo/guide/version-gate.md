# The version gate

A phone build can't be reloaded the way a web page is. When an API change breaks old builds, set
a floor: the worker answers every build below it with `426 Upgrade Required`, and the app shows
its update wall instead of running into undefined behaviour.

```ts
expo({ minNativeBuild: { ios: 42, android: 40 } });
```

Raise the floor by hand, in the same change as the breaking API change. A platform left out
floors at `0`, so every build of it passes. Without `minNativeBuild`, or with both platforms at
`0`, the gate is off and nothing of it lands in the worker.

## The update wall

With `nativeUi()`, the first `426` replaces the whole app with the update wall: a page titled
"Update required" that tells the viewer to update from the store. It cannot be dismissed and stays
until the app restarts. Its Update act opens the platform's store page, which the app config
holds:

- Android: the Play Store page of the app's Android package, always written.
- iOS: the App Store page, written only when `appStoreId` is set. It is the numeric Apple ID App
  Store Connect shows under App information.

```ts
expo({ minNativeBuild: { ios: 42, android: 40 }, appStoreId: 1385361527 });
```

Without a store page for the platform the wall keeps its sentence and draws no act. Set
`appStoreId` once the app has an App Store record; a build carries its app config, so a build
made before it opens nothing on iOS.

## What it reads

| Header | Value |
| --- | --- |
| `x-stack-client-build` | The native build number, digits only |
| `x-stack-client-platform` | `ios` or `android` |

The scaffolded client stamps both on every request ([the API client](./api-client.md)). A build
that stamps other names is invisible to the gate and
never walled, so ship a release that stamps these before raising a floor.

## What it walls

The gate walls only the worker's own routes, the RPC prefix (`/rpc/*` unless `api({ prefix })`
sets another), and never `/api/auth/*`, so a stranded user can still sign in again after
updating. A raw route the app adds passes untouched, and so does `/`. It runs before every other middleware but CORS, so a walled build's retries see `426`,
never a rate limit's `429`. Below the floor the answer is:

```json
{ "code": "UPGRADE_REQUIRED", "message": "A newer version of the app is required." }
```

A request passes untouched (fails open) when either header is missing, when the build number is
anything but digits (`1.2.3`, empty), or when the platform is neither `ios` nor `android`. The
wall is a nudge toward the update, not a security control: a request that can't be read as a stale
phone build always passes.

## Telemetry

While the gate is on, the worker binds an Analytics Engine dataset, `VERSION_GATE_METRICS`
(dataset `<app slug>_version_gate`), and counts two events on gated paths: `walled` (a `426`
served) and `headerless` (a request that failed open, which includes every browser request in an
app that also has a web client). Each data point carries `[event, platform, build]` as blobs,
indexed by `event`. A `headerless` row with an empty platform is the canary for builds the gate
cannot wall. Where the binding is absent (the Node target, a local run without it) the gate
writes nothing and never errors.
