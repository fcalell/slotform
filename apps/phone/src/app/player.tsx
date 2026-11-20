import { Pane } from "@slotform/native-ui/components/pane";
import { Section } from "@slotform/native-ui/components/section";
import { player, usePlayer } from "@slotform/native-ui/lib/player";
import type { Track } from "@slotform/ui-core/descriptors";

// Three tracks of the Soundhelix examples: the dock above the tab bar plays them
// through navigation, with the lock screen's controls.
const tracks: Track[] = [1, 2, 3].map((n) => ({
	src: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`,
	title: `Song ${n}`,
	line: "Soundhelix",
}));

export default function Player() {
	const playing = usePlayer().track?.src;
	return (
		<Pane>
			<Section
				title="Tracks"
				items={tracks.map((track) => ({
					key: track.src,
					title: track.title,
					facts: track.line ? [track.line] : [],
					leading: { icon: playing === track.src ? "Volume2" : "Play" },
					onOpen: () => player.play(track, tracks),
				}))}
			/>
		</Pane>
	);
}
