import { cn } from "@slotform/ui-core/cn";
import { COUNT, COUNT_LABEL } from "@slotform/ui-core/variants";
import { useInkColor } from "../../lib/ink";
import { Decoded } from "../../lib/region";

// The number every Count and every Button's count renders: docs/architecture/plugins/native-ui.md, "Ink". Outside the package's exports.
export function CountBase(props: {
	value: number | string;
	inAct?: boolean;
	painted?: boolean;
}) {
	const color = useInkColor();
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
