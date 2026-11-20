# Containers

A container holds the rest of a screen: the `Shell` around the app, the `Pane` that is a screen of the router's stack, the `Gate` outside the shell, the `Sheet` over a page, the `Banner` that tells the page something, and the `Columns` and `Card` that arrange its sections. This page is what each takes; which container a screen needs is `rules.md`.

## Shell

The container of the app: the tab bar over the home indicator, the app's `foot`, the toasts and the `confirm()` sheets.

| Prop | Is |
| --- | --- |
| `places` | the tab bar's places, in order, each a `PlaceSpec` (`node_modules/@slotform/ui-core/guide/places.md#placespec`). Past five, four stand and a More tab opens a page of the rest. A spot place (`#activity`) is no tab: it stays on its page. A place's `children` are web only (`collections.md`, "What the phone leaves out") |
| `groups` | `{ label, switcher? }`, named by a place's `group`; the More page draws a group's switcher over its places |
| `switcher` | what the app is looking at and what it can switch to; its trigger starts the bar of each place's Pane |
| `banner` | a `Banner` under the status bar |
| `foot` | a part above the tab bar under every screen (a `Dock`, `audio.md`); without one the Shell draws nothing there |
| `children` | the router's stack, each screen a `Pane` |

## Pane

One screen of a place, of two kinds: the place's own, titled by the place's name, and a record's, pushed after it, titled by the record's name. Both bars lead with their act (the shell's switcher, or Back to the page above on a record's) and the trail: the places above the current one, then that place's name, a middle dot apart and cut at its start so the nearest shows.

