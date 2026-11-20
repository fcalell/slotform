import { cn } from "@slotform/ui-core/cn";
import { FIELD_ERROR_LINE, FLOW_IN } from "@slotform/ui-core/variants";
import { type AriaAttributes, useId, useState } from "react";

// What a control refused (a code's check, a file of the wrong type) stands in
// its own line under it until the next change: the control draws invalid and
// is described by that line beside its field's own description.
export function useRefusal() {
	const [refused, refuse] = useState<string>();
	const id = useId();
	const wired = (
		control: Pick<AriaAttributes, "aria-invalid" | "aria-describedby">,
	) => ({
		"aria-invalid": refused ? true : control["aria-invalid"],
		"aria-describedby": refused
			? [control["aria-describedby"], id].filter(Boolean).join(" ")
			: control["aria-describedby"],
	});
	const line = refused ? (
		<p
			id={id}
			key={refused}
			role="alert"
			className={cn(FIELD_ERROR_LINE, FLOW_IN)}
		>
			{refused}
		</p>
	) : null;
	return { refused, refuse, wired, line };
}
