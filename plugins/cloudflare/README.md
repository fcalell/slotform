# @slotform/cloudflare

The Cloudflare Workers target for `slotform`, the alternative to `@slotform/node`. It
renders the API worker's wrangler config from what the other plugins contribute and runs
`wrangler` for dev, types and deploy.

How it is built: [docs/architecture/plugins/cloudflare.md](../../docs/architecture/plugins/cloudflare.md).

## Install

```bash
slotform add cloudflare
```

## Guide

Using the target in an app lives in `guide/`, indexed into a consumer's `.slotform/guide.md`:
[`wrangler.md`](./guide/wrangler.md) and the recipe [`deploy.md`](./guide/deploy.md).
