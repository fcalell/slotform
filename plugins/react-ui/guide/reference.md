# Web UI reference

`reactUi()` renders the `@slotform/ui-core` contract into the web app's stylesheet, loads the
fonts, sets the mode before first paint and mounts the words. It sits beside `vite()` and
`react()` in `slotform.config.ts`. A web app that owns no server gives `api({ server })` the Slotform app it
talks to (`node_modules/@slotform/api/guide/config.md`) and carries no deploy target.

## Components

Each roster component is imported from its own subpath, its name in kebab case:

```tsx
import { Section } from "@slotform/react-ui/components/section";
import { Pane } from "@slotform/react-ui/components/pane";
import { toast } from "@slotform/react-ui/lib/toast";
import { useWords } from "@slotform/ui-core/react/words";
```

`navigate(route)` (`lib/navigate`) opens a route of the app from a handler the way a `Button` with an `href` does, in the router with no document load. `toast()` and `confirm()`, and the act types and hooks, are [acts](./acts.md).
`age(moment, now)` (`lib/age`) words an ISO moment as its age from `now` ("2 minutes ago") and
`ageShort(moment, now)` in its short form ("2 min", for a meta like "Waiting for you · 12 min");
read `now` from the shared clock, `useClock((now) => age(moment, now))` (`@slotform/ui-core/react/clock`), and the age
ticks on its own, the part drawing again only when its words change. A row's trailing age takes
the ISO moment itself, `trailing: { age: item.madeAt }`: the row words it short and ticks it, so
pass the moment, never a worded string. `useTouch()` (`lib/media`) says whether the touch density is
drawing. The icon set is Lucide, drawn from `lucide-react`: every `icon` a component takes is an
`IconName`, a Lucide PascalCase name.

`player` and `usePlayer()` (`lib/player`), the `Dock` and the `Waveform` play and draw sound: [audio](./audio.md).

## Reads

A read, a `Form` and an act's refusal run on the `QueryProvider` that `query()` mounts; without
`query()` in the config a component given plain values still draws, and a read or a `Form` throws
naming the provider. The web needs no `QueryProvider listen`, since TanStack reads the window's
online and visibility events.

A still frame sets `data-still` on its box, a collection's own box too.

## Long collections

A collection windows by itself: from `VIRTUAL_FROM` loaded rows (`@slotform/ui-core/window`) under
a scroller, only the rows near the view and `OVERSCAN` past each edge are drawn, spacers holding
the space of the rest. No prop turns it on or off. The scrollers are a `Pane`'s body, a `Sheet`'s
body (docked or not), a `Gate`'s page and a `Thread`'s log, the nearest one winning, so a `Section`'s
sheet in a `Sheet` windows against the `Sheet`. A `Section`'s sheet (rows, labelled or not, flat
or a tree), a `Table` at both widths, a `Thread`, trees, a `Picker`'s options (its `list` fit included),
and a `BarChart` (sideways, at a fixed bar width) window. A row is exactly one element. A collection that crosses the count
(a Show more) keeps the rows it drew.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `theme` | the calibrated defaults | Six knobs: `hue` (`{ accent?, cast? }`; the accent 264, the cast the neutrals' hue, the accent's unless set), `radius` (the control's corner radius in px, 6; a layer takes a third more), `fonts` (`{ sans?, mono? }` family names; IBM Plex Sans (sans) and IBM Plex Mono (mono) unless set), `size` (the desktop body in px, 13, 12 to 18: every type size, space and size scales with it), `defaultMode` (where a viewer with no stored choice starts, ahead of `prefers-color-scheme`) and `loading` (`{ text?, figure?, id? }`, each `"pulse"` or `"scramble"`: how that kind of waiting region is painted, the skeleton's breath or generated characters; omitted, all pulse. A technical voice scrambles figures and ids, `{ figure: "scramble", id: "scramble" }`; a shape always pulses). |
| `words` | English | Every word a component draws on its own, every key required. Read with `useWords()`. |
| `fonts` | IBM Plex Sans upright and italic on the `wght` axis, IBM Plex Mono at 400, 500 and 600 | The font files to load, each preloaded with a metric fallback face (a `local()` face over the system font of the same metrics, `Liberation` and `Arimo` standing in for Arial on Linux); `[]` loads none. Which family binds to `sans` or `mono` is `theme.fonts`. The default list is `defaultFonts`, from `@slotform/react-ui/node/fonts`. |

```ts
reactUi({
  theme: { hue: { accent: 120 }, defaultMode: "dark" },
  words: { ...ENGLISH, back: "Zurück" },
});
```

`ENGLISH` is the default words record, from `@slotform/ui-core/tokens`.

## Modes

The `dark` class on `<html>` is the mode; `.light` on an element inside it restores the light
colours for that subtree. The mode script sets `dark` before first paint from the stored choice,
else `theme.defaultMode`, else the system; a mode that came from the system follows it while the
page is open (a screen on a dark schedule changes with it), unless a choice is stored by then. Under
`prefers-reduced-motion: reduce` every transition duration is 0 ms.
