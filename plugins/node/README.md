# @fcalell/plugin-node

A long-running Node server target for `@fcalell/stack`, the alternative to
`@fcalell/plugin-cloudflare`. One process serves the API worker, the built web client and the
consumer's background services.

How it is built: [docs/architecture/plugins/node.md](../../docs/architecture/plugins/node.md).

## Install

```bash
stack add node
```

## Guide

Using the target in an app lives in `guide/`, indexed into a consumer's `.stack/guide.md`:
[`server.md`](./guide/server.md), [`bundle.md`](./guide/bundle.md), [`services.md`](./guide/services.md), [`channels.md`](./guide/channels.md) and
[`live.md`](./guide/live.md).
