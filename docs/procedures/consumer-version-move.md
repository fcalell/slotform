# Consumer version move

How a consumer that pinned a Slotform commit (`github:fcalell/slotform#<sha>&path:/plugins/db`) or
links a checkout (`link:../slotform/plugins/db`) moves to a published version once the registry
holds it. The version rule it moves onto is in
[releasing](../architecture/releasing.md#the-version-rule). A pin under the old names
(`"@fcalell/plugin-db": "github:fcalell/stack#<sha>&path:/plugins/db"`) moves its names first
([the app's names](consumer-migration.md#the-apps-names)); the `overrides` and `allowBuilds` entries
of step 2 then carry `@fcalell/` and `github.com/fcalell/stack` in place of the names shown.

## Steps

1. In the consumer's `package.json`, every `@slotform/*` spec in `dependencies` and
   `devDependencies` becomes the caret of the release:

   ```diff
   -"@slotform/db": "github:fcalell/slotform#55a1add…&path:/plugins/db",
   +"@slotform/db": "^0.1.0",
   ```

   Each required peer of the Slotform packages goes into `dependencies` too
   ([consumer migration](consumer-migration.md#before-you-start), "Required peers").

2. In its `pnpm-workspace.yaml`, delete what only the git route needed and keep the third-party
   verdicts:
   - The `overrides` entries naming `@slotform/*`;
   - `blockExoticSubdeps: false`;
   - The `allowBuilds` keys of the form `"@slotform/<name>@git+https://github.com/fcalell/slotform.git": true`;
   - `childConcurrency` and `networkConcurrency`, which only the git prepares needed.
3. Run `pnpm install`.
4. Check that the lockfile holds no `github.com/fcalell/slotform`, `github.com/fcalell/stack` or
   `link:` entry and one copy of each Slotform package ([the count](../architecture/releasing.md#peers-one-copy-of-each-slotform-package)).
5. Run `slotform generate`, then the consumer's `pnpm check`.

## After the move

`pnpm update "@slotform/*"` moves every Slotform package together. A review round that fixes Slotform
runs `slotform link <checkout>` and `slotform unlink` when it ends
([a linked app](../architecture/consumer-project.md#a-linked-app)), and the pin moves to the next
version.
