import type { Runs } from "@fcalell/ui-core/descriptors";
import { valueCut } from "@fcalell/ui-core/list-state";
import {
	CODE_NAME,
	PROSE_CODESPAN,
	textStrong,
} from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { codeWhole } from "./bind";
import { cn } from "./cn";

// A whole value of code in the room its box leaves: the stem truncates to it
// and the tail stands whole (`valueCut`). The two read as the one value.
const CUT = "flex-row min-w-0";
const STEM = "shrink min-w-0";
const TAIL = "shrink-0";

// A span of code that is a whole title or meta part of a row: one value in the
// mono, bare (a machine name in a row is never boxed), cut in its middle to
// keep its start and its end (`valueCut`: a value with a space is words, cut at
// its end), in the ink of the `role` it stands in.
export function CodeCut(props: { code: string; role: string }) {
	const { stem, tail } = valueCut(props.code);
	return (
		<View accessible accessibilityLabel={props.code} className={CUT}>
			<RNText numberOfLines={1} className={cn(props.role, CODE_NAME, STEM)}>
				{stem}
			</RNText>
			{tail ? (
				<RNText numberOfLines={1} className={cn(props.role, CODE_NAME, TAIL)}>
					{tail}
				</RNText>
			) : null}
		</View>
	);
}

// Runs as one text: docs/architecture/plugins/native-ui.md, "Text breaks".
export function RunText(props: {
	runs: Runs;
	fit?: "span" | "name";
	whole?: boolean;
}) {
	const look = props.fit === "name" ? CODE_NAME : PROSE_CODESPAN;
	return props.runs.map((run, at) => {
		if (typeof run === "string") return run;
		if ("quoted" in run) return `“${run.quoted}”`;
		if ("code" in run)
			return (
				<RNText key={at} className={look}>
					{props.whole ? codeWhole(run.code) : run.code}
				</RNText>
			);
		return (
			<RNText key={at} className={textStrong({ role: "meta" })}>
				{run.strong}
			</RNText>
		);
	});
}
