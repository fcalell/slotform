import { cn } from "@fcalell/ui-core/cn";
import { type ReactNode, useLayoutEffect, useState } from "react";

// A stage a root frame (a `Gate`, a `Shell`) stands in, a viewport tall, so a
// popup mounts in that frame's portal and draws the frame's mode; `contain`
// stands the frame's fixed layers (its portal, its toasts) in the stage's box
// (a transformed box contains its fixed descendants), which a popover anchored
// to its trigger must not take; and `ready` drives the frame (opens a menu,
// presses a blocked submit so its reason shows).
// `ready` runs before paint, in the commit the stage mounts in, before any
// popup on the page listens for a press outside it: every open Base UI popup
// scans the whole document on each press anywhere, so a frame pressing after
// the page's popups open costs all of them and can dismiss another frame's.
// A press inside a popup waits one frame for the popup's content.
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
