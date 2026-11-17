import { drew, isThenable } from "@fcalell/ui-core/acts";
import { useAttempt } from "@fcalell/ui-core/react/acts";
import { usePort } from "@fcalell/ui-core/react/port";
import { useTouched } from "@fcalell/ui-core/react/touched";
import { useWords } from "@fcalell/ui-core/react/words";
import {
	FIELD_ERROR_LINE,
	OTP,
	OTP_DIGIT,
	otpBox,
	text,
} from "@fcalell/ui-core/variants";
import { useContext, useRef, useState } from "react";
import { Text as RNText, TextInput, View } from "react-native";
import { Spinner } from "../../atoms/spinner";
import { cn } from "../../lib/cn";
import {
	FieldError,
	FieldFocus,
	useFieldClaim,
	useFieldName,
} from "../../lib/field";
import { FadingText, flowIn } from "../../lib/motion";
import type { CodeInputProps } from "./index";

// A one-time code: `length` boxes over one string of digits, standing at the
// `otp` side and shrinking together, square, on a narrow row. One real input
// lies over the boxes, invisible, so a tap anywhere focuses it and the
// system's code suggestion and a paste of the whole code fill it at once; the
// boxes draw it. It takes focus as it mounts where `FieldFocus` asks, as an
// `Input` does, so a code sheet is typed into at once, and in a
// `Gate` unless a typing control there holds it. `onComplete`
// hears the code once its last digit lands; a promise it returns holds the
// boxes at rest while the code is checked, the input inert (unwritable and
// marked disabled, still read), the spinner and its line under it, and a
// refusal stands in a line under the boxes, with its reason, until the next
// digit.
export function CodeField({
	length,
	value,
	onChange,
	onComplete,
}: CodeInputProps) {
	const words = useWords();
	const acting = useAttempt();
	const port = usePort();
	// The check's refusal stands in the control's own line until the next digit.
	const [refused, refuse] = useState<string>();
	const checking = acting.pending !== undefined;
	// The attempt a Retry runs again: its promise, so the toast's act holds it.
	const attempt = (code: string): unknown => {
		const result = onComplete?.(code);
		if (!isThenable(result)) return result;
		return Promise.resolve(result).catch((error: unknown) => {
			drew(error);
			refuse(port.refusal(error) ?? words.actFailed);
		});
	};
	const complete = (code: string) => acting.attempt(true, () => attempt(code));
	const { touch } = useTouched();
	const name = useFieldName();
	const error = useContext(FieldError);
	const focused = useContext(FieldFocus);
	const input = useRef<TextInput>(null);
	const column = useFieldClaim(input);
	return (
		<View className="gap-gap">
			<View className={cn(OTP, "relative flex-row items-center")}>
				{Array.from({ length }, (_, index) => (
					<View
						key={index}
						className={cn(
							otpBox({ state: error || refused ? "error" : "rest" }),
							"items-center justify-center",
						)}
					>
						<RNText className={cn(OTP_DIGIT, "text-center")}>
							{value[index] ?? ""}
						</RNText>
					</View>
				))}
				<TextInput
					ref={input}
					onFocus={column.onFocus}
					onBlur={column.onBlur}
					accessibilityLabel={name}
					accessibilityState={{ disabled: checking, busy: checking }}
					autoFocus={focused}
					value={value}
					onChangeText={(raw) => {
						const next = raw.replace(/\D/g, "").slice(0, length);
						touch();
						if (next === value) return;
						refuse(undefined);
						onChange(next);
						if (next.length === length) complete(next);
					}}
					maxLength={length}
					keyboardType="number-pad"
					textContentType="oneTimeCode"
					autoComplete="one-time-code"
					editable={!checking}
					caretHidden
					className="absolute inset-0 opacity-0"
				/>
			</View>
			{checking ? (
				<View className="flex-row items-center gap-gap">
					<Spinner />
					<FadingText
						entering={flowIn()}
						className={cn(text({ role: "meta" }), "shrink")}
					>
						{words.checking}
					</FadingText>
				</View>
			) : null}
			{refused ? (
				<FadingText
					key={refused}
					entering={flowIn()}
					accessibilityRole="alert"
					className={FIELD_ERROR_LINE}
				>
					{refused}
				</FadingText>
			) : null}
		</View>
	);
}
