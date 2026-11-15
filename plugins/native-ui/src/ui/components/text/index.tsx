import type { Run, Runs } from "@fcalell/ui-core/descriptors";
import { isRun } from "@fcalell/ui-core/runs";
import { type TextRole, text } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Text as RNText } from "react-native";
import type { Closed } from "../../lib/closed";
import { RunText } from "../../lib/code";

export interface TextProps extends Closed {
	/** The type role: a primary line (`body`, the default) or a secondary one (`meta`). Not named `role`, which is the ARIA attribute: lint and tooling read that name as one. */
	kind?: TextRole;
	/** The text (text; wraps): words, or runs, where a `{ strong }` run is words at weight 500 and a `{ code }` run a span of code. */
	children?: ReactNode | Run | Runs;
}

function runsIn(children: TextProps["children"]): Runs | undefined {
	if (Array.isArray(children) && children.every(isRun)) return children;
	return typeof children === "object" && isRun(children)
		? [children]
		: undefined;
}

// The only way to set type; ink and family ride with the role. A run of
// emphasis inside it is a `{ strong }` run: a nested React Native Text inherits
// the line's role, ink and family.
export function Text({ kind, children }: TextProps) {
	const runs = runsIn(children);
	return (
		<RNText className={text({ role: kind ?? "body" })}>
			{runs ? <RunText runs={runs} /> : (children as ReactNode)}
		</RNText>
	);
}
