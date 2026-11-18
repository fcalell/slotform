# @fcalell/plugin-react-ui

The web half of the stack design system: the CLI plugin that renders `@fcalell/ui-core`'s
contract into `.stack/app.css` on Tailwind v4, loads the fonts, sets the mode before first paint,
and mounts the words.

How it is built: [docs/architecture/plugins/react-ui.md](../../docs/architecture/plugins/react-ui.md).

## Install

```bash
stack add react-ui
```

Peer dependencies: `react` and `react-dom` `^19.2.0`. The config needs `vite()` and `react()`
beside it. `tailwindcss` and `@tailwindcss/vite` are optional peers that `reactUi()` writes into the
app ([From npm](../../docs/architecture/consumer-project.md#from-npm)).

```ts
// stack.config.ts
import { defineConfig } from "@fcalell/cli";
import { react } from "@fcalell/plugin-react";
import { reactUi } from "@fcalell/plugin-react-ui";
import { vite } from "@fcalell/plugin-vite";

export default defineConfig({
  app: { name: "my-app", domain: "example.com" },
  plugins: [vite(), react(), reactUi()],
});
```

## Guide

How to build on the plugin lives in `guide/`, indexed into a consumer's `.stack/guide.md`:
[`rules.md`](./guide/rules.md), what every web `.tsx` follows;
[`reference.md`](./guide/reference.md), the components' subpaths, the options, density, the page
container and the modes; [`containers.md`](./guide/containers.md), [`controls.md`](./guide/controls.md),
[`content.md`](./guide/content.md) and [`blocks.md`](./guide/blocks.md), what each component takes;
[`canvas.md`](./guide/canvas.md), a graph of nodes and edges; and [`audio.md`](./guide/audio.md),
the player. The screen recipe and the design standard are ui-core's pages.

## License

MIT
