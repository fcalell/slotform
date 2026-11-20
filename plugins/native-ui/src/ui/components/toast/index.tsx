import { TOAST_GLYPHS } from "@slotform/ui-core/banner";
import { cn } from "@slotform/ui-core/cn";
import type { LinkAct } from "@slotform/ui-core/descriptors";
import { tuned } from "@slotform/ui-core/paint";
import { useWords } from "@slotform/ui-core/react/words";
import type { Tone } from "@slotform/ui-core/tokens";
import { TOAST, text, toastContentTone } from "@slotform/ui-core/variants";
import { useContext } from "react";
import { Text as RNText, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { LinearTransition, ReduceMotion } from "react-native-reanimated";
import { IconButtonBase } from "../../atoms/button/glyph";
import { Icon } from "../../atoms/icon";
import type { Act } from "../../lib/act";
import { asAct, wiringOf } from "../../lib/act";
import type { Closed } from "../../lib/closed";
import { useSwipe } from "../../lib/follow";
import { Ink } from "../../lib/ink";
import { curve, FadingView, riseIn, sinkOut } from "../../lib/motion";
import { RaisedGround } from "../../lib/raised";
import { dismissToast, ToastId } from "../../lib/toast";
import { ButtonBase } from "../button/base";

// The phone is touch: the toast is as wide as its words (a short report is a
// pill, a long one fills the layer) and centred, as the web draws it on touch.
const BOX = "flex-row items-center max-w-full w-auto self-center";
// The sentence takes its words' width (`shrink`, the basis its text), never
// `flex-1`: that is a basis of 0, which a box as wide as its content measures
// as an empty pill. It wraps only once the layer's width is reached, and the
// act and the dismiss (`shrink-0`) keep theirs.
const SENTENCE = "min-w-0 shrink";
const ACT = "shrink-0";

// The builders run at render, so the tuning page's rungs reach the next toast.
const closeUp = () =>
	LinearTransition.duration(tuned.base)
		.easing(curve("in-out"))
		.reduceMotion(ReduceMotion.System);

export interface ToastProps extends Closed {
	/** What happened (a sentence; wraps). */
	sentence: string;
	// How the act it reports ended (`done`, the default): its glyph in the
	// tone's ink.
	tone?: Tone;
	// A route (`{ label, href }`, a press that navigates) or a retry; never an
	// undo.
	act?: Act | LinkAct;
}

// A raised toast: the tone's glyph, the sentence, its act and the dismiss
// act. It stands in the toasts' layer the Shell holds, which `toast()`
// queues it to.
export function Toast({ sentence, tone = "done", act }: ToastProps) {
	const words = useWords();
	const pressed = act && asAct(act);
	const id = useContext(ToastId);
	const swipe = useSwipe(() => id !== undefined && dismissToast(id));
	if (id === undefined)
		throw new Error(
			"a Toast stands in the Shell's toasts layer, queued by toast()",
		);
	return (
		<RaisedGround>
			<GestureDetector gesture={swipe.gesture}>
				<FadingView
					entering={riseIn("base")}
					exiting={sinkOut("base")}
					layout={closeUp()}
					style={swipe.style}
					className={cn(TOAST, BOX)}
				>
					<Ink.Provider value={toastContentTone(tone)}>
						<Icon name={TOAST_GLYPHS[tone]} />
					</Ink.Provider>
					<RNText className={cn(text({ role: "body" }), SENTENCE)}>
						{sentence}
					</RNText>
					{pressed ? (
						<View className={ACT}>
							<ButtonBase
								act="secondary"
								label={pressed.label}
								onAct={pressed.onAct}
								blocked={pressed.blocked}
								{...wiringOf(pressed)}
							/>
						</View>
					) : null}
					<IconButtonBase
						icon="X"
						label={words.dismiss}
						onAct={() => dismissToast(id)}
					/>
				</FadingView>
			</GestureDetector>
		</RaisedGround>
	);
}
