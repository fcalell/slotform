# @fcalell/plugin-auth

Authentication for `@fcalell/stack`: Better Auth with email codes and magic links, OAuth (Apple, Google),
passkeys, organizations with roles, tenancy scopes and record abilities, on either deploy target.

How it is built: [docs/architecture/plugins/auth.md](../../docs/architecture/plugins/auth.md).

## Install

```bash
stack add auth
```

## Guide

Using auth in an app lives in `guide/`, indexed into a consumer's `.stack/guide.md`:
[`config.md`](./guide/config.md), [`callbacks.md`](./guide/callbacks.md),
[`sign-in.md`](./guide/sign-in.md), [`mcp-oauth.md`](./guide/mcp-oauth.md),
[`devices.md`](./guide/devices.md),
[`organizations.md`](./guide/organizations.md),
[`scopes.md`](./guide/scopes.md), [`abilities.md`](./guide/abilities.md),
and the recipes [`add-a-role.md`](./guide/add-a-role.md) and
[`protect-by-scope.md`](./guide/protect-by-scope.md).

## License

MIT
