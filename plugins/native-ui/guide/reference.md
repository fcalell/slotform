# Phone UI reference

`nativeUi()` renders the `@fcalell/ui-core` contract into the phone app's uniwind stylesheet,
embeds the font files, wraps the app in its providers and mounts the words. It sits beside
`expo()` in `stack.config.ts` and `api()`. An app with its own server adds a deploy target; an app that is a client of another stack app's server gives `api({ server })` (below) and carries no `auth()`, `db()` or deploy target, so no worker is generated.

## Components

Each roster component is imported from its own subpath, its name in kebab case:

```tsx
import { Section } from "@fcalell/plugin-native-ui/components/section";
import { Pane } from "@fcalell/plugin-native-ui/components/pane";
import { toast } from "@fcalell/plugin-native-ui/lib/toast";
import { useWords } from "@fcalell/ui-core/react/words";
```

A component's props are its topic page (`containers.md`, `content.md`, `thread.md`, `blocks.md`,
`controls.md`, `forms.md`, `acts.md`, `audio.md`), and each prop's whole doc is its props type in
`node_modules/@fcalell/plugin-native-ui/src/ui/components/<dir>/index.tsx`.

`age(moment, now)` (`lib/age`) words an ISO moment as its age from `now`
("2 minutes ago") and `ageShort(moment, now)` in its short form ("2 min"). `setTheme("light" | "dark" | "system")` (`lib/theme`) switches the mode at runtime. The
icon set is Lucide, drawn from `lucide-react-native`: every `icon` a component takes is an
`IconName`, a Lucide PascalCase name.

## Reads

The phone has no window
events, so `nativeUi()` wires TanStack's online and focus managers itself (`expo-network` and
`AppState`, through `QueryProvider listen`): a read pauses offline, shows the paused line, and
refetches when the app returns to the foreground. Pass nothing.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `theme` | the calibrated defaults | Six knobs: `hue` (`{ accent?, cast? }`; the cast is the neutrals' hue, the accent's unless set), `radius` (the control's corner radius in px; a layer takes a third more), `fonts` (`{ sans?, mono? }` family names; IBM Plex Sans and IBM Plex Mono unless set), `size` (the desktop body in px, 13, 12 to 18: every type size, space and size scales with it), `defaultMode` (the mode the app starts in; unset, it follows the system) and `loading` (`{ text?, figure?, id? }`, each `"pulse"` or `"scramble"`: how that kind of waiting region is painted, the skeleton's breath or generated characters; omitted, all pulse; a shape always pulses). An app on both platforms passes the web plugin the same object. |
| `words` | English | Every word a component draws on its own, every key required, so a translation that misses one fails the type-check. Read with `useWords()`. |
| `fonts` | none | The font files to embed, `{ family, source }[]`, `source` a path from the project root. `theme.fonts` names the families; an entry only brings a file, so embed the files of the families the theme names. Without one, the device must already have the family. |
| `queryClientModule`, `authClientModule` | `{ source: "../src/lib/query", export: "queryClient" }`, `{ source: "../src/lib/auth", export: "authClient" }` | Where the generated entry imports the Query and Auth clients from, `source` relative to `.stack/`. Setting one skips scaffolding its default file. |

```ts
nativeUi({
  theme: { hue: { accent: 200 }, defaultMode: "dark" },
  fonts: [
    { family: "IBM Plex Sans", source: "./assets/IBMPlexSans.ttf" },
    { family: "IBM Plex Mono", source: "./assets/IBMPlexMono.ttf" },
  ],
});
```

Fonts embed through expo-font's config plugin, so a change to `fonts` takes a new native build;
Expo Go never has them.

## A client of another app's server

A phone that only talks to a server another stack app runs sets `api({ server })`
(`node_modules/@fcalell/plugin-api/guide/config.md`) and types its client by that app's router:

```ts
// stack.config.ts
plugins: [expo({ scheme: "vault" }), api({ server: "../hub" }), nativeUi()],
```

```ts
// src/lib/api.ts
import { createClient } from "@fcalell/plugin-api/client";
import { createApiQueryUtils } from "@fcalell/plugin-query/tanstack-query";
import type { AppRouter } from "../../.stack/server";
import { server } from "./server"; // the app's own: where the address is kept

const client = createClient<AppRouter>({
  url: () => `${server.url}/rpc`, // read on every request: the address may change at runtime
  headers: () => (server.key ? { authorization: `Bearer ${server.key}` } : {}),
  credentials: "omit",
});
export const orpc = createApiQueryUtils(client);
```

- Run `stack generate` in the server app first (its `tsc -b` emits the `AppRouter` declaration under
  `.stack/types`); then here, and again after the server's procedures change.
- The Auth provider stands with `auth()` in the config, an `authClientModule`, or, in a client of a
  server (`api({ server })`), when that server has `auth()` (its `.stack/server.json` says so) and
  your `src/lib/auth.ts` exports `authClient`: `useAuthClient()` and the plugin-auth hooks work
  there. An app that signs in with a Better Auth session of the server gives `createAuthClient` a
  `baseURL` function (`node_modules/@fcalell/plugin-expo/guide/native-auth.md`).
- A new address means a new server's data: `queryClient.clear()` when it changes.

## What you edit

`stack init` (or `stack add native-ui`) scaffolds two files once; they are yours to edit.

- `src/lib/query.ts` exports `queryClient`, made by `createQueryClient()` from
  `@fcalell/plugin-query/tanstack-query` with a single retry and a short stale window; pass a
  `QueryClientConfig` to tune it.
- `src/lib/auth.ts` exports `authClient`; the phone's sign-in is
  `node_modules/@fcalell/plugin-expo/guide/native-auth.md`.

## Density and layout

The phone draws the touch density set at every width, and the room set inside a place that
states `distance="room"` (the `Shell` takes none): the touch set at a 960 × 540 canvas scaled to the window, which
`RoomScope` (`lib/room`) computes from the window's size and scopes with uniwind's
`ScopedVariables`. The roster's structure follows the phone: the `Shell` draws a tab bar and no
sidebar, a route renders one `Pane` (`panes.md`), and the `Table` alone reads the window
(`collections.md`).

## Modes

The app starts in `theme.defaultMode` when it is set, else in the system's mode, and
`setTheme` changes it from then on. The generated app config sets `userInterfaceStyle` to
`automatic`, so the system's light and dark setting reaches the app.
