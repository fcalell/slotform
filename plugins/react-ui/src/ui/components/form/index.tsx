import { cn } from "@fcalell/ui-core/cn";
import type { PickedFile } from "@fcalell/ui-core/descriptors";
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
import { CARD, FORM_FOOT, ROWS } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import type { Act } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import type { Empty } from "../../lib/empty.tsx";
import { toast } from "../../lib/toast.ts";
import { FormField } from "../form-field/index.tsx";
import { Input } from "../input/index.tsx";
import {
	type FormFrameProps,
	FormRows,
	FormShell,
	useFormBar,
} from "./base.tsx";
import { SavedSecret } from "./saved.tsx";

interface FormBase<P extends ProcedureCall> extends Closed {
	/** What follows the fields at the card inset, drawn from the input the fields make now (`given` and every field that holds a value, as the procedure would take them, a file as the picked file): a live preview of what the form would send. It is a function the form calls as it draws, so it is right before any keystroke (a prefilled form shows its first values), follows each change, and starts over when a sheet reopens; the form's bar stands after it, pinned in a sheet's foot. */
	after?: (input: Partial<InputOf<P>>) => ReactNode;
	/** The fields' sentence when the `read`'s selection is empty. */
	empty?: Empty;
}

/** A form is its procedure and its field labels: `fields` or `groups`, never both. */
export type FormProps<P extends ProcedureCall = ProcedureCall> = FormModelProps<
	P,
	Act
> &
	FormBase<P>;

/** A form over a procedure: a card of the fields `fields` names, each drawn from the procedure's input schema (a string a line of text, in the mono with the `mono` hint, an enum a pick, a boolean a switch, a number a numeric line, a list of an enum, or of strings with `options`, a pick of several, a date a date line, a string with the `file` hint a file pick whose file is read into the string, a list with the `lines` hint a line per item, an object with the `json` hint mono JSON source), required unless the schema makes it optional (a pick or a switch with a schema `default` always holds a value, so it is required: no empty choice, no optional word) (in a submit form an optional one says so under its label; a form that commits by field marks nothing), with the server's refusal of its value under it, over a bar whose filled act submits the procedure. The act is pending while the procedure runs and while a promise `onDone` returns settles; then, where the form stays (on a page, its submit going nowhere), the fields go back to `values`; a rejection stands in the bar, and the issues the server's schema refused under their fields until the viewer changes them. A field with a `locked` reason stands inert with it under the control. With `commit: "field"` the form draws no bar and each field sends itself. `groups` partition the fields under bands. While the form stands edited, leaving its page asks once, "Discard your edit?". A form over no procedure (a filter, a local setting) is not a `Form`: a filter is a `Toolbar`, a setting a `Switch` in a row. A form in a sheet is that `Sheet`'s `form`, these same props. */
export function Form<P extends ProcedureCall>(props: FormProps<P>) {
	const { frame: form, outer } = useDerivedForm(props, true);
	const frame = useFrame(form.read);
	const [own] = useTouchState();
	const bar = useFormBar(form.bar, frame, outer);
	return (
		<FormShell
			frame={frame}
			touch={own}
			guards={form.commit !== "field"}
			className={cn(CARD, ROWS)}
		>
			<FormRows
				frame={frame}
				groups={form.groups}
				empty={form.empty}
				after={form.after}
			>
				{form.children}
			</FormRows>
			{bar ? <div className={cn(FORM_FOOT)}>{bar}</div> : null}
		</FormShell>
	);
}

