import type { Acting } from "@slotform/ui-core/react/acts";
import { useFrame } from "@slotform/ui-core/react/read";
import { useTouched } from "@slotform/ui-core/react/touched";
import { useState } from "react";
import {
	type FormFrameProps,
	FormRows,
	FormShell,
	useFormBar,
} from "../form/base";

// A sheet's form: its rows flush on the sheet in the sheet's touched state,
// which the sheet's foot reads too, asking nothing when the sheet closes. The
// sheet draws the form's `after` itself; a sheet that hoists the bar into its
// foot passes the form without it. Outside the package's exports.
export function SheetForm({
	form,
	outer,
	acting,
}: {
	form: FormFrameProps;
	// The reads the bar paints under besides the form's own (the sheet's read,
	// the ability the form is gated on).
	outer: readonly unknown[];
	// The holder of the bar's run, when the sheet holds more than the bar (a
	// docked sheet's dismissal).
	acting?: Acting<number>;
}) {
	const touch = useTouched();
	const frame = useFrame(form.read);
	const bar = useFormBar(form.bar, frame, outer, acting);
	return (
		<FormShell
			touch={touch}
			guard={false}
			edited={form.edited}
			card={false}
			frame={frame}
		>
			<FormRows {...form} after={undefined} frame={frame} />
			{bar}
		</FormShell>
	);
}

// Drops the viewer's edits as the sheet opens again. Outside the package's
// exports.
export function useClearOnOpen(open: boolean, clear: () => void): void {
	const [wasOpen, setWasOpen] = useState(open);
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) clear();
	}
}
