import { useMore, useWindowMore } from "@fcalell/ui-core/react/read";
import { useWords } from "@fcalell/ui-core/react/words";
import type { More, Read } from "@fcalell/ui-core/read";
import { type ReactNode, useEffect, useRef } from "react";
import { View } from "react-native";
import { ButtonBase } from "../components/button/base";
import { cn } from "./cn";
import { StateLine } from "./read";

// The room under a row of the viewer's own pressing, as a state line carries.
const SHOW = "flex-row items-center pb-gap";
// A collection that bleeds the card's inset (a Section's sheet) has its
// rows pad themselves with it, so its more row does the same; the quiet act
// hangs its wash out by the control's own padding, its label at the rows' text.
const INSET = "px-pad";
const HANG = "-mx-pad";

// A collection's last row over a read that pages: docs/architecture/ui-core/reads.md, "Paging".
export function MoreRow(props: MoreProps) {
	return props.read.kind === "window" ? (
		<WindowMoreRow {...props} />
	) : (
		<PagesMoreRow {...props} />
	);
}

interface MoreProps {
	read: Read<unknown>;
	empty: boolean;
	paint: () => ReactNode;
	// The collection's rows pad themselves with the card's inset, so this row
	// does too.
	inset?: boolean;
}

function PagesMoreRow(props: MoreProps) {
	return <MoreLine {...props} more={useMore(props.read)} />;
}

function WindowMoreRow(props: MoreProps) {
	return <MoreLine {...props} more={useWindowMore(props.read)} />;
}

function MoreLine(props: MoreProps & { more: More }) {
	const { more, empty, paint, inset } = props;
	const words = useWords();
	const { next, fetching, failed } = more;
	const fetch = useRef(more.fetch);
	fetch.current = more.fetch;
	const fetches = empty && next && !fetching && !failed;
	useEffect(() => {
		if (fetches) fetch.current();
	}, [fetches]);
	if (fetching || fetches) return paint();
	if (failed) {
		return (
			<View className={inset ? INSET : undefined}>
				<StateLine
					sentence={words.moreFailed}
					act={{ label: words.retry, onAct: more.fetch }}
				/>
			</View>
		);
	}
	if (!next) return null;
	return (
		<View className={cn(SHOW, inset && INSET)}>
			<View className={HANG}>
				<ButtonBase act="quiet" label={words.showMore} onAct={more.fetch} />
			</View>
		</View>
	);
}
