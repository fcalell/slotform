import { cn } from "@fcalell/ui-core/cn";
import type { Acting } from "@fcalell/ui-core/react/acts";
import { useFrame } from "@fcalell/ui-core/react/read";
import { useTouched } from "@fcalell/ui-core/react/touched";
import { FORM_FOOT, FORM_FOOT_STUCK, ROWS } from "@fcalell/ui-core/variants";
import { useState } from "react";
import {
	type FormFrameProps,
	FormRows,
	FormShell,
	useFormBar,
} from "../form/base.tsx";

/** A sheet's form, the modal and the docked one's: its rows flush on the sheet, its foot stuck to the body's. Outside the package's exports. */
export function SheetForm(props: {
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

/** Drops the viewer's edits as the sheet opens again, on the render that sees it open. Outside the package's exports. */
export function useClearOnOpen(open: boolean, clear: () => void): void {
	const [wasOpen, setWasOpen] = useState(open);
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) clear();
	}
}
