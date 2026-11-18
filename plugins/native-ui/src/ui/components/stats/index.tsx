import { cn } from "@fcalell/ui-core/cn";
import type { StatSpec } from "@fcalell/ui-core/descriptors";
import { formatterFor } from "@fcalell/ui-core/format";
import { useRow, useSelections } from "@fcalell/ui-core/react/read";
import { useWords } from "@fcalell/ui-core/react/words";
import {
	type Datum,
	endedSentence,
	isEnded,
	paints,
} from "@fcalell/ui-core/read";
import {
	STATS,
	STATS_CELL,
	STATS_EDGE,
	STATS_FIGURE,
	STATS_OPENS,
	text,
} from "@fcalell/ui-core/variants";
import { Pressable, Text as RNText, View } from "react-native";
import { Icon } from "../../atoms/icon";
import { CountLinks } from "../../atoms/stats/count-links";
import { Meter } from "../../atoms/stats/meter";
import type { Closed } from "../../lib/closed";
import { Ink } from "../../lib/ink";
import { navigate, useWarm } from "../../lib/navigate";
import { inertProps } from "../../lib/paint";
import { HIT } from "../../lib/press";
import { FailedMark, RetryMark } from "../../lib/read";
import { Decoded } from "../../lib/region";

const CLIP = "overflow-hidden";
// Each cell draws its own top and start hairline; the card's edge is drawn over
// them, so the outer ones are the edge's own.
const CELLS = "flex-row flex-wrap";
// Two to a row.
const CELL = "min-w-0 grow basis-1/2";
// The label and, where the cell opens, its chevron at the end of the label's
// first line.
const LABEL_LINE = "flex-row items-start gap-gap";
const FIGURE = "flex-row items-baseline";
// A failed cell's figure region: its marks, a target tall, at the cell's start.
const FAILED_FIGURE = "flex-row items-center min-h-target";
// An ended figure an enclosing frame holds keeps its region, drawn nothing.
const UNSEEN = "opacity-0";

/** A cell: a `StatSpec` whose figure is a constant or a selection. */
export type StatsItem = StatSpec extends infer S
	? S extends StatSpec
		? Omit<S, "value" | "bound" | "label"> & {
				value: Datum<number>;
			} & (S extends { bound: number }
					? { label: Datum<string>; bound: Datum<number> }
					: { label: string; bound?: never })
		: never
	: never;

export interface StatsProps extends Closed {
	/** The cells, in order: each a label over its figure, or a share of its `bound` drawn as a meter (its label a selection too). A cell whose `value` or `bound` is a selection paints its figure, and takes no touch, until its read lands. */
	items: readonly StatsItem[];
}

const number = formatterFor("number");

// A cell without a bound: its label over its figure. It is the frame of the selection it
// draws: docs/architecture/ui-core/reads.md, "What a frame draws".
function Cell({
	item,
	at,
}: {
	item: Extract<StatsItem, { bound?: never }>;
	at: number;
}) {
	const words = useWords();
	const warm = useWarm();
	const [figure] = useSelections([item.value]);
	const { ended: held, busy, retry } = useRow([item.value]);
	const painted = paints(figure);
	const ended = figure.painted && isEnded(figure.phase);
	const { href } = item;
	const { label } = item;
	return (
		<View {...inertProps(painted)} className={cn(STATS_CELL, CELL)}>
			<View className={LABEL_LINE}>
				<RNText className={cn(text({ role: "meta" }), "shrink")}>
					{label}
				</RNText>
				{href !== undefined && !painted && !held ? (
					<View className={STATS_OPENS}>
						<Ink.Provider value="ink-mark">
							<Icon name="ChevronRight" fit="meta" />
						</Ink.Provider>
					</View>
				) : null}
			</View>
			<View className={cn(STATS_FIGURE, held ? FAILED_FIGURE : FIGURE)}>
				{held ? null : ended ? (
					// An ended read an enclosing frame holds keeps the figure's region, drawn
					// nothing; a failed cell's marks stand flush at the cell's start.
					<RNText className={cn(text({ role: "figure" }), UNSEEN)}>0</RNText>
				) : (
					<Decoded
						role="figure"
						at={at}
						painted={painted}
						text={figure.painted ? undefined : number.format(figure.value)}
						of={figure.painted ? undefined : figure.value}
						className={cn(text({ role: "figure" }), "shrink-0")}
					/>
				)}
				{held ? (
					<>
						<FailedMark />
						{held === "failed" ? <RetryMark busy={busy} /> : null}
					</>
				) : item.unit ? (
					<RNText className={cn(text({ role: "meta" }), "shrink")}>
						{item.unit}
					</RNText>
				) : null}
			</View>
			{held ? (
				<RNText className={text({ role: "meta" })}>
					{endedSentence(words, held)}
				</RNText>
			) : (
				<>
					{item.line ? (
						<RNText className={text({ role: "meta" })}>{item.line}</RNText>
					) : null}
					{item.counts ? <CountLinks counts={item.counts} /> : null}
				</>
			)}
			{held === "failed" ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={`${words.retry} ${label}`}
					onPress={() => {
						if (!busy) void retry();
					}}
					className={HIT}
				/>
			) : href !== undefined && !painted ? (
				<Pressable
					accessibilityRole="link"
					accessibilityLabel={label}
					onPressIn={() => warm(href)}
					onPress={() => navigate(href)}
					className={HIT}
				/>
			) : null}
		</View>
	);
}

// One hairline card of counts split by hairlines, each cell its label in meta
// over its figure in tabular figures (its unit muted beside it), then a
// `line` or sub-counts as links, or the whole cell a link to its list, a chevron at its label's end. Zeros are
// drawn. Two cells to a row. A cell that is a link takes its press on a hit
// laid last over it, so it stands on top of the cell's text. Each cell is the
// frame of the selection it draws.
export function Stats({ items }: StatsProps) {
	return (
		<View className={cn(STATS, CLIP)}>
			<View className={CELLS}>
				{items.map((item, at) =>
					item.bound !== undefined ? (
						<View key={at} className={cn(STATS_CELL, CELL)}>
							<Meter
								label={item.label}
								value={item.value}
								max={item.bound}
								mark={item.mark}
								goal={item.goal}
								line={item.line}
								counts={item.counts}
								at={at}
							/>
						</View>
					) : (
						<Cell key={at} item={item} at={at} />
					),
				)}
			</View>
			<View pointerEvents="none" className={STATS_EDGE} />
		</View>
	);
}
