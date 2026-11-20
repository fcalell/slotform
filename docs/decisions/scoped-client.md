# The route scopes the client

The URL names the scope by slug. The consumer's layout resolves the slug to its chain (the
organization's id, then the project's) and wraps its outlet in `<ScopeBoundary ids>`, one line per
layout, which registers those ids with the client. `slotform generate` writes each procedure's scope
key (`organizationId`, `projectId`, or none) beside its input schema, and the binding's query utils
set the registered id as that key of every scoped call's input, so a screen writes no scope id and
no hook. The id still arrives in the input, so the scope middleware and the query key are
unchanged: two organizations' `projects.list` never share a cache entry. Which id wins and the
throw on a missing one are under [scope](../architecture/plugins/api.md#scope).

**Why.** A procedure's scope id arrives in its input (the config adds `<scope>Id` to the schema and
the middleware resolves the chain before validation). Measured on one consumer: 43 procedures
scoped to the organization and 30 to the project; the screens passed `organizationId` on 175 lines
and `projectId` on 74, always the route's own. The route knows the scope once; each call repeating
it is the part that can be wrong.

**Trade-off.** A call made outside a scope boundary (a global search, a sign-in screen) passes the
id itself, as today. The registered scope is ambient: a call's scope is the boundary it renders
under, and a screen that must call across scopes passes the id explicitly. The client depends on
the generated schema file, so a procedure added since the last `slotform generate` is not scoped
until it runs. A header could carry the scope instead and drop the key from the schema, but the
query key would then lose the id and the cache would need its own scoping; keeping the id in the
input keeps one mechanism.
