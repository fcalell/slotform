import type {
	Act,
	Fact,
	LinkAct,
	Route,
	RowLeading,
	Run,
	Runs,
} from "./descriptors.ts";
import type { RosterEntry } from "./shared.ts";
import { ANSWER, build, matrix } from "./shared.ts";

// A collection of messages: docs/architecture/ui-core/components.md, "Thread".
export const threadEntry: RosterEntry = {
	props: [
		"message",
		"items",
		"composer",
		"sheet",
		"replying",
		"reply",
		"empty",
	],
	draws: [
		"THREAD",
		"THREAD_COLUMN",
		"FOOT_DOCKED",
		"THREAD_LATEST",
		"STREAM_LATEST",
		"BLOCK_IN",
		"CHIP.family.neutral",
		"CHIP_LABEL.family.neutral",
		"IMAGE.fit.thumb",
		"IMAGE_PICTURE.fit.thumb",
		"MESSAGE_ATTACHMENTS",
		"ICON.fit.meta",
		"LINE_BOX.role.body",
		"LINE_BOX.role.meta",
		"MESSAGE",
		"MESSAGE_BUBBLE",
		"MESSAGE_HEAD",
		"MESSAGE_LINE",
		"MESSAGE_OPEN",
		"MESSAGE_ENTRY",
		"CARD",
		"MESSAGE_CODE",
		"MESSAGE_FOLD",
		"PAINT.kind.glyphs",
		"SCRAMBLE",
		"TEXT.role.body",
		"TEXT.role.meta",
		"TEXT.role.code",
		"TEXT_STRONG.role.body",
		"CHEVRON",
		"STREAM_IN",
		"BUTTON.act.primary",
		"BUTTON.act.secondary",
		"BUTTON_LABEL.act.primary",
		"BUTTON_LABEL.act.secondary",
		"CHIP.trailing.remove",
		"REMOVE_HIT",
		"FIELD.state.rest",
		"FIELD.trailing.none",
		"FIELD_VALUE.kind.text",
		"ICON.fit.control",
		"IMAGE_REMOVE",
		"IMAGE_REMOVE_DISC",
		"MESSAGE_ATTACH_REGION",
		"MESSAGE_INPUT",
		"MESSAGE_INPUT_BOX",
		"MESSAGE_INPUT_CHIPS",
		"MESSAGE_INPUT_FIELD_CHIPS",
		"MESSAGE_INPUT_FIELD_VALUE",
		"MESSAGE_INPUT_FOOT",
		"MESSAGE_INPUT_ROW",
		"MESSAGE_INPUT_TEXT",
		"MESSAGE_INPUT_VALUE",
		"MESSAGE_NOTICE",
		"MESSAGE_NOTICE_TEXT",
		"SPINNER",
		"SPINNER_ARC",
		"SPINNER_TRACK",
		"FLOW_IN",
	],
	states: [
		"rest",
		"loading",
		"empty",
		"error",
		"streaming",
		"hover",
		"focus",
		"active",
		"disabled",
	],
	motion: ["stream", "answer", "toggle", "block", "wait", "give", "flow"],
	owns: {
		colors: [
			"raised",
			"edge",
			"edge-raised",
			"ink-meta",
			"fill-neutral",
			"ink-body",
			"surface",
			"skeleton",
			"wash-hover",
			"ring",
			"wash-press",
			"chip-",
			"act-accent",
			"on-act-accent",
			"fill-disabled",
			"ink-disabled",
			"edge-hover",
			"chip-neutral-soft",
			"chip-neutral-ink",
		],
		radii: ["control", "card", "chip", "full"],
		spacing: ["section", "page", "gap", "pad"],
		sizes: [
			"icon-meta",
			"measure",
			"row",
			"target",
			"figures",
			"measure-short",
			"line-body",
			"control",
			"hairline",
			"icon-control",
			"icon",
		],
		elevation: ["float"],
		roles: ["meta", "body", "code", "caption"],
	},
};

