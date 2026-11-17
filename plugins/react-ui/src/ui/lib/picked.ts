import type { PickedFile } from "@fcalell/ui-core/descriptors";

export function pickedFrom(file: File): PickedFile {
	return {
		name: file.name,
		size: file.size,
		type: file.type,
		blob: () => Promise.resolve(file),
	};
}

// A file attached to a message and its `src`: docs/architecture/plugins/react-ui.md, "A picked file's `src`".
export function attachedFrom(file: File): PickedFile {
	return {
		...pickedFrom(file),
		...(file.type.startsWith("image/") && { src: URL.createObjectURL(file) }),
	};
}
