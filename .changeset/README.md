# Changesets

Every `@slotform/*` package is versioned in lockstep (`fixed` in `config.json`), so one changeset
bumps them all together.

Add a changeset with your change:

```bash
pnpm changeset
```

`pnpm release` applies the pending changesets, proves and publishes
(`docs/procedures/publishing.md`). The version rule and the one-copy peer rules are in
`docs/architecture/releasing.md`.

The private apps (`phone`, `showcase`) are never versioned or published: changesets leaves a private package alone.

`@slotform/repo-checks` is private too, but the `fixed` glob matches it, and `changeset version`
fails on a matched package with no version (`Invalid version. Must be a string`), so its manifest
holds `0.0.0`, which the release leaves as it is.
