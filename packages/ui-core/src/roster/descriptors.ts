// The descriptors more than one component takes; `../descriptors.ts` re-exports
// them.
import type { IconName } from "../icon-name.ts";
import type { ChipFamily, Tone } from "../tokens.ts";

// What every act is: docs/architecture/ui-core/acts.md, "Act model".
export interface ActBase {
	onAct: () => unknown;
}

// A labelled text act, 44 px, with an optional `blocked` reason drawn under
// it. `destructive` marks an act that removes or ends something: an
// `ActionBar` draws it as `danger` when it is the bar's filled act and as
// `destructive` (the hairline form) otherwise. A promise its `onAct`
// returns keeps the bar's filled act pending until it settles.
export interface Act extends ActBase {
	// The act's visible text (a short phrase; truncates); the accessible name where only the `icon` draws.
	label: string;
	// The glyph a slot draws with the label, or alone where it is icon-only.
	icon?: IconName;
	// Why the act cannot run (a sentence; wraps).
	blocked?: string;
	destructive?: boolean;
	// A quiet act: words in the meta ink with no hairline (a resend). An
	// `ActionBar` draws it so unless it is the bar's filled act.
	quiet?: boolean;
	// Asked before `onAct` runs, as a decision over the page (the act's own
	// label and `destructive` on the decision's act); declined, nothing runs.
	confirm?: Decision;
	// A sentence toasted once `onAct` resolves. A rejection toasts the
	// error's sentence as a failed toast, as without it.
	done?: string;
	// An href the router goes to once `onAct` resolves, after its `done` is
	// toasted: the route a LinkAct would go to.
	to?: string;
}

// An act that goes to a route: docs/architecture/ui-core/acts.md, "Link acts".
export interface LinkAct {
	// The link's visible text (a short phrase; truncates).
	label: string;
	icon?: IconName;
	href: Route;
	// Why the link cannot be followed (a sentence; wraps): it draws inert, with this reason, as a blocked act does.
	blocked?: string;
}

export type IconAct = Act & { icon: IconName };

export type IconLinkAct = LinkAct & { icon: IconName };

// A run of text: docs/architecture/ui-core/words.md, "Text runs".
export type Run =
	| string
	| { quoted: string }
	| { code: string }
	| { strong: string };

// Runs together are one line of text: a sentence wraps, a row's title truncates
// at its end.
export type Runs = readonly Run[];

// A status: docs/architecture/ui-core/roster.md, "Status and chips".
export interface StatusMark {
	tone: Tone;
	// The tone's word (a word; truncates when its line is out of room), when the tone's own word does not say it.
	label?: string;
}

// A value's tag: docs/architecture/ui-core/roster.md, "Status and chips".
export interface ChipMark {
	family: ChipFamily;
	// The value (a word; truncates past the short measure, 20 characters).
	label: string;
}

// One filter of a toolbar, which draws it as a `Picker` while the toolbar
// holds two or fewer filters on the desktop, and folds all of them behind one
// Filters act at three or more there (`FOLD_FILTERS_AT`) and at touch whatever
// their count, a removable chip for each one set. A
// pick is set while `value` is a string (unset, or on the `null` option, the
// empty choice, it is not; its empty value is `null`), a pick of several while
// it holds any (its empty value `[]`); the toolbar's pick of several carries
// `several: true`.
export type ToolbarFilter<V extends string | null = string> =
	| OptionPick<V>
	| (MultiPick<V> & { several: true });

