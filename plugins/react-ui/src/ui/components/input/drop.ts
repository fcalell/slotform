import type { ChangeEvent, DragEvent } from "react";

// The files a file input chose, the input cleared: the same file chosen again
// is a change the input would not report.
export function chosenFiles(event: ChangeEvent<HTMLInputElement>): File[] {
	const files = Array.from(event.currentTarget.files ?? []);
	event.currentTarget.value = "";
	return files;
}

// A box that takes dropped files: a drag that carries files lights it
// (`setOver`) and is the box's to drop, so a file dropped on it never opens
// in the tab; any other drag (a text selection, a link) passes it by.
// Without `take` (the box is disabled) the drop is still the box's and takes
// nothing.
export function fileDrop(
	setOver: (over: boolean) => void,
	take: ((files: FileList) => void) | undefined,
) {
	return {
		onDragOver: (event: DragEvent<HTMLElement>) => {
			if (!event.dataTransfer.types.includes("Files")) return;
			event.preventDefault();
			if (take) setOver(true);
		},
		onDragLeave: (event: DragEvent<HTMLElement>) => {
			const next = event.relatedTarget;
			if (next instanceof Node && event.currentTarget.contains(next)) return;
			setOver(false);
		},
		onDrop: (event: DragEvent<HTMLElement>) => {
			event.preventDefault();
			setOver(false);
			take?.(event.dataTransfer.files);
		},
	};
}
