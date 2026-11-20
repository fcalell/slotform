// The model of a form over its procedure on both platforms: docs/architecture/ui-core/acts.md, "Forms".
import { useEffect, useRef, useState } from "react";
import { drew, type Issue, placed } from "../acts.ts";
import type {
	Act,
	ChangeKind,
	Option,
	PickedFile,
	Run,
	Runs,
	StepState,
} from "../descriptors.ts";
import {
	answerOf,
	type Can,
	changedSince,
	changeOf,
	type Derived,
	derive,
	emptied,
	type FieldSpec,
	type FormFields,
	type FormGroupOf,
	type FormSubmit,
	firstRefused,
	type Held,
	type InputOf,
	invalidReason,
	isChoice,
	isEmpty,
	leftWith,
	markedRuns,
	type OutputOf,
	type PickWords,
	type ProcedureCall,
	pathOf,
	pickWords,
	readPicked,
	requiredReason,
	stepStates,
	summaryOf,
	toInput,
	toShown,
} from "../form.ts";
import { type Datum, isSelection, isStandIn, type Selection } from "../read.ts";
import { registeredScope } from "../scope.ts";
import type { ActPlatform } from "./acts.ts";
import { failedSentence } from "./failed.ts";
import { usePort } from "./port.ts";
import { useSelections } from "./read.ts";
import { useWords } from "./words.ts";

// A field's `options` may be a selection, which paints the pick until its read lands.
type Options = Selection<readonly Option<string>[]>;
// The form reads its fields through the schema at run time, never through
// `P`: each field is a `Spec` and the input a record by key, so a field list,
// a value or a draft of `InputOf<P>` is cast to those where it is read, and
// the input the fields make is cast back to `InputOf<P>` where it is sent.
type Spec = FieldSpec<unknown, Options, Record<string, string>, Datum<string>>;
type Edits = Readonly<Record<string, Held>>;
type Values = Readonly<Record<string, unknown>>;

interface FormModelBase<P extends ProcedureCall, A> {
	/** The procedure the form submits: its input schema gives every field its control, its optionality and its issue line, and its mutation is the submit. */
	act: P;
	/** The input keys the screen supplies (a scope id, a record id): sent with the input, never drawn. */
	given?: Partial<InputOf<P>>;
	/** The fields' first values (a form about a record). A selection paints the controls until its read lands and follows it until the viewer types; it is the form's `read` unless one is given. A submit that resolves puts the fields back to it. */
	values?: Datum<Partial<InputOf<P>>>;
	/** How the form commits. `submit` (the default): the bar's filled act sends every field at once. `field`: no bar; each field sends `given` and its own key when the viewer commits it (a text on leaving it or on Enter, a switch or a pick on its change, a file as it is picked) and draws its own refusal under it, so a settings page is a form that commits by field. The `submit`'s `done` is toasted per field commit and `onDone` hears each output; `label` and `to` have no place. Every required key the form does not show must be `given`, or the form throws. */
	commit?: "submit" | "field";
	/** The submit act's words and what follows it. */
	submit?: FormSubmit;
	/** Called with the output once the procedure resolves, and the input it was sent (once per field commit, when the form commits by field): the `given` keys and the fields' values as the procedure took them, a file as the string it was read into. A promise it returns (a navigation) keeps the submit pending, and the fields as sent, until it settles. */
	onDone?: (output: OutputOf<P>, input: InputOf<P>) => unknown;
	/** Other acts standing in the form's bar before the filled submit (a Cancel, a destructive Decline with `confirm`), drawn and run as any act of an `ActionBar`, through the same `useAct`. The last act of a bar is the filled one, so with `commit: "field"` (no submit) they stand in a bar of their own under the fields, the last of them filled. */
	acts?: readonly A[];
	/** What the caller must be allowed to do to submit, as an ability's `[action, subject]` in the registered scope's organization. A caller who may not stands the fields disabled and the submit blocked with the reason (the word `denied`). The act paints the form, inert, until the ability's read lands. */
	can?: Can;
	/** What the form's fields hold, read once for the form's frame. */
	read?: Selection<unknown>;
	/** The form asks one step at a time: a step is a group, or a field when the form has no groups. The open step's fields stand over the bar, whose filled act is Continue, blocked until each of the step's fields holds a value its schema accepts; Continue folds the step to its summary row (its title, then each answer a middle dot apart, and an Edit act that unfolds it) and opens the next, whose first control takes focus. The last step's act is the submit. A form that commits by field has no submit to step to, so it throws. */
	steps?: true;
}

