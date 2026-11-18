import { type ReactNode, useEffect, useRef } from "react";
import { afterFrames } from "../judge.ts";

// Draws `children` in a box `judge` reads once `settle` frames have passed. A
// `judge` is a stable function: a new one each render restarts the wait.
export function Judged({
	settle,
	judge,
	className,
	children,
}: {
	settle: number;
	judge: (host: HTMLElement) => void;
	className?: string;
	children: ReactNode;
}) {
	const host = useRef<HTMLDivElement>(null);
	useEffect(
		() =>
			afterFrames(settle, () => {
				if (host.current) judge(host.current);
			}),
		[settle, judge],
	);
	return (
		<div ref={host} className={className}>
			{children}
		</div>
	);
}
