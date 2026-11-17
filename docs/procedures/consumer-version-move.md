# Consumer version move

How a consumer that pinned a stack commit (`github:fcalell/stack#<sha>&path:/plugins/db`) moves to
a published version once the registry holds it. The version rule it moves onto is in
[releasing](../architecture/releasing.md#the-version-rule).

## Steps

1. In the consumer's `package.json`, every `@fcalell/*` spec in `dependencies` and
   `devDependencies` becomes the caret of the release:

   ```diff
   -"@fcalell/plugin-db": "github:fcalell/stack#55a1add…&path:/plugins/db",
   +"@fcalell/plugin-db": "^0.1.0",
   ```

2. In its `pnpm-workspace.yaml`, delete what only the git route needed and keep the third-party
   verdicts:
   - the `overrides` entries naming `@fcalell/*`;
   - `blockExoticSubdeps: false`;
   - the `allowBuilds` keys of the form `"@fcalell/<name>@git+https://github.com/fcalell/stack.git": true`;
   - `childConcurrency` and `networkConcurrency`, which only the git prepares needed.
3. Run `pnpm install`.
4. Check that the lockfile holds no `github.com/fcalell/stack` entry and one copy of each stack
   package ([the count](../architecture/releasing.md#peers-one-copy-of-each-stack-package)).
5. Run `stack generate`, then the consumer's `pnpm check`.

## After the move

`pnpm update "@fcalell/*"` moves every stack package together. A review round that fixes stack
links a checkout instead ([consumer project](../architecture/consumer-project.md#from-a-checkout)),
and the pin moves to the next version, not the next commit.