// A file that goes with a message: a chip of its name, or, with `src` (an
// image's address), a thumbnail that opens full size.
export interface Attachment {
	id: string;
	// The file's name: the chip's label (a word; truncates past the short
	// measure, 20 characters), or a thumbnail's accessible name.
	name: string;
	src?: string;
}

// A sentence and an act under a message input.
export interface Notice {
	// What it says (a sentence; wraps).
	sentence: string;
	act?: Act | LinkAct;
}

// What stands under a system message's line, exactly one of three: `row`,
// what the line names as one list row in a hairline card, opening its record;
// `code`, a tool call's arguments in the code role under the line, its name;
// `fold`, lines (split on newlines) the line opens in place, its chevron
// turning down.
export type MessageDetail =
	| {
			row: {
				leading?: RowLeading;
				title: Run;
				facts?: readonly Fact[];
				line?: Run | Runs;
				href?: Route;
				onOpen?: () => void;
			};
			code?: never;
			fold?: never;
	  }
	| { code: string; row?: never; fold?: never }
	| { fold: string; row?: never; code?: never };

// One message of a thread, by its author: `you`, a bubble at the column's end;
// `other`, a reply read as Prose under its name; `system`, one line
// centred in the thread. A turn takes `name`, `attachments`, `from` and
// `streaming`; a system line takes `onOpen` and `detail`.
export type Message = {
	// What was said (text; wraps): plain text for `you` and `system`, markdown for `other`.
	body: string;
	// When it was said, an ISO moment: drawn as the time today, the day's word and the time a day either side, else the date and time (its year only when it is not this year's).
	at?: string;
} & (
	| {
			author: "you" | "other";
			// Who said it: drawn over `other`'s reply; yours draws none (a short phrase; wraps).
			name?: string;
			// What came with it, one row over the bubble or the reply: an attachment with `src` a thumbnail that opens full size, one without a chip of its name.
			attachments?: readonly Attachment[];
			// Where it came from ("via email", "Front desk"), joined by a middle dot before the time (each a short phrase; the line breaks between a part's words, never at a dot; a dot inside a part is text).
			from?: Runs;
			// The reply is still arriving: a marker left open at its end (an emphasis, a strong run, a code span, a link, a fence) is drawn in its own form from its first character, and its closing marker changes nothing already drawn; unset or `false`, an unmatched marker is text. Yours is always whole.
			streaming?: boolean;
			onOpen?: never;
			detail?: never;
	  }
	| {
			author: "system";
			// Opens what the line names: the line becomes the act, a chevron after it.
			onOpen?: () => void;
			// What stands under the line, one of three: a row in a hairline card that opens its record, a tool call's arguments in the code role, or lines the line opens in place (it takes no `onOpen` then).
			detail?: MessageDetail;
			name?: never;
			streaming?: never;
			attachments?: never;
			from?: never;
	  }
);

// A message by its author: yours and another's a pair over their parts, a
// system line a row at the target height.
export const MESSAGE = matrix({
	base: "",
	variants: {
		author: {
			you: "gap-gap",
			other: "gap-gap",
			system: "min-h-target",
		},
	},
});

export const message = build(MESSAGE);

