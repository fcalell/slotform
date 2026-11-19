import { createPlayer, type PlayerHost } from "@fcalell/ui-core/player";

// The phone's side of the store: docs/architecture/ui-core/sound.md, "Player".
const host: PlayerHost = {
	recall: () => undefined,
	keep: () => {},
	frame(run) {
		const id = requestAnimationFrame(run);
		return () => cancelAnimationFrame(id);
	},
};

/** The app's one player store: `lib/player` gives the app its commands and hooks, and the `Dock` hands it the cover it draws. Outside the package's exports. */
export const store = createPlayer(host);
