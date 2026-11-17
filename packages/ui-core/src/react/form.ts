// The model of a form over its procedure on both platforms: docs/architecture/ui-core/acts.md, "Forms".
import { useState } from "react";
import { drew, type Issue, placed } from "../acts.ts";
import type { Act, Option, PickedFile, Run, Runs } from "../descriptors.ts";
import {
	type Can,
	type Derived,
	derive,
	type FieldSpec,
	type FormFields,
	type FormGroupOf,
	type FormSubmit,
	type Held,
	type InputOf,
	invalidReason,
	isEmpty,
	markedRuns,
	type OutputOf,
	type PickWords,
	type ProcedureCall,
	pathOf,
	pickWords,
	readPicked,
	requiredReason,
	toInput,
	toShown,
} from "../form.ts";
import { type Datum, isSelection, isStandIn, type Selection } from "../read.ts";
import { registeredScope } from "../scope.ts";
import type { ActPlatform } from "./acts.ts";
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
type Draft = Readonly<Record<string, Held>>;
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
}

/** What the form model reads of a form's props: its procedure and its field labels (`fields` or `groups`, never both), `A` the platform's act in its bar. */
export type FormModelProps<
	P extends ProcedureCall = ProcedureCall,
	A = Act,
> = FormModelBase<P, A> &
	(
		| { fields: FormFields<InputOf<P>, Options, Datum<string>>; groups?: never }
		| {
				fields?: never;
				groups: readonly FormGroupOf<InputOf<P>, Options, Datum<string>>[];
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
	/** The server's refusal of the value, else the typed text's own issue once the viewer has typed it. */
	error: Run | Runs | undefined;
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

/** A form's model: its fields, its bar, its read, the input the fields make now, the reads the bar paints under besides the form's own, and `clear`, which drops the viewer's edits and the refusals they drew. */
export interface FormModel<P extends ProcedureCall, A> {
	/** Every field in the order it stands. */
	fields: readonly FieldModel[];
	/** The props' groups, each with its fields; undefined on a form of `fields`. */
	groups:
		| readonly {
				title: string | undefined;
				description: string | undefined;
				fields: readonly FieldModel[];
		  }[]
		| undefined;
	/** How the form commits. */
	commit: "submit" | "field" | undefined;
	/** The bar's acts, the submit last; undefined on a form that commits by field with no other act. */
	bar: { acts: (A | Act)[] } | undefined;
	/** The form's frame: its `read`, else a selection of its `values`. */
	read: Selection<unknown> | undefined;
	/** The input the fields make now: `given` and every field that holds a value, as the procedure would take them, a file as the picked file. */
	sent: Partial<InputOf<P>>;
	/** The reads the bar paints under besides the form's own: the ability `can` asks. */
	outer: readonly unknown[];
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
export function useFormModel<P extends ProcedureCall, A>(
	props: FormModelProps<P, A> | undefined,
	stays: boolean,
	platform: Pick<ActPlatform, "toast">,
): FormModel<P, A> | { clear: () => void; fields?: undefined } {
	const port = usePort();
	const words = useWords();
	const send = port.useSubmit(props?.act);
	const [draft, setDraft] = useState<Draft>({});
	const [refused, setRefused] = useState<readonly Issue[]>([]);
	// The saved secrets the viewer is replacing: their field is the empty input.
	const [replacing, setReplacing] = useState<readonly string[]>([]);
	const clear = () => {
		setDraft({});
		setRefused([]);
		setReplacing([]);
	};
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
		throw new Error(`Form: no schema for ${path}; run \`stack generate\``);
	}
	if (entry.kind !== "mutation" || !entry.input) {
		throw new Error(`Form: ${path} is not a mutation over an object`);
	}
	const input = entry.input;
	const base: Values = loaded.painted ? {} : ((loaded.value as Values) ?? {});
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
	// What a field holds: the viewer's, else the form's first value.
	const holds = (key: string, held: Draft): Held | undefined => {
		const derived = shown.get(key);
		if (!derived) return undefined;
		if (key in held) return held[key];
		// A saved secret is never read back into its field.
		return derived.control === "secret"
			? undefined
			: toShown(derived, base[key]);
	};
	// The masked form of a secret the form holds (its first value, the server's
	// last characters, never the secret): the field draws it as its hint and
	// stands a Remove. A required secret has no empty form to remove to.
	const savedOf = (key: string, derived: Derived): string | undefined => {
		const first = base[key];
		return derived.control === "secret" &&
			!derived.required &&
			typeof first === "string" &&
			first !== ""
			? first
			: undefined;
	};
	const clearRefused = (key: string) =>
		setRefused((all) => all.filter((issue) => issue.path[0] !== key));

	// The input the fields make from a draft, or why they cannot make one yet,
	// and the choices each field with options draws (a function of the fields
	// before it). A change hands `onChange` the input its next draft makes.
	const specOf = new Map(specs);
	const make = (held: Draft) => {
		let blocked: string | undefined = denied;
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
					blocked ??= requiredReason(
						words,
						specOf.get(key)?.label ?? key,
						derived.control === "pick" || derived.control === "file",
					);
				}
				continue;
			}
			const made = toInput(derived, value, words);
			if (made === "invalid") {
				blocked ??= invalidReason(words, specOf.get(key)?.label ?? key);
				continue;
			}
			if ("issue" in made) {
				wrong.set(key, made.issue);
				blocked ??= made.issue;
				continue;
			}
			sent[key] = made.value;
		}
		return { blocked, sent, wrong, choices };
	};
	const { blocked, sent, wrong, choices } = make(draft);
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
			// An optional pick's empty choice sends the key absent.
			if (derived.nullable) made[key] = null;
			else if (derived.control === "several" || derived.control === "lines")
				made[key] = [];
			else if (
				["text", "mono", "prose", "source", "code", "secret"].includes(
					derived.control,
				)
			)
				made[key] = "";
			else if (derived.control !== "pick" || derived.required) {
				throw new Error(
					requiredReason(words, specOf.get(key)?.label ?? key, false),
				);
			}
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
		if (!isSelection(values)) {
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
				{ path: [key], message: port.refusal(error) ?? words.actFailed },
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

	const onAct = async () => {
		try {
			const input = await wire(sent);
			const output = await send(input);
			await onDone?.(output, input);
			// The fields go back to `values` only where the form stays: a sheet
			// drops its edits as it opens again and leaves over what was sent, and
			// a form whose submit goes `to` a page is left as it was.
			if (stays && submit?.to === undefined) clear();
			return output;
		} catch (error) {
			const found = port.issues(error);
			if (found.length > 0) {
				setRefused(found);
				drew(error);
				// A value refusal stands under its field: where every issue names a
				// field the form shows, the bar draws none of them again.
				if (found.every((issue) => shown.has(String(issue.path[0]))))
					placed(error);
			}
			throw error;
		}
	};

	// What a field says under its control, in the order the specs stand.
	const saying = (key: string): string | undefined => {
		const at = specs.findIndex(([each]) => each === key);
		const said = described[at];
		return said === undefined || said.painted ? undefined : said.value;
	};

	// A selection of the form's values hands each control its own slice, so it
	// paints until the read lands; the placeholder stands for every slice of it.
	const initial = (key: string, derived: Derived): Datum<Held | undefined> =>
		isSelection(values)
			? (values as Selection<Values | undefined>).at((all) =>
					isStandIn(all)
						? (all as never)
						: derived.control === "secret"
							? undefined
							: toShown(derived, all?.[key]),
				)
			: derived.control === "secret"
				? undefined
				: toShown(derived, base[key]);

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
		// A typed text's own issue stands once the viewer has typed it; the
		// server's own sentence boxes the names it puts between backticks.
		const said = refused.find((issue) => issue.path[0] === key)?.message;
		const error =
			said !== undefined
				? markedRuns(said)
				: key in draft
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

	const others = props.acts ?? [];
	const bar =
		byField && others.length === 0
			? undefined
			: {
					acts: byField
						? [...others]
						: [
								...others,
								{
									...submit,
									label: submit?.label ?? "Save",
									blocked,
									onAct,
								},
							],
				};
	return {
		fields,
		groups: props.groups?.map((group) => ({
			title: group.title,
			description: group.description,
			fields: fields.filter((one) => Object.hasOwn(group.fields, one.key)),
		})),
		commit: props.commit,
		bar,
		read: read ?? (isSelection(values) ? values : undefined),
		sent: sent as Partial<InputOf<P>>,
		outer: [mayHere],
		clear,
	};
}
