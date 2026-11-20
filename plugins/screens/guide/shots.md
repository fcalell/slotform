# Shots and live apps

A shot is a PNG of a screen for a critic to look at. [The test run](test-run.md) saves one of each
story it visits; `shoot` and `drive` take them from a running app, judged by the same checks.

## Screenshots

`--shots <dir>` saves a PNG of every story the run visits, at each width, once the checks at that
width ran: `<dir>/<screen>/<story>-<width>.png`, for example `shots/projects/$id/data-dark-1920.png`.
The directory is resolved from the app's root and must lie inside it (gitignore it); the default
mode's story has no mode in its name (`data-1920.png`). The narrowing flags choose the images: one screen after an edit is
`slotform screens test --screen deploys --state data --mode dark --width 320,1920 --shots shots`. The run ends by listing the absolute path of every shot it
wrote.

- A shot is the viewport, 800 px tall. `--full` grows it to the whole screen, until no scroller
  hides anything, up to 16384 px.
- A loading story's shot is its waiting shape.
- A run writes over the files it takes and leaves the others; empty the directory first for a set
  from one run alone.
- The shots are taken whether or not the screen passes its checks.

## Opening a popup, a search for a filter

- `--open <control text>` presses, once a story has drawn, the control whose visible text or
  accessible name is that text (real mouse input after a hit test, tried up to three times; a
  control still covered fails, naming what covers it), waits for what it opens to settle, then runs
  the checks and takes the shot with it open, named `<story>-<width>-open-<slug>.png`. A Menu, a
  Picker, a Dialog or a Sheet is then judged and seen. A screen that draws no such control fails,
  naming it: narrow the run with `--state` to the states that draw it.
- `--search <query>` draws every screen at this search in place of the fixtures' example, so a
  filter-on empty shape is drawn: `--screen deploys --state empty --search "?q=x"`. An empty value
  draws none.

## Driving a live app

`shoot` and `drive` open a running app (any URL: `slotform dev`, a built bundle, a deploy, or a
[seeded server](seeded-server.md)) in the shared browser, with reduced motion and a device scale of
1, at each width and mode, with touch input and a coarse pointer under 768 px. They judge what the
test run judges on the live page (horizontal overflow, the render walk and axe), print the findings
like the test run and exit non-zero on any.

```bash
slotform screens shoot --url http://localhost:3000 --route /,/deploys --width 320,1920 --mode dark \
  --shots shots --open "Invite" --cookie session=abc
```

`shoot` waits until a page is quiet (no request in flight, nothing `aria-busy`, at most `--settle`
ms, 10000 by default; an open event stream does not count; a page still busy at the cap is shot with
a note, which does not fail it), then writes `<dir>/<route-slug>-<width>-<mode>.png` (`/` is
`index`; the default directory is `.slotform/shots`; `--full` and `--open` as above). Defaults: widths
`320,1920`, mode `dark`; a width is 200 to 4000 px. A route that fails (it does not load, its
`--open` control is not found) is reported with its path, and the run goes on to the next. A
guarded route needs a session: `--cookie name=value` sets one, and `--sign-in <url>` is opened once
first in the same context, which sets it for every tab after.

`drive <plan.json>` runs a plan once for each viewport of `each` (default 320 and 1920, dark; the
widths and modes `shoot` takes):

```json
{ "each": [{ "width": 320, "mode": "dark" }],
  "steps": [{ "goto": "/" }, { "fx": "/api/code" }, { "open": "Invite" }, { "type": "{{fx}}" },
            { "shot": "invite" }, { "key": "Escape" }, { "scroll": 400, "in": "main" }] }
```

| Step | Does |
| --- | --- |
| `goto` | opens a path of the app and waits until quiet |
| `open` | presses the control with this text or accessible name: real mouse (touch under 768 px) input after a hit test, retried as `--open` is, then waits until quiet |
| `key` | one key: `Enter`, `Escape`, `Tab`, `Backspace`, `Delete`, `Space`, an arrow, `Home`, `End`, `PageUp`, `PageDown`, or one character |
| `type` | types text into the focused element |
| `fx` | GETs a path of the app from the page; its text answer is `{{fx}}` in later steps |
| `shot` | judges the page and writes `<name>-<width>-<mode>.png` |
| `offline` | `true` or `false`: the network off or on |
| `scroll` | sets `scrollTop` of the page, or of the element `in` names (a CSS selector) |

A step of any other kind, with two kinds in one object, or with a value of the wrong type fails the
plan before it runs.
