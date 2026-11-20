import { commitMoment } from "@slotform/ui-core/commit";
import type { Draft } from "@slotform/ui-core/react/acts";
import { type RefObject, useState } from "react";
import type { TextInputInstance, TextInputKeyPressEvent } from "react-native";

// When a typing field's `onCommit` hears its value: on leaving the field (or
// at `submit`) only when it changed since focus, through the draft, so a
// commit that returns its save's promise holds the value while it pends. With
// `onCommit`, a hardware Escape puts back the value at focus and leaves the
// field. Outside the package's exports.
export function useCommitMoment({
	draft,
	typed,
	edit,
	onCommit,
	input,
}: {
	draft: Draft<string>;
	typed: string;
	edit: (next: string) => void;
	onCommit: ((value: string) => unknown) | undefined;
	input: RefObject<TextInputInstance | null>;
}) {
	const [moment] = useState(() => commitMoment<string>());
	const commit = (next: string) => {
		if (onCommit) draft.change(next, () => onCommit(next));
	};
	return {
		focus: () => moment.focus(typed),
		leave: () => moment.leave(typed, commit),
		submit: () => moment.commit(typed, commit),
		onKeyPress: (event: TextInputKeyPressEvent) => {
			if (!onCommit || event.nativeEvent.key !== "Escape") return;
			moment.cancel(typed, edit);
			input.current?.blur();
		},
	};
}