| Prop | Is |
| --- | --- |
| `title` | the record's name, a short phrase or a selection of its read, on a record's Pane; it paints while the record loads, and stands whole and wrapping as the screen's header in the head at the body's top. The place's Pane takes none |
| `record` | the record's head, on a record's Pane: `overline` (the parts that place the record, one cut line, never repeating the place's name the bar holds), `facts` (a `RecordFact` each, `node_modules/@slotform/ui-core/guide/facts.md#a-record-heads-facts`) and `image` (`{ src, alt }`: a person's photo, a product shot, a square tile beside the head's text at its top, painted while its `src` is a selection, an `ImageOff` glyph where it failed or the address is empty). Each part is a constant or a selection that paints in its place |
| `noun` | the kind of record (a short lowercase noun, "project"): a not-found read says "Couldn't find this project.", else "Couldn't find this." |
| `missing` | the sentence a not-found read says in place of the one `noun` words ("No report for that month."); `noun` still names the kind |
| `acts` | icon acts after the title, the primary first: it stands at its icon and the rest lead the `more` menu. Each is a constant or a selection, painted and inert while its read waits. While the Pane's own `read` failed or is missing the bar draws none of them |
| `more` | the acts past them, in a menu named "More", its sheet titled by the Pane's title |
| `foot` | what docks under the body over the keyboard, given by the route: a `Composer`, or a `Table`'s chosen bar (an `ActionBar` with `chosen`), which the route gives only while a row is ticked, since the Pane reserves the foot's space, border and inset included, for whatever it is given |
| `sheet` | a `Sheet`'s props: docks in the foot's place while `open`, with no scrim; closing it hands focus back to the foot's input |
| `read`, `empty` | the screen's read and the sentence that stands in place of the body when it is empty (`node_modules/@slotform/ui-core/guide/frames.md`); `empty` takes a `read` |

## Gate

A page outside the shell, a root container as the `Shell` is: one column at most the `auth` width inside the page inset, standing at the top, the step's count, title, description, banner and body a stack apart, with `toast()` and `confirm()` standing in it. It keeps the safe area and scrolls over the keyboard. An `Input` that mounts in it takes focus unless a typing control of the column holds it, so the first field of a step takes it. A new `title` is a new step, which fades in and starts its form afresh. It draws no word of its own.

| Prop | Is |
| --- | --- |
| `title` | the page's one header (a short phrase; wraps); required |
| `description` | a meta line under the title, `Run \| Runs`: `{ strong }` at weight 500, `{ code }` in the inline code style, `{ quoted }` in typographic quotes |
| `step` | `{ at, of }` (`at` counted from one), the onboarding count of a flow of two to four steps: a segment per step and "Step n of m" above the title |
| `banner` | a `Banner` under the title and the description, before the body, so a verdict stands with the content it is about |
| `children` | the step's body, ahead of the `form`: a first run's `Button`s, `Section`s, a `Picker` at `fit="list"`, and the controls of a step that holds local state and submits nothing |
| `form` | a `Form`'s props (`forms.md`), drawn after the body, its bar across the column (`full`) |

```tsx
<Gate
  step={{ at: 1, of: 2 }}
  title="Choose a workspace"
  description={["Signed in as ", { strong: "ana@acme.dev" }]}
  banner={expired ? <Banner tone="attention" sentence="This request has expired." /> : undefined}
>
  <Section items={workspaces.map(toRow)} />
</Gate>
```

## Sheet

A task over the page: a create, an edit, a decision, an acknowledgement. A record is read in a `Pane`, never in a sheet. Placed in a screen it is the modal one, a bottom sheet over the scrim as tall as its content, growing with it up to the screen under the top inset and scrolling its body past that, so a `prose` `Input` that grows grows the sheet a line at a time; a pick that searches is the one sheet that stands tall from its first frame. Its first `Input` takes focus as it opens. A `Pane`'s or a `Thread`'s `sheet` docks in the foot's place instead.

| Prop | Is |
| --- | --- |
| `open`, `onClose` | its holder owns both; `onClose` hears the close act, a press on the scrim and the drag down. An act's `sheet` takes the rest |
| `title` | the heading (a short phrase; wraps to its whole text, the close act at its first line) |
| `description` | the sentence under the title |
| `back` | a function, a second page's way back, first in the head |
| `submit` | the act that completes the task, in the foot after the body, so it follows the fields it submits; the foot stands above the keyboard. Its blocked reason stands under it at rest, and a rejection is its sentence in that line, the act ready again, cleared on the next press. With no `onAct` (`{ label: "I saved them" }`) it acknowledges what the sheet shows: the press closes the sheet |
| `read`, `empty` | the body's read and its empty sentence |
| `children` | the body's parts, ahead of the `form` |
| `form` | a `Form`'s props (`forms.md`): its rows after the body's parts, its bar pinned in the foot. Give the form's submit or the sheet's `submit`, not both |

The sheet holds the attempt of its submit, its foot bar and its form's bar, so it cannot be dismissed while one pends. Its head and foot hold their height and the body scrolls between them. Docked beside a log, the body scrolls past two fifths of the region it shares with the log and keeps three rows; the log keeps two rows of its own while the body can give, and where the region is short the body gives first to the log's two rows, then to its three, then the log goes; the head and the submit never give. Each page of a docked sheet (a new `title`) opens at the top of its body, its first field taking focus.

## Banner

A tinted strip at its content's height that tells the page something: the tone's glyph beside the sentence, and the act under the line. It stands where it reads best and is always placed (`node_modules/@slotform/ui-core/guide/waiting.md#a-block-that-stands-only-with-its-data`).

| Prop | Is |
| --- | --- |
| `tone` | a `Tone` (`node_modules/@slotform/ui-core/guide/tone.md`), `active` by default; `failed` is announced at once. A selection paints the glyph until its read lands |
| `sentence` | the text beside the glyph (a sentence; wraps), words or runs, a `{ code }` in the mono. A selection draws no banner while its read waits or when it answers `undefined` |
| `act` | its one act, an `Act` or a `LinkAct`, an outlined `Button` under the line; a blocked act's reason under it. A selection paints the act's box and stands blocked once its read ended |
| `until` | when the run it tells of ends, with `tone="running"`: it draws the time left and a line along its foot that fills toward it, the clock stopping at 0:00; its `act` is the cancel |

## Columns

Sections side by side. `fit`: `board` (the default) stands each at its own width in a row that scrolls sideways; `half` stacks them in order.

## Card

A surface for one part of a `Section` that draws none (a `Prose`, `Stages`, `Image` or `Slider`, as `children`). A `Form`, a `Table`, a `Stats` and a `BarChart` are cards already.
