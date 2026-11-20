import { channelAnswer, currentStory } from "@slotform/screens/channels";
import { ws } from "@slotform/screens/msw";
import type { ServerFrame } from "./ws/index.ts";

// The workbench's /ws handler: docs/architecture/plugins/node.md, "Screens serve".
const socket = ws.link("*/ws");

// The story is the `screens` plugin's one module-level selection: a handler reads it
// when a socket opens and again on each frame.
export default [
	// The error story's server is down: it closes the socket before it opens, as a
	// refused connection does. A socket that opened and closed on the subscribe
	// would resume the paused reads at every backoff retry, so they never settle.
	socket.addEventListener("connection", ({ client }) => {
		if (currentStory().state === "error") return client.close(1011, "error");
		client.addEventListener("message", async (event) => {
			if (typeof event.data !== "string") return;
			let frame: { t?: unknown; ch?: unknown };
			try {
				frame = JSON.parse(event.data);
			} catch {
				// A frame that is not JSON is no `sub`; the real server drops it too.
				return;
			}
			if (frame.t !== "sub" || typeof frame.ch !== "string") return;
			const { channels, params, state } = currentStory();
			const answer = await channelAnswer(frame.ch, channels, params, state);
			if (!answer.send) return;
			const reply: ServerFrame = answer.send;
			client.send(JSON.stringify(reply));
		});
	}),
];
