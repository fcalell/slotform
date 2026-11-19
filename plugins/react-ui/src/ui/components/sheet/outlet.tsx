import { type DrawnSheet, useDrawnSheets } from "@fcalell/ui-core/react/sheets";
import { closeOnResolve, closeSheet } from "@fcalell/ui-core/sheets";
import type { ReactNode } from "react";
import type { ActSheetProps } from "./index.tsx";
import { TaskSheet } from "./task.tsx";

// One sheet an act opened, with the props the act held at the press.
function OpenedSheet(props: { drawn: DrawnSheet; nested: ReactNode }) {
	const { drawn, nested } = props;
	// Only `useAct` opens a sheet here, with an act's `sheet` of this platform.
	const sheet = drawn.sheet as ActSheetProps;
	const { submit, form } = sheet;
	return (
		<TaskSheet
			{...sheet}
			open={drawn.open}
			onClose={() => closeSheet(drawn.id)}
			nested={nested}
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

/** The sheets acts open (`openSheet`, `@fcalell/ui-core/sheets`), each later one drawn inside the one before it, as Base UI nests dialogs. Outside the package's exports: a root container's host draws it. */
export function SheetOutlet() {
	return useDrawnSheets().reduceRight<ReactNode>(
		(nested, drawn) => (
			<OpenedSheet key={drawn.id} drawn={drawn} nested={nested} />
		),
		null,
	);
}
