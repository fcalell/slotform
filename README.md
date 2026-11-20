# slotform

A plugin-driven TypeScript full-stack framework: Hono on Cloudflare Workers or Node, React on Vite, React Native on Expo, Drizzle and Better Auth, behind one `slotform` CLI.

[![status: alpha](https://img.shields.io/badge/status-alpha-orange)](#status)
[![npm](https://img.shields.io/npm/v/@slotform/cli?label=npm)](https://www.npmjs.com/package/@slotform/cli)
[![license: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

> [!WARNING]
> **Alpha.** Slotform is under active development. Plugin slots, generated files and CLI commands may change between minor versions; install by [the version rule](docs/architecture/releasing.md#the-version-rule) and read each release's notes before upgrading. It runs two in-repo apps and one external consumer, and has no other users.

A project is a `slotform.config.ts`, a `domain`, a `plugins` array, and its own business logic:

```ts
import { defineConfig } from "@slotform/cli";
import { db } from "@slotform/db";
import { auth } from "@slotform/auth";
import { api } from "@slotform/api";
import { vite } from "@slotform/vite";
import { react } from "@slotform/react";

export default defineConfig({
  app: { name: "my-app", domain: "example.com" },
  plugins: [
    db({ dialect: "d1", databaseId: "9a619a0b-..." }),
    auth({ cookies: { prefix: "myapp" }, organization: true }),
    api(),
    vite(),
    react({ description: "My app" }),
  ],
});
```

Plugins coordinate through typed slots in a dataflow graph: each plugin contributes typed values into other plugins' slots and derives values from them, and the framework resolves the graph once per command. The order of plugins in the array does not matter. Every plugin is listed explicitly; `slotform init` adds missing dependencies (picking `native-ui` also adds `expo`).

## Quick start

Requires Node 24.14 or newer and pnpm. Tested on POSIX systems (Linux, macOS); Windows is untested.

```bash
pnpm add -D @slotform/cli
pnpm exec slotform init my-app
```

`slotform init` prompts for plugins and plugin-specific options, scaffolds the project, and generates `.slotform/`. From inside the project, `slotform dev` starts the plugin-driven dev loop (processes, watchers, schema push).

## What you get

- **Database**: Drizzle ORM for Cloudflare D1 and SQLite (`@slotform/db`).
- **Auth**: Better Auth integration, RBAC, access control (`@slotform/auth`).
- **API**: Hono + oRPC behind a procedure builder with auth, rate limiting, and a typed client (`@slotform/api`).
- **Web**: React on Vite with TanStack Router file routes, the React Compiler, and the HTML shell (`@slotform/react`).
- **UI**: one design system, `@slotform/ui-core`. On the web its stylesheet, fonts, words and showcase over Tailwind v4 (`@slotform/react-ui`); on the phone its roster in React Native + uniwind (`@slotform/native-ui`).
- **Tooling**: one `slotform` CLI for init, dev, build, deploy. TypeScript and Biome presets included.

Every package, plugin and command: [`docs/architecture.md`](docs/architecture.md).

## Status

Slotform is alpha. This table says what the two in-repo apps exercise and what nothing does yet.

| Surface | State |
|---------|-------|
| Showcase app (web): `vite`, `react`, `react-ui`, `screens`, `api`, `cloudflare` target | Exercised by an in-repo app |
| Phone app (React Native): `expo`, `native-ui`, `api`, `db`, `auth`, `cloudflare` target | Exercised by an in-repo app |
| `node` target | Exercised by one consumer outside this repo (a long-running server); no in-repo app uses it |
| Windows | Untested |
| Third-party plugins | Less exercised: supported by design, no known plugin outside this repo |
| Installing from npm | Less exercised: first release (`0.1.0`) |

## Documentation

- [`docs/index.md`](docs/index.md): a reading list per kind of task, then every page.
- [`docs/product.md`](docs/product.md): what the framework is for.
- [`docs/architecture.md`](docs/architecture.md): the packages, plugins and dependency graph, linking every architecture page.
- Each package's `README.md`: its install, guide pages and exports; [`docs/architecture.md`](docs/architecture.md#plugins) lists them.
- The guide pages, how to build on Slotform, in `packages/*/guide/` and `plugins/*/guide/`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The repository's commands:

```bash
pnpm check            # Type-check every package, run the tests, then lint (Biome)
pnpm build            # Compile every package's src/ to dist/ and build the apps
pnpm showcase         # Build the showcase's dependencies and serve it on :3000
pnpm stories          # Storybook for the roster, on :6006
```

In this repo `pnpm install` builds every package through its `prepare`, and `pnpm turbo run build` rebuilds after a source change. Which entries ship compiled in `dist/`: [build and exports](docs/architecture/conventions.md#build-and-exports). Taking Slotform from npm or linking a checkout: [installing Slotform](docs/architecture/consumer-project.md#installing-slotform).

## Security

Report vulnerabilities privately, as [SECURITY.md](SECURITY.md) describes. Do not open a public issue.

## License

[MIT](LICENSE)