// `V` narrows the value to an enum's literals, so a `Picker` over them
// picks that enum. An option whose value is `null` is the empty choice (a
// "Not set"), and it is the only way `null` joins `V`: a pick is nullable
// because its options offer the empty choice, never by a flag.
// An option's `leading` is a row's leading (`RowLeading`) of the three kinds a
// picker draws. A `{ tone }` is a work state: a pick over such options is a
// status that moves, its options and its value drawn as the status (its dot
// beside `label`). An `{ avatar }` stands for a person or a workspace: its
// avatar, drawn from the avatar's `name` (its initials) or `src`, leads it. An
// `{ icon }` leads with its glyph (a sort's direction), in the trigger too. An
// option takes one leading form.
// An option carrying `chip` draws it after its label, in the list and on the
// trigger: the option's kind (a context's Draft, Ready), where a `{ tone }`
// leading is a work state that moves.
// An option carrying `blocked` cannot be chosen while it is not in the value:
// its reason replaces its `line` under the label, both in the disabled
// ink. In the value it draws and acts as any chosen option, so it stays
// removable.
export interface Option<V extends string | null = string> {
	value: V;
	// The option's text (a short phrase; truncates; a row pick's value holds a word, truncating past the short measure, 20 characters).
	label: string;
	// Under the label (a short phrase; truncates).
	line?: string;
	recommended?: boolean;
	// The option's start: a glyph, a status's mark or an avatar.
	leading?: OptionLeading;
	chip?: ChipMark;
	// Why the option cannot be chosen (a short phrase; truncates).
	blocked?: string;
}

// Options under a group label, in a `Picker`'s list and its searchable sheet.
export interface OptionGroup<V extends string | null = string> {
	// The group's heading (a short phrase; truncates).
	label: string;
	options: Option<V>[];
}

export interface LinkSegment {
	href: string;
	label: string;
	value?: never;
}

// A list row's leading: docs/architecture/ui-core/layout.md, "Leading".
export type RowLeading =
	| {
			icon: IconName;
	  }
	| StatusMark
	// The avatar's `name` is a short phrase: read aloud, only its initials draw.
	| { avatar: { name: string; src?: string } }
	// A type's mark: one or two characters in the family's hue (`T`, `#`, `[ ]`,
	// `{ }`, `?`), in the code face at the caption size on the family's soft
	// ground, in a small box its slot centres.
	// `label` is the type's name ("Text", "Number"): the mark's accessible name and tooltip; without it the mark is decorative and hidden from assistive tech.
	| { mark: string; family: ChipFamily; label?: string }
	| {
			check: {
				checked: boolean;
				onChange: (checked: boolean) => void;
				// Why the row cannot be ticked (a short phrase; it leads the row's
				// facts, which truncate).
				blocked?: string;
			};
	  };

// The leading kinds a picker's option draws: a glyph, a status's mark, an avatar.
export type OptionLeading = Extract<
	RowLeading,
	{ icon: IconName } | { tone: Tone } | { avatar: unknown }
>;

// A boolean mark, named by its `label`. A `ring` is the required ring: an
// outlined circle at the dot's size, filled when `ring` is true. A `flag` is a
// glyph from the icon set for a fact that is true of the record (a "Personal
// data"): give it only while it holds. The label is drawn as the mark's words,
// beside the glyph; with `words: false` it is not drawn: the glyph alone stands
// where the component keeps a quiet mark (a row's end group, before the
// trailing value; the end of a record head's name line), and the label is its
// accessible name and its tooltip, so a quiet mark (provenance, a kind) carries
// its meaning without taking a line.
export type RowMark =
	| { ring: boolean; label: string; words?: false }
	| { flag: IconName; label: string; words?: false };

// A fact: docs/architecture/ui-core/roster.md, "Facts".
export type Fact = Run | StatusMark | ChipMark | { warning: string } | RowMark;

// A pick that applies at once where a value stands (a row's trailing, a
// record's status fact, a toolbar's filter, the shell's switcher between a
// workspace and an account), drawn as a `Picker` at the row fit. A promise
// `onChange` returns holds the viewer's pick while it pends; a refusal puts
// it back, with its reason.
export interface OptionPick<V extends string | null = string> {
	// Tells it from a pick of several (see `MultiPick`).
	several?: false;
	// What is picked, the trigger's name (a short phrase; read aloud, never drawn on the trigger; in a toolbar the field's label in the folded panel and the lead of its chip, "Work type: Change").
	label: string;
	// The hint drawn while nothing is chosen (a short phrase; truncates).
	placeholder?: string;
	options: readonly Option<V>[] | readonly OptionGroup<V>[];
	value?: NoInfer<V>;
	onChange: (value: NoInfer<V>) => unknown;
	// The act that makes a new option, ending the list under a hairline: an act that runs, or a link to where it is made.
	act?: IconAct | IconLinkAct;
}