/** What a derived form draws: the structure `FormRows` and `useFormBar` take, the reads its bar paints under besides the form's own (the ability its `can` asks), and `clear`, which drops the viewer's edits and the refusals they drew. */
export interface DerivedFrame {
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

/** The derivation of a form over its procedure: its fields, its bar and its read, as the structure a `Form`, a `Gate` or a `Sheet` draws. Without props (a sheet with no form) it draws nothing. `stays`: the form stays on its page after a send (a `Form`, a `Gate`'s), so its fields go back to `values` unless its submit goes `to` a page; a sheet's does not, and the sheet calls `clear` as it opens again. Outside the package's exports. */
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
	const model = useFormModel<P, Act>(props, stays, { toast });
	if (!props || model.fields === undefined) return { clear: model.clear };
	const byField = model.commit === "field";
	const drawn = (field: FieldModel) => (
		<FormField
			key={field.key}
			label={field.spec.label}
			description={field.description}
			error={field.error}
			optional={field.optional}
			split={byField}
			disabled={field.disabled}
			// `FormField`'s props are a union by control, which a spread of
			// `controlOf`'s union is not checked against member by member.
			{...(controlOf(field) as object)}
		/>
	);
	const { bar, commit, read } = model;
	const after = props.after?.(model.sent);
	return {
		outer: model.outer,
		clear: model.clear,
		frame: model.groups
			? {
					bar,
					commit,
					after,
					read,
					empty: props.empty,
					groups: model.groups.map((group) => ({
						title: group.title,
						description: group.description,
						fields: group.fields.map(drawn),
					})),
				}
			: {
					bar,
					commit,
					after,
					read,
					empty: props.empty,
					children: model.fields.map(drawn),
				},
	};
}

// The descriptor of the control a field draws, which `FormField` draws in its
// value line. A form that commits by field hands each control `commit`: a
// typed control (a line, a text area) calls it on leaving the field, any other
// control on its change, and each returns the save's promise for the field to
// hold. The control the schema gives a field decides what its `Held` value
// is (a switch a boolean, a file a `PickedFile`, a pick a string or `null`,
// several picks a list, any other a string), which the union does not
// follow: each control reads the value as its own.
function controlOf(field: FieldModel) {
	const { derived, spec, value, options, set, commit, said, saved } = field;
	const text = (value ?? "") as Datum<string>;
	const onText = (next: string) => set(next);
	const onCommit = commit && ((next: string) => commit(next));
	const done = commit ?? set;
	switch (derived.control) {
		case "switch":
			return {
				switch: {
					checked: (value ?? false) as Datum<boolean>,
					onChange: (next: boolean) => done(next),
				},
			};
		case "prose":
		case "source":
		case "lines":
		case "json":
			return {
				textArea: {
					value: text,
					onChange: onText,
					onCommit,
					source: derived.control === "source" || derived.control === "json",
				},
			};
		case "code":
			return {
				children: (
					<Input
						label={spec.label}
						kind="code"
						length={derived.length ?? 0}
						value={(value ?? "") as string}
						onChange={set}
						onComplete={onCommit}
					/>
				),
			};
		case "mono":
			return {
				input: {
					kind: "source" as const,
					value: text,
					onChange: onText,
					onCommit,
				},
			};
		case "number":
			return {
				input: {
					kind: "number" as const,
					value: text,
					onChange: onText,
					onCommit,
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
					onChange: onText,
					onCommit,
					autoFocus: saved?.replacing,
				},
			};
		case "date":
			return {
				input: {
					kind: "date" as const,
					value: text,
					onChange: onText,
					onCommit,
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
			return {
				picker: {
					options,
					placeholder: said.several,
					value: value as Datum<readonly string[]>,
					onChange: (next: string[]) => done(next),
				},
			};
		case "pick":
			return {
				picker: {
					options,
					placeholder: said.one,
					value: value as Datum<string | null>,
					onChange: (next: string | null) => done(next),
				},
			};
		default:
			return spec.options
				? {
						picker: {
							options,
							placeholder: said.one,
							value: (isSelection(value)
								? value.at(heldPick)
								: heldPick(value)) as Datum<string | null>,
							onChange: (next: string | null) => done(next),
						},
					}
				: {
						input: { value: text, onChange: onText, onCommit },
					};
	}
}