/** What the form model reads of a form's props: its procedure and its field labels (`fields` or `groups`, never both), `A` the platform's act in its bar and `E` its empty state, which a group takes. */
export type FormModelProps<
	P extends ProcedureCall = ProcedureCall,
	A = Act,
	E = never,
> = FormModelBase<P, A> &
	(
		| { fields: FormFields<InputOf<P>, Options, Datum<string>>; groups?: never }
		| {
				fields?: never;
				groups: readonly FormGroupOf<InputOf<P>, Options, Datum<string>, E>[];
		  }
	);

/** One field as its platform draws it: its spec and derivation, what it says and holds, and the calls its control makes. */
export interface FieldModel {
	/** The input key the field draws. */
	key: string;
	/** The field's spec as the props give it. */
	spec: Spec;
	/** What the procedure's input schema says of the key. */
	derived: Derived;
	/** Under the control: the `locked` reason, else the field's description once it lands. */
	description: string | undefined;
	/** The server's refusal of the value, else the typed text's own issue once the viewer has typed it and left the field. */
	error: Run | Runs | undefined;
	/** Set afresh when a refusal names this field first in the fields' order: the platform hands its control focus, once per refusal. */
	seek: object | undefined;
	/** The viewer left the field: its typed text's own issue stands from then on. */
	leave: () => void;
	/** The field may be left empty and says so (never in a form that commits by field). */
	optional: boolean;
	/** The field stands inert: the caller may not submit, or the field is `locked`. */
	disabled: boolean;
	/** What the control holds; a selection of the form's values paints it until its read lands. */
	value: Datum<Held | undefined>;
	/** The choices a pick draws, the empty choice first on a field that may be left empty. */
	options: Datum<readonly Option<string | null>[]>;
	/** What a pick reads while it holds nothing. */
	said: PickWords;
	/** Where the field stands against its first value, `undefined` where it holds it: its change mark. */
	change: ChangeKind | undefined;
	/** The viewer's change. */
	set: (next: Held) => unknown;
	/** The field's own send, in a form that commits by field: it returns the save's promise for the field to hold. */
	commit: ((next: Held) => unknown) | undefined;
	/** A saved secret's masked form and its Replace and Remove; undefined for any other field. */
	saved:
		| {
				tail: string;
				label: string;
				replacing: boolean;
				replace: () => void;
				remove: () => Promise<unknown>;
		  }
		| undefined;
}

/** One step of a form that asks one step at a time. */
export interface StepModel {
	/** Folded to its summary row (`done`), open (`current`), or not reached and not drawn (`later`). */
	state: StepState;
	/** The summary row's title: the group's, or the field's label. */
	title: string;
	/** The summary row's answers, a middle dot apart. */
	summary: string;
	/** Unfolds the step; its first control takes focus. */
	edit: () => void;
}

/** One run of a form's fields: a group of the props, or a field that is a step of its own (untitled). */
export interface GroupModel<E> {
	title: string | undefined;
	description: string | undefined;
	fields: readonly FieldModel[];
	/** The group's frame read: its `values` where they are a selection. */
	read: Selection<unknown> | undefined;
	/** The fields' sentence when that read is empty. */
	empty: E | undefined;
	/** Where the form stands at this step; undefined on a form that asks all at once. */
	step: StepModel | undefined;
}

/** A form's model: its fields, its bar, its read, the input the fields make now, the reads the bar paints under besides the form's own, and `clear`, which drops the viewer's edits and the refusals they drew. */
export interface FormModel<P extends ProcedureCall, A, E = never> {
	/** Every field in the order it stands. */
	fields: readonly FieldModel[];
	/** The props' groups, each with its fields, or each field a group of its own on a form of `fields` that asks one step at a time; undefined on any other form of `fields`. */
	groups: readonly GroupModel<E>[] | undefined;
	/** How the form commits. */
	commit: "submit" | "field" | undefined;
	/** The bar's acts, the submit last, and `onBlocked`, which the platform's bar calls on a press of the blocked submit (a pointer, Enter, a tap): every field is left, so each typed field's own issue stands. Undefined on a form that commits by field with no other act. */
	bar: { acts: (A | Act)[]; onBlocked: (() => void) | undefined } | undefined;
	/** The form's frame: its `read`, else a selection of its `values`. */
	read: Selection<unknown> | undefined;
	/** The input the fields make now: `given` and every field that holds a value, as the procedure would take them, a file as the picked file. */
	sent: Partial<InputOf<P>>;
	/** The reads the bar paints under besides the form's own: the ability `can` asks. */
	outer: readonly unknown[];
	/** A field holds a value other than its first: what a leave asks about. A value put back is no edit. */
	edited: boolean;
	/** Drops the viewer's edits and the refusals they drew. */
	clear: () => void;
}

