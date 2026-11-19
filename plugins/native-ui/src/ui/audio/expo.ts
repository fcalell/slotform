import type { Engine } from "@fcalell/ui-core/player";
import {
	type AudioMetadata,
	type AudioStatus,
	createAudioPlayer,
	setAudioModeAsync,
} from "expo-audio";

import { NOOP } from "../lib/noop";

/**
 * `expo-audio` as the player's sound: one audio player, made when the first track loads and kept, so the sound goes on through navigation, in the background and on the lock screen (play, pause and seek; `expo-audio` does not report the system's Next and Previous). Pass it to `connectOutput` once: `connectOutput(audioOutput())`. The app adds `expo-audio` and its config plugin itself.
 */
export function audioOutput(): Engine {
	return (report) => {
		const sound = createAudioPlayer(null, {
			updateInterval: 250,
			keepAudioSessionActive: true,
		});
		void setAudioModeAsync({
			playsInSilentMode: true,
			shouldPlayInBackground: true,
			interruptionMode: "doNotMix",
		});
		// A source that has not answered yet: the player's own pause while the file
		// loads is the load, not a pause.
		let fresh = true;
		// Whether the store wants sound, as it last told the output.
		let wanted = false;
		// What the lock screen shows of the loaded track, beside its picture.
		let shown: AudioMetadata | undefined;
		sound.addListener("playbackStatusUpdate", (status: AudioStatus) => {
			if (status.error) {
				report.failed();
				return;
			}
			if (!status.isLoaded) return;
			if (fresh) {
				// The file answered: a seek made before it lands, and a track the store
				// wants playing starts, this status being the load's.
				fresh = false;
				report.metadata();
				if (wanted) sound.play();
				return;
			}
			report.time();
			if (status.didJustFinish) {
				report.ended();
				return;
			}
			// The sound is the truth about whether it runs: the system's controls or an
			// interruption may pause it.
			if (!status.isBuffering) report.state(status.playing);
		});
		return {
			load(track) {
				wanted = false;
				if (!track) {
					sound.pause();
					sound.clearLockScreenControls();
					shown = undefined;
					sound.replace(null);
					return;
				}
				fresh = true;
				sound.replace({ uri: track.src });
				shown = { title: track.title, artist: track.line };
				// The picture comes with `cover`, once the store has it.
				sound.setActiveForLockScreen(true, shown, {
					showSeekBackward: true,
					showSeekForward: true,
				});
			},
			play() {
				wanted = true;
				sound.play();
			},
			pause() {
				wanted = false;
				sound.pause();
			},
			time: () => sound.currentTime,
			length: () =>
				sound.isLoaded && Number.isFinite(sound.duration) && sound.duration > 0
					? sound.duration
					: undefined,
			ready: () => sound.isLoaded,
			seek(to) {
				// A seek the sound refuses (not loaded yet, or released) leaves the
				// time where it stood, which the player reads back every frame.
				sound.seekTo(to).catch(NOOP);
			},
			paused: () => !sound.playing,
			level: () => ({ volume: sound.volume, muted: sound.muted }),
			apply(volume, muted) {
				sound.volume = volume;
				sound.muted = muted;
			},
			// The system fetches the lock screen's picture itself, from an address
			// alone.
			cover(address) {
				if (shown)
					sound.updateLockScreenMetadata({ ...shown, artworkUrl: address });
			},
			// `expo-audio` reports no system Next or Previous: those two are the dock's.
			steps: () => {},
		};
	};
}
