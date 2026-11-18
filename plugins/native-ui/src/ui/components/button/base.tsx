import { cn } from "@fcalell/ui-core/cn";
import { tuned } from "@fcalell/ui-core/paint";
import { ReasonHostContext, usePressed } from "@fcalell/ui-core/react/reason";
import { useTouched } from "@fcalell/ui-core/react/touched";
import {
	type ButtonAct,
	button,
	buttonContentTone,
	buttonLabel,
	FIELD_ERROR_LINE,
	text,
} from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { Text as RNText, View } from "react-native";
import { CountBase } from "../../atoms/count/base";
import { Icon } from "../../atoms/icon";
import { Spinner } from "../../atoms/spinner";
import { useAct } from "../../lib/act";
import { ActInert } from "../../lib/form";
import { Ink } from "../../lib/ink";
import { FadingText, flowIn } from "../../lib/motion";
import { inertProps, PAINT_CONTROL, useShown } from "../../lib/paint";
import { Press } from "../../lib/press";
import { ActSheet } from "../sheet/act";
import type { ButtonAttemptProps } from "./index";

const STACK = "items-start gap-gap";
const BOX = "flex-row items-center justify-center";
// Pending, the content gives way to the spinner; painted, the act keeps its
// loaded box and draws none of its content.
const HIDDEN = "opacity-0";
const SPINNER_LAYER = "absolute inset-0 items-center justify-center";

// The pressed look: an overlay that lands at once and fades out on release
// (`Press`), at the control's radius.
const WASH: Record<ButtonAct, string> = {
	primary: "rounded-control bg-act-accent-press",
	danger: "rounded-control bg-act-danger-press",
	secondary: "rounded-control bg-wash-press",
	destructive: "rounded-control bg-wash-press",
	quiet: "rounded-control bg-wash-press",
};

// Each act's pending fill and blocked look. A filled act's label reads in the
// meta ink on the disabled fill, which holds 4.5:1; the unfilled acts' words
// are in the disabled ink. The blocked ink is the label's and the glyph's,
// through `Ink`: a view draws no text colour.
const LOOK: Record<
	ButtonAct,
	{
		pending: string;
		blocked: string;
		label: string;
		ink: "ink-meta" | "ink-disabled";
	}
> = {
	primary: {
		pending: "bg-act-accent-pending",
		blocked: "bg-fill-disabled",
		label: "text-ink-meta",
		ink: "ink-meta",
	},
	danger: {
		pending: "bg-act-danger-pending",
		blocked: "bg-fill-disabled",
		label: "text-ink-meta",
		ink: "ink-meta",
	},
	secondary: {
		pending: "",
		blocked: "",
		label: "text-ink-disabled",
		ink: "ink-disabled",
	},
	destructive: {
		pending: "",
		blocked: "",
		label: "text-ink-disabled",
		ink: "ink-disabled",
	},
	quiet: {
		pending: "",
		blocked: "",
		label: "text-ink-disabled",
		ink: "ink-disabled",
	},
};

// Pending and blocked look: docs/architecture/ui-core/acts.md, "Blocked and pending acts".
function lookOf(
	kind: ButtonAct,
	pending: boolean,
	shown: boolean,
	muted: boolean,
): string {
	if (pending) return shown ? LOOK[kind].pending : "";
	if (muted) return LOOK[kind].blocked;
	return "";
}

