import { cn } from "@slotform/ui-core/cn";
import type { InputOf, ProcedureCall } from "@slotform/ui-core/form";
import type { FormModelProps } from "@slotform/ui-core/react/form";
import { CARD, FORM_FOOT, ROWS } from "@slotform/ui-core/variants";
import type { ReactNode } from "react";
import type { Act } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import type { Empty } from "../../lib/empty.tsx";
import { FormRows, FormShell } from "./base.tsx";
import { useStandingForm } from "./derive.tsx";

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
	const { form, frame, touch, bar } = useStandingForm(props);
	return (
		<FormShell
			frame={frame}
			touch={touch}
			guards={form.commit !== "field"}
			edited={form.edited}
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
