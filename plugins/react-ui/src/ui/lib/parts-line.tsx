import { cn } from "@fcalell/ui-core/cn";
import type { ReactNode } from "react";

// A text line of parts a middle dot apart: docs/architecture/plugins/react-ui.md, "Text".

// The dot of one text, bound to the words beside it.
const BOUND = " · ";

/** Parts a middle dot apart as one text. The parts are the line's children, so the caller draws the line's box and `className` styles each part (the text role). Outside the package's exports. */
export function PartsLine(props: {
	parts: readonly ReactNode[];
	className?: string;
}) {
	const { parts, className } = props;
	return parts.map((part, at) => (
		<span key={at} className={cn(className)}>
			{at > 0 ? BOUND : null}
			{part}
		</span>
	));
}
