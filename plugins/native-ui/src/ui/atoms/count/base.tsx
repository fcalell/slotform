import { COUNT, COUNT_LABEL } from "@fcalell/ui-core/variants";
import { cn } from "../../lib/cn";
import { useInk } from "../../lib/ink";
import { Decoded } from "../../lib/region";
import { useTokenColor } from "../../lib/theme";

// The number every Count and every Button's count renders: docs/architecture/plugins/native-ui.md, "Ink". Outside the package's exports.
export function CountBase(props: {
	value: number | string;
	inAct?: boolean;
	painted?: boolean;
}) {
	const color = useTokenColor(`--color-${useInk() ?? "ink-meta"}`);
	const look = props.inAct ? COUNT_LABEL : cn(COUNT, COUNT_LABEL);
	const ink = props.inAct ? { color } : undefined;
	return (
		<Decoded
			role="figure"
			painted={props.painted}
			text={String(props.value)}
			of={Number.parseFloat(String(props.value))}
			className={look}
			style={ink}
		/>
	);
}
