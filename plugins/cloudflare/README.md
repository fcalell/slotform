# @fcalell/plugin-cloudflare

The Cloudflare Workers target for `@fcalell/stack`, the alternative to `@fcalell/plugin-node`. It
renders the API worker's wrangler config from what the other plugins contribute and runs
`wrangler` for dev, types and deploy.

How it is built: [docs/architecture/plugins/cloudflare.md](../../docs/architecture/plugins/cloudflare.md).

## Install

```bash
stack add cloudflare
```

## Guide

Using the target in an app lives in `guide/`, indexed into a consumer's `.stack/guide.md`:
[`wrangler.md`](./guide/wrangler.md) and the recipe [`deploy.md`](./guide/deploy.md).
