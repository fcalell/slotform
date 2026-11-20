import { createRequire } from "node:module";
import path from "node:path";
import type { Plugin } from "vite";
import { CLASS_SETS_FILE, SCENES_DIR, writeStories } from "./roster.ts";

const require = createRequire(import.meta.url);

// ui-core's built roster and variants: a roster edit lands here.
const UI_CORE_DIST = path.dirname(require.resolve("@slotform/ui-core/roster"));

// Rewrites the generated story modules when the roster, its class sets or a scene
// drawer change; Storybook re-indexes the modules that changed.
export function rosterPlugin(): Plugin {
	return {
		name: "slotform:roster-stories",
		configureServer(server) {
			const watched = [CLASS_SETS_FILE, SCENES_DIR, UI_CORE_DIST];
			server.watcher.add(watched);
			let timer: ReturnType<typeof setTimeout> | undefined;
			const regenerate = (file: string) => {
				if (!watched.some((dir) => file.startsWith(dir))) return;
				clearTimeout(timer);
				timer = setTimeout(() => {
					// A roster that does not load (a syntax error, a half-built dist) keeps
					// the stories it last wrote; the next save that loads rewrites them.
					try {
						writeStories();
					} catch (error) {
						server.config.logger.error(
							`Roster stories not rewritten: ${error instanceof Error ? error.message : String(error)}`,
						);
					}
				}, 200);
			};
			for (const event of ["add", "change", "unlink"] as const)
				server.watcher.on(event, regenerate);
		},
	};
}
