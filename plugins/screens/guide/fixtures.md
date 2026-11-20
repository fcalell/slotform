# Fixtures

All fixtures live in `src/app/fixtures.ts`: one per procedure, shared by every screen that calls
it, typed by the router, so a fixture that departs from its procedure's output fails
`pnpm check`. The states that answer from them are [the states](screens.md#the-states).

```ts
// src/app/fixtures.ts
import { defineFixtures } from "@slotform/screens/fixtures";
import type { AppRouter } from "../../.slotform/worker";

export default defineFixtures<AppRouter>(
  {
    projects: {
      list: () => [{ id: "acme-web", name: "acme-web", status: "Live" }],
      get: ({ projectId }) => ({ id: projectId, name: projectId, status: "Live" }),
    },
  },
  { projectId: "acme-web" },
);
```

## Procedures

A fixture takes the procedure's input and returns its output; give it a value for every state the
screen draws, not only the happy one.

- A procedure with no fixture answers `no fixture for projects.get` and never reaches the
  network; the workbench draws it as a failed read, and the test run fails the story on it. A
  fixture that throws anything but the procedure's own error (an `ORPCError`) fails it the same
  way (`the fixture for projects.get threw: …`).
- A screen reaches the network only through the fixtures: a request or socket to another origin, or
  to a worker path nothing answers, fails as `Unanswered call: <url>`.

## Params and search

The second argument gives an example value for each route `$param`, by name, typed from the route
tree. A key that is a route id (it starts with `/`) holds the values for that route and every route
under it, the most specific id winning, so records of several kinds get one example each:
`{ projectId: "p1", "/_app/orgs/$orgId/reports": { projectId: "p2" } }`.

- A route whose `$param` has no example value fails its story, naming the route, the param and
  where it looked.
- A read whose input carries a param's example value and that answers any error in the data state
  fails the story, naming the procedure, the param and the error code (`projects.get answered
  NOT_FOUND in the data state for the param projectId "p1"`): the example record does not exist or
  is the wrong kind for the procedure.
- A route that reads its search (the router's `useSearch`, `location.searchStr`; never
  `window.location`, which a story's memory history does not set) is drawn at the example search
  the fourth argument gives: `defineFixtures<AppRouter>(procedures, params, channels,
  "?token=abc")`.

## A plugin's fixtures

A plugin supplies the fixtures of the procedures it owns, and the app writes fixtures for its own
procedures only. With `auth`, `auth.session` answers a signed-in user, so every screen behind the
session guard draws its signed-in form; the sign-in steps, `signOut`, `user.update`, the
organization list, create, delete, `setActive` and `invitations.create` answer too, with
`devices: true` `auth.devices.list` (three keys), `create` and `revoke`, and with `mcp: true` `oauth.client` and `oauth.consent`.

The app overrides any of them in `src/app/fixtures.ts`, which is asked first: give `auth.session` a
`() => null` to draw the signed-out form, or another user to draw a role. An app that needs session
fields of its own (an `activeOrganizationId`, so a screen that reads the active organization draws)
starts from the plugin's answer, a public subpath:

```ts
import authFixtures from "@slotform/auth/screens-fixtures";

const { session, user } = authFixtures.auth.session();
// in the procedures of defineFixtures:
auth: { session: () => ({ session: { ...session, activeOrganizationId: "org_1" }, user }) },
```

The answer is typed by the procedure, so a field the session does not have fails there.

## Channels

A screen that reads over the `node` plugin's WebSocket (`channelRead`) is answered from the third
argument, `channels`: a map from a channel's name to a fixture that takes the route params and
returns the channel's opening reply. A bare value is the payload of the channel's `snapshot`
message; a channel that opens with another message returns `{ type: "status", payload }` naming it
(exactly those two keys, so a snapshot shaped that way cannot be sent bare). Type it with
`@slotform/node`'s `Snapshots` over a map of the channel definitions.

```ts
export default defineFixtures<
  AppRouter,
  Snapshots<{ notes: typeof notesChannel; sync: typeof syncChannel }>
>(
  { projects: { list: () => [] } },
  { projectId: "acme-web" },
  {
    notes: () => ({ items: [] }), // the payload of notes' snapshot
    sync: () => ({ type: "status", payload: { state: "idle" } }), // sync opens with status
  },
);
```

A channel with no fixture fails the story, as a procedure with none does. Error closes the socket,
so after two seconds the channel's read draws its paused line; not found sends the frame as data.
