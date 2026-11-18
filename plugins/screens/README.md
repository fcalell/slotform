# @fcalell/plugin-screens

The screens workbench for `@fcalell/stack`'s web apps: one command serves every route of the app in
each state its queries can take, from typed fixtures, with no backend and no story, harness or
Storybook config in the consumer's repo.

How it is built: [docs/architecture/plugins/screens.md](../../docs/architecture/plugins/screens.md).

## Install

```bash
stack add screens
```

`stack add screens` installs the workbench's packages into the app
([dependencies](../../docs/architecture/plugins/screens.md#dependencies)). It requires `react` (the
routes) and `api` (the procedures).

## Guide

Using the workbench lives in [`guide/screens.md`](./guide/screens.md), indexed into a consumer's
`.stack/guide.md`.

## License

MIT
