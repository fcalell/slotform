import { useEffect } from "react";

// How the viewer last drove the page: docs/architecture/plugins/react-ui.md, "Field box and focus rings".
let mounted = 0;
let remove: (() => void) | undefined;

const MODIFIERS = new Set(["Shift", "Control", "Alt", "Meta"]);
const LEAVES_FIELD = new Set(["Tab", "Escape"]);
// The input types that take no typing.
const UNTYPED = new Set([
	"checkbox",
	"radio",
	"range",
	"color",
	"file",
	"image",
	"button",
	"submit",
	"reset",
]);

function typesInto(target: EventTarget | null): boolean {
	if (target instanceof HTMLTextAreaElement) return true;
	if (target instanceof HTMLInputElement) return !UNTYPED.has(target.type);
	return target instanceof HTMLElement && target.isContentEditable;
}

function moves(event: KeyboardEvent): boolean {
	if (event.metaKey || event.ctrlKey || event.altKey) return false;
	if (MODIFIERS.has(event.key)) return false;
	return !typesInto(event.target) || LEAVES_FIELD.has(event.key);
}

function install(): () => void {
	const root = document.documentElement;
	const pointer = () => {
		root.dataset.modality = "pointer";
	};
	const keyboard = (event: KeyboardEvent) => {
		if (moves(event)) root.dataset.modality = "keyboard";
	};
	document.addEventListener("pointerdown", pointer, true);
	document.addEventListener("keydown", keyboard, true);
	return () => {
		document.removeEventListener("pointerdown", pointer, true);
		document.removeEventListener("keydown", keyboard, true);
	};
}

// Whether the viewer last drove the page by keyboard.
export function keyed(): boolean {
	return document.documentElement.dataset.modality === "keyboard";
}

// A frame or a field calls this once; the listeners follow them.
export function useModality() {
	useEffect(() => {
		if (mounted++ === 0) remove = install();
		return () => {
			if (--mounted === 0) {
				remove?.();
				remove = undefined;
			}
		};
	}, []);
}

// A field box's ring: docs/architecture/plugins/react-ui.md, "Field box and focus rings".
export const BOX_FOCUS =
	"not-has-[button:focus-visible]:in-data-[modality=keyboard]:has-focus-visible:outline-2 not-has-[button:focus-visible]:in-data-[modality=keyboard]:has-focus-visible:outline-offset-(--focus-ring-edge-offset) not-has-[button:focus-visible]:in-data-[modality=keyboard]:has-focus-visible:outline-ring";
// A focused field takes the accent edge, under the pointer and the keyboard
// alike (the keyboard adds the ring); the hover edge yields to it.
export const FOCUS_EDGE = "has-focus-visible:border-accent";
