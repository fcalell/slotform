import type { ServiceSpec } from "./server/index.ts";

// The /fixture/socket service: docs/architecture/plugins/node.md, "Screens serve".
export const fixtureSockets: ServiceSpec = {
	name: "fixture-sockets",
	start({ ws, http }) {
		http.mount("/fixture/socket", async (request) => {
			const session = await http.session(request);
			if (session === null)
				return new Response("fixture socket: no session", { status: 401 });
			if (new URL(request.url).searchParams.get("close") !== "1")
				return new Response("fixture socket: give close=1", { status: 400 });
			ws.closeSession(String(session.session.id));
			return new Response("closed");
		});
	},
};
