// What the `node` plugin's handler module imports: docs/architecture/plugins/screens.md, "Single copies for plugin modules".
import {
	emptyOf,
	isPlain,
	noteUnanswered,
	type ScreenState,
	whenReleased,
} from "./answer.ts";

// A channel's fixture, by the channel's name: it takes the route params of the
// fixtures, since the `sub` frame carries none.
type ChannelFixture = (params: Record<string, string>) => unknown;

// The frame the `node` plugin's server sends and its client decodes (`ServerFrame`,
// `serverFrameSchema`). A channel has no frame of its own for its opening: it
// is one of its server messages, "snapshot" by the `channelRead` convention.
interface ChannelFrame {
	t: "msg";
	ch: string;
	type: string;
	payload: unknown;
}

// A fixture names the opening message with `{ type, payload }` (exactly those
// two keys, a string type); any other value is the payload of "snapshot".
function opening(value: unknown): { type: string; payload: unknown } {
	if (isPlain(value)) {
		const keys = Object.keys(value);
		if (
			keys.length === 2 &&
			keys.includes("type") &&
			keys.includes("payload") &&
			typeof value.type === "string"
		)
			return { type: value.type, payload: value.payload };
	}
	return { type: "snapshot", payload: value };
}

// What the socket does on a subscribe: docs/architecture/plugins/screens.md, "Channels".
type ChannelAnswer = { send: ChannelFrame } | { send?: undefined };

// One subscribe, answered for the story's state. Loading holds the frame until
// `release`, as it holds a query.
export async function channelAnswer(
	channel: string,
	channels: Record<string, ChannelFixture> | undefined,
	params: Record<string, string>,
	state: ScreenState,
): Promise<ChannelAnswer> {
	const fixture = channels?.[channel];
	if (!fixture) return leaveUnanswered(`no fixture for channel ${channel}`);
	if (state === "loading") await whenReleased();
	try {
		const { type, payload } = opening(fixture(params));
		return {
			send: {
				t: "msg",
				ch: channel,
				type,
				payload: state === "empty" ? emptyOf(payload) : payload,
			},
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return leaveUnanswered(
			`the fixture for channel ${channel} threw: ${message}`,
		);
	}
}

// A subscribe left unanswered: one unanswered call, one console error.
function leaveUnanswered(message: string): ChannelAnswer {
	noteUnanswered(message);
	return {};
}

// The story on screen, for the socket's one handler: a handler module is
// static and a socket belongs to the story that opened it. A story sets it as
// it renders.
interface Story {
	channels: Record<string, ChannelFixture> | undefined;
	params: Record<string, string>;
	state: ScreenState;
}

let story: Story = { channels: undefined, params: {}, state: "data" };

export function setStory(next: Story): void {
	story = next;
}

export function currentStory(): Story {
	return story;
}
