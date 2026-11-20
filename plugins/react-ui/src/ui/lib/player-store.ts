import { createPlayer, type PlayerHost } from "@slotform/ui-core/player";
import { saveChoice, savedChoice } from "./saved.ts";

const VOLUME_KEY = "slotform.player.volume";

// The web's side of the store (`createPlayer`, in ui-core): a viewer's volume is
// theirs from one visit to the next, a convenience, so a store that is blocked or
// empty falls back to full; the clock follows the animation frame.
const host: PlayerHost = {
	recall() {
		try {
			const saved: unknown = JSON.parse(savedChoice(VOLUME_KEY) ?? "null");
			if (
				typeof saved === "object" &&
				saved !== null &&
				"volume" in saved &&
				typeof saved.volume === "number" &&
				"muted" in saved &&
				typeof saved.muted === "boolean"
			)
				return {
					volume: Math.min(1, Math.max(0, saved.volume)),
					muted: saved.muted,
				};
		} catch {}
		return undefined;
	},
	keep(volume, muted) {
		saveChoice(VOLUME_KEY, JSON.stringify({ volume, muted }));
	},
	frame(run) {
		const id = requestAnimationFrame(run);
		return () => cancelAnimationFrame(id);
	},
};

/** The page's one player store: `lib/player` gives the app its commands and hooks, and the `Dock` hands it the cover it draws. Outside the package's exports. */
export const store = createPlayer(host);
