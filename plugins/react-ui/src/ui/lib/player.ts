import type { Peaks, Track } from "@fcalell/ui-core/descriptors";
import {
	type Engine,
	type Output,
	type PlayerCommands,
	type PlayerReport,
	type PlayerState,
	type PlayerTime,
	type PlayerView,
	type QueueProvider,
	type TrackQueue,
	type WindowQueueOptions,
	windowQueue,
} from "@fcalell/ui-core/player";
import { useSyncExternalStore } from "react";
import { store } from "./player-store.ts";

export type {
	Engine,
	Output,
	Peaks,
	PlayerCommands,
	PlayerReport,
	PlayerState,
	PlayerTime,
	PlayerView,
	QueueProvider,
	Track,
	TrackQueue,
	WindowQueueOptions,
};
export { windowQueue };

/** The player, from anywhere in the app (a handler, a loader): `player.play({ src, title, line })`. It plays through the output `connectOutput` was given, and a `Dock` in the `Shell`'s `foot` draws it; the store is the page's, so the sound goes on through navigation. */
export const player: PlayerCommands = store.player;

/** Passes the player its sound: `connectOutput(audioOutput())` once, before the app renders. The output is the app's, not the `Shell`'s, so a screen that plays without a `Dock` takes the same one. */
export const connectOutput: (engine: Engine) => void = store.connect;

/** The browser's audio element as the player's sound: one `Audio`, made when the first track loads and kept, so the sound goes on through navigation. */
export function audioOutput(): Engine {
	return (report) => {
		const audio = new Audio();
		audio.preload = "metadata";
		audio.addEventListener("timeupdate", report.time);
		audio.addEventListener("durationchange", report.time);
		audio.addEventListener("loadedmetadata", report.metadata);
		audio.addEventListener("play", () => report.state(true));
		audio.addEventListener("pause", () => {
			// A pause while the file loads is the element reloading, not a pause.
			if (audio.readyState > 0) report.state(false);
		});
		audio.addEventListener("volumechange", report.volume);
		audio.addEventListener("ended", report.ended);
		audio.addEventListener("error", report.failed);
		// The system's media controls (none in a browser without them) show the
		// loaded track, its name, its line and its picture once the store hands
		// it over, and act on the sound as the phone's lock screen does; previous
		// and next ask the store, which holds the queue.
		const session =
			"mediaSession" in navigator ? navigator.mediaSession : undefined;
		let shown: Track | undefined;
		const describe = (artwork: string | undefined) => {
			if (!session) return;
			session.metadata = shown
				? new MediaMetadata({
						title: shown.title,
						artist: shown.line ?? "",
						artwork: artwork ? [{ src: artwork }] : [],
					})
				: null;
		};
		const steps = (previous: boolean, next: boolean) => {
			session?.setActionHandler(
				"previoustrack",
				previous ? () => report.step("previous") : null,
			);
			session?.setActionHandler(
				"nexttrack",
				next ? () => report.step("next") : null,
			);
		};
		const output: Output = {
			load(track) {
				shown = track;
				describe(undefined);
				if (track) audio.src = track.src;
				else {
					audio.pause();
					audio.removeAttribute("src");
					audio.load();
				}
			},
			// The browser holds back sound that no press asked for: the track waits
			// paused.
			play() {
				audio.play().catch((error: unknown) => {
					const name = error instanceof DOMException ? error.name : "";
					if (name === "NotAllowedError") report.blocked();
					// An `AbortError` is a pause or a new source ending the pending play,
					// which the store asked for: no failure.
					else if (name !== "AbortError") report.failed();
				});
			},
			pause: () => audio.pause(),
			time: () => audio.currentTime,
			length: () =>
				Number.isFinite(audio.duration) ? audio.duration : undefined,
			ready: () => audio.readyState > 0,
			seek(to) {
				audio.currentTime = to;
			},
			paused: () => audio.paused,
			level: () => ({ volume: audio.volume, muted: audio.muted }),
			apply(volume, muted) {
				audio.volume = volume;
				audio.muted = muted;
			},
			cover: describe,
			steps,
		};
		session?.setActionHandler("play", () => output.play());
		session?.setActionHandler("pause", () => output.pause());
		session?.setActionHandler("seekto", (event) => {
			if (event.seekTime !== undefined) output.seek(event.seekTime);
		});
		return output;
	};
}

/** What the player holds and its commands, drawing again when the track, play state, volume or queue change (not each second: `usePlayerTime` is the clock). */
export function usePlayer(): PlayerView {
	return useSyncExternalStore(store.subscribe, store.view, store.view);
}

/** Where the loaded track stands, drawing again as it moves (on each frame while it plays). */
export function usePlayerTime(): PlayerTime {
	return useSyncExternalStore(store.subscribeClock, store.clock, store.clock);
}
