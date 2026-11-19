import type { Option, PickedFile } from "@fcalell/ui-core/descriptors";
import {
	heldPick,
	type InputOf,
	type ProcedureCall,
} from "@fcalell/ui-core/form";
import {
	type FieldModel,
	type FormModelProps,
	useFormModel,
} from "@fcalell/ui-core/react/form";
import { useFrame } from "@fcalell/ui-core/react/read";
import { useTouchState } from "@fcalell/ui-core/react/touched";
import { type Datum, isSelection } from "@fcalell/ui-core/read";
import type { ReactNode } from "react";
import type { Act } from "../../lib/act";
import type { Closed } from "../../lib/closed";
import type { Empty } from "../../lib/empty";
import { toast } from "../../lib/toast";
import type { ActionBarProps } from "../action-bar";
import { FieldBody } from "../form-field";
import { Input } from "../input";
import { type FormFrameProps, FormRows, FormShell, useFormBar } from "./base";
import { SavedSecret } from "./saved";

interface FormBase<P extends ProcedureCall> extends Closed {
	/** What follows the fields at the card inset, drawn from the input the fields make now (`given` and every field that holds a value, as the procedure would take them, a file as the picked file): a live preview of what the form would send. It is a function the form calls as it draws, so it is right before any keystroke (a prefilled form shows its first values), follows each change, and starts over when a sheet reopens; the form's bar stands after it, pinned in a sheet's foot. */
	after?: (input: Partial<InputOf<P>>) => ReactNode;
	/** The fields' sentence when the `read`'s selection is empty. */
	empty?: Empty;
}

/** A form is its procedure and its field labels: `fields` or `groups`, never both. */
export type FormProps<P extends ProcedureCall = ProcedureCall> = FormModelProps<
	P,
	Act,
	Empty
> &
	FormBase<P>;

/** A form over a procedure: a card of the fields `fields` names, each drawn from the procedure's input schema (a string a line of text, in the mono with the `mono` hint, an enum a pick (the option list with the `list` hint, the segmented row with `segments`), a boolean a switch, a number a numeric line, a list of an enum, or of strings with `options`, a pick of several (the option list with a checkbox per option with `list`), a date a date line, a string with the `file` hint a file pick whose file is read into the string, a list with the `lines` hint a line per item, an object with the `json` hint mono JSON source), required unless the schema makes it optional (a pick or a switch with a schema `default` always holds a value, so it is required: no empty choice, no optional word) (in a submit form an optional one says so under its label; a form that commits by field marks nothing), with the server's refusal of its value under it, over a bar whose filled act submits the procedure. The act is pending while the procedure runs and while a promise `onDone` returns settles; then, where the form stays (on a page, its submit going nowhere), the fields go back to `values`; a rejection stands in the bar, and the issues the server's schema refused under their fields until the viewer changes them. A field with a `locked` reason stands inert with it under the control. With `commit: "field"` the form draws no bar and each field sends itself. `groups` partition the fields under bands, each with its own `values` and `empty`. A field holding a value other than its first draws its change mark. With `steps` the form asks one group (or one field) at a time: Continue folds the open step to its summary row and opens the next, and the last step's act is the submit. While the form stands edited (a field holds a value other than its first), leaving its page asks once, "Discard your edit?". A form over no procedure (a filter, a local setting) is not a `Form`: a filter is a `Toolbar`, a setting a `Switch` in a row. A form in a sheet is that `Sheet`'s `form`, these same props. */
export function Form<P extends ProcedureCall>(props: FormProps<P>) {
	return <StandingForm form={props} />;
}

/** A form that stands on its screen: a `Form`, or a `Gate`'s with `fit`, the bar's fit where the form's bar names none. Outside the package's exports. */
export function StandingForm<P extends ProcedureCall>({
	form: props,
	fit,
}: {
	form: FormProps<P>;
	fit?: ActionBarProps["fit"];
}) {
	const { frame: form, outer } = useDerivedForm(props, true);
	const frame = useFrame(form.read);
	const [touch] = useTouchState();
	const bar = useFormBar(form.bar && { fit, ...form.bar }, frame, outer);
	return (
		<FormShell
			touch={touch}
			guard={form.commit !== "field"}
			edited={form.edited}
			card
			frame={frame}
		>
			<FormRows {...form} frame={frame} />
			{bar}
		</FormShell>
	);
}

/** What a derived form draws: the structure `FormRows` and `useFormBar` take, the reads its bar paints under besides the form's own (the ability its `can` asks), and `clear`, which drops the viewer's edits and the refusals they drew. */
interface DerivedFrame {
	frame: FormFrameProps;
	outer: readonly unknown[];
	clear: () => void;
}

/** A derivation over no form (a sheet with none): nothing to draw, and the `clear` a sheet calls as it opens. */
interface NoFrame {
	frame?: undefined;
	outer?: undefined;
	clear: () => void;
}

