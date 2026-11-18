import { cn } from "@fcalell/ui-core/cn";
import type { Act } from "@fcalell/ui-core/descriptors";
import { SHELL_COLUMN } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { act } from "./section-rows.ts";

export const ACTIONS = [
	{ icon: "ListFilter" as const, label: "Filter", onAct: act },
	{ icon: "RefreshCw" as const, label: "Refresh", onAct: act },
];
export const MORE: Act[] = [
	{ label: "Copy deploy hook", onAct: act },
	{ label: "Export as CSV", onAct: act },
	{ label: "Delete all previews", onAct: act, destructive: true },
];

// A scene drawn at the showcase's width on the column's ground, the way a
// page stands in the shell's column, which has a height of its own when the
// page docks a foot.
export function Column(props: { children: ReactNode }) {
	return (
		<div className={cn(SHELL_COLUMN, "flex flex-col w-screen max-w-full")}>
			{props.children}
		</div>
	);
}
