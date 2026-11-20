import { cn } from "@slotform/ui-core/cn";
import type { IconLinkAct } from "@slotform/ui-core/descriptors";
import { LIST_BAND, text, textStrong } from "@slotform/ui-core/variants";
import { CountBase } from "../../atoms/count/base.tsx";
import type { IconAct } from "../../lib/act.ts";
import { IconActFace } from "../button/face.tsx";

// The row hairline the sheet draws under its children (`DIVIDER`) is not the
// band's: the band closes with its own rule.
const BAND = "flex items-center after:hidden";
// The label and its count stand together, the act at the end.
const NAME = "flex items-center min-w-0 grow gap-gap";
const LABEL = "truncate min-w-0";

/** A band: its label, the count of its rows (none when it has none) and its act. Outside the package's exports; the Section draws it. */
export function BandHead(props: {
	label: string;
	count: number;
	act?: IconAct | IconLinkAct;
}) {
	const { act } = props;
	return (
		<div className={cn(LIST_BAND, BAND)}>
			<span className={NAME}>
				<span
					className={cn(
						text({ role: "body" }),
						textStrong({ role: "body" }),
						LABEL,
					)}
				>
					{props.label}
				</span>
				{props.count > 0 ? <CountBase value={props.count} /> : null}
			</span>
			{act ? <IconActFace act={act} /> : null}
		</div>
	);
}
