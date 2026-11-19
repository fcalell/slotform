import { useRef } from "react";
import {
	type AccessibilityActionEvent,
	type GestureResponderHandlers,
	PanResponder,
	type PanResponderInstance,
} from "react-native";

interface TrackDrag {
	disabled?: boolean;
	onMove: (x: number) => void;
	onEnd: (x: number) => void;
}

// The pan handlers of a track a finger drags along, on a `box-only` view: `x`
// is across the track from its start, and the drag keeps the gesture to its
// end, never yielding it to a scroll.
export function useTrackDrag(drag: TrackDrag): GestureResponderHandlers {
	// A drag reads `locationX` once, at the grant on the `box-only` track, and
	// follows the gesture's travel from there, since a moving finger's
	// `locationX` is relative to whatever view is under it.
	const latest = useRef(drag);
	latest.current = drag;
	const origin = useRef(0);
	const reached = useRef(0);
	const responder = useRef<PanResponderInstance>(null);
	responder.current ??= PanResponder.create({
		onStartShouldSetPanResponder: () => !latest.current.disabled,
		onMoveShouldSetPanResponder: () => !latest.current.disabled,
		onPanResponderTerminationRequest: () => false,
		onPanResponderGrant: (event) => {
			origin.current = event.nativeEvent.locationX;
			reached.current = origin.current;
			latest.current.onMove(reached.current);
		},
		onPanResponderMove: (_, gesture) => {
			reached.current = origin.current + gesture.dx;
			latest.current.onMove(reached.current);
		},
		onPanResponderRelease: () => latest.current.onEnd(reached.current),
		onPanResponderTerminate: () => latest.current.onEnd(reached.current),
	});
	return responder.current.panHandlers;
}

// The screen reader's increment and decrement on an adjustable control, each
// heard as a step forward (`1`) or back (`-1`); a disabled control offers none.
export function adjustActions(adjust: {
	disabled?: boolean;
	onStep: (direction: 1 | -1) => void;
}) {
	if (adjust.disabled) return {};
	const { onStep } = adjust;
	return {
		accessibilityActions: [{ name: "increment" }, { name: "decrement" }],
		onAccessibilityAction: (event: AccessibilityActionEvent) => {
			if (event.nativeEvent.actionName === "increment") onStep(1);
			if (event.nativeEvent.actionName === "decrement") onStep(-1);
		},
	};
}
