# Contributing

Thanks for helping with `@fcalell/stack`.

## Setup

- Node 24 or newer.
- pnpm through corepack: `corepack enable`. The version is pinned by `packageManager` in
  `package.json`.
- POSIX shell tooling (Linux, macOS); Windows is untested.

```bash
pnpm install
pnpm check
```

`pnpm check` (type-check, tests, Biome lint) must pass before a change is complete. `pnpm lint`
applies Biome's fixes.

## Where things are

[`docs/architecture.md`](docs/architecture.md) maps the monorepo. Before a change, read the pages
[`docs/index.md`](docs/index.md) lists for that kind of task.

## Commits and pull requests

- The commit scope is the package, like `plugin-auth`: `fix(plugin-auth): reject expired codes`.
- Add a changeset for a user-facing change with `pnpm changeset`. All `@fcalell/*` packages are
  versioned together.
- Fill in the pull request template.

## Security

Report vulnerabilities privately; see [SECURITY.md](SECURITY.md).

## License

By contributing you agree your contribution is licensed under the [MIT License](LICENSE).