// Message: yours in a bubble on the neutral fill; the name beside the time;
// a system line's words beside its time, wrapping; the line that opens, a
// pill at the target height with the pointer's washes. Under a system line,
// its card: one list row on a card (`CARD`); a tool call's code
// and its fold's lines start-aligned across the column at the pill's inset,
// the code in the meta ink, ranking under its name. Its attachments stand in
// one wrapping row a gap apart, over the bubble at the column's end (the
// `Thread`'s composer draws the same row over its text), and its provenance line
// (`from`) leads the time. A line and its card are one entry a pair apart, the
// label over its content.
export const MESSAGE_BUBBLE = "rounded-card bg-fill-neutral px-pad py-gap";
export const MESSAGE_HEAD = "gap-gap";
export const MESSAGE_LINE = "gap-x-gap";
export const MESSAGE_OPEN = `gap-gap rounded-control px-gap min-h-target text-ink-meta ${ANSWER}`;
export const MESSAGE_ATTACHMENTS = "gap-gap";
export const MESSAGE_ENTRY = "gap-gap";
export const MESSAGE_CODE = "px-gap text-ink-meta";
export const MESSAGE_FOLD = "px-gap";
// Thread's composer: the composer over its notice. On the desktop one box (the
// field's boundary at the card radius), its attachments, its text at the
// field's inset (capped at eight lines, scrolling past them) and its foot
// (attach, Stop while an answer comes, Send); its notice at the text's x. On
// touch one row (attach, the field at its bar fit growing upward, Stop's icon
// act at the bar fit while an answer comes, Send's icon act) and the notice's row under
// it in the same columns, its sentence at the field's text (the attach region
// held, the field's hairline counted).
export const MESSAGE_INPUT = "gap-gap";
export const MESSAGE_INPUT_BOX =
	"rounded-card border border-edge bg-surface p-gap";
export const MESSAGE_INPUT_CHIPS = "px-gap pt-gap";
// The text is the textarea itself, inset above and below by its value's own
// padding and beside by the text's (the touch field's own sides do that
// there), so a press anywhere on the text area lands on it.
export const MESSAGE_INPUT_TEXT = "px-gap";
// The text grows to eight body lines and its inset, then scrolls.
export const MESSAGE_INPUT_VALUE =
	"py-gap max-h-[calc(8*var(--spacing-line-body)+2*var(--spacing-gap))]";
export const MESSAGE_INPUT_FOOT = "gap-gap";
export const MESSAGE_INPUT_ROW = "gap-gap";
// The touch field holds no inset of its own above and below the text, which the
// text takes; its chips keep one above.
export const MESSAGE_INPUT_FIELD_CHIPS = "pt-gap";
// On touch the text is the field's one control, so it stands at the control's
// height, the touch target: it reaches across the box's border and its inset
// above and below centres one body line in the control, where the gap would
// leave it the border and the target's surplus short.
export const MESSAGE_INPUT_FIELD_VALUE =
	"-my-hairline py-[calc((var(--spacing-control)-var(--spacing-line-body))/2)]";
export const MESSAGE_NOTICE =
	"gap-gap pl-pad pr-gap border-x border-transparent";
export const MESSAGE_NOTICE_TEXT = "px-pad border-x border-transparent";
export const MESSAGE_ATTACH_REGION = "w-control";

// Thread's gap and composer column: docs/architecture/ui-core/layout.md, "Foot".
export const THREAD = "gap-section";

// The way back to the newest message, floating over the log a pair above the
// foot while the reader is scrolled up: a lifted ground under the secondary
// act's hairline, at its radius.
export const THREAD_LATEST = "mb-gap rounded-control bg-raised shadow-float";

// A thumbnail's remove act (an attachment's, in the `Thread`'s composer): a hit box
// the target's size (24, 44 on touch) a gap in from the thumbnail's corner
// (`IMAGE_REMOVE`), the `REMOVE_HIT` disc centred in it on the raised ground
// inside a hairline, the glyph a gap clear all round, so it stays legible over
// any picture (`IMAGE_REMOVE_DISC`).
export const IMAGE_REMOVE = "m-gap min-h-target min-w-target rounded-full";
export const IMAGE_REMOVE_DISC = "p-gap border border-edge bg-raised";

// A message that arrives at the end of a log: docs/architecture/ui-core/motion.md, "Navigate and stream".
export const STREAM_IN =
	"animate-[stream-in_var(--transition-duration-base)_var(--ease-out)_both]";
// The act back to the newest message: docs/architecture/ui-core/motion.md, "Navigate and stream".
export const STREAM_LATEST =
	"transition-[opacity,translate] duration-fast ease-out starting:opacity-0 starting:translate-y-gap data-[leaving]:ease-in data-[leaving]:opacity-0 data-[leaving]:translate-y-gap";
