import type { IconName, RowMark, Runs } from "@fcalell/ui-core/descriptors";
import { splitFacts } from "@fcalell/ui-core/list-state";
import { filled, isCode, partRuns, partText } from "@fcalell/ui-core/runs";
import type { ChipFamily, Tone } from "@fcalell/ui-core/tokens";

// The words of a line of facts, free of any view: docs/architecture/plugins/native-ui.md, "Type-checking". No import here is relative.

// A list of facts as the badges a line draws: docs/architecture/ui-core/roster.md, "Facts".

/** What a badge draws: a status's tone mark, a warning, a lock, a chip's family dot, the required ring, a flag, a count's figure, or words alone, each with its words. */
type BadgeKind =
	| "status"
	| "warning"
	| "lock"
	| "chip"
	| "ring"
	| "flag"
	| "count"
	| "words";

/** One badge of a facts line. */
export interface BadgeSpec {
	kind: BadgeKind;
	/** The badge's accessible name: its words (a status's tone word where it draws none), the full text a badge cut with an ellipsis keeps. */
	name: string;
	/** The words the badge draws, as runs: a `{ code }` run stands in the mono, a `{ quoted }` one is whole, the badge's own line count cuts it. Empty while `painted`, and for a status with no word of its own. */
	runs: Runs;
	/** A status's tone, which its tone mark draws. */
	tone?: Tone;
	/** A chip's family: its dot, none for neutral. */
	family?: ChipFamily;
	/** A flag's glyph. */
	icon?: IconName;
	/** A lock's route: the badge is a link and takes the press itself. */
	href?: string;
	/** A count's figure, after its word. */
	count?: number;
	/** The badge is its filler: the loaded badge's box and glyph, its words a filler. */
	painted?: boolean;
}

/** What a list of facts draws, in the row's one reading. */
interface Badges {
	/** The badges of the facts line, in the order given. */
	badges: BadgeSpec[];
	/** The boolean marks that draw no words (`words: false`): their glyphs stand in the end group, each named by its label, and no badge of the line. */
	quiet: RowMark[];
}

/** What the facts are drawn with. */
interface BadgeInput {
	/** The facts, in the order given, each one fact; a placeholder (a fact that waits) is words. */
	facts: readonly unknown[];
	/** The word of a tone (`words[tone]`), for a status that gives none and the name of one that draws none. */
	word: (tone: Tone) => string;
	/** The row's lock reason; its badge follows the status, or leads the line where there is none. */
	lock?: string;
	/** The lock's route: a linked badge. */
	href?: string;
	/** A tick's blocked reason: the first badge, plain. */
	blocked?: string;
	/** The words are fillers (a fact waits): one painted badge per words fact, loaded or not. */
	fillers?: boolean;
	/** The whole row is painted: its status, warning and lock are boxes with fillers, and its chips and boolean marks, which the painted shape cannot know, are not drawn. */
	painted?: boolean;
}

const NONE: Runs = [];

const words = (runs: Runs): BadgeSpec => ({
	kind: "words",
	name: partText(runs),
	runs,
});

const filler = (kind: BadgeKind, spec: Partial<BadgeSpec> = {}): BadgeSpec => ({
	kind,
	name: "",
	runs: NONE,
	painted: true,
	...spec,
});

/** A list of facts as its badges, in the order given: a status (the first leads the list and the row's lock follows it; a further one is a badge of its own, its tone mark before its word), a warning, a chip, a boolean mark with words and each words fact one badge, a tick's blocked reason first. A fact with no text and a ring that does not hold draw nothing. */
export function badgesOf(input: BadgeInput): Badges {
	const { facts, word, lock, href, blocked, fillers, painted } = input;
	const badges: BadgeSpec[] = [];
	const parts = splitFacts(facts);
	let status = -1;
	for (const part of parts.facts) {
		if (part.kind === "status") {
			const { fact } = part;
			if (status < 0) status = badges.length;
			// A status with no word of its own (`label: ""`) is its mark alone.
			const said = fact.label ?? word(fact.tone);
			badges.push(
				painted
					? filler("status", { tone: "done" })
					: {
							kind: "status",
							tone: fact.tone,
							name: said || word(fact.tone),
							runs: said === "" ? NONE : [said],
						},
			);
		} else if (part.kind === "warning") {
			badges.push(
				painted
					? filler("warning")
					: { kind: "warning", name: part.fact, runs: [part.fact] },
			);
		} else if (part.kind === "chip") {
			if (painted) continue;
			const { fact } = part;
			badges.push({
				kind: "chip",
				family: fact.family,
				name: fact.label,
				runs: [fact.label],
			});
		} else if (part.kind === "mark") {
			if (painted) continue;
			const { fact } = part;
			badges.push(
				"ring" in fact
					? { kind: "ring", name: fact.label, runs: [fact.label] }
					: {
							kind: "flag",
							icon: fact.flag,
							name: fact.label,
							runs: [fact.label],
						},
			);
		} else if (fillers) {
			badges.push(filler("words"));
		} else if (filled(part.fact)) {
			badges.push(words(partRuns(part.fact)));
		}
	}
	if (lock !== undefined) {
		const at = status >= 0 ? status + 1 : 0;
		badges.splice(
			at,
			0,
			painted
				? filler("lock")
				: { kind: "lock", name: lock, runs: [lock], href },
		);
	}
	if (blocked !== undefined) badges.unshift(words([blocked]));
	return { badges, quiet: painted ? [] : parts.quiet };
}

/** The code a list of badges is when it is one lone `{ code }` run: a row's value in the mono, cut in its middle, no badge. */
export function loneCode(badges: readonly BadgeSpec[]): string | undefined {
	const [only] = badges;
	if (badges.length !== 1 || !only || only.kind !== "words" || only.painted)
		return undefined;
	const [run] = only.runs;
	return only.runs.length === 1 && run !== undefined && isCode(run)
		? run.code
		: undefined;
}
