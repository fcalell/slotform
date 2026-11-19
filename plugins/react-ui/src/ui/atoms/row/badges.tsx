import { cn } from "@fcalell/ui-core/cn";
import type {
	ChipMark,
	RowMark,
	Run,
	StatusMark,
} from "@fcalell/ui-core/descriptors";
import type { PaintRole } from "@fcalell/ui-core/paint";
import { paintText } from "@fcalell/ui-core/paint";
import { useWords } from "@fcalell/ui-core/react/words";
import { isCode, partRuns } from "@fcalell/ui-core/runs";
import {
	BADGE,
	BADGE_LINE,
	BADGE_RING,
	BADGE_RING_CENTRE,
	BADGE_WORDS,
	chipDot,
	FIGURES,
	ITEM_PILL_ACT,
	text,
	YIELDS_LAST_EACH,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { CodeCut, RunText } from "../../lib/code.tsx";
import { follow } from "../../lib/navigate.ts";
import { PAINT_BOX } from "../../lib/paint.tsx";
import { IconBase } from "../icon/index.tsx";
import { StatusDot } from "../status/dot.tsx";
import { flagGlyph, warnGlyph } from "./marks.tsx";

// A badge is a flex box of its glyph and its words: the box never breaks, the
// words are cut inside it. A glyph is one box that keeps its size.
const FACE = "flex items-center";
const GLYPH = "flex shrink-0 items-center";
// A badge that links takes the pointer the line does not, above the row's hit,
// and rings inset as the hit does; its words are underlined so it reads as a
// link among plain facts.
const LINKED = "relative pointer-events-auto focus-visible:-outline-offset-2";
// A painted badge's parts: laid out at the loaded size, drawn to nothing.
const UNSEEN = "invisible select-none";
const LINK_WORDS = "underline decoration-ink-mark";

/** One fact in a box that never breaks inside: an optional `glyph` (the only part of a badge that carries colour), then its words, cut with an ellipsis inside the box where the line is out of room; the box is the meta text's line tall on the meta-ink soft ground (`BADGE`). With an `href` it is a link, named by its words; `painted` is its filler at the loaded badge's size. Outside the package's exports. */
export function Badge(props: {
	glyph?: ReactNode;
	children?: ReactNode;
	href?: string;
	/** A badge an element around it links: its words underlined, the hit box's washes on it (a record head's link fact keeps its target's hit box). */
	hit?: true;
	painted?: boolean;
	/** The filler's role and place while `painted`. */
	paint?: { role: PaintRole; at?: number };
}) {
	const { glyph, children, href, hit, painted, paint } = props;
	const linked = href !== undefined && !painted;
	const filler = paint ?? { role: "phrase" as const };
	// A painted badge is one bar: its box is the filler, and its glyph and its
	// words stand unseen at the loaded size, so no bar nests in a lighter box.
	const face = (
		<>
			{glyph ? (
				<span className={cn(GLYPH, painted && UNSEEN)}>{glyph}</span>
			) : null}
			{painted ||
			(children !== undefined && children !== null && children !== "") ? (
				<span
					aria-hidden={painted || undefined}
					className={cn(
						BADGE_WORDS,
						(linked || hit) && LINK_WORDS,
						painted && UNSEEN,
					)}
				>
					{painted ? paintText(filler.role, filler.at) : children}
				</span>
			) : null}
		</>
	);
	const box = cn(
		BADGE,
		FACE,
		text({ role: "meta" }),
		FIGURES,
		hit && ITEM_PILL_ACT,
		painted && PAINT_BOX,
	);
	if (!linked) return <span className={box}>{face}</span>;
	return (
		<a href={href} onClick={follow} className={cn(box, LINKED)}>
			{face}
		</a>
	);
}

/** A line of badges: whole badges, `badge` apart across and down, with no separator. `wrap` lets them wrap to the next line; without it they stand on one line and the last one is cut inside its badge when the line is out of room; only once it is gone do the earlier ones give way too, each cut inside its own badge with an ellipsis, never clipped flat at the line's edge. The line takes no pointer, a linked badge in it does. Outside the package's exports. */
export function BadgesLine(props: {
	wrap?: boolean;
	/** The line holds one line of badges and wraps (`row-two-line:`) where the row's container is narrower than its one-line form: the row's `adapts` form. */
	adapts?: boolean;
	className?: string;
	children: ReactNode;
}) {
	const { wrap = true, adapts = false, className, children } = props;
	return (
		<span
			className={cn(
				"flex items-center pointer-events-none",
				BADGE_LINE,
				// A line that does not wrap gives up its last badge first: it takes the
				// cut, and its words end in an ellipsis. Only when it is gone (a stub of
				// its box) and the earlier ones alone overflow do they give up too, each
				// cut by an ellipsis inside its own box, never clipped flat at the row's
				// edge.
				!wrap &&
					`flex-nowrap overflow-hidden ${YIELDS_LAST_EACH} [&>:last-child]:shrink`,
				adapts && "row-two-line:flex-wrap row-two-line:overflow-visible",
				className,
			)}
		>
			{children}
		</span>
	);
}

/** A boolean mark's glyph: the required ring outlined with its centre filled (never a chip's solid dot), or the flag's icon, in the meta ink. */
function MarkGlyph({ mark }: { mark: RowMark }) {
	if ("ring" in mark)
		return (
			<span aria-hidden className={cn("flex", BADGE_RING)}>
				<span className={BADGE_RING_CENTRE} />
			</span>
		);
	return flagGlyph(mark.flag);
}

/** A status's badge: its tone's mark (the dot, the running dots, the waiting ring), then its word, the tone's own word where it brings none. A status with an empty label is its mark alone, named by the tone's word. `painted` is the mark's box and a word's filler. */
export function StatusBadge(props: { status: StatusMark; painted?: boolean }) {
	const { status, painted } = props;
	const words = useWords();
	if (painted)
		return <Badge glyph={<StatusDot tone="done" painted />} painted />;
	const word = status.label ?? words[status.tone];
	return (
		<Badge
			glyph={
				<StatusDot
					tone={status.tone}
					label={word === "" ? words[status.tone] : undefined}
				/>
			}
		>
			{word}
		</Badge>
	);
}

export function WarningBadge(props: { warning: string; painted?: boolean }) {
	return (
		<Badge
			glyph={warnGlyph({ painted: props.painted })}
			painted={props.painted}
		>
			{props.warning}
		</Badge>
	);
}

/** A chip's badge: the family's dot (a neutral chip has none) and its value. */
export function ChipBadge({ chip }: { chip: ChipMark }) {
	return (
		<Badge
			glyph={
				chip.family === "neutral" ? null : (
					<span className={chipDot({ family: chip.family })} />
				)
			}
		>
			{chip.label}
		</Badge>
	);
}

/** A boolean mark with its words as a badge: the ring or the flag's icon and its label. A mark whose words are not drawn is no badge. */
export function MarkBadge({ mark }: { mark: RowMark }) {
	return <Badge glyph={<MarkGlyph mark={mark} />}>{mark.label}</Badge>;
}

/** A row's lock as a badge: the lock glyph and its reason, a link to what holds the fact with an `href`, inert without one. */
export function LockBadge(props: {
	reason: string;
	href?: string;
	painted?: boolean;
}) {
	return (
		<Badge
			glyph={
				<IconBase
					name="Lock"
					fit="meta"
					stroke="line"
					painted={props.painted}
				/>
			}
			href={props.href}
			painted={props.painted}
		>
			{props.reason}
		</Badge>
	);
}

/** Words as a badge: the runs of one fact, a `{ quoted }` run whole (its badge cuts it), a `{ code }` run in the mono. A fact that is one `{ code }` run (a branch, an id) is cut in its middle where the line is out of room, its tail standing whole, as a value is (`valueCut`): the end of an identifier is what tells it apart. */
export function WordsBadge({ fact }: { fact: Run }) {
	if (isCode(fact))
		return (
			<Badge>
				<CodeCut code={fact.code} />
			</Badge>
		);
	return (
		<Badge>
			<RunText runs={partRuns(fact)} fit="name" />
		</Badge>
	);
}
