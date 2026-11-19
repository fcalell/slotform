import type { Option, PickedFile } from "@fcalell/ui-core/descriptors";
import { heldPick, type ProcedureCall } from "@fcalell/ui-core/form";
import { type FieldModel, useFormModel } from "@fcalell/ui-core/react/form";
import { useFrame } from "@fcalell/ui-core/react/read";
import { useTouchState } from "@fcalell/ui-core/react/touched";
import { type Datum, isSelection } from "@fcalell/ui-core/read";
import type { Act } from "../../lib/act.ts";
import type { Empty } from "../../lib/empty.tsx";
import { toast } from "../../lib/toast.ts";
import { FieldBody } from "../form-field/index.tsx";
import { Input } from "../input/index.tsx";
import { type FormFrameProps, useFormBar } from "./base.tsx";
import type { FormProps } from "./index.tsx";
import { SavedSecret } from "./saved.tsx";

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

/** The derivation of a form over its procedure: its fields, its bar and its read,  as the structure a `Form`, a `Gate` or a `Sheet` draws. Without props (a sheet with no form) it draws nothing. `stays`: the form stays on its page after a send (a `Form`, a `Gate`'s), so its fields go back to `values` unless its submit goes `to` a page; a sheet's does not, and the sheet calls `clear` as it opens again. */
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
	const byField = model.commit === "field";
	const drawn = (field: FieldModel) => (
		<FieldBody
			key={field.key}
			label={field.spec.label}
			description={field.description}
			error={field.error}
			optional={field.optional}
			change={field.change}
			split={byField}
			disabled={field.disabled}
			seek={field.seek}
			onLeave={field.leave}
			// The body's props take each control at its widest, which a spread of
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
					edited: model.edited,
					empty: props.empty,
					groups: model.groups.map((group) => ({
						...group,
						fields: group.fields.map(drawn),
					})),
				}
			: {
					bar,
					commit,
					after,
					read,
					edited: model.edited,
					empty: props.empty,
					children: model.fields.map(drawn),
				},
	};
}

// The descriptor of the control a field draws: docs/architecture/ui-core/acts.md, "Forms".
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
						length={derived.checks.minLength ?? 0}
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
			if (spec.control === "list")
				return {
					options: {
						options: listedOf(options),
						value: value as Datum<readonly string[]>,
						onChange: (next: string[]) => done(next),
					},
				};
			return {
				picker: {
					options,
					placeholder: said.several,
					value: value as Datum<readonly string[]>,
					onChange: (next: string[]) => done(next),
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
						input: { value: text, onChange: onText, onCommit },
					};
	}
}

// A choice hint's options: the model holds them to a list in hand with no
// empty choice (a fixed `options` or the schema's values, on a field that
// always holds a value or picks several), which its `Datum` does not say.
const listedOf = (options: FieldModel["options"]) =>
	options as readonly Option<string>[];

// A pick of one: the menu, or with a choice hint the option list or the
// segmented row, whose choices are a list in hand and never the empty one
// (the model throws otherwise).
function pickOf(field: FieldModel, value: Datum<string | null>) {
	const { spec, options, said, set, commit } = field;
	const done = commit ?? set;
	const onChange = (next: string | null) => done(next);
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

/** A form that stands on its page (a `Form`, a `Gate`'s): its derivation, its frame over its read, its own touch state and its bar. Outside the package's exports. */
export function useStandingForm<P extends ProcedureCall>(props: FormProps<P>) {
	const { frame: form, outer } = useDerivedForm(props, true);
	const frame = useFrame(form.read);
	const [touch] = useTouchState();
	const bar = useFormBar(form.bar, frame, outer);
	return { form, frame, touch, bar };
}
