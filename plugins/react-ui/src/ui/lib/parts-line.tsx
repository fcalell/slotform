import { cn } from "@slotform/ui-core/cn";
import { META_TAIL } from "@slotform/ui-core/runs";
import type { ReactNode } from "react";

// A text line of parts a middle dot apart: docs/architecture/plugins/react-ui.md, "Text".

/** Parts a middle dot apart as one text. The parts are the line's children, so the caller draws the line's box and `className` styles each part (the text role). Outside the package's exports. */
export function PartsLine(props: {
	parts: readonly ReactNode[];
	className?: string;
}) {
	const { parts, className } = props;
	return parts.map((part, at) => (
		<span key={at} className={cn(className)}>
			{at > 0 ? META_TAIL : null}
			{part}
		</span>
	));
}

// A trail leading a line: a flex row whose trail is cut at its start, so the
// nearest place stands, and whose parts after it are cut at their end. The
// trail's box runs right to left, which puts the ellipsis at its start, and
// its text is isolated left to right, so the places keep their order. The dot
// between the two is a flex item of its own, its spaces kept.
const LINE = "flex min-w-0";
const TRAIL = "min-w-0 truncate [direction:rtl]";
const TRAIL_TEXT = "[direction:ltr] [unicode-bidi:isolate]";
const TRAIL_DOT = "shrink-0 whitespace-pre";
const REST = "min-w-0 truncate";

/** A line led by a trail: its labels a middle dot apart, cut at the start with an ellipsis so the last stands, then the `children` (more parts) after a middle dot, cut at their end. `className` is the line's text role. Outside the package's exports. */
export function TrailLine(props: {
	trail: readonly string[];
	className?: string;
	children?: ReactNode;
}) {
	const { trail, className, children } = props;
	return (
		<p className={cn(LINE, className)}>
			<span className={TRAIL}>
				<span className={TRAIL_TEXT}>
					<PartsLine parts={trail} />
				</span>
			</span>
			{children ? (
				<>
					<span className={TRAIL_DOT}>{META_TAIL}</span>
					<span className={REST}>{children}</span>
				</>
			) : null}
		</p>
	);
}
