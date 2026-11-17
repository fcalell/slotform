# Publishing

The owner's runbook for publishing a release of the sixteen packages to npm. What is published, the
version rule and the check it runs are in [releasing](../architecture/releasing.md).

## Once per machine

`npm login` as the account that owns the `@fcalell` scope, with two-factor on; `pnpm` forwards
npm's one-time-password prompt.

## Steps

```bash
git switch master && git pull --ff-only          # a clean tree on master: publish refuses otherwise
pnpm install --frozen-lockfile
pnpm version-packages                            # only after a first release; commit the bump
pnpm turbo run build                             # JavaScript and .d.ts into every dist/: the one build
pnpm check                                       # the gate
pnpm release:check                               # tarballs, three consumers, the dry run
pnpm -r publish --dry-run                        # the dry run alone, with the git checks on
pnpm release                                     # the build again (cached), then pnpm -r publish --access public
git tag "v$(node -p "require('./packages/cli/package.json').version")"
git push --follow-tags
```

The one build is the one `pnpm pack` and `pnpm publish` ship: a package's `prepare` leaves a `dist/`
that is there alone ([releasing](../architecture/releasing.md#prepare-script)).

## A failure part-way

`pnpm -r publish` goes in dependency order and skips a version the registry already holds, so after
a failure part-way (a dropped connection, an expired one-time password) the same command resumes.

## After publishing

From an empty directory, follow the [README](../../README.md)'s route: `pnpm add -D @fcalell/cli`,
then `pnpm exec stack init my-app`, which must install, generate and finish. A bad release is never
unpublished; the next patch fixes it.