// A pick of several: the options ticked in the list, which stays open while
// the viewer picks, and the chosen ones drawn as removable chips (in a rule's
// row, one chip for one value and from two a token naming how many). Its
// empty value is `[]`.
export interface MultiPick<V extends string | null = string> {
	// Tells it from a pick of one, so an inline `onChange` reads its value's type
	// from the entry it stands in (a toolbar's filter requires it).
	several?: true;
	// What is picked, the trigger's name (a short phrase; read aloud, and in a rule's row the noun of the folded count, its first letter lowercased: "5 projects").
	label: string;
	// The hint drawn while nothing is chosen (a short phrase; truncates).
	placeholder?: string;
	options: readonly Option<V>[] | readonly OptionGroup<V>[];
	value: readonly NoInfer<V>[];
	// A promise it returns holds the viewer's picks while it pends; a refusal
	// puts them back, with its reason.
	onChange: (value: NoInfer<V>[]) => unknown;
	// The act that makes a new option, ending the list under a hairline: an act that runs, or a link to where it is made.
	act?: IconAct | IconLinkAct;
}

// A list row's trailing: a value that cannot change (an age, a count, a
// word). An `age` is an ISO moment: the row words it short ("2 min")
// and keeps it current from the shared clock. Its `beside` is a short value beside the age (a
// size, "2.4 MB"; a cost, "$0.12"), whole or gone with it; a row that waits
// draws the same bar for it, since the loaded width is not derivable.
export type RowTrailing =
	| { age: string; beside?: string }
	| { count: number }
	// A word: whole or gone on the web (the row leaves it once the title would hold under half its line), kept whole on the phone.
	| { value: string };

// A `FormField` whose question is answered: it folds to one summary row with
// `answer` and an Edit act that `onEdit` hears; clearing it reopens the field.
export interface Answered {
	// The answer in the summary row (a short phrase; truncates).
	answer: string;
	onEdit: () => void;
}

// A row's title: words (`Run`, `Runs`), a span of code (`{ code }`, the mono
// cut in its middle; with `copy` it carries a copy act: an identifier), the
// word that says there is no value (`{ absent }`, "Any", "None", drawn in the
// meta ink) or a status (`StatusMark`, its tone's mark and word at the title's start, plain).
export type RowTitle =
	| Run
	| Runs
	| { code: string; copy: true }
	| { absent: string }
	| StatusMark;

// What a typing control in a bound `FormField` takes: docs/architecture/ui-core/acts.md, "Commit".
export interface FieldControl<V> {
	readonly value: V;
	onChange: (value: V) => unknown;
	onCommit?: (value: V) => unknown;
}

// A form field by name: its value, its change handler and its error line.
// A `FormField` given one draws the error and hands the control the rest.
export interface FieldBinding<V> extends FieldControl<V> {
	// The line that takes the description's place (a sentence; wraps): words,
	// or runs whose `{ code }` stands boxed in the mono.
	readonly error: Run | Runs | undefined;
}

// A decision asked imperatively: `confirm()` opens a sheet with the title,
// the sentence and the act, and returns nothing. The act runs the work: while
// the promise its `onAct` returns pends, the act is pending and the sheet's
// other acts are inert; the sheet closes when it resolves and stays open,
// the act ready again, when it rejects. Dismissing the sheet runs nothing.
// `destructive` draws the act as a destructive button.
// The value the viewer must type before the act enables (a name the act
// removes), the field's label, and the act's `blocked` reason until then.
export interface ConfirmName {
	// The name to type, compared with the typed text and never drawn (text).
	value: string;
	// The field's label (a short phrase; wraps).
	label: string;
	// Why the act is blocked until then (a sentence; wraps).
	blocked: string;
}

