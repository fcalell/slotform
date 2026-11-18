import {
	RAISED_GROUND_TOKENS,
	SOFT_GROUND_TOKENS,
} from "@fcalell/ui-core/emit";
import { type PropsWithChildren, useMemo } from "react";
import { ScopedVariables, useCSSVariable } from "uniwind";

// A ground's re-point as the variable it declares and the one it reads: docs/architecture/plugins/native-ui.md, "Raised grounds and room".
interface Ground {
	names: string[];
	reads: string[];
}

function groundOf(tokens: Record<string, string>): Ground {
	return {
		names: Object.keys(tokens),
		reads: Object.values(tokens).map((value) =>
			value.slice("var(".length, -")".length),
		),
	};
}

function Repoint({ ground, children }: PropsWithChildren<{ ground: Ground }>) {
	const values = useCSSVariable(ground.reads);
	const variables = useMemo(() => {
		const scoped: Record<string, string | number> = {};
		ground.names.forEach((name, index) => {
			const value = values[index];
			if (value !== undefined) scoped[name] = value;
		});
		return scoped;
	}, [ground, values]);
	return <ScopedVariables variables={variables}>{children}</ScopedVariables>;
}

const RAISED = groundOf(RAISED_GROUND_TOKENS);
const SOFT = groundOf(SOFT_GROUND_TOKENS);

// A raised ground (`RAISED_GROUNDS`) for everything inside it: docs/architecture/plugins/native-ui.md, "Raised grounds and room".
export function RaisedGround({ children }: PropsWithChildren) {
	return <Repoint ground={RAISED}>{children}</Repoint>;
}

// A soft ground (`SOFT_GROUNDS`, a banner's tone) for everything inside it:
// `edge` reads `edge-strong`, so a part's `border-edge` is an edge on the tint.
export function SoftGround({ children }: PropsWithChildren) {
	return <Repoint ground={SOFT}>{children}</Repoint>;
}
