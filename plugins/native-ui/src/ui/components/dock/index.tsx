import { trackTime } from "@slotform/ui-core/clock";
import { cn } from "@slotform/ui-core/cn";
import type { Track } from "@slotform/ui-core/descriptors";
import { dockSeek } from "@slotform/ui-core/player";
import { useSelections } from "@slotform/ui-core/react/read";
import { useWords } from "@slotform/ui-core/react/words";
import {
	DOCK,
	DOCK_BAR,
	DOCK_PROGRESS,
	DOCK_TEXT,
	DOCK_TIME,
	text,
	textStrong,
} from "@slotform/ui-core/variants";
import { shareOf } from "@slotform/ui-core/waveform";
import { useEffect, useState } from "react";
import { Text as RNText, View } from "react-native";
import { useHeldDraft } from "../../lib/act";
import { NOOP } from "../../lib/noop";
import { player, usePlayer, usePlayerTime } from "../../lib/player";
import { store } from "../../lib/player-store";
import { Press } from "../../lib/press";
import { Button } from "../button";
import { PictureTile } from "../image/base";
import { Sheet } from "../sheet";
import { SliderBase } from "../slider/base";
import { Waveform } from "../waveform";

// The dock is one bar above the tab bar, which keeps the home indicator clear:
// the picture and the name (a press on them opens the full player), play or
// pause and next; the progress is a hairline along its top, over the border.
const BAR = "flex-row items-center min-w-0";
const OPENER = "flex-row items-center gap-gap grow basis-0 min-w-0";
const WASH = "rounded-control bg-wash-press";
const TEXT = "grow basis-0 min-w-0";
const FAILED = "text-danger";
const TRANSPORT = "flex-row items-center shrink-0";
const HAIRLINE = "absolute inset-x-0 -top-hairline flex-row";
// The full player in the sheet: the picture over its seek over the transport
// and the way to put the player away.
const FULL = "items-center gap-stack";
const PROGRESS = "flex-row items-center gap-gap w-full min-w-0";
const SEEK = "grow basis-0 min-w-0";
const TIME = "shrink-0";
const ELAPSED = "text-right";

/** The player's dock, for a `Shell`'s `foot`: while a track is loaded, one bar above the tab bar with its picture, name, play or pause and next, and a hairline of progress along its top; a press on the bar opens a `Sheet` with the full player (the seek, previous, next and a way to close it). It draws what `player` holds and plays nothing itself (the app's `connectOutput` is the sound, and the lock screen's). */
export function Dock() {
	const state = usePlayer();
	const words = useWords();
	const [open, setOpen] = useState(false);
	const { track } = state;
	// The cover as the tile draws it is what the lock screen shows.
	const [cover] = useSelections([track?.image ?? ""]);
	useEffect(() => {
		if (track) store.cover(track, cover);
	}, [track, cover]);
	if (!track) return null;

	const toggle = (
		<Button
			glyph
			act="primary"
			icon={state.playing ? "Pause" : "Play"}
			label={state.playing ? words.pause : words.play}
			onAct={player.toggle}
		/>
	);
	const next = state.hasNext ? (
		<Button
			glyph
			icon="SkipForward"
			label={words.next}
			onAct={player.playNext}
		/>
	) : null;

	return (
		<View accessibilityLabel={words.player} className={DOCK}>
			<Hairline track={track} />
			<View className={cn(DOCK_BAR, BAR)}>
				<Press
					accessibilityRole="button"
					accessibilityLabel={track.title}
					onPress={() => setOpen(true)}
					wash={WASH}
					className={OPENER}
				>
					<PictureTile
						src={track.image ?? ""}
						alt={track.title}
						fit="mini"
						box={undefined}
					/>
					<View className={cn(DOCK_TEXT, TEXT)}>
						<RNText
							numberOfLines={1}
							className={cn(
								text({ role: "body" }),
								textStrong({ role: "body" }),
							)}
						>
							{track.title}
						</RNText>
						{state.failed ? (
							<RNText
								numberOfLines={1}
								className={cn(text({ role: "meta" }), FAILED)}
							>
								{words.playFailed}
							</RNText>
						) : track.line ? (
							<RNText numberOfLines={1} className={text({ role: "meta" })}>
								{track.line}
							</RNText>
						) : null}
					</View>
				</Press>
				<View className={TRANSPORT}>
					{toggle}
					{next}
				</View>
			</View>
			<Sheet
				open={open}
				onClose={() => setOpen(false)}
				title={track.title}
				description={state.failed ? words.playFailed : track.line}
			>
				<View className={FULL}>
					<PictureTile
						src={track.image ?? ""}
						alt={track.title}
						fit="thumb"
						box={undefined}
					/>
					<Progress track={track} />
					<View className={TRANSPORT}>
						{state.queued ? (
							<Button
								glyph
								icon="SkipBack"
								label={words.previous}
								onAct={player.playPrevious}
							/>
						) : null}
						{toggle}
						{next}
					</View>
					<Button
						act="secondary"
						label={words.close}
						onAct={() => {
							setOpen(false);
							player.close();
						}}
					/>
				</View>
			</Sheet>
		</View>
	);
}

// The progress along the bar's top: the played share in the toggle ink over the
// bar's border. The time is its own reader, so only this part draws again as the
// track moves.
function Hairline({ track }: { track: Track }) {
	const { time, duration } = usePlayerTime();
	const share = shareOf(time, dockSeek(track, duration).length);
	return (
		<View pointerEvents="none" className={HAIRLINE}>
			<View className={DOCK_PROGRESS} style={{ flexGrow: share }} />
			<View style={{ flexGrow: 1 - share }} />
		</View>
	);
}

// The elapsed time, the seek and the total: the seek is the track's waveform
// where it has peaks, else a slider.
function Progress({ track }: { track: Track }) {
	const words = useWords();
	const { time, duration } = usePlayerTime();
	const { length, peaks } = dockSeek(track, duration);
	return (
		<View className={PROGRESS}>
			<RNText className={cn(DOCK_TIME, TIME, ELAPSED)}>
				{trackTime(time)}
			</RNText>
			<View className={SEEK}>
				{peaks ? (
					<Waveform
						fit="bar"
						label={words.seek}
						peaks={peaks}
						duration={length}
						at={time}
						onSeek={player.seek}
					/>
				) : (
					<Seek time={time} length={length} />
				)}
			</View>
			<RNText className={cn(DOCK_TIME, TIME)}>{trackTime(length)}</RNText>
		</View>
	);
}

function Seek({ time, length }: { time: number; length: number }) {
	const words = useWords();
	const draft = useHeldDraft(Math.floor(time));
	return (
		<SliderBase
			bare
			label={words.seek}
			draft={draft}
			onChange={NOOP}
			onCommit={player.seek}
			min={0}
			max={Math.max(1, Math.floor(length))}
			step={1}
			said={trackTime}
		/>
	);
}
