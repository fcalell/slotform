import {
	type DrawnSheet,
	useDrawnSheets,
} from "@slotform/ui-core/react/sheets";
import { closeOnResolve, closeSheet } from "@slotform/ui-core/sheets";
import { type ActSheetProps, Sheet } from ".";

// One sheet an act opened, with the props the act held at the press.
function OpenedSheet({ drawn }: { drawn: DrawnSheet }) {
	// Only `useAct` opens a sheet here, with an act's `sheet` of this platform.
	const sheet = drawn.sheet as ActSheetProps;
	const { submit, form } = sheet;
	return (
		<Sheet
			{...sheet}
			open={drawn.open}
			onClose={() => closeSheet(drawn.id)}
			form={
				form && {
					...form,
					onDone: (output: unknown, input: unknown) =>
						closeOnResolve(
							drawn.id,
							// The procedure is forgotten here, so its input types as `never`.
							(
								form.onDone as
									| ((output: unknown, input: unknown) => unknown)
									| undefined
							)?.(output, input),
						),
				}
			}
			submit={
				submit?.onAct
					? {
							...submit,
							// The submit's confirm, done and to stand as given.
							onAct: () => closeOnResolve(drawn.id, submit.onAct?.()),
						}
					: submit
			}
		/>
	);
}

// The sheets acts open (`openSheet`, `@slotform/ui-core/sheets`), side by side
// in the order they opened: the provider stacks its modals by `present()`,
// each one presented over the one before it, which it restores as the later
// one leaves. Outside the package's exports: a root container's host draws it.
export function SheetOutlet() {
	return useDrawnSheets().map((drawn) => (
		<OpenedSheet key={drawn.id} drawn={drawn} />
	));
}