// `cancel` is the way out's label, the `cancel` word unless given: the
// decision's own words for leaving it ("Keep editing", "Stay"). The way out
// runs nothing; Escape, the scrim and the sheet's close dismiss alike.
export interface Decision {
	// The sheet's heading (a short phrase; wraps).
	title: string;
	// What the decision asks (a sentence; wraps).
	sentence: string;
	// The way out's text (a short phrase; truncates).
	cancel?: string;
	confirmName?: ConfirmName;
}

// A decision with the act it runs: what `confirm()` draws.
export interface Confirmation extends Decision {
	act: Act;
}

// What a menu holds: acts that run and links that go.
export type MenuEntry = Act | LinkAct;

// The routes an app has, merged in by a platform: docs/architecture/ui-core/layout.md, "Places".
// biome-ignore lint/suspicious/noEmptyInterface: a platform merges its route type in
export interface RouteRegistry {}
export type Route = RouteRegistry extends { route: infer R extends string }
	? R
	: string;

// A file the viewer chose or dropped: docs/architecture/ui-core/components.md, "File controls".
export interface PickedFile {
	name: string;
	size: number;
	type: string;
	blob: () => Promise<Blob>;
	src?: string;
}

// ── Table ───────────────────────────────────────────────────────────

// The rows a mutation acts on, as the table holds them and as the server
// takes them (`selector()` of plugin-api): the ids ticked, or every row the
// read's query matches but the ids unticked. `Q` is the read's query (its
// input less the paging and the sort).
export type Picked<Q = unknown> =
	| { ids: string[] }
	| { query: Q; except: string[] };

// A change set's mark: docs/architecture/ui-core/roster.md, "Marks".
export type ChangeKind =
	| "added"
	| "changed"
	| "removed"
	| "unchanged"
	| "stale";

// ── Thread ──────────────────────────────────────────────────────────

// A waveform's precomputed amplitude, drawn from the first value to the last
// across the track's length: one 0..1 magnitude per value, or with `paired`
// each pair of values the lowest and highest sample of a stretch (each -1..1).
// A typed array stands as well as an array, so a decoded buffer is passed as it is.
export interface Peaks {
	values: ArrayLike<number>;
	paired?: boolean;
}

// ── Drag and drop ───────────────────────────────────────────────────

// What a drag carries to a drop: the kind the drops accept by and the rows
// dragged, either their ids or a pick of a read's query (`selector()` of
// plugin-api takes it whole), so a drag of a ticked selection over a
// paginated read carries every row the query matches, loaded or not.
export interface Dragged<Q = unknown> {
	kind: string;
	picked: Picked<Q>;
}

// A place that takes a drag: docs/architecture/ui-core/drag.md, "Drag and drop".
export interface Drop<Q = unknown> {
	accepts: string | readonly string[];
	label: string;
	onDrop(drag: Dragged<Q>): unknown;
	blocked?: string;
	confirm?: Decision;
	done?: string;
	to?: string;
}

// Where a row moved to: its index in the order the move makes, and the rows it
// then stands between (`after` the row before it, `before` the row after it;
// null at the start and at the end), which is all a fractional position needs.
export interface Moved {
	index: number;
	after: string | null;
	before: string | null;
}

// A collection that orders its rows: `onMove` hears the id of the row the
// viewer moved and where it lands; the order it keeps is the consumer's (a
// fractional position, an index). The rows show the move at once and the order
// the read answers replaces it; a rejection toasts, its Retry runs the move
// again, and the rows go back. `done` is toasted once `onMove` resolves.
export interface Reorder {
	onMove: (id: string, to: Moved) => unknown;
	done?: string;
}
