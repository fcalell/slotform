# @fcalell/plugin-screens

The screens workbench for `@fcalell/stack`'s web apps: one command serves every route of the app in
each state its queries can take, from typed fixtures, with no backend and no story, harness or
Storybook config in the consumer's repo.

How it is built: [docs/architecture/plugins/screens.md](../../docs/architecture/plugins/screens.md).

## Install

```bash
stack add screens
```

`stack add screens` writes Storybook, its addons, MSW, Vitest and `@vitest/browser` for the test run
into the app's `devDependencies`; they are optional peers of this package, so an app that has
auth or react-ui without `screens()` installs none of them. The oRPC packages the host answers
with are this package's own dependencies. It requires `react` (the routes) and
`api` (the procedures).

## Guide

Using the workbench lives in `guide/`, indexed into a consumer's `.stack/guide.md`:
[`screens.md`](./guide/screens.md), the commands (`dev`, `test`, `shoot`, `drive`, `serve`, `browser`), the seeded server, its seed and its `/fixture` controls, a screen's five states, the fixtures in
`src/app/fixtures.ts`, the test run's checks and the limits.

## License

MIT
