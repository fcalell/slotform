import { channel } from "node:diagnostics_channel";

// Where the worker says a session is over: docs/architecture/plugins/auth.md, "Session end".
export const SESSION_ENDED_CHANNEL = "stack:auth:session-ended";

const ended = channel(SESSION_ENDED_CHANNEL);

export function publishSessionEnded(session: {
	id: string;
	userId: string;
}): void {
	if (!ended.hasSubscribers) return;
	ended.publish({ sessionId: session.id, userId: session.userId });
}
