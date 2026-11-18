import { Dock } from "@fcalell/plugin-react-ui/components/dock";
import { connectOutput, player } from "@fcalell/plugin-react-ui/lib/player";
import type { Engine } from "@fcalell/ui-core/player";
import { useEffect } from "react";
import { MADE_DURATION, madePeaks, silence } from "../peaks.ts";
import { Column } from "./place.tsx";

// A sound that holds nothing, which fails when it is told to play if `failing`.
const still =
	(failing: boolean): Engine =>
	(report) => ({
		load: () => {},
		play: () => {
			if (failing) report.failed();
		},
		pause: () => {},
		time: () => 0,
		length: () => undefined,
		ready: () => false,
		seek: () => {},
		paused: () => true,
		level: () => ({ volume: 1, muted: false }),
		apply: () => {},
	});

// A track is loaded, paused a third in (`failing`: told to play and failed), for a dock to stand with; the player is the page's, so the scene puts it away when it goes.
export function useLoadedTrack(options: { image?: string; failing?: boolean }) {
	const { image, failing = false } = options;
	useEffect(() => {
		const src = silence(MADE_DURATION);
		const track = {
			src,
			title: "Midnight Run (Extended Mix)",
			line: "Kollektiv Turm",
			image,
			duration: MADE_DURATION,
			peaks: madePeaks(),
		};
		const queue = [track, { ...track, src: `${src}#next`, title: "Low Tide" }];
		connectOutput(still(failing));
		if (failing) player.play(track, queue);
		else {
			player.load(track, queue);
			player.seek(MADE_DURATION / 3);
		}
		return () => {
			player.close();
			URL.revokeObjectURL(src);
		};
	}, [image, failing]);
}

// A dock under a place's column, its track loaded with `image` (`failing`: told to play and failed).
export function Standing(props: { image?: string; failing?: boolean }) {
	useLoadedTrack(props);
	return (
		<Column>
			<Dock />
		</Column>
	);
}
