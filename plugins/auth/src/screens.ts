import { HttpResponse, http } from "@fcalell/plugin-screens/msw";
import { session, user } from "./screens-session.ts";
import { AUTH_PREFIX } from "./types.ts";

// The workbench's `get-session` handlers: docs/architecture/plugins/auth.md, "Screens".
export default [
	http.get(`*${AUTH_PREFIX}/get-session`, () =>
		HttpResponse.json({ session, user }),
	),
];