/** The derivation of a form over its procedure: its fields, its bar and its read, as the structure a `Form`, a `Gate` or a `Sheet` draws. Without props (a sheet with no form) it draws nothing. `stays`: the form stays on its screen after a send (a `Form`, a `Gate`'s), so its fields go back to `values` unless its submit goes `to` a route; a sheet's does not, and the sheet calls `clear` as it opens again. Outside the package's exports. */
export function useDerivedForm<P extends ProcedureCall>(
	props: FormProps<P>,
	stays: boolean,
): DerivedFrame;
export function useDerivedForm<P extends ProcedureCall>(
	props: FormProps<P> | undefined,
	stays: boolean,
): DerivedFrame | NoFrame;
export function useDerivedForm<P extends ProcedureCall>(
	props: FormProps<P> | undefined,
	stays: boolean,
): DerivedFrame | NoFrame {
	const model = useFormModel<P, Act, Empty>(props, stays, { toast });
	if (!props || model.fields === undefined) return { clear: model.clear };
	const drawn = (field: FieldModel) => (
		<FieldBody
			key={field.key}
			label={field.spec.label}
			description={field.description}
			error={field.error}
			optional={field.optional}
			change={field.change}
			disabled={field.disabled}
			seek={field.seek}
			onLeave={field.leave}
			// The body takes each descriptor at its widest, which a spread of
			// `controlOf`'s union is not checked against member by member.
			{...(controlOf(field) as object)}
		/>
	);
	const { bar, commit, read } = model;
	const shared = {
		bar,
		commit,
		after: props.after?.(model.sent),
		read,
		edited: model.edited,
		empty: props.empty,
	};
	return {
		outer: model.outer,
		clear: model.clear,
		frame: model.groups
			? {
					...shared,
					groups: model.groups.map((group) => ({
						...group,
						fields: group.fields.map(drawn),
					})),
				}
			: { ...shared, children: model.fields.map(drawn) },
	};
}

// The line a schema control draws as an `Input` kind.
const LINE_KINDS = { mono: "source", number: "number", date: "date" } as const;

// The descriptor of the control a field draws, which `FormField` draws in its value line.
// A form that commits by field hands each control `commit`: docs/architecture/ui-core/acts.md, "Commit".
function controlOf(field: FieldModel) {
	const { derived, spec, value, options, set, commit, said, saved } = field;
	// The schema's control decides which `Held` the value is: each case names
	// its own, which the compiler cannot tie to the case.
	const text = (value ?? "") as Datum<string>;
	const done = commit ?? set;
	switch (derived.control) {
		case "switch":
			return {
				switch: {
					checked: (value ?? false) as Datum<boolean>,
					onChange: done,
				},
			};
		case "prose":
		case "source":
		case "lines":
		case "json":
			return {
				textArea: {
					value: text,
					onChange: set,
					onCommit: commit,
					source: derived.control === "source" || derived.control === "json",
				},
			};
		case "code":
			return {
				children: (
					<Input
						label={spec.label}
						kind="code"
						length={derived.checks.minLength ?? 0}
						value={(value ?? "") as string}
						onChange={set}
						onComplete={commit}
					/>
				),
			};
		case "mono":
		case "number":
		case "date":
			return {
				input: {
					kind: LINE_KINDS[derived.control],
					value: text,
					onChange: set,
					onCommit: commit,
				},
			};
		case "secret":
			// A saved secret says it is saved and how it ends; Replace opens the
			// empty input, which takes focus.
			if (saved && !saved.replacing)
				return {
					children: (
						<SavedSecret
							tail={saved.tail}
							label={saved.label}
							onReplace={saved.replace}
							onRemove={saved.remove}
						/>
					),
				};
			return {
				input: {
					kind: "secret" as const,
					value: text,
					onChange: set,
					onCommit: commit,
					autoFocus: saved?.replacing,
				},
			};
		case "file":
			return {
				children: (
					<Input
						label={spec.label}
						kind="file"
						value={(value ?? null) as PickedFile | null}
						onChange={(file) => {
							set(file);
							commit?.(file);
						}}
						accept={spec.accept ?? []}
					/>
				),
			};
		case "several":
			if (spec.control === "list")
				return {
					options: {
						options: listedOf(options),
						value: value as Datum<readonly string[]>,
						onChange: done,
					},
				};
			return {
				picker: {
					options,
					placeholder: said.several,
					value: value as Datum<readonly string[]>,
					onChange: done,
				},
			};
		case "pick":
			return pickOf(field, value as Datum<string | null>);
		default:
			return spec.options
				? pickOf(
						field,
						(isSelection(value)
							? value.at(heldPick)
							: heldPick(value)) as Datum<string | null>,
					)
				: {
						input: { value: text, onChange: set, onCommit: commit },
					};
	}
}

// A choice hint's options: the model holds them to a list in hand with no
// empty choice (a fixed `options` or the schema's values, on a field that
// always holds a value or picks several), which its `Datum` does not say.
const listedOf = (options: FieldModel["options"]) =>
	options as readonly Option<string>[];

// A pick of one: the menu, or with a choice hint the option list or the
// segmented row.
function pickOf(field: FieldModel, value: Datum<string | null>) {
	const { spec, options, said, set, commit } = field;
	const onChange = commit ?? set;
	if (spec.control === "list")
		return {
			options: { options: listedOf(options), value, onChange },
		};
	if (spec.control === "segments")
		return {
			segments: {
				options: listedOf(options).map(({ value, label }) => ({
					value,
					label,
				})),
				value: value as Datum<string>,
				onChange,
			},
		};
	return { picker: { options, placeholder: said.one, value, onChange } };
}
