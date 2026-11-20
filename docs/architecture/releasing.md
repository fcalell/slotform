# Releasing

How the packages reach the npm registry: what is published, the version rule, the peer rules that
keep one copy of each stack package in a consumer, the packages' `prepare`, and the check a release
passes. The owner publishes; nothing in the repository logs in to npm or publishes on its own. The
publish runbook is [publishing](../procedures/publishing.md), and moving a consumer from a git pin to
a version is [consumer version move](../procedures/consumer-version-move.md).

## What is published

The packages below, all `@fcalell/*`, all at one version:

| Package | Directory | A consumer installs it because |
|---------|-----------|--------------------------------|
| `@fcalell/cli` | `packages/cli` | the `stack` binary and the slot graph; every app's devDependency |
| `@fcalell/ui-core` | `packages/ui-core` | the design contract and the read model with its hooks; both UI plugins depend on it and the guide index lists its pages |
| `@fcalell/typescript-config` | `packages/typescript-config` | the scaffold's `tsconfig` presets (every app's devDependency) |
| `@fcalell/biome-config` | `packages/biome-config` | the scaffold's Biome preset (every app's devDependency outside stack's workspace) |
| `@fcalell/plugin-api`, `-auth`, `-cloudflare`, `-db`, `-expo`, `-native-ui`, `-node`, `-query`, `-react`, `-react-ui`, `-screens`, `-vite` | `plugins/<name>` | one per domain, named in `stack.config.ts` |

Private, never published: the root (`@fcalell/stack`), `packages/repo-checks` and the two apps,
`apps/showcase` and `apps/phone`, stack consumers inside the checkout (`private`, which changesets
never versions). The two
presets are public although only a devDependency: `stack init` writes both into every app's
`package.json`, and `.stack/biome.json` extends the Biome one.

A tarball holds what its `files` lists and nothing more:

- `dist/`: JavaScript with `.d.ts` and maps.
- `src/`: the entries a bundler compiles resolve to it, ui-core's guide sends a reader to
  `src/roster.ts` and `src/roster/`, and the maps point into it.
- `guide/*.md`: a consumer's `stack generate` indexes them.
- `DESIGN.md` for ui-core, and `templates/` and `lint/` where a plugin scaffolds or contributes
  them.
- The README and the LICENSE.

Test files, `tsconfig*.json` and ui-core's maintainer scripts stay out. Which `exports` entries
resolve to `dist/` and which to source is in [conventions](./conventions.md#build-and-exports).

The CLI keeps a table of every first-party package a consumer installs (`STACK_PACKAGES`): the
directory it lives in within stack's repository, the first-party packages its `dependencies` name,
and `builds`, pnpm's verdict on each build script the package brings into the app (`true` runs it,
`false` skips it), which the install that brings the package meets before any plugin loads. A test
holds each entry to the package's own manifest.

## The version rule

- **One version for every public package** (`fixed` in `.changeset/config.json`). A release
  publishes all of them or none, never a subset.
- **Stack-to-stack ranges are carets of that version.** A package depends on another with
  `workspace:^`, which `pnpm pack` and `pnpm publish` write as `^<version>`. On `0.x` a caret holds
  the minor (`^0.1.0` is `>=0.1.0 <0.2.0`), so a breaking change bumps the minor and everything
  else the patch, until `1.0.0`; then semver.
