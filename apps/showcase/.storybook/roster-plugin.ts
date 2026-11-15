import { createRequire } from "node:module";
import path from "node:path";
import type { Plugin } from "vite";
import { CELLS_FILE, FRAMES_DIR, writeStories } from "./roster.ts";

const require = createRequire(import.meta.url);

// ui-core's built roster and variants: a roster edit lands here.
const UI_CORE_DIST = path.dirname(require.resolve("@fcalell/ui-core/roster"));

// Rewrites the generated story modules when the roster, its cells or a frame
// drawer change; Storybook re-indexes the modules that changed.
export function rosterPlugin(): Plugin {
	return {
		name: "stack:roster-stories",
		configureServer(server) {
			const watched = [CELLS_FILE, FRAMES_DIR, UI_CORE_DIST];
			server.watcher.add(watched);
			let timer: ReturnType<typeof setTimeout> | undefined;
			const regenerate = (file: string) => {
				if (!watched.some((dir) => file.startsWith(dir))) return;
				clearTimeout(timer);
				timer = setTimeout(writeStories, 200);
			};
			for (const event of ["add", "change", "unlink"] as const)
				server.watcher.on(event, regenerate);
		},
	};
}
