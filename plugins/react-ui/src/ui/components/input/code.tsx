import { Input as Control } from "@base-ui/react/input";
import { drew, isThenable } from "@slotform/ui-core/acts";
import { cn } from "@slotform/ui-core/cn";
import { useAttempt } from "@slotform/ui-core/react/acts";
import { usePort } from "@slotform/ui-core/react/port";
import { useWords } from "@slotform/ui-core/react/words";
import {
	FLOW_IN,
	OTP,
	OTP_DIGIT,
	otpBox,
	text,
} from "@slotform/ui-core/variants";
import { Spinner } from "../../atoms/spinner/index.tsx";
import { useModality } from "../../lib/modality.ts";
import type { CodeInputProps } from "./index.tsx";
import { useRefusal } from "./refusal.tsx";

// The checking line stands one `pair` under the row.
const STACK = "flex flex-col gap-gap";
const ROW = "relative flex items-center";
// One real input lies over the boxes, invisible: a click anywhere focuses it,
// and the browser's code suggestion or a paste fills it at once. It goes
// first so the box it types into can ring on its focus.
const INPUT = "peer absolute inset-0 opacity-0";
const BOX = "flex items-center justify-center";
const BOX_FOCUS =
	"peer-focus-visible:in-data-[modality=keyboard]:outline-2 peer-focus-visible:in-data-[modality=keyboard]:outline-offset-(--focus-ring-edge-offset) peer-focus-visible:in-data-[modality=keyboard]:outline-ring";
const DIGIT = "text-center";
const LINE = "flex items-center gap-gap";

/** The row of digit boxes over one input a `code` Input draws; the box the next digit lands in rings on focus. Outside the package's exports. */
export function CodeField({
	length,
	value,
	onChange,
	onComplete,
}: CodeInputProps) {
	useModality();
	const words = useWords();
	const acting = useAttempt();
	const port = usePort();
	const { refused, refuse, wired, line } = useRefusal();
	const checking = acting.pending !== undefined;
	const active = Math.min(value.length, length - 1);
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
	return (
		<Control
			value={value}
			onValueChange={(raw) => {
				const next = raw.replace(/\D/g, "").slice(0, length);
				if (next === value) return;
				refuse(undefined);
				onChange(next);
				if (next.length === length) complete(next);
			}}
			inputMode="numeric"
			autoComplete="one-time-code"
			maxLength={length}
			// Read-only, not disabled, while the check runs: a disabled input
			// drops its focus, so the digit after a refusal would go nowhere.
			readOnly={checking}
			// Base UI's Field wires the input; the render function hands over its
			// props and state so the boxes draw the field's error.
			render={(control, state) => (
				<div className={STACK}>
					<div className={cn(OTP, ROW)}>
						<input {...control} {...wired(control)} className={INPUT} />
						{Array.from({ length }, (_, index) => (
							<span
								key={index}
								aria-hidden
								className={cn(
									otpBox({
										state: state.valid === false || refused ? "error" : "rest",
									}),
									BOX,
									index === active && !checking && BOX_FOCUS,
								)}
							>
								<span className={cn(OTP_DIGIT, DIGIT)}>{value[index]}</span>
							</span>
						))}
					</div>
					{checking ? (
						<p
							role="status"
							className={cn(text({ role: "meta" }), LINE, FLOW_IN)}
						>
							<Spinner />
							<span>{words.checking}</span>
						</p>
					) : null}
					{line}
				</div>
			)}
		/>
	);
}
