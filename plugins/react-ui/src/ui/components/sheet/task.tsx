import type { ProcedureCall } from "@slotform/ui-core/form";
import { FrameHolds } from "@slotform/ui-core/react/read";
import { NO_HOLDS } from "@slotform/ui-core/read";
import { type ReactNode, useState } from "react";
import { SheetBase } from "./base.tsx";
import { useSheetForm } from "./form.tsx";
import type { SheetProps } from "./index.tsx";

/** The public `Sheet`, with what the sheet outlet hands it: `nested`, the sheet opened after this one, drawn inside this one's dialog. Outside the package's exports. */
export function TaskSheet<P extends ProcedureCall>(
	given: SheetProps<P> & { nested?: ReactNode },
) {
	// The props of the last open render. A set during render re-runs this
	// component with the same props object, so it settles at once.
	const [shown, setShown] = useState(given);
	if (given.open && shown !== given) setShown(given);
	const { open, onClose } = given;
	const { title, description, back, submit, read, empty, form, children } = open
		? given
		: shown;
	const { acting, fields } = useSheetForm(form, open, [read]);
	return (
		<FrameHolds holds={NO_HOLDS}>
			<SheetBase
				acting={acting}
				open={open}
				onClose={onClose}
				title={title}
				description={description}
				back={back}
				submit={submit}
				read={read}
				empty={empty}
				fields={fields}
				nested={given.nested}
			>
				{children}
			</SheetBase>
		</FrameHolds>
	);
}
