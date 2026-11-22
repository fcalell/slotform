# Publishing

The owner's runbook for publishing a release of the public packages to npm. What is published, the
version rule and the check it runs are in [releasing](../architecture/releasing.md).

## Once per machine

`npm login` as the account that owns the `@slotform` scope, with two-factor on; `pnpm` forwards
npm's one-time-password prompt.

## Steps

`pnpm release` (`scripts/release.ts`) is the whole release. It stops at the first step that fails,
and running it again resumes.

1. **Preflight.** On `master` with a clean tree, `git pull --ff-only`, and `npm whoami` answers.
2. **Install.** `pnpm install --frozen-lockfile`.
3. **Version.** With changesets pending, `changeset version` applies them and the result is
   committed as `chore: release v<version>`. With none pending, the version the manifests hold is
   released if npm lacks it on any public package (the first release, or a run again after a failure
   part-way). When npm holds it on every one, the run goes straight to Record, and it stops,
   nothing to release, once the tag `v<version>` is on origin too.
4. **Prove**, when npm lacks the version. `pnpm turbo run build`, the one build `pnpm pack` and
   `pnpm publish` ship (a package's `prepare` leaves a `dist/` that is there alone,
   [releasing](../architecture/releasing.md#prepare-script)); `pnpm check`; then the
   [release check](../architecture/releasing.md#the-check) with `--no-build`, which ends on the
   publish dry run.
5. **Publish**, when npm lacks the version. `pnpm -r publish --access public`, which forwards npm's
   one-time-password prompt, goes in dependency order and skips a version npm already holds. A failure part-way (a dropped
   connection, an expired one-time password) is resumed by running `pnpm release` again.
6. **Record.** The annotated tag `v<version>` (`git push --follow-tags` pushes annotated tags
   only), then `git push --follow-tags`. A failure before this step pushes nothing; a failure here
   is finished by running `pnpm release` again.
7. **Smoke.** It points at [After publishing](#after-publishing), which runs once the release is a
   day old.

## After publishing

Once the release is a day old (pnpm refuses a version younger than its `minimumReleaseAge`, 1440
minutes), from an empty directory, follow the [README](../../README.md)'s route: `pnpm add -D @slotform/cli`,
then `pnpm exec slotform init my-app`, which must install, generate and finish. A bad release is never
unpublished; the next patch fixes it.
