import type { Acting } from "@fcalell/ui-core/react/acts";
import { useFrame } from "@fcalell/ui-core/react/read";
import { useTouched } from "@fcalell/ui-core/react/touched";
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
	acting,
}: {
	form: FormFrameProps;
	// The holder of the bar's run, when the sheet holds more than the bar (a
	// docked sheet's dismissal).
	acting?: Acting<number>;
}) {
	const touch = useTouched();
	const frame = useFrame(form.read);
	const bar = useFormBar(form.bar, frame, acting);
	return (
		<FormShell touch={touch} guard={false} card={false} frame={frame}>
			<FormRows {...form} after={undefined} frame={frame} />
			{bar}
		</FormShell>
	);
}
