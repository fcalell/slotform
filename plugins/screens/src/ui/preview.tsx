import Providers from "virtual:slotform-providers";
import { prefixes, previewGlobals } from "virtual:slotform-screens";
import type { Preview } from "@storybook/react-vite";
import { HttpNetworkFrame, WebSocketNetworkFrame } from "msw/experimental";
import { mswLoader } from "msw-storybook-addon/csf3";
import { mustBeMocked } from "./answer.ts";
import { RememberClient } from "./client.tsx";
import { applyGlobals, globalTypes, initialGlobals } from "./globals.ts";

// The URL an unanswered frame reaches for: a request's, or a socket's. MSW
// frames are those two kinds, so any other is unanswered wherever it goes.
function frameUrl(frame: unknown): string | null {
	if (frame instanceof HttpNetworkFrame) return frame.data.request.url;
	if (frame instanceof WebSocketNetworkFrame)
		return frame.data.connection.client.url.href;
	return null;
}

// The worker answers the app's procedures; a request or socket outside it that
// reaches for the network is an error, not a silent call.
async function startWorker() {
	const { setupWorker } = await import("msw/browser");
	const worker = setupWorker();
	await worker.start({
		quiet: true,
		serviceWorker: { url: "/mockServiceWorker.js" },
		async onUnhandledFrame({ frame, defaults }) {
			const url = frameUrl(frame);
			if (url !== null && !mustBeMocked(url, location.origin, prefixes)) return;
			// MSW 3's `defaults.error()` only prints; a rejection errors the frame.
			await defaults.error();
			throw new Error(`Unanswered call: ${url ?? frame.protocol}`);
		},
	});
	return worker;
}

const preview: Preview = {
	initialGlobals: initialGlobals(previewGlobals),
	globalTypes: globalTypes(previewGlobals),
	loaders: [mswLoader(startWorker)],
	decorators: [
		(Story, context) => {
			// What the plugins contribute (the design system's mode and density),
			// pinned on the root before the story's first paint.
			applyGlobals(document.documentElement, previewGlobals, context.globals);
			// Providers hold the query cache: a new one per story keeps one story's
			// answers from drawing the next.
			return (
				<Providers key={context.id}>
					<RememberClient />
					<Story />
				</Providers>
			);
		},
	],
};

export default preview;
