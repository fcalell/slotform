import { isThenable } from "@fcalell/ui-core/acts";
import type { Acting } from "@fcalell/ui-core/react/acts";
import type { ActSheetProps } from "../../lib/act.ts";
import { Sheet } from "./index.tsx";

/** The sheet an act of its holder opened: drawn by the holder beside the control that drew the act, open from the press until it is dismissed or its `submit` has resolved. The holder keeps only the open state: `of` answers the opened act's *current* `sheet` (the holder draws it again with its act), so the sheet follows what the act holds now, not what it held at the press. Outside the package's exports: a holder that runs acts draws it. */
export function ActSheet<K>({
	acting,
	of,
}: {
	acting: Acting<K>;
	of: (key: K) => ActSheetProps | undefined;
}) {
	const opened = acting.sheet;
	const props = opened && of(opened.key);
	if (!(opened && props)) return null;
	const { open, close } = opened;
	const { submit, form } = props;
	// Closing is the run's resolution: at once for a run that returns nothing,
	// once its promise resolves, and never on a rejection, which stands in the
	// sheet's bar.
	const closing = (ran: unknown) => {
		if (!isThenable(ran)) {
			close();
			return ran;
		}
		return Promise.resolve(ran).then((value) => {
			close();
			return value;
		});
	};
	return (
		<Sheet
			{...props}
			open={open}
			onClose={close}
			form={
				form && {
					...form,
					onDone: (output: unknown, input: unknown) =>
						closing(
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
							onAct: () => closing(submit.onAct?.()),
						}
					: submit
			}
		/>
	);
}
