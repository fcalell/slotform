import { cn } from "@fcalell/ui-core/cn";
import { type ReactNode, useLayoutEffect, useState } from "react";

// A stage a root container (a `Gate`, a `Shell`) stands in; `contain` and `ready` are described in docs/architecture/ui-core/showcase.md, "Roster scenes".
export function Stage(props: {
	children: ReactNode;
	contain?: boolean;
	ready?: (stage: HTMLElement) => void;
}) {
	const [stage, setStage] = useState<HTMLElement | null>(null);
	const { ready } = props;
	useLayoutEffect(() => {
		if (!stage || !ready) return;
		ready(stage);
	}, [stage, ready]);
	return (
		<div
			ref={setStage}
			className={cn(
				"relative flex flex-col overflow-hidden h-dvh w-screen max-w-full rounded-card border border-edge bg-surface",
				props.contain && "transform-gpu",
			)}
		>
			{props.children}
		</div>
	);
}

export function press(target: Element | null | undefined): void {
	if (target instanceof HTMLElement) target.click();
}

export function key(target: Element | null | undefined, name: string): void {
	target?.dispatchEvent(
		new KeyboardEvent("keydown", { key: name, bubbles: true }),
	);
}