- **A consumer's specs are `^<the CLI's version>`.** `stack init` and `stack add` write them from the
  CLI's own `package.json` (`stackSpec`), and the consumer's lockfile is the pin.
- **The CLI reads its own manifest at run time.** `packages/cli/src/lib/manifest.ts` parses the
  packed `package.json` when the CLI starts: `version` for `stackSpec`, the `ts-morph` peer for
  `TS_MORPH_SPEC`, and the `typescript`, `@types/node` and `@biomejs/biome` devDependencies for `TYPESCRIPT_SPEC`,
  `TYPES_NODE_SPEC` and `BIOME_SPEC`, the ranges a scaffold writes. The published manifest keeps its
  `devDependencies`; a CLI whose manifest lacks one fails at start.
- **The bump goes through changesets.** `pnpm changeset` goes with each user-facing change; at
  release time `pnpm version-packages` applies the pending ones (versions and changelogs), and the
  result is committed on `master`; with no pending changeset it exits 1. The first release,
  `0.1.0`, needs no changeset: the manifests are already at it.

## Peers: one copy of each stack package

A consumer must end with exactly one copy of each stack package, or its slots split
(`Slot 'api:envType' is defined twice: two copies of its package are installed`). pnpm makes one
instance of a package per set of resolved peers, so a peer that resolves differently in two places
turns one `@fcalell/plugin-api` into two, and every stack package above it into two. The rules that
prevent it:

1. **A stack package depends on another stack package, never peers on it.** The ranges are lockstep
   carets, so one install holds one version.
2. **A third-party dependency is a peer when one of three holds.**
   - A type it declares appears in the package's public types. A type that crosses into the app
     must be one copy, or the app's typecheck splits ("separate declarations of a private
     property"): `zod`, `drizzle-orm`, `hono`, `@orpc/client`, `@orpc/server`, `@casl/ability`,
     `better-auth` with its `@better-auth/*` plugins, `expo`, `react`, `react-native`.
   - It must be one instance at runtime across the app and stack (a React context, an error class
     tested with `instanceof`, a registry): `react`, `zod`, `@orpc/server`, `@casl/ability`,
     `@tanstack/react-query`.
   - It is a build-time tool the app's own commands run. Such a tool is an optional peer, so an
     install that only runs the app holds none of them
     ([consumer project](./consumer-project.md#from-npm)).

   A peer is optional (`peerDependenciesMeta`) when only some of the package's subpaths use it and
   an app without that feature must not need it. Each peer is also a
   `devDependency`, at a spec inside the peer range (the next rule), so stack's own workspace
   builds and tests. `stack init` and
   `stack add` write each required peer into the app's `dependencies`
   ([installing stack](./consumer-project.md#installing-stack)).
3. **Each library has one spec per field across the public manifests, and the devDependency lies
   inside the peer range.** One `peerDependencies` range is the contract a consumer meets, the
   highest any package needs (`zod` `^4.6.7`, `react` `^19.3.0`, `react-native` `^0.88.0`). One
   `devDependencies` spec is the one copy stack's workspace installs, and devDependencies install
   only there, where `apps/phone` bundles the packages' source and needs the Expo SDK's exact pins
   (`react` `19.3.0`, `react-native` `0.88.1`): React Native's renderer refuses any other React.
   So a devDependency is a subset of its peer range (`19.3.0` inside `^19.3.0`, `~58.1.2` inside
   `>=58.0.0`), and `dependencies` hold one spec too. `packages/repo-checks/src/ranges.test.ts`
   checks it.
4. **A third-party dependency's optional peer that a consumer's tree can hold in two versions is a
   direct dependency of the stack package.** `@orpc/server` has an optional peer `ws`; wrangler's
   miniflare pins `ws` exactly while Storybook and Vitest take the newest, so an app with a worker
   holds two `ws`, and pnpm resolves `@orpc/server`'s peer to either by context. `plugin-api`,
   `plugin-auth` and `plugin-screens` each depend on `@orpc/server`, so each lists `ws: ^8.23.0`,
   which settles the peer inside the package; without it, each of the three and every package above
   them exists twice.

When `stack generate` names a slot defined twice after an install, the cause is a dependency's optional
peer (the last rule above): compare the parenthesised suffixes of the duplicated keys in the lockfile's `snapshots:`; the
one that differs is the peer.

Count the copies in any consumer, from its root; each stack package must show `1`:

```bash
awk '/^snapshots:/{s=1} s && /^  .?@fcalell\//' pnpm-lock.yaml \
  | sed -E "s/^  '?(@fcalell\/[a-z-]+)@.*/\1/" | sort | uniq -c
```

## Prepare script

A package's `prepare` is `node ../../scripts/prepare.ts`, run from the package's directory. An
install of a checkout (`pnpm install` in the workspace) has no `dist/` until it builds one.
`pnpm pack` and `pnpm publish` run `prepare` too, but a release builds once, before either (`turbo run build`, which `pnpm release:check` and `pnpm release` run), so under those two
commands a `dist/` already there is the build, and `prepare` leaves it alone. Without one, it
builds. There is no `prepublishOnly`.

## The check

`pnpm release:check` (`scripts/release-check.ts`) proves the tarballs, with no server and no login;
it publishes nothing.

1. It builds every package (`turbo run build`; `--no-build` skips it when they are built).
2. It packs every public package under `packages/` and `plugins/` (a `private` one is skipped) and
   checks each tarball: MIT, a LICENSE, a
   `repository.directory`, `publishConfig.access: public`, no `workspace:` range left, no test
   file, every `exports` and `bin` target present. Across them: one version, and every plugin
   installed by at least one consumer, since a plugin none installs is never generated or
   type-checked.
3. It makes the consumers `CONSUMERS` in the script lists, each with its plugins, with
   `stack init`, each installing **only** from the tarballs (`overrides` to `file:` tarballs in
   the consumer's `pnpm-workspace.yaml`, which is what the registry will serve), so no workspace
   link and no registry copy of a stack package stands in for a tarball.
4. On each it runs `stack generate`, `stack build` and `tsc -b` where its entry says so, and counts
   the copies of each stack package in the lockfile.
5. It ends with `pnpm -r publish --dry-run`.

`node scripts/release-check.ts [--out <dir>] [--only web,node,native] [--keep] [--no-build]`:
`--out` is where the tarballs, the consumers and the logs go (a fresh directory under the system
temp directory by default, printed; a reused one has its tarballs emptied first); `--only` narrows
the consumers, and a name that is no consumer fails at once; `--keep` keeps each consumer's
`node_modules`, which are otherwise removed after the consumer is checked, to spare the disk.

Every consumer type-checks, the native one included: `plugin-auth`'s `src/expo.tsx` ships as
source, so an app's `tsc` reads it, and it names no type from `expo-apple-authentication` or
`@react-native-google-signin/google-signin`, optional peers that an app signing in by the browser
installs neither of. It declares the little it uses of each and casts the dynamic import to it.

The check prints each consumer's `node_modules` size and package count: a build-time tool that slips
into a runtime package's `dependencies` shows there first. The packages a server that only runs the
app should not hold are optional peers ([consumer project](./consumer-project.md#from-npm)).

## In the code

- `scripts/release-check.ts`: `pnpm release:check`.
- `scripts/prepare.ts`: every package's `prepare`.
- `packages/cli/src/lib/stack-packages.ts`: `STACK_PACKAGES`, `stackSpec`.
- `packages/repo-checks/src/ranges.test.ts`: one spec per field per library, devDependencies inside the peer range.
- `.changeset/config.json`: the fixed version group.