// The act every Button renders; outside the package's exports.
// Its attempt, pending, blocked and painted shapes: docs/architecture/ui-core/acts.md, "Blocked and pending acts".
export function ButtonBase({
	act,
	fit,
	icon,
	label,
	count,
	wait,
	onAct,
	confirm,
	done,
	to,
	sheet,
	blocked,
	painted,
	pending: given,
	line,
}: Omit<ButtonAttemptProps, "href" | "glyph"> & {
	painted?: boolean;
	pending?: boolean;
	line?: boolean;
}) {
	const kind = act ?? "primary";
	const muted = !painted && blocked !== undefined;
	const { touched } = useTouched();
	const host = useContext(ReasonHostContext);
	// A host with a line of its own draws a rejection there; the public Button
	// alone draws it under itself. The base makes the attempt whose mode `line` picks.
	const acting = useAct(line && !host ? "line" : "toast");
	const pending = given === true || acting.pending !== undefined;
	const drawn = useShown(pending, tuned.actDelay);
	// Inert where it stands: the blocked look and no press, no reason.
	const waiting = wait !== undefined && wait > 0;
	const inert = (useContext(ActInert) || waiting) && !pending;
	const [pressed, keep] = usePressed(blocked);
	const said = muted && (pressed || touched);
	const look = painted
		? PAINT_CONTROL
		: lookOf(kind, pending, drawn, muted || inert);
	const labelLook = drawn ? HIDDEN : (muted || inert) && LOOK[kind].label;
	const ink =
		(muted || inert) && !pending ? LOOK[kind].ink : buttonContentTone(kind);
	const press = () => {
		if (pending || inert) return;
		if (muted) {
			if (host) host();
			else keep();
		} else if (given === undefined)
			acting.attempt(true, {
				onAct: () => onAct?.(),
				label,
				destructive: kind === "destructive" || kind === "danger",
				confirm,
				done,
				to,
				sheet,
			});
		else onAct?.();
	};
	const face = (
		<Press
			painted={painted}
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{
				disabled: pending || muted || inert,
				busy: pending,
			}}
			onPress={press}
			{...inertProps(painted === true)}
			// A blocked, pending or painted act has no press to answer; a full-width
			// one gives no scale (a wide surface scaling reads as a wobble).
			wash={painted || pending || muted || inert ? undefined : WASH[kind]}
			give={fit !== "field" && !(painted || pending || muted || inert)}
			className={cn(button({ act: kind, fit }), BOX, look)}
		>
			<Ink.Provider value={ink}>
				{icon ? (
					<View className={cn((drawn || painted) && HIDDEN)}>
						<Icon name={icon} fit="control" />
					</View>
				) : null}
				<RNText
					numberOfLines={1}
					className={cn(
						buttonLabel({ act: kind }),
						"shrink",
						labelLook,
						painted && HIDDEN,
					)}
				>
					{label}
				</RNText>
				{wait !== undefined ? (
					<View className={cn((drawn || !waiting || painted) && HIDDEN)}>
						<CountBase value={wait} inAct />
					</View>
				) : count !== undefined ? (
					<View className={cn((drawn || painted) && HIDDEN)}>
						<CountBase value={count} inAct />
					</View>
				) : null}
				{drawn ? (
					<View className={SPINNER_LAYER}>
						<Spinner />
					</View>
				) : null}
			</Ink.Provider>
		</Press>
	);
	const control = (
		<>
			{face}
			<ActSheet acting={acting} of={() => sheet} />
		</>
	);
	// A host draws the reason, and a failure, on its own line.
	if (host) return control;
	if (muted) {
		return (
			<View className={STACK}>
				{control}
				{said ? (
					<FadingText
						key={blocked}
						entering={flowIn()}
						className={text({ role: "meta" })}
					>
						{blocked}
					</FadingText>
				) : null}
			</View>
		);
	}
	if (!line) return control;
	// The stack stands from the first render, so the failure's line arriving
	// never remounts the act it was pressed on (and its focus with it).
	const under = acting.line;
	return (
		<View className={STACK}>
			{control}
			{under === undefined ? null : (
				<FadingText
					key={under}
					entering={flowIn()}
					accessibilityRole="alert"
					className={
						acting.holds || acting.pending === undefined
							? FIELD_ERROR_LINE
							: text({ role: "meta" })
					}
				>
					{under}
				</FadingText>
			)}
		</View>
	);
}
