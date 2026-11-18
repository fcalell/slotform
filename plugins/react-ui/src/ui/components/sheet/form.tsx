import { cn } from "@fcalell/ui-core/cn";
import type { ProcedureCall } from "@fcalell/ui-core/form";
import type { Acting } from "@fcalell/ui-core/react/acts";
import { useFrame } from "@fcalell/ui-core/react/read";
import { useTouched } from "@fcalell/ui-core/react/touched";
import { FORM_FOOT, FORM_FOOT_STUCK, ROWS } from "@fcalell/ui-core/variants";
import { type ReactNode, useState } from "react";
import { useAct } from "../../lib/act.ts";
import {
	type FormFrameProps,
	FormRows,
	FormShell,
	useFormBar,
} from "../form/base.tsx";
import { useDerivedForm } from "../form/derive.tsx";
import type { FormProps } from "../form/index.tsx";

/** A sheet's form, the modal and the docked one's: its rows flush on the sheet, its foot stuck to the body's. Outside the package's exports. */
function SheetForm(props: {
	form: FormFrameProps;
	/** The reads the bar paints under besides the form's own (the sheet's read, the ability the form is gated on). */
	outer: readonly unknown[];
	/** The sheet's run: one holder keeps the dismissal held while either the form's act or the sheet's runs. */
	acting: Acting<number>;
}) {
	const { form } = props;
	// A sheet's form is the sheet's: its edit by value is the sheet's leave,
	// which the sheet asks when it is closed, so the form asks nothing of its own.
	const touch = useTouched();
	const frame = useFrame(form.read);
	const bar = useFormBar(form.bar, frame, props.outer, props.acting);
	return (
		<FormShell
			frame={frame}
			touch={touch}
			guards={false}
			edited={form.edited}
			className={cn(ROWS)}
		>
			<FormRows
				frame={frame}
				groups={form.groups}
				empty={form.empty}
				after={form.after}
			>
				{form.children}
			</FormRows>
			{bar ? <div className={cn(FORM_FOOT, FORM_FOOT_STUCK)}>{bar}</div> : null}
		</FormShell>
	);
}

/** A sheet's form, the modal and the docked one's: the sheet's run, which its foot's act and its form's bar share (one act pends at a time, and the dismissal is held while it runs), and the form's rows, its edits dropped as the sheet opens again, on the render that sees it open. `outer`: the reads the bar paints under besides the form's own (the sheet's read). Outside the package's exports. */
export function useSheetForm<P extends ProcedureCall>(
	form: FormProps<P> | undefined,
	open: boolean,
	outer: readonly unknown[],
): { acting: Acting<number>; fields: ReactNode } {
	const acting = useAct<number>("line");
	const derived = useDerivedForm(form, false);
	const [wasOpen, setWasOpen] = useState(open);
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) derived.clear();
	}
	return {
		acting,
		fields: derived.frame ? (
			<SheetForm
				form={derived.frame}
				acting={acting}
				outer={[...outer, ...derived.outer]}
			/>
		) : undefined,
	};
}
