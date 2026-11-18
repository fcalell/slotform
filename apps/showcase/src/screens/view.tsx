import { cn } from "@fcalell/ui-core/cn";
import { MODES, type Mode } from "@fcalell/ui-core/tokens";
import {
	SEGMENTED_CONTROL,
	segment,
	segmentLabel,
} from "@fcalell/ui-core/variants";
import { useLayoutEffect, useState } from "react";
import { DENSITIES, type ShowcaseDensity } from "../roster/class-sets.ts";

export interface View {
	mode: Mode;
	density: ShowcaseDensity;
}

function pick<T extends string>(
	value: string | null,
	options: readonly T[],
	fallback: T,
): T {
	return options.find((option) => option === value) ?? fallback;
}

// The mode the URL's `?mode=` asks, `fallback` without one.
export function askedMode(fallback: Mode): Mode {
	const asked = new URLSearchParams(window.location.search).get("mode");
	return pick(asked, MODES, fallback);
}

// The `dark` class exactly as the mode script sets it.
export function applyMode(mode: Mode): void {
	document.documentElement.classList.toggle("dark", mode === "dark");
}

// The URL decides; without a `mode` the page keeps what the mode script set,
// and without a `density` it draws the desktop set.
function readView(): View {
	const params = new URLSearchParams(window.location.search);
	const current = document.documentElement.classList.contains("dark")
		? "dark"
		: "light";
	return {
		mode: askedMode(current),
		density: pick(params.get("density"), DENSITIES, "desktop"),
	};
}

// The mode, and the density pinned on the root. Nothing is stored: the URL
// holds the view.
function applyView(view: View): void {
	applyMode(view.mode);
	document.documentElement.dataset.density = view.density;
}

// The page's own parameters stay.
function writeView(view: View): void {
	const url = new URL(window.location.href);
	url.searchParams.set("mode", view.mode);
	url.searchParams.set("density", view.density);
	window.history.replaceState(window.history.state, "", url);
}

// The page's view, read from the URL, applied to the root before paint and
// written back on every change.
export function useView(): [View, (next: View) => void] {
	const [view, setView] = useState(readView);
	useLayoutEffect(() => applyView(view), [view]);
	// A density switch loads the page afresh: docs/architecture/ui-core/showcase.md, "The app".
	const change = (next: View) => {
		writeView(next);
		if (next.density === view.density) setView(next);
		else location.reload();
	};
	return [view, change];
}

// A header's mode and density toggles.
export function ViewBar(props: { view: View; onChange: (next: View) => void }) {
	const { view, onChange } = props;
	return (
		<>
			<Toggle
				label="Mode"
				options={MODES}
				value={view.mode}
				onChange={(mode) => onChange({ ...view, mode })}
			/>
			<Toggle
				label="Density"
				options={DENSITIES}
				value={view.density}
				onChange={(density) => onChange({ ...view, density })}
			/>
		</>
	);
}

function Toggle<T extends string>(props: {
	label: string;
	options: readonly T[];
	value: T;
	onChange: (value: T) => void;
}) {
	return (
		<fieldset
			aria-label={props.label}
			className={cn("flex flex-row", SEGMENTED_CONTROL)}
		>
			{props.options.map((option) => {
				const state = option === props.value ? "selected" : "idle";
				return (
					<button
						key={option}
						type="button"
						aria-pressed={state === "selected"}
						className={cn(
							"flex items-center justify-center",
							segment({ state }),
						)}
						onClick={() => props.onChange(option)}
					>
						<span className={segmentLabel({ state })}>{option}</span>
					</button>
				);
			})}
		</fieldset>
	);
}
