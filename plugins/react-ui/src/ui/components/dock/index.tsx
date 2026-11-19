import { trackTime } from "@fcalell/ui-core/clock";
import { cn } from "@fcalell/ui-core/cn";
import type { Track } from "@fcalell/ui-core/descriptors";
import { dockSeek, shortcut } from "@fcalell/ui-core/player";
import { useSelections } from "@fcalell/ui-core/react/read";
import { useWords } from "@fcalell/ui-core/react/words";
import {
	DOCK,
	DOCK_BAR,
	DOCK_TEXT,
	DOCK_TIME,
	DOCK_VOLUME,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { useEffect } from "react";
import { useHeldDraft } from "../../lib/act.ts";
import { useTouch } from "../../lib/media.ts";
import { NOOP } from "../../lib/noop.ts";
import { player, usePlayer, usePlayerTime } from "../../lib/player.ts";
import { store } from "../../lib/player-store.ts";
import { Button } from "../button/index.tsx";
import { PictureTile } from "../image/base.tsx";
import { SliderBase } from "../slider/base.tsx";
import { Waveform } from "../waveform/index.tsx";

// The dock is a column of bars (two on touch) under the place, clear of the
// bottom safe inset.
const COLUMN = "flex flex-col pb-safe";
const BAR = "flex items-center min-w-0";
// The bar's zones share its width by flex: the name's and, on the desktop, the
// seek's, each the same basis, so the transport between them stands at the
// bar's centre.
const ZONE = "flex items-center gap-gap grow basis-0 min-w-0";
const TEXT = "flex flex-col grow basis-0 min-w-0";
const LINE = "truncate";
const FAILED = "text-danger";
const SEEK = "grow basis-0 min-w-0";
const TIME = "shrink-0";
const ELAPSED = "text-end";
const VOLUME = "flex items-center shrink-0";
const TRANSPORT = "flex items-center shrink-0";

// Space and the horizontal arrows are the page's: docs/architecture/ui-core/sound.md, "Dock keys".
const TEXT_INPUTS = new Set([
	"text",
	"search",
	"email",
	"url",
	"tel",
	"password",
	"number",
	"date",
	"datetime-local",
	"month",
	"time",
	"week",
]);
const PRESSED =
	'button, a[href], summary, select, input:not([type="range"]), [role="button"], [role="link"], [role="switch"], [role="checkbox"], [role="radio"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="tab"], [role="option"], [role="treeitem"]';
const ARROWED =
	'select, input, textarea, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="textbox"], [role="combobox"], [role="listbox"], [role="menu"], [role="menubar"], [role="tablist"], [role="tree"], [role="grid"], [role="radiogroup"], [role="spinbutton"], [role="scrollbar"]';

function typing(target: Element): boolean {
	if (target instanceof HTMLElement && target.isContentEditable) return true;
	if (target instanceof HTMLTextAreaElement) return true;
	return target instanceof HTMLInputElement && TEXT_INPUTS.has(target.type);
}

/** The key, if the player takes it where focus stands. */
function taken(event: KeyboardEvent) {
	if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey)
		return undefined;
	const target = event.target instanceof Element ? event.target : null;
	if (target && typing(target)) return undefined;
	const key = shortcut(event.key, event.shiftKey);
	if (!key) return undefined;
	if (target?.closest(key.to === "toggle" ? PRESSED : ARROWED))
		return undefined;
	return key;
}

/** The player's dock, for a `Shell`'s `foot`: while a track is loaded, its name, transport, seek and volume under the place. It draws what `player` holds and plays nothing itself (the app's `connectOutput` is the sound), takes Space and the horizontal arrows anywhere that is not typing or a control that takes them. The system's media controls are the output's (`audioOutput`). */
export function Dock() {
	const state = usePlayer();
	const touch = useTouch();
	const words = useWords();
	const { track } = state;
	// The cover as the tile draws it is what the system's media controls show.
	const [cover] = useSelections([track?.image ?? ""]);
	useEffect(() => {
		if (track) store.cover(track, cover);
	}, [track, cover]);
	useEffect(() => {
		if (!track) return;
		const onKey = (event: KeyboardEvent) => {
			const key = taken(event);
			if (!key) return;
			event.preventDefault();
			if (key.to === "toggle") player.toggle();
			else player.skip(key.by);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [track]);

	if (!track) return null;

	const transport = (
		<div className={TRANSPORT}>
			{state.queued ? (
				<Button
					glyph
					icon="SkipBack"
					label={words.previous}
					onAct={player.playPrevious}
				/>
			) : null}
			<Button
				glyph
				act="primary"
				icon={state.playing ? "Pause" : "Play"}
				label={state.playing ? words.pause : words.play}
				onAct={player.toggle}
			/>
			{state.hasNext ? (
				<Button
					glyph
					icon="SkipForward"
					label={words.next}
					onAct={player.playNext}
				/>
			) : null}
		</div>
	);
	const close = (
		<Button glyph icon="X" label={words.close} onAct={player.close} />
	);
	const progress = <Progress track={track} />;

	return (
		<aside aria-label={words.player} className={cn(DOCK, COLUMN)}>
			<div className={cn(DOCK_BAR, BAR)}>
				<div className={ZONE}>
					<PictureTile
						src={track.image ?? ""}
						alt={track.title}
						fit="mini"
						box={undefined}
					/>
					<div className={cn(DOCK_TEXT, TEXT)}>
						<span
							className={cn(
								text({ role: "body" }),
								textStrong({ role: "body" }),
								LINE,
							)}
						>
							{track.title}
						</span>
						{state.failed ? (
							<span className={cn(text({ role: "meta" }), LINE, FAILED)}>
								{words.playFailed}
							</span>
						) : track.line ? (
							<span className={cn(text({ role: "meta" }), LINE)}>
								{track.line}
							</span>
						) : null}
					</div>
				</div>
				{transport}
				{touch ? (
					close
				) : (
					<div className={ZONE}>
						{progress}
						<Volume />
						{close}
					</div>
				)}
			</div>
			{touch ? <div className={cn(DOCK_BAR, BAR)}>{progress}</div> : null}
		</aside>
	);
}

// The elapsed time, the seek and the total: the seek is the track's waveform
// where it has peaks, else a slider. The time is its own reader, so only this
// part draws again as the track moves.
function Progress({ track }: { track: Track }) {
	const words = useWords();
	const { time, duration } = usePlayerTime();
	const { length, peaks } = dockSeek(track, duration);
	return (
		<div className={ZONE}>
			<span className={cn(DOCK_TIME, TIME, ELAPSED)}>{trackTime(time)}</span>
			<div className={SEEK}>
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
			</div>
			<span className={cn(DOCK_TIME, TIME)}>{trackTime(length)}</span>
		</div>
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

function Volume() {
	const state = usePlayer();
	const words = useWords();
	const shown = state.muted ? 0 : Math.round(state.volume * 100);
	const draft = useHeldDraft(shown);
	return (
		<div className={VOLUME}>
			<Button
				glyph
				icon={state.muted || shown === 0 ? "VolumeX" : "Volume2"}
				label={state.muted ? words.unmute : words.mute}
				onAct={() => player.mute()}
			/>
			<div className={DOCK_VOLUME}>
				<SliderBase
					bare
					label={words.volume}
					draft={draft}
					onChange={(value) => player.setVolume(value / 100)}
					min={0}
					max={100}
					step={5}
					unit="percent"
				/>
			</div>
		</div>
	);
}
