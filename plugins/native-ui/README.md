# @fcalell/plugin-native-ui

The phone half of the stack design system: the CLI plugin that renders `@fcalell/ui-core`'s
contract into the uniwind stylesheet, embeds the font files, composes the app's providers, and
ships the roster's phone components. Requires `expo` (it contributes into `plugin-expo`'s slots),
`api` and `query` (the wired Query provider and the components' reads); `auth` is optional, and the
Auth provider stands when the app's server has it.

How it is built: [docs/architecture/plugins/native-ui.md](../../docs/architecture/plugins/native-ui.md).

## Install

```bash
stack add native-ui
```

It adds `nativeUi()` to `stack.config.ts`, beside `expo()`, `api()` and `query()`, and
`auth({ expo: true })` in an app with auth.

## Guide

How to build on the plugin lives in `guide/`, indexed into a consumer's `.stack/guide.md`:
[`rules.md`](./guide/rules.md), what every phone `.tsx` follows;
[`panes.md`](./guide/panes.md), [`rows.md`](./guide/rows.md),
[`collections.md`](./guide/collections.md), [`frames.md`](./guide/frames.md),
[`waiting.md`](./guide/waiting.md) and [`motion.md`](./guide/motion.md), how the phone draws each;
[`reference.md`](./guide/reference.md), the components' subpaths, the options, the scaffolded
clients, the phone layout and the modes; [`containers.md`](./guide/containers.md),
[`controls.md`](./guide/controls.md), [`content.md`](./guide/content.md),
[`thread.md`](./guide/thread.md), [`blocks.md`](./guide/blocks.md), [`forms.md`](./guide/forms.md)
and [`acts.md`](./guide/acts.md), what each component takes; and [`audio.md`](./guide/audio.md), the
player. The screen recipe and the design standard are ui-core's pages; the plugin hands the CLI
those too (`cliSlots.guide`), as react-ui does.

## License

MIT