// The options of a pick: the schema's values (or the consumer's), with the
// empty choice first on a field that may be left empty.
function optionsOf(
	derived: Derived,
	given: Datum<readonly Option<string>[]> | undefined,
	none: string,
): Datum<readonly Option<string | null>[]> {
	const listed: Datum<readonly Option<string>[]> =
		given ?? (derived.values ?? []).map((value) => ({ value, label: value }));
	if (derived.required || derived.control === "several") return listed;
	const empty: Option<string | null> = { value: null, label: none };
	return isSelection(listed)
		? listed.at((all) => (isStandIn(all) ? all : [empty, ...all]))
		: [empty, ...listed];
}

/** The model of a form over its procedure. Without props (a sheet with no form) it holds nothing but `clear`. `stays`: the form stays on its page after a send, so its fields go back to `values` unless its submit goes `to` a page; one that does not (a sheet's) calls `clear` as it opens again. `platform` toasts a field commit's `done`. */
export function useFormModel<P extends ProcedureCall, A, E = never>(
	props: FormModelProps<P, A, E> | undefined,
	stays: boolean,
	platform: Pick<ActPlatform, "toast">,
): FormModel<P, A, E> | { clear: () => void; fields?: undefined } {
	const port = usePort();
	const words = useWords();
	const send = port.useSubmit(props?.act);
	const [draft, setDraft] = useState<Edits>({});
	// The draft as it stands now, which a send's late answer reads against
	// the draft it sent.
	const now = useRef(draft);
	useEffect(() => {
		now.current = draft;
	});
	const [refused, setRefused] = useState<readonly Issue[]>([]);
	// The refusal's first field, which takes focus: a fresh object per refusal.
	const [seek, setSeek] = useState<{ key: string }>();
	// The fields the viewer left since the form started over: their typed
	// text's own issue stands.
	const [left, setLeft] = useState<ReadonlySet<string>>(new Set());
	// The saved secrets the viewer is replacing: their field is the empty input.
	const [replacing, setReplacing] = useState<readonly string[]>([]);
	// The steps the viewer answered, by their place among the steps.
	const [answered, setAnswered] = useState<ReadonlySet<number>>(new Set());
	// The form starts over: the viewer's edits but those `kept` dropped, with
	// the refusals, the secrets being replaced, the fields left, the focus a
	// refusal asked for and the steps answered.
	const startOver = (kept: ReadonlySet<string>) => {
		setDraft((all) =>
			Object.fromEntries(Object.entries(all).filter(([key]) => kept.has(key))),
		);
		setRefused([]);
		setReplacing([]);
		setLeft(new Set());
		setSeek(undefined);
		setAnswered(new Set());
	};
	const clear = () => startOver(new Set());
	// The caller's ability in the route's organization, a read the form paints
	// under until it lands; no organization answers no. The ids are those the
	// innermost `ScopeBoundary` above registered, none under no boundary.
	const can = props?.can;
	const organizationId = registeredScope().organizationId;
	const may = can && port.may(organizationId, can);
	const mayHere = may
		? may.at((yes) => (yes ? (true as const) : words.denied))
		: true;
	const [loaded, allowed] = useSelections([props?.values, mayHere] as const);
	// A group's `values` are its fields' first values, in place of the form's.
	const groupLoaded = useSelections(
		(props?.groups ?? []).map((group) => group.values),
	);
	// A field's description may be a read of its own ("Saved, ends in 1234"): it
	// draws once it lands, and a description that waits or ended draws none.
	const described = useSelections(
		(props?.groups ?? [{ fields: props?.fields }])
			.flatMap((group) =>
				Object.entries((group.fields ?? {}) as Record<string, Spec>),
			)
			.map(([, spec]) => spec.description),
	);
	if (!props) return { clear };

	const { act, given, values, submit, onDone, read } = props;
	const byField = props.commit === "field";
	const path = pathOf(act);
	const entry = port.schemaOf(path);
	if (!entry) {
		throw new Error(`Form: no schema for ${path}; run \`slotform generate\``);
	}
	if (entry.kind !== "mutation" || !entry.input) {
		throw new Error(`Form: ${path} is not a mutation over an object`);
	}
	const input = entry.input;
	if (props.steps && byField) {
		throw new Error(`Form: ${path} commits by field, so it takes no steps`);
	}
	// Each field's first values: its group's `values`, else the form's.
	const groupOf = new Map<string, number>();
	props.groups?.forEach((group, at) => {
		if (group.values === undefined) return;
		for (const key of Object.keys(group.fields)) groupOf.set(key, at);
	});
	const valuesOf = (key: string): Datum<unknown> => {
		const at = groupOf.get(key);
		return at === undefined ? values : props.groups?.[at]?.values;
	};
	const firstOf = (key: string): unknown => {
		const at = groupOf.get(key);
		const drawn = at === undefined ? loaded : groupLoaded[at];
		return drawn === undefined || drawn.painted
			? undefined
			: (drawn.value as Values | undefined)?.[key];
	};
	const denied =
		allowed.painted || allowed.value === true
			? undefined
			: String(allowed.value);

	const groups = props.groups ?? [{ title: undefined, fields: props.fields }];
	const specs = groups.flatMap((group) =>
		Object.entries(group.fields as Record<string, Spec>),
	);
	const given_ = (given ?? {}) as Values;
	// The keys a file field's name goes to are the form's, not the screen's.
	const named = new Set(
		specs.flatMap(([, spec]) => (spec.name ? [spec.name] : [])),
	);
	const shown = new Map<string, Derived>();
	for (const [key, spec] of specs) {
		try {
			if (spec.control === "file" && !spec.accept) {
				throw new Error("is a file field with no `accept`");
			}
			if (spec.name !== undefined) {
				if (spec.control !== "file") {
					throw new Error("names a file's name but is not a file field");
				}
				if (!input.properties?.[spec.name]) {
					throw new Error(
						`names "${spec.name}" for the file's name, which the input lacks`,
					);
				}
			}
			if (
				isChoice(spec.control) &&
				spec.options !== undefined &&
				!Array.isArray(spec.options)
			) {
				throw new Error(
					`is a ${spec.control} field whose options are a read or a function of the draft`,
				);
			}
			shown.set(
				key,
				derive(input, key, spec.control, spec.options !== undefined),
			);
		} catch (error) {
			throw new Error(
				`Form: ${path}.${key} ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	// The scope's key comes from the route's boundary, never from the form.
	for (const key of input.required ?? []) {
		if (
			key === entry.scope ||
			key in given_ ||
			named.has(key) ||
			shown.has(key)
		) {
			continue;
		}
		throw new Error(
			byField
				? `Form: ${path} commits by field, so it needs "${key}" given`
				: `Form: ${path} needs "${key}": make it a field or give it`,
		);
	}

	// A held pick or picks cut to the choices that stand; a value no longer among
	// them is cleared.
	const within = (
		value: Held | undefined,
		among: Datum<readonly Option<string>[]> | undefined,
	): Held | undefined => {
		if (value === undefined || value === null || isSelection(among) || !among) {
			return value;
		}
		const has = (one: string) => among.some((option) => option.value === one);
		if (typeof value === "string") return has(value) ? value : undefined;
		return Array.isArray(value) ? value.filter(has) : value;
	};
	const holds = (key: string, held: Edits): Held | undefined => {
		const derived = shown.get(key);
		if (!derived) return undefined;
		if (key in held) return held[key];
		// A saved secret is never read back into its field.
		return derived.control === "secret"
			? undefined
			: toShown(derived, firstOf(key));
	};
	// The masked form of a secret the form holds (its first value, the server's
	// last characters, never the secret): the field draws it as its hint and
	// stands a Remove. A required secret has no empty form to remove to.
	const savedOf = (key: string, derived: Derived): string | undefined => {
		const first = firstOf(key);
		return derived.control === "secret" &&
			!derived.required &&
			typeof first === "string" &&
			first !== ""
			? first
			: undefined;
	};
	// A press of the submit while it is blocked, or while a typed issue waits
	// unseen: every field is left, so each typed field's own issue stands.
	const order = [...shown.keys()];
	const press = () => setLeft((all) => leftWith(all, order));
	const clearRefused = (key: string) =>
		setRefused((all) => all.filter((issue) => issue.path[0] !== key));

	// The input the fields make from a draft, why each field cannot make its
	// part yet (in the fields' order), and the choices each field with options
	// draws (a function of the fields before it). A change hands `onChange` the
	// input its next draft makes.
	const specOf = new Map(specs);
	const make = (held: Edits) => {
		const reasons = new Map<string, string>();
		const sent: Record<string, unknown> = { ...given_ };
		// What a typed text says is wrong with it, by field.
		const wrong = new Map<string, string>();
		const choices = new Map<string, Datum<readonly Option<string>[]>>();
		for (const [key, derived] of shown) {
			const listed = specOf.get(key)?.options;
			const narrowed = typeof listed === "function";
			if (narrowed) {
				choices.set(key, listed(sent as Partial<Record<string, string>>));
			} else if (listed) {
				choices.set(key, listed);
			}
			let value = narrowed
				? within(holds(key, held), choices.get(key))
				: holds(key, held);
			if (
				value === undefined &&
				derived.control === "switch" &&
				derived.required
			) {
				value = false;
			}
			// A saved secret the viewer has not touched is left out: sending it
			// would erase it.
			if (
				derived.control === "secret" &&
				!(key in held) &&
				savedOf(key, derived) !== undefined
			) {
				continue;
			}
			if (value === undefined || isEmpty(derived, value)) {
				if (derived.nullable) sent[key] = null;
				else if (derived.required) {
					reasons.set(
						key,
						requiredReason(
							words,
							specOf.get(key)?.label ?? key,
							derived.control === "pick" || derived.control === "file",
						),
					);
				}
				continue;
			}
			const made = toInput(derived, value, words);
			if (made === "invalid") {
				reasons.set(key, invalidReason(words, specOf.get(key)?.label ?? key));
				continue;
			}
			if ("issue" in made) {
				// A typed issue blocks only once its field is left, so the bar never
				// says what the field itself does not.
				wrong.set(key, made.issue);
				if (left.has(key)) reasons.set(key, made.issue);
				continue;
			}
			sent[key] = made.value;
		}
		return { reasons, sent, wrong, choices };
	};
	const { reasons, sent, wrong, choices } = make(draft);
	// Why the act over `keys` cannot run: the caller may not, or the first of
	// their fields that cannot make its input yet.
	const blockedOver = (keys: readonly string[]) =>
		denied ?? keys.map((key) => reasons.get(key)).find(Boolean);
	// The viewer's change: the draft holds it, and the next render's `after`
	// draws the input it makes.
	const change = (key: string, next: Held) => {
		const held = { ...draft, [key]: next };
		setDraft(held);
		clearRefused(key);
	};

	// A picked file goes as the string it is read into.
	const wire = async (made: Record<string, unknown>): Promise<InputOf<P>> => {
		const out = { ...made };
		for (const [key, derived] of shown) {
			// A file field holds a `PickedFile` (the control decides).
			const file = out[key] as PickedFile | undefined;
			if (derived.control === "file" && file) {
				out[key] = await readPicked(file, derived.base64);
				const name = specOf.get(key)?.name;
				if (name) out[name] = file.name;
			}
		}
		return out as InputOf<P>;
	};

	// A form that commits by field sends `given` and the one field's key.
	const commitField = async (key: string, derived: Derived, next: Held) => {
		const made: Record<string, unknown> = { ...given_ };
		if (isEmpty(derived, next)) {
			const empty = emptied(derived);
			if (empty === "required") {
				throw new Error(
					requiredReason(words, specOf.get(key)?.label ?? key, false),
				);
			}
			if (empty !== "absent") made[key] = empty.value;
		} else {
			const one = toInput(derived, next, words);
			if (one === "invalid") {
				throw new Error(invalidReason(words, specOf.get(key)?.label ?? key));
			}
			if ("issue" in one) {
				setRefused([{ path: [key], message: one.issue }]);
				return undefined;
			}
			made[key] = one.value;
		}
		const input = await wire(made);
		const output = await send(input);
		setReplacing((all) => all.filter((each) => each !== key));
		if (!isSelection(valuesOf(key))) {
			setDraft((all) => ({ ...all, [key]: next }));
		}
		if (submit?.done) platform.toast(submit.done);
		onDone?.(output, input);
		return output;
	};
	// A file's, a list's and json's commit is no draft's save, so its refusal stands under it here.
	const commitCaught = async (key: string, derived: Derived, next: Held) => {
		try {
			await commitField(key, derived, next);
		} catch (error) {
			drew(error);
			setRefused([
				{ path: [key], message: failedSentence(port, words, error) },
			]);
		}
	};

	// Takes a saved secret away: sends what an emptied field means (`null` where
	// the schema takes it, else the empty string) for that field alone.
	const removeSecret = async (key: string, derived: Derived) => {
		const input = await wire({
			...given_,
			[key]: derived.nullable ? null : "",
		});
		const output = await send(input);
		setReplacing((all) => all.filter((each) => each !== key));
		setDraft((all) =>
			Object.fromEntries(Object.entries(all).filter(([each]) => each !== key)),
		);
		clearRefused(key);
		onDone?.(output, input);
		return output;
	};

	// What a field says under its control, in the order the specs stand.
	const saying = (key: string): string | undefined => {
		const at = specs.findIndex(([each]) => each === key);
		const said = described[at];
		return said === undefined || said.painted ? undefined : said.value;
	};

	// A selection of the field's values (its group's, else the form's) hands each
	// control its own slice, so it paints until the read lands; the stand-in
	// stands for every slice of it.
	const initial = (key: string, derived: Derived): Datum<Held | undefined> => {
		const source = valuesOf(key);
		return isSelection(source)
			? (source as Selection<Values | undefined>).at((all) =>
					isStandIn(all)
						? (all as never)
						: derived.control === "secret"
							? undefined
							: toShown(derived, all?.[key]),
				)
			: derived.control === "secret"
				? undefined
				: toShown(derived, firstOf(key));
	};

	const field = (key: string, spec: Spec): FieldModel[] => {
		const derived = shown.get(key);
		if (!derived) return [];
		const held = key in draft ? draft[key] : initial(key, derived);
		// A selection of the values passes `within` as it is: it is neither a
		// string nor a list.
		const value =
			typeof spec.options === "function"
				? within(held as Held | undefined, choices.get(key))
				: held;
		// A typed text's own issue stands once the viewer has typed it and left
		// the field, so a half-typed value is not called wrong; the server's own
		// sentence boxes the names it puts between backticks.
		const said = refused.find((issue) => issue.path[0] === key)?.message;
		const error =
			said !== undefined
				? markedRuns(said)
				: key in draft && left.has(key)
					? wrong.get(key)
					: undefined;
		const file = derived.control === "file";
		const caught =
			file || derived.control === "lines" || derived.control === "json";
		// By field, a typed control keeps its own draft until it commits.
		const set = (next: Held) =>
			byField && !file
				? caught
					? clearRefused(key)
					: undefined
				: change(key, next);
		const commit = byField
			? (next: Held) =>
					caught
						? commitCaught(key, derived, next)
						: commitField(key, derived, next)
			: undefined;
		const saved = savedOf(key, derived);
		const pick = pickWords(
			{ required: derived.required, empty: spec.empty },
			words,
		);
		return [
			{
				key,
				spec,
				derived,
				description: spec.locked ?? saying(key),
				error,
				seek: seek?.key === key ? seek : undefined,
				change:
					key in draft
						? changeOf(derived, holds(key, {}), draft[key])
						: undefined,
				leave: () => setLeft((all) => leftWith(all, [key])),
				optional: !derived.required && !byField,
				disabled: denied !== undefined || spec.locked !== undefined,
				value,
				options: optionsOf(derived, choices.get(key), pick.none),
				said: pick,
				set,
				commit,
				saved:
					saved === undefined
						? undefined
						: {
								tail: saved.slice(-4),
								label: spec.label,
								replacing: replacing.includes(key),
								replace: () => setReplacing((all) => [...all, key]),
								remove: () => removeSecret(key, derived),
							},
			},
		];
	};
	const fields = specs.flatMap(([key, spec]) => field(key, spec));

	// The fields stay editable while a send runs: its answer reaches only the
	// fields left as they were sent, so what the viewer typed meanwhile is
	// neither refused nor reset.
	// A typed issue the viewer has not seen yet (its field not left) does not
	// block an act over `keys`; its press shows every field's and runs nothing.
	const shownFirst = (keys: readonly string[]) => {
		const key = keys.find((one) => wrong.has(one) && !left.has(one));
		if (key === undefined) return;
		press();
		const error = new Error(wrong.get(key));
		placed(error);
		throw error;
	};
	const onAct = async () => {
		const snapshot = draft;
		shownFirst(order);
		try {
			const input = await wire(sent);
			const output = await send(input);
			await onDone?.(output, input);
			// The fields go back to `values` only where the form stays: a sheet
			// drops its edits as it opens again and leaves over what was sent, and
			// a form whose submit goes `to` a page is left as it was.
			if (stays && submit?.to === undefined)
				startOver(changedSince(shown, snapshot, now.current));
			return output;
		} catch (error) {
			// A field changed since the send is past its refusal.
			const changed = changedSince(shown, snapshot, now.current);
			const standing = port
				.issues(error)
				.filter((issue) => !changed.has(String(issue.path[0])));
			if (standing.length > 0) {
				setRefused(standing);
				const key = firstRefused(fields, standing);
				if (key !== undefined) setSeek({ key });
				drew(error);
				// A value refusal stands under its field: where every refusal that
				// stands names a field the form shows, the bar draws none of them
				// again; one whose fields all changed says the press failed.
				if (standing.every((issue) => shown.has(String(issue.path[0]))))
					placed(error);
			}
			throw error;
		}
	};

	// The runs of fields a step is: the groups, or each field on a form of fields
	// that asks one step at a time.
	const runs =
		props.groups?.map((group) => ({
			group,
			keys: Object.keys(group.fields),
		})) ??
		(props.steps
			? order.map((key) => ({ group: undefined, keys: [key] }))
			: undefined);
	const fieldsOf = (keys: readonly string[]) =>
		fields.filter((one) => keys.includes(one.key));
	const states =
		props.steps && runs
			? stepStates(
					runs.map(({ keys }, at) => ({
						answered: answered.has(at),
						refused: fieldsOf(keys).some((one) => one.error !== undefined),
					})),
				)
			: undefined;
	// The step the bar acts on; a step that opens hands its first field focus.
	const current = states?.indexOf("current");
	const at = current === -1 ? undefined : current;
	const keysAt = (step: number | undefined) =>
		(step === undefined ? undefined : runs?.[step]?.keys) ?? [];
	const opens = (run: { keys: readonly string[] } | undefined) => {
		const key = run?.keys[0];
		if (key !== undefined) setSeek({ key });
	};
	// Continue folds the open step and opens the first step left unanswered.
	const onContinue = async () => {
		if (at === undefined) return;
		shownFirst(keysAt(at));
		const after = new Set([...answered, at]);
		setAnswered(after);
		opens(runs?.find((_, step) => !after.has(step)));
	};
	const stepped =
		runs !== undefined && at !== undefined && at < runs.length - 1;

	const others = props.acts ?? [];
	const submitAct = stepped
		? {
				label: words.continue,
				blocked: blockedOver(keysAt(at)),
				onAct: onContinue,
			}
		: {
				...submit,
				label: submit?.label ?? words.save,
				blocked: blockedOver(order),
				onAct,
			};
	const bar =
		byField && others.length === 0
			? undefined
			: {
					acts: byField ? [...others] : [...others, submitAct],
					onBlocked: byField ? undefined : press,
				};
	return {
		fields,
		groups: runs?.map(({ group, keys }, step) => {
			const run = fieldsOf(keys);
			return {
				title: group?.title,
				description: group?.description,
				fields: run,
				read: isSelection(group?.values) ? group.values : undefined,
				empty: group?.empty,
				step: states?.[step] && {
					state: states[step],
					title: group?.title ?? run[0]?.spec.label ?? "",
					summary: summaryOf(
						run.map((one) =>
							answerOf(
								one.derived,
								holds(one.key, draft),
								one.options,
								one.spec.label,
							),
						),
					),
					edit: () => {
						setAnswered(
							(all) => new Set([...all].filter((each) => each !== step)),
						);
						opens(runs?.[step]);
					},
				},
			};
		}),
		commit: props.commit,
		bar,
		read: read ?? (isSelection(values) ? values : undefined),
		sent: sent as Partial<InputOf<P>>,
		outer: [mayHere],
		edited: fields.some((one) => one.change !== undefined),
		clear,
	};
}
