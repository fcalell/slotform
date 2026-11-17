# showcase

The app that shows `@fcalell/plugin-react-ui`: its roster, its foundations and one app composed
from its components. It is the first consumer of the screens workbench (`@fcalell/plugin-screens`).

```bash
pnpm showcase                  # from the repo root: builds the workspace chain, then stack dev on :3000
pnpm --filter showcase build   # stack build
```

How it is built: [docs/architecture/ui-core/showcase.md](../../docs/architecture/ui-core/showcase.md).
